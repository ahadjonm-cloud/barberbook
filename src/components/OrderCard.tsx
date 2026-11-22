import type { ReactNode } from 'react';
import type { Order } from '../types';
import { fmtDateTime, money, STATUS_LABEL } from '../lib/format';

interface Props {
  order: Order;
  /** Which amount to emphasise: what the customer pays, or what the worker receives. */
  view: 'customer' | 'worker' | 'admin';
  children?: ReactNode;
}

export default function OrderCard({ order: o, view, children }: Props) {
  return (
    <article className="card order">
      <div className="row between wrap">
        <span className="pill">{o.category?.icon} {o.category?.name ?? 'Boshqa'}</span>
        <span className={`status ${o.status}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      <h3>{o.title}</h3>
      {o.description && <p className="muted desc">{o.description}</p>}
      <dl className="facts">
        <div><dt>Vaqt</dt><dd>{fmtDateTime(o.starts_at)} · {Number(o.duration_hours)} soat</dd></div>
        <div><dt>Joy</dt><dd>{[o.city, o.address].filter(Boolean).join(', ')}</dd></div>
        <div>
          <dt>Buyurtmachi</dt>
          <dd>{o.customer_type === 'organization' ? `🏢 ${o.org_name ?? 'Tashkilot'}` : '👤 Jismoniy shaxs'}</dd>
        </div>
      </dl>
      <div className="money-row">
        {view === 'worker' ? (
          <>
            <div><small className="muted">Siz olasiz</small><strong className="price">{money(o.worker_payout, o.currency)}</strong></div>
            <small className="muted">Narx {money(o.price, o.currency)} − {Number(o.commission_percent)}% xizmat haqi</small>
          </>
        ) : view === 'admin' ? (
          <>
            <div><small className="muted">Narx</small><strong>{money(o.price, o.currency)}</strong></div>
            <div><small className="muted">Platforma ({Number(o.commission_percent)}%)</small><strong className="price">{money(o.platform_fee, o.currency)}</strong></div>
          </>
        ) : (
          <>
            <div><small className="muted">Narx</small><strong className="price">{money(o.price, o.currency)}</strong></div>
            <small className="muted">Ishchi oladi: {money(o.worker_payout, o.currency)}</small>
          </>
        )}
      </div>
      {children && <div className="row wrap actions">{children}</div>}
    </article>
  );
}

export const ORDER_SELECT = '*, category:categories(name, icon)';
