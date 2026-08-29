'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  BusinessApiError,
  getWorkflowRun,
  workflowRequest,
} from '../../lib/business-api-client';

export const DEFAULT_BUSINESS_WORKFLOW_STORAGE_KEY = 'qianhai:business-workflow:v1';

type WorkflowPayload = Record<string, unknown>;

export type WorkflowStep =
  | 'attach_onboarding_task'
  | 'create_task'
  | 'create_content'
  | 'schedule_content'
  | 'create_campaign'
  | 'create_customer_and_inquiry'
  | 'create_quote'
  | 'request_approval'
  | 'decide_approval'
  | 'create_order'
  | 'record_attribution'
  | 'refresh';

export interface WorkflowResourceIds {
  runId: string;
  taskId?: string;
  contentId?: string;
  scheduleId?: string;
  campaignId?: string;
  customerId?: string;
  inquiryId?: string;
  quoteId?: string;
  approvalId?: string;
  orderId?: string;
  opportunityId?: string;
  attributionId?: string;
}

export interface WorkflowResourceStatuses {
  task?: string;
  content?: string;
  schedule?: string;
  campaign?: string;
  customer?: string;
  inquiry?: string;
  quote?: string;
  approval?: string;
  order?: string;
  attribution?: string;
}

export interface WorkflowRunEvidence {
  runStatus?: string;
  counts: Record<string, number>;
  chain: {
    orderId?: string;
    quoteStatus?: string;
    approvalStatus?: string;
  };
  verifiedAt?: string;
}

export interface WorkflowUiError {
  step: WorkflowStep;
  message: string;
  occurredAt: string;
}

export interface BusinessWorkflowState {
  hydrated: boolean;
  ids: WorkflowResourceIds;
  statuses: WorkflowResourceStatuses;
  evidence: WorkflowRunEvidence;
  pending: WorkflowStep | null;
  error: WorkflowUiError | null;
}

export interface OnboardingTaskReference {
  id: string;
  status?: string;
  enterpriseId?: string;
  name?: string;
  targetMarket?: string;
}

export interface AttachOnboardingTaskOptions {
  runId?: string;
}

export interface DecideApprovalInput {
  decision: 'approved' | 'rejected';
  note?: string;
}

export interface BusinessWorkflowActions {
  attachOnboardingTask(
    task: OnboardingTaskReference,
    options?: AttachOnboardingTaskOptions,
  ): Promise<BusinessWorkflowState>;
  createTask(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  createContent(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  scheduleContent(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  createCampaign(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  createCustomerAndInquiry(
    customerPayload?: WorkflowPayload,
    inquiryPayload?: WorkflowPayload,
  ): Promise<BusinessWorkflowState>;
  createQuote(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  requestApproval(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  decideApproval(input: DecideApprovalInput): Promise<BusinessWorkflowState>;
  createOrder(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  recordAttribution(payload?: WorkflowPayload): Promise<BusinessWorkflowState>;
  refresh(): Promise<BusinessWorkflowState>;
}

export interface BusinessWorkflowContextValue {
  state: BusinessWorkflowState;
  actions: BusinessWorkflowActions;
}

interface BusinessWorkflowProviderProps {
  children: ReactNode;
  storageKey?: string;
}

interface PersistedWorkflowState {
  version: 1;
  ids: WorkflowResourceIds;
  statuses: WorkflowResourceStatuses;
  evidence: WorkflowRunEvidence;
}

interface EntityReference {
  id: string;
  status?: string;
  opportunityId?: string;
}

const BusinessWorkflowContext = createContext<BusinessWorkflowContextValue | null>(null);

const RESOURCE_ROWS: ReadonlyArray<{
  idKey: Exclude<keyof WorkflowResourceIds, 'runId' | 'opportunityId'>;
  statusKey: keyof WorkflowResourceStatuses;
  label: string;
}> = [
  { idKey: 'taskId', statusKey: 'task', label: '经营任务' },
  { idKey: 'contentId', statusKey: 'content', label: '内容' },
  { idKey: 'scheduleId', statusKey: 'schedule', label: '排期' },
  { idKey: 'campaignId', statusKey: 'campaign', label: '活动' },
  { idKey: 'customerId', statusKey: 'customer', label: '客户' },
  { idKey: 'inquiryId', statusKey: 'inquiry', label: '询盘' },
  { idKey: 'quoteId', statusKey: 'quote', label: '报价' },
  { idKey: 'approvalId', statusKey: 'approval', label: '审批' },
  { idKey: 'orderId', statusKey: 'order', label: '订单' },
  { idKey: 'attributionId', statusKey: 'attribution', label: '归因' },
];

const STEP_LABELS: Record<WorkflowStep, string> = {
  attach_onboarding_task: '接入新手任务',
  create_task: '创建经营任务',
  create_content: '创建内容',
  schedule_content: '创建排期',
  create_campaign: '创建活动',
  create_customer_and_inquiry: '创建客户与询盘',
  create_quote: '创建报价',
  request_approval: '发起审批',
  decide_approval: '处理审批',
  create_order: '创建订单',
  record_attribution: '记录归因',
  refresh: '刷新后端状态',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '运行中',
  scheduled: '已排期',
  new_inquiry: '新询盘',
  open: '处理中',
  pending: '待审批',
  pending_approval: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  accepted: '已接受',
  won: '已成交',
  recorded: '已记录',
  completed: '已完成',
  cleaned: '已清理',
};

function createRunId(): string {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `ui-${suffix}`;
}

function emptyState(): BusinessWorkflowState {
  return {
    hydrated: false,
    ids: { runId: '' },
    statuses: {},
    evidence: { counts: {}, chain: {} },
    pending: null,
    error: null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseIds(value: unknown): WorkflowResourceIds {
  const ids = asRecord(value) ?? {};
  return {
    runId: optionalString(ids.runId) ?? createRunId(),
    taskId: optionalString(ids.taskId),
    contentId: optionalString(ids.contentId),
    scheduleId: optionalString(ids.scheduleId),
    campaignId: optionalString(ids.campaignId),
    customerId: optionalString(ids.customerId),
    inquiryId: optionalString(ids.inquiryId),
    quoteId: optionalString(ids.quoteId),
    approvalId: optionalString(ids.approvalId),
    orderId: optionalString(ids.orderId),
    opportunityId: optionalString(ids.opportunityId),
    attributionId: optionalString(ids.attributionId),
  };
}

function parseStatuses(value: unknown): WorkflowResourceStatuses {
  const statuses = asRecord(value) ?? {};
  return {
    task: optionalString(statuses.task),
    content: optionalString(statuses.content),
    schedule: optionalString(statuses.schedule),
    campaign: optionalString(statuses.campaign),
    customer: optionalString(statuses.customer),
    inquiry: optionalString(statuses.inquiry),
    quote: optionalString(statuses.quote),
    approval: optionalString(statuses.approval),
    order: optionalString(statuses.order),
    attribution: optionalString(statuses.attribution),
  };
}

function parseCounts(value: unknown): Record<string, number> {
  const counts = asRecord(value) ?? {};
  return Object.fromEntries(
    Object.entries(counts).filter((entry): entry is [string, number] => (
      typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0
    )),
  );
}

function parseEvidence(value: unknown): WorkflowRunEvidence {
  const evidence = asRecord(value) ?? {};
  const chain = asRecord(evidence.chain) ?? {};
  return {
    runStatus: optionalString(evidence.runStatus),
    counts: parseCounts(evidence.counts),
    chain: {
      orderId: optionalString(chain.orderId),
      quoteStatus: optionalString(chain.quoteStatus),
      approvalStatus: optionalString(chain.approvalStatus),
    },
    verifiedAt: optionalString(evidence.verifiedAt),
  };
}

function parsePersistedState(value: string | null): BusinessWorkflowState {
  if (!value) {
    return {
      ...emptyState(),
      hydrated: true,
      ids: { runId: createRunId() },
    };
  }

  try {
    const parsed = asRecord(JSON.parse(value));
    if (!parsed || parsed.version !== 1) throw new Error('Unsupported workflow state version');
    return {
      hydrated: true,
      ids: parseIds(parsed.ids),
      statuses: parseStatuses(parsed.statuses),
      evidence: parseEvidence(parsed.evidence),
      pending: null,
      error: null,
    };
  } catch {
    return {
      ...emptyState(),
      hydrated: true,
      ids: { runId: createRunId() },
      error: {
        step: 'refresh',
        message: '本地经营链状态无法读取，已建立新的本地运行标识。',
        occurredAt: new Date().toISOString(),
      },
    };
  }
}

function entityFromResponse(response: unknown, key: string): EntityReference {
  const root = asRecord(response);
  const entity = asRecord(root?.[key]);
  const id = optionalString(entity?.id);
  if (!id) throw new Error(`后端响应缺少 ${key}.id，未更新本地状态。`);
  return {
    id,
    status: optionalString(entity?.status),
    opportunityId: optionalString(entity?.opportunityId),
  };
}

function requireId(
  ids: WorkflowResourceIds,
  key: keyof WorkflowResourceIds,
  message: string,
): string {
  const value = ids[key];
  if (!value) throw new Error(message);
  return value;
}

function requireAbsent(value: string | undefined, message: string): void {
  if (value) throw new Error(message);
}

function idempotencyKey(runId: string, action: string): string {
  return `${runId}:business-ui:${action}:v1`;
}

function errorMessage(error: unknown): string {
  if (error instanceof BusinessApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '经营链操作失败，请稍后重试。';
}

function hasDownstreamResources(ids: WorkflowResourceIds): boolean {
  return Boolean(
    ids.contentId || ids.scheduleId || ids.campaignId || ids.customerId || ids.inquiryId
      || ids.quoteId || ids.approvalId || ids.orderId || ids.opportunityId || ids.attributionId,
  );
}

export function BusinessWorkflowProvider({
  children,
  storageKey = DEFAULT_BUSINESS_WORKFLOW_STORAGE_KEY,
}: BusinessWorkflowProviderProps) {
  const [state, setState] = useState<BusinessWorkflowState>(emptyState);
  const stateRef = useRef(state);
  const activeStepRef = useRef<WorkflowStep | null>(null);

  const updateState = useCallback((updater: (current: BusinessWorkflowState) => BusinessWorkflowState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(storageKey);
      } catch {
        // A usable in-memory workflow is still preferable when storage is unavailable.
      }
      const hydrated = parsePersistedState(stored);
      stateRef.current = hydrated;
      setState(hydrated);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          version: 1,
          ids: hydrated.ids,
          statuses: hydrated.statuses,
          evidence: hydrated.evidence,
        } satisfies PersistedWorkflowState));
      } catch {
        // The visible state remains authoritative for this tab.
      }
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [storageKey]);

  useEffect(() => {
    if (!state.hydrated) return;
    const persisted: PersistedWorkflowState = {
      version: 1,
      ids: state.ids,
      statuses: state.statuses,
      evidence: state.evidence,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(persisted));
    } catch {
      // Do not hide a successful backend result because browser storage is unavailable.
    }
  }, [state, storageKey]);

  const executeStep = useCallback(async (
    step: WorkflowStep,
    operation: () => Promise<void> | void,
  ): Promise<BusinessWorkflowState> => {
    if (!stateRef.current.hydrated) throw new Error('经营链状态仍在初始化，请稍后再试。');
    if (activeStepRef.current) {
      throw new Error(`${STEP_LABELS[activeStepRef.current]}仍在处理中，请勿重复提交。`);
    }

    activeStepRef.current = step;
    updateState((current) => ({ ...current, pending: step, error: null }));
    try {
      await operation();
      return updateState((current) => ({ ...current, pending: null }));
    } catch (error) {
      const workflowError: WorkflowUiError = {
        step,
        message: errorMessage(error),
        occurredAt: new Date().toISOString(),
      };
      updateState((current) => ({ ...current, pending: null, error: workflowError }));
      throw error;
    } finally {
      activeStepRef.current = null;
    }
  }, [updateState]);

  const attachOnboardingTask = useCallback<BusinessWorkflowActions['attachOnboardingTask']>(
    async (task, options) => executeStep('attach_onboarding_task', () => {
      if (!optionalString(task.id)) throw new Error('新手配置没有返回真实 taskId。');
      const current = stateRef.current;
      const requestedRunId = optionalString(options?.runId) ?? current.ids.runId;
      if (requestedRunId !== current.ids.runId && (current.ids.taskId || hasDownstreamResources(current.ids))) {
        throw new Error('当前浏览器已有经营链资源，不能切换到另一个 runId。');
      }
      if (current.ids.taskId && current.ids.taskId !== task.id) {
        throw new Error('当前经营链已绑定另一个任务，请勿混用客户或项目数据。');
      }
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, runId: requestedRunId, taskId: task.id },
        statuses: { ...latest.statuses, task: task.status ?? latest.statuses.task ?? 'draft' },
      }));
    }),
    [executeStep, updateState],
  );

  const createTask = useCallback<BusinessWorkflowActions['createTask']>(
    async (payload = {}) => executeStep('create_task', async () => {
      const current = stateRef.current;
      requireAbsent(current.ids.taskId, '经营任务已经存在，不能重复创建。');
      const response = await workflowRequest('create_task', {
        runId: current.ids.runId,
        payload,
        idempotencyKey: idempotencyKey(current.ids.runId, 'create-task'),
      });
      const task = entityFromResponse(response, 'task');
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, taskId: task.id },
        statuses: { ...latest.statuses, task: task.status ?? 'draft' },
      }));
    }),
    [executeStep, updateState],
  );

  const createContent = useCallback<BusinessWorkflowActions['createContent']>(
    async (payload = {}) => executeStep('create_content', async () => {
      const current = stateRef.current;
      const taskId = requireId(current.ids, 'taskId', '请先接入或创建经营任务。');
      requireAbsent(current.ids.contentId, '内容已经创建，不能跳回此步骤重复生成。');
      const response = await workflowRequest('create_content', {
        runId: current.ids.runId,
        payload: { ...payload, taskId },
        idempotencyKey: idempotencyKey(current.ids.runId, 'create-content'),
      });
      const content = entityFromResponse(response, 'content');
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, contentId: content.id },
        statuses: { ...latest.statuses, content: content.status ?? 'draft' },
      }));
    }),
    [executeStep, updateState],
  );

  const scheduleContent = useCallback<BusinessWorkflowActions['scheduleContent']>(
    async (payload = {}) => executeStep('schedule_content', async () => {
      const current = stateRef.current;
      const taskId = requireId(current.ids, 'taskId', '请先创建经营任务。');
      const contentId = requireId(current.ids, 'contentId', '请先创建内容。');
      requireAbsent(current.ids.scheduleId, '内容排期已经存在。');
      const response = await workflowRequest('schedule_content', {
        runId: current.ids.runId,
        payload: { ...payload, taskId, contentId },
        idempotencyKey: idempotencyKey(current.ids.runId, 'schedule-content'),
      });
      const schedule = entityFromResponse(response, 'schedule');
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, scheduleId: schedule.id },
        statuses: { ...latest.statuses, schedule: schedule.status ?? 'scheduled' },
      }));
    }),
    [executeStep, updateState],
  );

  const createCampaign = useCallback<BusinessWorkflowActions['createCampaign']>(
    async (payload = {}) => executeStep('create_campaign', async () => {
      const current = stateRef.current;
      const taskId = requireId(current.ids, 'taskId', '请先创建经营任务。');
      const contentId = requireId(current.ids, 'contentId', '请先创建内容。');
      requireId(current.ids, 'scheduleId', '请先完成内容排期。');
      requireAbsent(current.ids.campaignId, '活动已经创建。');
      const response = await workflowRequest('create_campaign', {
        runId: current.ids.runId,
        payload: {
          ...payload,
          taskId,
          contentIds: payload.contentIds ?? [contentId],
        },
        idempotencyKey: idempotencyKey(current.ids.runId, 'create-campaign'),
      });
      const campaign = entityFromResponse(response, 'campaign');
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, campaignId: campaign.id },
        statuses: { ...latest.statuses, campaign: campaign.status ?? 'draft' },
      }));
    }),
    [executeStep, updateState],
  );

  const createCustomerAndInquiry = useCallback<BusinessWorkflowActions['createCustomerAndInquiry']>(
    async (customerPayload = {}, inquiryPayload = {}) => executeStep(
      'create_customer_and_inquiry',
      async () => {
        let current = stateRef.current;
        requireId(current.ids, 'campaignId', '请先完成活动创建。');
        requireAbsent(current.ids.inquiryId, '客户询盘已经创建。');

        let customerId = current.ids.customerId;
        if (!customerId) {
          const customerResponse = await workflowRequest('create_customer', {
            runId: current.ids.runId,
            payload: customerPayload,
            idempotencyKey: idempotencyKey(current.ids.runId, 'create-customer'),
          });
          const customer = entityFromResponse(customerResponse, 'customer');
          customerId = customer.id;
          updateState((latest) => ({
            ...latest,
            ids: { ...latest.ids, customerId: customer.id },
            statuses: { ...latest.statuses, customer: customer.status ?? 'new_inquiry' },
          }));
          current = stateRef.current;
        }

        const campaignId = requireId(current.ids, 'campaignId', '请先完成活动创建。');
        const contentId = requireId(current.ids, 'contentId', '请先创建内容。');
        const inquiryResponse = await workflowRequest('create_inquiry', {
          runId: current.ids.runId,
          payload: { ...inquiryPayload, customerId, campaignId, contentId },
          idempotencyKey: idempotencyKey(current.ids.runId, 'create-inquiry'),
        });
        const inquiry = entityFromResponse(inquiryResponse, 'inquiry');
        updateState((latest) => ({
          ...latest,
          ids: { ...latest.ids, inquiryId: inquiry.id },
          statuses: { ...latest.statuses, inquiry: inquiry.status ?? 'open' },
        }));
      },
    ),
    [executeStep, updateState],
  );

  const createQuote = useCallback<BusinessWorkflowActions['createQuote']>(
    async (payload = {}) => executeStep('create_quote', async () => {
      const current = stateRef.current;
      const taskId = requireId(current.ids, 'taskId', '请先创建经营任务。');
      const customerId = requireId(current.ids, 'customerId', '请先创建客户。');
      requireId(current.ids, 'inquiryId', '请先创建并保存询盘。');
      requireAbsent(current.ids.quoteId, '报价已经创建。');
      const response = await workflowRequest('create_quote', {
        runId: current.ids.runId,
        payload: { ...payload, taskId, customerId },
        idempotencyKey: idempotencyKey(current.ids.runId, 'create-quote'),
      });
      const quote = entityFromResponse(response, 'quote');
      updateState((latest) => ({
        ...latest,
        ids: {
          ...latest.ids,
          quoteId: quote.id,
          opportunityId: quote.opportunityId ?? latest.ids.opportunityId,
        },
        statuses: { ...latest.statuses, quote: quote.status ?? 'draft' },
      }));
    }),
    [executeStep, updateState],
  );

  const requestApproval = useCallback<BusinessWorkflowActions['requestApproval']>(
    async (payload = {}) => executeStep('request_approval', async () => {
      const current = stateRef.current;
      const quoteId = requireId(current.ids, 'quoteId', '请先创建报价。');
      requireAbsent(current.ids.approvalId, '报价审批已经发起。');
      const response = await workflowRequest('request_quote_approval', {
        runId: current.ids.runId,
        payload: { ...payload, quoteId },
        idempotencyKey: idempotencyKey(current.ids.runId, 'request-quote-approval'),
      });
      const approval = entityFromResponse(response, 'approval');
      const quote = entityFromResponse(response, 'quote');
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, approvalId: approval.id },
        statuses: {
          ...latest.statuses,
          approval: approval.status ?? 'pending',
          quote: quote.status ?? 'pending_approval',
        },
      }));
    }),
    [executeStep, updateState],
  );

  const decideApproval = useCallback<BusinessWorkflowActions['decideApproval']>(
    async (input) => executeStep('decide_approval', async () => {
      const current = stateRef.current;
      const approvalId = requireId(current.ids, 'approvalId', '请先发起报价审批。');
      if (current.statuses.approval && current.statuses.approval !== 'pending') {
        throw new Error(`审批已经是 ${current.statuses.approval}，不能重复决策。`);
      }
      const response = await workflowRequest('decide_approval', {
        runId: current.ids.runId,
        payload: { approvalId, decision: input.decision, note: input.note },
        idempotencyKey: idempotencyKey(current.ids.runId, `decide-approval-${input.decision}`),
      });
      const approval = entityFromResponse(response, 'approval');
      const resumed = asRecord(asRecord(response)?.resumed);
      const quote = asRecord(resumed?.quote);
      updateState((latest) => ({
        ...latest,
        statuses: {
          ...latest.statuses,
          approval: approval.status ?? input.decision,
          quote: optionalString(quote?.status) ?? input.decision,
        },
      }));
    }),
    [executeStep, updateState],
  );

  const createOrder = useCallback<BusinessWorkflowActions['createOrder']>(
    async (payload = {}) => executeStep('create_order', async () => {
      const current = stateRef.current;
      const quoteId = requireId(current.ids, 'quoteId', '请先创建报价。');
      requireId(current.ids, 'approvalId', '请先完成报价审批。');
      if (current.statuses.approval !== 'approved') {
        throw new Error('只有后端状态为 approved 的审批才能继续创建订单。');
      }
      requireAbsent(current.ids.orderId, '订单已经创建。');
      const response = await workflowRequest('create_order', {
        runId: current.ids.runId,
        payload: { ...payload, quoteId },
        idempotencyKey: idempotencyKey(current.ids.runId, 'create-order'),
      });
      const order = entityFromResponse(response, 'order');
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, orderId: order.id },
        statuses: {
          ...latest.statuses,
          order: order.status ?? 'won',
          quote: 'accepted',
        },
      }));
    }),
    [executeStep, updateState],
  );

  const recordAttribution = useCallback<BusinessWorkflowActions['recordAttribution']>(
    async (payload = {}) => executeStep('record_attribution', async () => {
      const current = stateRef.current;
      const taskId = requireId(current.ids, 'taskId', '缺少经营任务。');
      const customerId = requireId(current.ids, 'customerId', '缺少客户。');
      const orderId = requireId(current.ids, 'orderId', '请先创建订单。');
      requireAbsent(current.ids.attributionId, '收入归因已经记录。');
      const response = await workflowRequest('record_attribution', {
        runId: current.ids.runId,
        payload: {
          ...payload,
          taskId,
          customerId,
          orderId,
          opportunityId: current.ids.opportunityId,
          campaignId: current.ids.campaignId,
          contentId: current.ids.contentId,
          sourceId: payload.sourceId ?? orderId,
          eventType: payload.eventType ?? 'order_won',
          sourceType: payload.sourceType ?? 'campaign',
        },
        idempotencyKey: idempotencyKey(current.ids.runId, 'record-attribution'),
      });
      const attribution = entityFromResponse(response, 'attribution');
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, attributionId: attribution.id },
        statuses: { ...latest.statuses, attribution: attribution.status ?? 'recorded' },
      }));
    }),
    [executeStep, updateState],
  );

  const refresh = useCallback<BusinessWorkflowActions['refresh']>(
    async () => executeStep('refresh', async () => {
      const current = stateRef.current;
      const response = asRecord(await getWorkflowRun(current.ids.runId)) ?? {};
      const run = asRecord(response.run) ?? {};
      const chain = asRecord(response.chain) ?? {};
      const quoteStatus = optionalString(chain.quoteStatus);
      const approvalStatus = optionalString(chain.approvalStatus);
      const orderId = optionalString(chain.orderId);
      updateState((latest) => ({
        ...latest,
        ids: { ...latest.ids, orderId: orderId ?? latest.ids.orderId },
        statuses: {
          ...latest.statuses,
          quote: quoteStatus ?? latest.statuses.quote,
          approval: approvalStatus ?? latest.statuses.approval,
          order: orderId ? latest.statuses.order ?? 'won' : latest.statuses.order,
        },
        evidence: {
          runStatus: optionalString(run.status),
          counts: parseCounts(response.counts),
          chain: { orderId, quoteStatus, approvalStatus },
          verifiedAt: new Date().toISOString(),
        },
      }));
    }),
    [executeStep, updateState],
  );

  const actions = useMemo<BusinessWorkflowActions>(() => ({
    attachOnboardingTask,
    createTask,
    createContent,
    scheduleContent,
    createCampaign,
    createCustomerAndInquiry,
    createQuote,
    requestApproval,
    decideApproval,
    createOrder,
    recordAttribution,
    refresh,
  }), [
    attachOnboardingTask,
    createTask,
    createContent,
    scheduleContent,
    createCampaign,
    createCustomerAndInquiry,
    createQuote,
    requestApproval,
    decideApproval,
    createOrder,
    recordAttribution,
    refresh,
  ]);

  const value = useMemo<BusinessWorkflowContextValue>(() => ({ state, actions }), [actions, state]);

  return <BusinessWorkflowContext.Provider value={value}>{children}</BusinessWorkflowContext.Provider>;
}

export function useBusinessWorkflow(): BusinessWorkflowContextValue {
  const context = useContext(BusinessWorkflowContext);
  if (!context) throw new Error('useBusinessWorkflow must be used within BusinessWorkflowProvider');
  return context;
}

interface WorkflowStatusStripProps {
  className?: string;
  title?: string;
}

function readableStatus(status: string | undefined): string {
  if (!status) return '状态待刷新';
  const translated = STATUS_LABELS[status];
  return translated ? `${translated} · ${status}` : status;
}

export function WorkflowStatusStrip({
  className,
  title = '真实经营链状态',
}: WorkflowStatusStripProps) {
  const { state } = useBusinessWorkflow();
  const countSummary = Object.entries(state.evidence.counts)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${name} ${count}`)
    .join(' · ');

  return <section className={className} style={stripStyle} aria-live="polite">
    <div style={stripHeaderStyle}>
      <div>
        <strong>{title}</strong>
        <div style={runStyle}>
          Run <code>{state.ids.runId || '初始化中'}</code>
          {' · '}{readableStatus(state.evidence.runStatus)}
        </div>
      </div>
      <span style={verificationStyle}>
        {state.evidence.verifiedAt
          ? `后端校验 ${new Date(state.evidence.verifiedAt).toLocaleString('zh-CN')}`
          : '尚未执行后端刷新'}
      </span>
    </div>

    {state.pending && <div role="status" style={pendingStyle}>
      {STEP_LABELS[state.pending]}处理中…
    </div>}
    {state.error && <div role="alert" style={errorStyle}>
      {STEP_LABELS[state.error.step]}失败：{state.error.message}
    </div>}

    <div style={resourceGridStyle}>
      {RESOURCE_ROWS.map(({ idKey, statusKey, label }) => {
        const id = state.ids[idKey];
        return <div key={idKey} style={resourceStyle}>
          <span style={resourceLabelStyle}>{label}</span>
          <strong>{id ? readableStatus(state.statuses[statusKey]) : '待创建'}</strong>
          <code title={id} style={resourceIdStyle}>{id ?? '—'}</code>
        </div>;
      })}
    </div>

    {state.ids.opportunityId && <div style={secondaryEvidenceStyle}>
      商机 ID：<code>{state.ids.opportunityId}</code>
    </div>}
    {countSummary && <div style={secondaryEvidenceStyle}>后端运行计数：{countSummary}</div>}
  </section>;
}

const stripStyle: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.35)',
  borderRadius: 14,
  background: 'rgba(15, 23, 42, 0.92)',
  color: '#e2e8f0',
  padding: 16,
  display: 'grid',
  gap: 12,
};

const stripHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
};

const runStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  marginTop: 4,
  overflowWrap: 'anywhere',
};

const verificationStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
};

const pendingStyle: CSSProperties = {
  color: '#fde68a',
  background: 'rgba(245, 158, 11, 0.12)',
  borderRadius: 8,
  padding: '8px 10px',
};

const errorStyle: CSSProperties = {
  color: '#fecaca',
  background: 'rgba(239, 68, 68, 0.12)',
  borderRadius: 8,
  padding: '8px 10px',
};

const resourceGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 8,
};

const resourceStyle: CSSProperties = {
  minWidth: 0,
  borderRadius: 9,
  background: 'rgba(30, 41, 59, 0.8)',
  padding: 10,
  display: 'grid',
  gap: 3,
};

const resourceLabelStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 11,
};

const resourceIdStyle: CSSProperties = {
  color: '#7dd3fc',
  fontSize: 10,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const secondaryEvidenceStyle: CSSProperties = {
  color: '#cbd5e1',
  fontSize: 12,
  overflowWrap: 'anywhere',
};
