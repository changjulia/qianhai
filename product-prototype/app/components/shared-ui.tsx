'use client';

export function Metric({ label, value, change, warn }: { label: string; value: string; change?: string; warn?: boolean }) {
  return <article className="stat-card"><div><span>{label}</span><b>{value}</b></div>{change && <em className={warn ? 'metric-warn' : ''}>{change}</em>}</article>;
}

export function PageHeader({ title, desc, action, secondary, onAction, onSecondary }: { title: string; desc: string; action?: string; secondary?: string; onAction?: () => void; onSecondary?: () => void }) {
  return <div className="page-heading"><div><p className="eyebrow">黔海 · {title}</p><h1>{title}</h1><p>{desc}</p></div><div className="header-actions">{secondary && <button className="secondary" onClick={onSecondary}>{secondary}</button>}{action && <button className="primary" onClick={onAction}>＋ {action}</button>}</div></div>;
}

export function Tabs({ items, active, setActive }: { items: string[]; active: string; setActive: (value: string) => void }) {
  return <div className="tabs">{items.map(item => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>)}</div>;
}
