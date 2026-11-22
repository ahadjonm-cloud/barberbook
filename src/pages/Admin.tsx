import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { money, WEEKDAYS } from '../lib/format';
import type { Barber, Profile, Role, Service, ShopSettings, WorkingHour } from '../types';

type Tab = 'services' | 'barbers' | 'users' | 'settings';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('services');
  return (
    <div>
      <h1>Admin</h1>
      <div className="tabs">
        {(['services', 'barbers', 'users', 'settings'] as Tab[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'selected' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'services' && <ServicesAdmin />}
      {tab === 'barbers' && <BarbersAdmin />}
      {tab === 'users' && <UsersAdmin />}
      {tab === 'settings' && <SettingsAdmin />}
    </div>
  );
}

/* ------------------------------ Services ------------------------------ */

const emptyService = { name: '', description: '', duration_min: 30, price_cents: 0, active: true };

function ServicesAdmin() {
  const { settings } = useAuth();
  const [items, setItems] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('services').select('*').order('name');
    setItems((data as Service[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    setError(null);
    const { id, ...fields } = editing;
    const payload = {
      name: fields.name, description: fields.description || null,
      duration_min: Number(fields.duration_min), price_cents: Number(fields.price_cents), active: fields.active,
    };
    const { error } = id
      ? await supabase.from('services').update(payload).eq('id', id)
      : await supabase.from('services').insert(payload);
    if (error) return setError(error.message);
    setEditing(null);
    load();
  };

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      <button className="btn btn-primary" onClick={() => setEditing({ ...emptyService })}>+ New service</button>
      {editing && (
        <div className="card form">
          <label>Name<input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label>Description<input value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
          <div className="row">
            <label>Duration (min)<input type="number" min={5} step={5} value={editing.duration_min} onChange={(e) => setEditing({ ...editing, duration_min: Number(e.target.value) })} /></label>
            <label>Price<input type="number" min={0} step={0.5} value={(editing.price_cents ?? 0) / 100} onChange={(e) => setEditing({ ...editing, price_cents: Math.round(Number(e.target.value) * 100) })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
          <div className="row">
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Duration</th><th>Price</th><th>Active</th><th /></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className={s.active ? '' : 'dim'}>
                <td>{s.name}<div className="muted small">{s.description}</div></td>
                <td>{s.duration_min} min</td>
                <td>{money(s.price_cents, settings?.currency)}</td>
                <td>{s.active ? 'Yes' : 'No'}</td>
                <td><button className="btn" onClick={() => setEditing(s)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ Barbers ------------------------------ */

type DayHours = { enabled: boolean; start: string; end: string };

function BarbersAdmin() {
  const [items, setItems] = useState<Barber[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [editing, setEditing] = useState<Partial<Barber> | null>(null);
  const [hours, setHours] = useState<DayHours[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('barbers').select('*').order('name'),
      supabase.from('profiles').select('*').in('role', ['barber', 'admin']).order('full_name'),
    ]);
    setItems((b as Barber[]) ?? []);
    setStaff((p as Profile[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const startEdit = async (b: Partial<Barber>) => {
    setError(null);
    setEditing(b);
    const base: DayHours[] = WEEKDAYS.map(() => ({ enabled: false, start: '09:00', end: '18:00' }));
    if (b.id) {
      const { data } = await supabase.from('working_hours').select('*').eq('barber_id', b.id);
      for (const h of (data as WorkingHour[]) ?? []) {
        base[h.weekday] = { enabled: true, start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) };
      }
    }
    setHours(base);
  };

  const save = async () => {
    if (!editing) return;
    setError(null);
    const payload = {
      name: editing.name, bio: editing.bio || null, photo_url: editing.photo_url || null,
      active: editing.active ?? true, profile_id: editing.profile_id || null,
    };
    let barberId = editing.id;
    if (barberId) {
      const { error } = await supabase.from('barbers').update(payload).eq('id', barberId);
      if (error) return setError(error.message);
    } else {
      const { data, error } = await supabase.from('barbers').insert(payload).select('id').single();
      if (error) return setError(error.message);
      barberId = data.id;
    }
    const rows = hours.map((h, weekday) => ({ ...h, weekday })).filter((h) => h.enabled)
      .map((h) => ({ barber_id: barberId!, weekday: h.weekday, start_time: h.start, end_time: h.end }));
    const del = await supabase.from('working_hours').delete().eq('barber_id', barberId!);
    if (del.error) return setError(del.error.message);
    if (rows.length) {
      const ins = await supabase.from('working_hours').insert(rows);
      if (ins.error) return setError(ins.error.message);
    }
    setEditing(null);
    load();
  };

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      <button className="btn btn-primary" onClick={() => startEdit({ name: '', active: true })}>+ New barber</button>
      {editing && (
        <div className="card form">
          <label>Name<input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label>Bio<input value={editing.bio ?? ''} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} /></label>
          <label>Photo URL<input value={editing.photo_url ?? ''} onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })} /></label>
          <label>Login account (users with role barber/admin)
            <select value={editing.profile_id ?? ''} onChange={(e) => setEditing({ ...editing, profile_id: e.target.value || null })}>
              <option value="">— none —</option>
              {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.email})</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
          <h3>Weekly hours</h3>
          {hours.map((h, i) => (
            <div key={i} className="row hours">
              <label className="check"><input type="checkbox" checked={h.enabled} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} /> {WEEKDAYS[i]}</label>
              <input type="time" disabled={!h.enabled} value={h.start} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} />
              <span>–</span>
              <input type="time" disabled={!h.enabled} value={h.end} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} />
            </div>
          ))}
          <div className="row">
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Login</th><th>Active</th><th /></tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className={b.active ? '' : 'dim'}>
                <td>{b.name}<div className="muted small">{b.bio}</div></td>
                <td>{staff.find((p) => p.id === b.profile_id)?.email ?? '—'}</td>
                <td>{b.active ? 'Yes' : 'No'}</td>
                <td><button className="btn" onClick={() => startEdit(b)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ Users ------------------------------ */

function UsersAdmin() {
  const [items, setItems] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setItems((data as Profile[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const setRole = async (id: string, role: Role) => {
    setError(null);
    const { error } = await supabase.rpc('admin_set_role', { p_user_id: id, p_role: role });
    if (error) setError(error.message);
    load();
  };

  return (
    <div>
      {error && <div className="alert error">{error}</div>}
      <p className="muted">To make someone a barber: set their role to “barber”, then link them to a barber in the Barbers tab.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>
                  <select value={p.role} onChange={(e) => setRole(p.id, e.target.value as Role)}>
                    <option value="customer">customer</option>
                    <option value="barber">barber</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ Settings ------------------------------ */

function SettingsAdmin() {
  const { settings, refreshSettings } = useAuth();
  const [form, setForm] = useState<ShopSettings>(settings!);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const save = async () => {
    const { id, ...fields } = form;
    const { error } = await supabase.from('shop_settings').update({
      ...fields,
      slot_minutes: Number(fields.slot_minutes),
      min_notice_minutes: Number(fields.min_notice_minutes),
      max_days_ahead: Number(fields.max_days_ahead),
    }).eq('id', id);
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Saved.' });
    if (!error) refreshSettings();
  };

  const field = (key: keyof ShopSettings, label: string, type = 'text') => (
    <label>{label}<input type={type} value={(form[key] as string | number | null) ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
  );

  return (
    <div className="card form">
      {field('name', 'Shop name')}
      {field('address', 'Address')}
      {field('phone', 'Phone')}
      {field('timezone', 'Time zone (IANA, e.g. America/New_York)')}
      {field('currency', 'Currency (ISO code, e.g. USD)')}
      <div className="row">
        {field('slot_minutes', 'Slot step (min)', 'number')}
        {field('min_notice_minutes', 'Min notice (min)', 'number')}
        {field('max_days_ahead', 'Book up to (days ahead)', 'number')}
      </div>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
      <button className="btn btn-primary" onClick={save}>Save settings</button>
    </div>
  );
}
