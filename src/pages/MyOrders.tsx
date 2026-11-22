import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/format';
import type { Order } from '../types';
import OrderCard, { ORDER_SELECT } from '../components/OrderCard';

const SELECT = `${ORDER_SELECT}, worker:profiles!orders_worker_id_fkey(full_name, phone)`;

export default function MyOrders() {
  const { session } = useAuth();
  const location = useLocation();
  const created = (location.state as { created?: boolean } | null)?.created;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('orders').select(SELECT)
      .eq('customer_id', session!.user.id).order('created_at', { ascending: false });
    if (error) setError(errorText(error));
    setOrders((data as Order[]) ?? []);
  };

  useEffect(() => {
    load();
    // Refresh when a worker accepts or finishes one of my orders.
    const ch = supabase.channel('my-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${session!.user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: 'cancel_order' | 'complete_order', id: string, confirmText: string) => {
    if (!confirm(confirmText)) return;
    setError(null);
    const { error } = await supabase.rpc(fn, { p_order_id: id });
    if (error) setError(errorText(error));
    load();
  };

  const active = (orders ?? []).filter((o) => o.status === 'open' || o.status === 'accepted');
  const past = (orders ?? []).filter((o) => o.status === 'completed' || o.status === 'cancelled');

  return (
    <>
      <div className="row between wrap">
        <h1>Buyurtmalarim</h1>
        <Link to="/order/new" className="btn btn-primary">+ Yangi buyurtma</Link>
      </div>
      {created && <div className="alert success">Buyurtma joylandi! Ishchi qabul qilishi bilan bu yerda ko'rinadi.</div>}
      {error && <div className="alert error">{error}</div>}
      {orders === null && <p className="muted">Yuklanmoqda…</p>}
      {orders?.length === 0 && <div className="card center muted">Hali buyurtma bermagansiz.</div>}

      {active.length > 0 && <h2>Faol</h2>}
      <div className="grid wide">
        {active.map((o) => (
          <OrderCard key={o.id} order={o} view="customer">
            {o.status === 'accepted' && (
              <div className="contact">
                Ishchi: <strong>{o.worker?.full_name || 'Ishchi'}</strong>
                {o.worker?.phone && <> · <a href={`tel:${o.worker.phone}`}>{o.worker.phone}</a></>}
              </div>
            )}
            {o.status === 'accepted' && (
              <button className="btn btn-primary" onClick={() => act('complete_order', o.id, 'Ish bajarildimi?')}>Bajarildi</button>
            )}
            <button className="btn btn-danger" onClick={() => act('cancel_order', o.id, 'Buyurtmani bekor qilasizmi?')}>Bekor qilish</button>
          </OrderCard>
        ))}
      </div>

      {past.length > 0 && <h2>Tarix</h2>}
      <div className="grid wide">
        {past.map((o) => (
          <OrderCard key={o.id} order={o} view="customer">
            {o.status === 'completed' && o.worker?.full_name && <div className="contact">Ishchi: {o.worker.full_name}</div>}
          </OrderCard>
        ))}
      </div>
    </>
  );
}
