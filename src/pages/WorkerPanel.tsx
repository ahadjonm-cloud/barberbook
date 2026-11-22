import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorText, money } from '../lib/format';
import type { Order, Worker } from '../types';
import OrderCard, { ORDER_SELECT } from '../components/OrderCard';

type Tab = 'open' | 'mine' | 'earnings' | 'profile';

export default function WorkerPanel() {
  const { worker } = useAuth();
  const [tab, setTab] = useState<Tab>('open');

  if (!worker) {
    return (
      <div className="narrow">
        <h1>Ishchi bo'lib ishlang</h1>
        <p className="muted">
          Ro'yxatdan o'ting va odamlar hamda tashkilotlarning buyurtmalarini qabul qiling.
          Har bir bajarilgan ish uchun buyurtma narxining katta qismini olasiz.
        </p>
        <WorkerForm />
      </div>
    );
  }

  return (
    <>
      <div className="row between wrap">
        <h1>Ishchi paneli</h1>
        {!worker.active && <span className="status cancelled">Profilingiz yashirilgan</span>}
      </div>
      <div className="tabs">
        {([['open', 'Yangi buyurtmalar'], ['mine', 'Mening ishlarim'], ['earnings', 'Daromad'], ['profile', 'Profil']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} className={`tab ${tab === t ? 'selected' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>
      {tab === 'open' && <OpenOrders worker={worker} onAccepted={() => setTab('mine')} />}
      {tab === 'mine' && <MyJobs />}
      {tab === 'earnings' && <Earnings />}
      {tab === 'profile' && <WorkerForm />}
    </>
  );
}

/* ------------------------------ Open orders ------------------------------ */

function OpenOrders({ worker, onAccepted }: { worker: Worker; onAccepted: () => void }) {
  const { session, categories } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [onlyMine, setOnlyMine] = useState(worker.category_ids.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('orders').select(ORDER_SELECT)
      .eq('status', 'open').gt('starts_at', new Date().toISOString())
      .neq('customer_id', session!.user.id)
      .order('starts_at');
    if (error) setError(errorText(error));
    setOrders((data as Order[]) ?? []);
  };

  useEffect(() => {
    load();
    // New orders appear (and taken ones disappear) without reloading the page.
    const ch = supabase.channel('open-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    // Realtime doesn't report orders that stop being visible (taken by another worker), so also poll.
    const timer = setInterval(load, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => (orders ?? []).filter((o) =>
    !onlyMine || !o.category_id || worker.category_ids.includes(o.category_id)), [orders, onlyMine, worker.category_ids]);

  const accept = async (id: string) => {
    setBusyId(id); setError(null);
    const { error } = await supabase.rpc('accept_order', { p_order_id: id });
    setBusyId(null);
    if (error) { setError(errorText(error)); load(); }
    else onAccepted();
  };

  const myCats = categories.filter((c) => worker.category_ids.includes(c.id)).map((c) => c.name).join(', ');

  return (
    <>
      {worker.category_ids.length > 0 && (
        <label className="check">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          Faqat mening yo'nalishlarim ({myCats})
        </label>
      )}
      {error && <div className="alert error">{error}</div>}
      {orders === null && <p className="muted">Yuklanmoqda…</p>}
      {orders && shown.length === 0 && <div className="card center muted">Hozircha yangi buyurtmalar yo'q. Yangilari shu yerda avtomatik paydo bo'ladi.</div>}
      <div className="grid wide">
        {shown.map((o) => (
          <OrderCard key={o.id} order={o} view="worker">
            <button className="btn btn-primary" disabled={busyId === o.id} onClick={() => accept(o.id)}>
              {busyId === o.id ? 'Qabul qilinmoqda…' : 'Qabul qilish'}
            </button>
          </OrderCard>
        ))}
      </div>
    </>
  );
}

/* -------------------------------- My jobs -------------------------------- */

const JOBS_SELECT = `${ORDER_SELECT}, customer:profiles!orders_customer_id_fkey(full_name, phone)`;

function useMyJobs() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    const { data, error } = await supabase.from('orders').select(JOBS_SELECT)
      .eq('worker_id', session!.user.id).order('starts_at', { ascending: false });
    if (error) setError(errorText(error));
    setJobs((data as Order[]) ?? []);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { jobs, error, setError, load };
}

function MyJobs() {
  const { jobs, error, setError, load } = useMyJobs();

  const act = async (fn: 'complete_order' | 'release_order', id: string, confirmText: string) => {
    if (!confirm(confirmText)) return;
    setError(null);
    const { error } = await supabase.rpc(fn, { p_order_id: id });
    if (error) setError(errorText(error));
    load();
  };

  const active = (jobs ?? []).filter((o) => o.status === 'accepted');
  const past = (jobs ?? []).filter((o) => o.status !== 'accepted');

  return (
    <>
      {error && <div className="alert error">{error}</div>}
      {jobs === null && <p className="muted">Yuklanmoqda…</p>}
      {jobs?.length === 0 && <div className="card center muted">Hali buyurtma qabul qilmagansiz.</div>}
      {active.length > 0 && <h2>Bajarilishi kerak</h2>}
      <div className="grid wide">
        {active.map((o) => (
          <OrderCard key={o.id} order={o} view="worker">
            <div className="contact">
              Buyurtmachi: <strong>{o.customer?.full_name || 'Mijoz'}</strong> · <a href={`tel:${o.contact_phone}`}>{o.contact_phone}</a>
            </div>
            <button className="btn btn-primary" onClick={() => act('complete_order', o.id, 'Ishni bajardingizmi?')}>Bajarildi</button>
            <button className="btn" onClick={() => act('release_order', o.id, 'Buyurtmani qaytarasizmi? U boshqa ishchilarga yana ko\'rinadi.')}>Qaytarish</button>
          </OrderCard>
        ))}
      </div>
      {past.length > 0 && <h2>Tarix</h2>}
      <div className="grid wide">
        {past.map((o) => <OrderCard key={o.id} order={o} view="worker" />)}
      </div>
    </>
  );
}

/* -------------------------------- Earnings ------------------------------- */

function Earnings() {
  const { settings } = useAuth();
  const { jobs } = useMyJobs();
  if (!jobs) return <p className="muted">Yuklanmoqda…</p>;

  const done = jobs.filter((o) => o.status === 'completed');
  const pending = jobs.filter((o) => o.status === 'accepted');
  const sum = (list: Order[], k: 'price' | 'worker_payout' | 'platform_fee') => list.reduce((s, o) => s + Number(o[k]), 0);
  const cur = settings.currency;

  return (
    <>
      <div className="grid stats">
        <div className="card stat"><small className="muted">Ishlab topilgan</small><strong className="price">{money(sum(done, 'worker_payout'), cur)}</strong><small className="muted">{done.length} ta bajarilgan ish</small></div>
        <div className="card stat"><small className="muted">Kutilmoqda</small><strong>{money(sum(pending, 'worker_payout'), cur)}</strong><small className="muted">{pending.length} ta faol ish</small></div>
        <div className="card stat"><small className="muted">Platforma xizmat haqi</small><strong>{money(sum(done, 'platform_fee'), cur)}</strong><small className="muted">Bajarilgan ishlar narxidan {settings.commission_percent}%</small></div>
      </div>
      <p className="muted small">To'lovlar hozircha sayt orqali o'tkazilmaydi: pulni buyurtmachi bilan to'g'ridan-to'g'ri hal qilasiz.</p>
    </>
  );
}

/* ----------------------------- Register / edit ---------------------------- */

function WorkerForm() {
  const { session, profile, worker, categories, settings, refreshProfile } = useAuth();
  const [name, setName] = useState(worker?.display_name ?? profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [city, setCity] = useState(worker?.city ?? '');
  const [bio, setBio] = useState(worker?.bio ?? '');
  const [cats, setCats] = useState<string[]>(worker?.category_ids ?? []);
  const [rate, setRate] = useState(worker?.hourly_rate != null ? String(worker.hourly_rate) : '');
  const [active, setActive] = useState(worker?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSaved(false);
    if (cats.length === 0) { setError('Kamida bitta yo\'nalishni tanlang'); return; }
    setBusy(true);
    const payload = {
      display_name: name.trim(),
      city: city.trim() || null,
      bio: bio.trim() || null,
      category_ids: cats,
      hourly_rate: rate ? Number(rate) : null,
      active,
    };
    const res = worker
      ? await supabase.from('workers').update(payload).eq('profile_id', session!.user.id)
      : await supabase.from('workers').insert({ ...payload, profile_id: session!.user.id });
    // Customers see this phone once the worker accepts their order.
    const p = !res.error && profile && (profile.phone !== (phone.trim() || null) || profile.full_name !== name.trim())
      ? await supabase.from('profiles').update({ phone: phone.trim() || null, full_name: name.trim() }).eq('id', profile.id)
      : null;
    setBusy(false);
    const err = res.error ?? p?.error;
    if (err) { setError(errorText(err)); return; }
    setSaved(true);
    await refreshProfile();
  };

  return (
    <form onSubmit={submit} className="form card narrow-card">
      <div className="row">
        <label>Ism familiya<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Telefon<input type="tel" required placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      </div>
      <div className="row">
        <label>Shahar<input placeholder="Toshkent" value={city} onChange={(e) => setCity(e.target.value)} /></label>
        <label>Soatlik narx (ixtiyoriy, {settings.currency === 'UZS' ? "so'm" : settings.currency})<input type="number" min="0" step="1000" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
      </div>
      <fieldset>
        <legend>Qaysi ishlarni bajarasiz?</legend>
        <div className="chips">
          {categories.filter((c) => c.active).map((c) => (
            <button type="button" key={c.id} className={`chip ${cats.includes(c.id) ? 'selected' : ''}`} onClick={() => toggle(c.id)}>{c.icon} {c.name}</button>
          ))}
        </div>
      </fieldset>
      <label>O'zingiz haqingizda<textarea rows={3} placeholder="Tajribangiz, asboblaringiz, qachon bo'shsiz…" value={bio} onChange={(e) => setBio(e.target.value)} /></label>
      {worker && (
        <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ishchilar ro'yxatida ko'rinish va buyurtma olish</label>
      )}
      <p className="muted small">Har bir bajarilgan buyurtmadan {settings.commission_percent}% platforma xizmat haqi olinadi, qolgan {100 - settings.commission_percent}% sizniki.</p>
      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert success">Saqlandi.</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : worker ? 'Saqlash' : 'Ishchi sifatida ro\'yxatdan o\'tish'}</button>
    </form>
  );
}
