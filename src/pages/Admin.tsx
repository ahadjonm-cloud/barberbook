import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorText, fmtDateTime, money, STATUS_LABEL } from '../lib/format';
import type { Category, Order } from '../types';
import { ORDER_SELECT } from '../components/OrderCard';

type Tab = 'overview' | 'categories' | 'settings';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <>
      <h1>Admin</h1>
      <div className="tabs">
        {([['overview', 'Umumiy'], ['categories', 'Xizmat turlari'], ['settings', 'Sozlamalar']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} className={`tab ${tab === t ? 'selected' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'categories' && <Categories />}
      {tab === 'settings' && <Settings />}
    </>
  );
}

function Overview() {
  const { settings } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [workerCount, setWorkerCount] = useState(0);

  useEffect(() => {
    supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(1000)
      .then(({ data }) => setOrders((data as Order[]) ?? []));
    supabase.from('workers').select('profile_id', { count: 'exact', head: true })
      .then(({ count }) => setWorkerCount(count ?? 0));
  }, []);

  if (!orders) return <p className="muted">Yuklanmoqda…</p>;
  const done = orders.filter((o) => o.status === 'completed');
  const cur = settings.currency;
  const total = (k: 'price' | 'platform_fee') => done.reduce((s, o) => s + Number(o[k]), 0);

  return (
    <>
      <div className="grid stats">
        <div className="card stat"><small className="muted">Platforma daromadi</small><strong className="price">{money(total('platform_fee'), cur)}</strong><small className="muted">bajarilgan ishlardan</small></div>
        <div className="card stat"><small className="muted">Bajarilgan ishlar summasi</small><strong>{money(total('price'), cur)}</strong><small className="muted">{done.length} ta buyurtma</small></div>
        <div className="card stat"><small className="muted">Ochiq / faol</small><strong>{orders.filter((o) => o.status === 'open').length} / {orders.filter((o) => o.status === 'accepted').length}</strong><small className="muted">buyurtmalar</small></div>
        <div className="card stat"><small className="muted">Ishchilar</small><strong>{workerCount}</strong><small className="muted">ro'yxatdan o'tgan</small></div>
      </div>
      <h2>So'nggi buyurtmalar</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Vaqt</th><th>Buyurtma</th><th>Narx</th><th>Platforma</th><th>Holat</th></tr></thead>
          <tbody>
            {orders.slice(0, 50).map((o) => (
              <tr key={o.id}>
                <td>{fmtDateTime(o.starts_at)}</td>
                <td>{o.category?.icon} {o.title}<div className="muted small">{o.customer_type === 'organization' ? o.org_name : 'Jismoniy shaxs'}</div></td>
                <td>{money(o.price, o.currency)}</td>
                <td className="price">{money(o.platform_fee, o.currency)}</td>
                <td><span className={`status ${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="muted center">Hali buyurtmalar yo'q.</p>}
      </div>
    </>
  );
}

function Categories() {
  const { categories, refreshCategories } = useAuth();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const payload = { name: editing.name?.trim(), icon: editing.icon || null, sort: Number(editing.sort) || 0, active: editing.active ?? true };
    const { error } = editing.id
      ? await supabase.from('categories').update(payload).eq('id', editing.id)
      : await supabase.from('categories').insert(payload);
    if (error) { setError(errorText(error)); return; }
    setEditing(null); setError(null);
    refreshCategories();
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setEditing({ name: '', icon: '', sort: 500, active: true })}>+ Yangi xizmat turi</button>
      {editing && (
        <form onSubmit={save} className="form card" style={{ marginTop: 16 }}>
          <div className="row">
            <label style={{ flex: '0 0 90px' }}>Belgi<input value={editing.icon ?? ''} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></label>
            <label>Nomi<input required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
            <label style={{ flex: '0 0 110px' }}>Tartib<input type="number" value={editing.sort ?? 0} onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Faol</label>
          {error && <div className="alert error">{error}</div>}
          <div className="row"><button className="btn btn-primary">Saqlash</button><button type="button" className="btn" onClick={() => setEditing(null)}>Bekor</button></div>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nomi</th><th>Tartib</th><th>Holat</th><th /></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className={c.active ? '' : 'dim'}>
                <td>{c.icon} {c.name}</td><td>{c.sort}</td><td>{c.active ? 'Faol' : "O'chirilgan"}</td>
                <td><button className="btn" onClick={() => setEditing(c)}>Tahrirlash</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Settings() {
  const { settings, refreshSettings } = useAuth();
  const [form, setForm] = useState(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('platform_settings').update({
      name: form.name.trim(),
      currency: form.currency.trim().toUpperCase(),
      commission_percent: Number(form.commission_percent),
      support_phone: form.support_phone?.trim() || null,
    }).eq('id', 1);
    setMsg(error ? { ok: false, text: errorText(error) } : { ok: true, text: 'Saqlandi.' });
    if (!error) refreshSettings();
  };

  return (
    <form onSubmit={save} className="form card narrow-card">
      <label>Sayt nomi<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <div className="row">
        <label>Valyuta<input required maxLength={3} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></label>
        <label>Platforma ulushi (%)<input type="number" min="0" max="50" step="0.5" required value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: Number(e.target.value) })} /></label>
      </div>
      <label>Qo'llab-quvvatlash telefoni<input value={form.support_phone ?? ''} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} /></label>
      <p className="muted small">Ulush o'zgarishi faqat yangi buyurtmalarga ta'sir qiladi. Eski buyurtmalar o'z foizini saqlaydi.</p>
      {msg && <div className={`alert ${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
      <button className="btn btn-primary">Saqlash</button>
    </form>
  );
}
