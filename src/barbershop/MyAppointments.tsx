import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { fmtDateTime, money, STATUS_LABEL } from '../lib/format';
import type { Appointment } from './types';

const SELECT = '*, service:services(name, duration_min, price_cents), barber:barbers(name)';

export default function MyAppointments() {
  const { session, settings } = useAuth();
  const location = useLocation();
  const justBooked = (location.state as { booked?: boolean } | null)?.booked;
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('appointments').select(SELECT)
      .eq('customer_id', session!.user.id).order('starts_at', { ascending: false });
    if (error) setError(error.message);
    setItems((data as Appointment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    const { error } = await supabase.rpc('cancel_appointment', { p_appointment_id: id });
    if (error) setError(error.message);
    load();
  };

  const now = Date.now();
  const upcoming = items.filter((a) => new Date(a.starts_at).getTime() > now && ['booked', 'confirmed'].includes(a.status)).reverse();
  const past = items.filter((a) => !upcoming.includes(a));

  const renderItem = (a: Appointment, canCancel: boolean) => (
    <div key={a.id} className="card appt">
      <div>
        <strong>{a.service?.name}</strong> with {a.barber?.name}
        <div className="muted">{fmtDateTime(a.starts_at, settings!.timezone)} · {a.service && money(a.service.price_cents, settings!.currency)}</div>
        {a.notes && <div className="muted small">“{a.notes}”</div>}
      </div>
      <div className="row">
        <span className={`status ${a.status}`}>{STATUS_LABEL[a.status]}</span>
        {canCancel && <button className="btn btn-danger" onClick={() => cancel(a.id)}>Cancel</button>}
      </div>
    </div>
  );

  return (
    <div>
      <h1>My appointments</h1>
      {justBooked && <div className="alert success">Your appointment is booked. See you soon!</div>}
      {error && <div className="alert error">{error}</div>}
      {loading ? <p className="muted">Loading…</p> : (
        <>
          <h2>Upcoming</h2>
          {upcoming.length === 0
            ? <p className="muted">No upcoming appointments. <Link to="/book">Book one now</Link>.</p>
            : upcoming.map((a) => renderItem(a, true))}
          {past.length > 0 && <><h2>History</h2>{past.map((a) => renderItem(a, false))}</>}
        </>
      )}
    </div>
  );
}
