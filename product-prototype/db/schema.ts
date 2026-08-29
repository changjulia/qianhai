export const DEMO_SCHEMA_VERSION = 14;

export const DEMO_TABLES = [
  'dataset_manifest', 'enterprises', 'products', 'enterprise_documents',
  'business_rules', 'industry_facts', 'buyer_personas', 'assets',
  'inspirations', 'growth_tasks', 'task_actions', 'approvals', 'contents',
  'content_schedule', 'ad_campaigns', 'customers', 'conversations',
  'messages', 'opportunities', 'orders', 'attribution_events', 'roles',
  'quotes', 'quote_lines', 'order_lines', 'business_state_history', 'business_outbox',
  'workflow_runs', 'workflow_run_resources', 'idempotency_keys',
  'organization_members', 'integrations', 'data_sources', 'sync_runs',
  'security_audit_events', 'organizations', 'app_users',
  'app_user_credentials',
  'organization_user_memberships', 'durable_task_states', 'knowledge_records',
  'ui_actions', 'integration_credentials_metadata', 'security_policies',
  'organization_security_policies',
  'tea_industry_catalog',
] as const;

export type DemoTable = (typeof DEMO_TABLES)[number];

export type DemoClassification = 'public' | 'inference' | 'mock';

export interface DemoDatasetSummary {
  dataset: Record<string, unknown> | null;
  counts: Record<string, number>;
  pipelineCny: number;
  demoRevenueCny: number;
}

export const JSON_COLUMNS = {
  enterprises: ['export_markets_json', 'contact_json'],
  products: ['applications_json', 'package_options_json', 'compliance_json'],
  enterprise_documents: ['metadata_json'],
  business_rules: ['condition_json'],
  industry_facts: ['page_uses_json'],
  buyer_personas: ['needs_json', 'objections_json', 'qualification_json', 'preferred_channels_json', 'languages_json'],
  assets: ['target_markets_json', 'target_personas_json', 'channels_json', 'tags_json'],
  growth_tasks: ['product_ids_json', 'target_segments_json', 'languages_json', 'channels_json', 'goals_json'],
  task_actions: ['input_refs_json', 'result_json'],
  approvals: ['payload_json'],
  contents: ['evidence_refs_json', 'asset_refs_json'],
  content_schedule: ['metrics_json'],
  ad_campaigns: ['cities_json', 'segments_json', 'job_titles_json', 'content_ids_json', 'metrics_json'],
  customers: ['interested_products_json', 'requirements_json', 'pain_points_json'],
  messages: ['attachment_refs_json', 'knowledge_refs_json'],
  opportunities: ['product_ids_json'],
  quotes: ['customer_snapshot_json', 'terms_json'],
  quote_lines: ['metadata_json'],
  attribution_events: ['metadata_json'],
  roles: ['permissions_json'],
  integrations: ['scopes_json'],
  sync_runs: ['details_json'],
  security_audit_events: ['details_json'],
  organizations: ['settings_json'],
  app_users: ['profile_json'],
  organization_user_memberships: ['permissions_json'],
  durable_task_states: ['state_json'],
  knowledge_records: ['tags_json', 'metadata_json'],
  ui_actions: ['payload_json', 'result_json'],
  integration_credentials_metadata: ['scopes_json', 'metadata_json'],
  security_policies: ['config_json'],
  organization_security_policies: ['rules_json'],
  tea_industry_catalog: ['metadata_json'],
  business_state_history: ['before_json', 'after_json'],
  business_outbox: ['payload_json'],
  workflow_runs: ['input_json', 'result_json', 'error_json'],
  idempotency_keys: ['response_json', 'error_json'],
} as const satisfies Partial<Record<DemoTable, readonly string[]>>;

export type JsonColumnTable = keyof typeof JSON_COLUMNS;
