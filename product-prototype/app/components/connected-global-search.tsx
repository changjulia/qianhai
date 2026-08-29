'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BusinessApiError,
  searchBusiness,
  type BusinessSearchResponse,
  type BusinessSearchResult,
} from '../../lib/business-api-client';

export interface ConnectedGlobalSearchProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  scope?: string;
  onSelectResult?: (result: BusinessSearchResult) => void;
}

export function ConnectedGlobalSearch({
  open,
  onClose,
  initialQuery = '',
  scope,
  onSelectResult,
}: ConnectedGlobalSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<BusinessSearchResponse | null>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      setError('请输入要查找的项目、内容或客户。');
      return;
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setSearching(true);
    setError('');
    setResult(null);
    try {
      setResult(await searchBusiness(normalized, { scope, signal: controller.signal }));
    } catch (cause) {
      if (!isAbort(cause)) setError(messageFor(cause));
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setSearching(false);
      }
    }
  };

  const close = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setSearching(false);
    onClose();
  };

  if (!open) return null;

  const seededOnly = result?.mode === 'seeded_data' || result?.capabilities.seededDataOnly;
  const unsupported = result?.status === 'unsupported' || result?.supported === false;

  return <div className="action-dialog-backdrop" role="presentation" onMouseDown={close}>
    <section className="action-dialog" role="dialog" aria-modal="true" aria-label="全局业务搜索" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>黔海工作台</span><h2>全局搜索</h2><p>搜索能力以服务端返回的真实状态为准。</p></div><button type="button" onClick={close} aria-label="关闭搜索">×</button></header>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label><span>搜索项目、内容或客户</span><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setError(''); }} placeholder="输入关键词" maxLength={300} /></label>
        <button className="onboarding-primary" type="submit" disabled={searching}>{searching ? '正在检查搜索能力…' : '搜索'}</button>
      </form>

      {error && <p className="auth-error" role="alert">{error}</p>}

      {result && <div aria-live="polite">
        {unsupported ? <section className="auth-error">
          <strong>未启用服务端或联网搜索</strong>
          <p>{result.message}</p>
          <small>当前模式：{seededOnly ? '仅限已加载的种子数据' : result.mode}；{result.networkAttempted ? '服务端报告曾尝试网络请求' : '本次未发起联网检索'}。</small>
        </section> : <section>
          <strong>{seededOnly ? '已加载数据结果（非联网）' : '搜索结果'}</strong>
          <p>{result.message}</p>
        </section>}

        {!unsupported && result.results.length === 0 && <p>没有找到匹配的已授权记录。</p>}
        {result.results.length > 0 && <div className="data-table">
          {result.results.map((item) => <article className="tr" key={item.id}>
            <span className="strong-cell"><strong>{item.title}</strong><small>{item.type ?? '业务记录'}</small></span>
            <span>{item.snippet ?? '无摘要'}</span>
            <span>{item.seeded || seededOnly ? '种子／已加载数据' : '服务端索引'}</span>
            <span>{item.sourceUrl
              ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel ?? '查看来源'}</a>
              : item.sourceLabel ?? '无外部来源'}</span>
            {onSelectResult && <span><button type="button" onClick={() => onSelectResult(item)}>打开</button></span>}
          </article>)}
        </div>}
        {result.requestId && <small>请求 ID：{result.requestId}</small>}
      </div>}

      <footer><button type="button" onClick={close}>关闭</button></footer>
    </section>
  </div>;
}

function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError';
}

function messageFor(cause: unknown): string {
  if (cause instanceof BusinessApiError) {
    return `${cause.message}${cause.requestId ? `（请求 ${cause.requestId}）` : ''}`;
  }
  return cause instanceof Error ? cause.message : '搜索请求失败，请稍后重试。';
}
