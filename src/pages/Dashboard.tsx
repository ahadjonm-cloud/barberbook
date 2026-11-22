import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { addDays, dateIn, fmtTime, STATUS_LABEL, todayIn } from '../lib/format';
import type { Appointment, AppointmentStatus } from '../types';

const SELECT = '*, service:services(name, duration_min, price_cents), barber:barbers(name), customer:profiles(full_name, phone, email)';

export default function Dashboard() {
  const { settings, profile } = useAuth();
  const tz = settings!.timezone;
  const [date, setDate] = useState(() => todayIn(tz));
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    // Fetch a padded UTC window, then keep only those on the selected shop-local date.
    const { data, error } = await supabase.from('appointments').select(SELECT)
      .gte('starts_at', `${addDays(date, -1)}T00:00:00Z`)
      .lt('starts_at', `${addDays(date, 2)}T00:00:00Z`)
      .order('starts_at');
    if (error) setError(error.message);
    setItems(((data as Appointment[]) ?? []).filter((a) => dateIn(a.starts_at, tz) === date));
    setLoading(false);
  };

  useEffect(() => { load(); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (a: Appointment, status: AppointmentStatus) => {
    const { error } = status === 'cancelled'
      ? await supabase.rpc('cancel_appointment', { p_appointment_id: a.id })
      : await supabase.from('appointments').update({ status }).eq('id', a.id);
    if (error) setError(error.message);
    load();
  };

  const active = items.filter((a) => a.status !== 'cancelled');

  return (
    <div>
      <div className="row between wrap">
        <h1>{profile?.role === 'admin' ? 'All appointments' : 'My schedule'}</h1>
        <div className="row">
          <button className="btn" onClick={() => setDate(addDays(date, -1))}>‹</button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button className="btn" onClick={() => setDate(addDays(date, 1))}>›</button>
          <button className="btn" onClick={() => setDate(todayIn(tz))}>Today</button>
        </div>
      </div>
      <p className="muted">{active.length} appointment(s)</p>
      {error && <div className="alert error">{error}</div>}
      {loading ? <p className="muted">Loading…</p> : items.length === 0 ? <p className="muted">Nothing scheduled.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Time</th><th>Customer</th><th>Service</th>{profile?.role === 'admin' && <th>Barber</th>}<th>Status</th><th /></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className={a.status === 'cancelled' ? 'dim' : ''}>
                  <td>{fmtTime(a.starts_at, tz)} – {fmtTime(a.ends_at, tz)}</td>
                  <td>
                    {a.customer?.full_name || a.customer?.email}
                    {a.customer?.phone && <div className="muted small"><a href={`tel:${a.customer.phone}`}>{a.customer.phone}</a></div>}
                    {a.notes && <div className="muted small">“{a.notes}”</div>}
                  </td>
                  <td>{a.service?.name}</td>
                  {profile?.role === 'admin' && <td>{a.barber?.name}</td>}
                  <td><span className={`status ${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                  <td className="actions">
                    {a.status === 'booked' && <button className="btn" onClick={() => setStatus(a, 'confirmed')}>Confirm</button>}
                    {['booked', 'confirmed'].includes(a.status) && (
                      <>
                        <button className="btn btn-primary" onClick={() => setStatus(a, 'completed')}>Done</button>
                        <button className="btn" onClick={() => setStatus(a, 'no_show')}>No-show</button>
                        <button className="btn btn-danger" onClick={() => setStatus(a, 'cancelled')}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
