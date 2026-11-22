import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { addDays, dateLabel, fmtDateTime, fmtTime, money, todayIn } from '../lib/format';
import type { Barber, Service } from '../types';

const DAYS_SHOWN = 14;

export default function Book() {
  const { settings } = useAuth();
  const tz = settings!.timezone;
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState(() => todayIn(tz));
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const today = todayIn(tz);
    return Array.from({ length: Math.min(DAYS_SHOWN, settings!.max_days_ahead + 1) }, (_, i) => addDays(today, i));
  }, [tz, settings]);

  useEffect(() => {
    supabase.from('services').select('*').eq('active', true).order('price_cents')
      .then(({ data }) => setServices((data as Service[]) ?? []));
    supabase.from('barbers').select('*').eq('active', true).order('name')
      .then(({ data }) => setBarbers((data as Barber[]) ?? []));
  }, []);

  const loadSlots = async () => {
    if (!serviceId || !barberId) return;
    setSlotsLoading(true); setSlot(null); setError(null);
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_barber_id: barberId, p_service_id: serviceId, p_date: date,
    });
    if (error) setError(error.message);
    setSlots(((data as { slot: string }[]) ?? []).map((r) => r.slot));
    setSlotsLoading(false);
  };

  useEffect(() => { loadSlots(); }, [serviceId, barberId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const service = services.find((s) => s.id === serviceId);
  const barber = barbers.find((b) => b.id === barberId);

  const book = async () => {
    if (!serviceId || !barberId || !slot) return;
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('book_appointment', {
      p_barber_id: barberId, p_service_id: serviceId, p_starts_at: slot, p_notes: notes || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      loadSlots();
      return;
    }
    navigate('/appointments', { state: { booked: true } });
  };

  return (
    <div className="book">
      <h1>Book an appointment</h1>

      <section>
        <h2><span className="step">1</span> Choose a service</h2>
        <div className="grid">
          {services.map((s) => (
            <button key={s.id} className={`card selectable ${serviceId === s.id ? 'selected' : ''}`} onClick={() => setServiceId(s.id)}>
              <div className="row between">
                <strong>{s.name}</strong>
                <span className="price">{money(s.price_cents, settings!.currency)}</span>
              </div>
              <span className="muted">{s.duration_min} min</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2><span className="step">2</span> Choose a barber</h2>
        <div className="chips">
          {barbers.map((b) => (
            <button key={b.id} className={`chip ${barberId === b.id ? 'selected' : ''}`} onClick={() => setBarberId(b.id)}>
              {b.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2><span className="step">3</span> Pick a date</h2>
        <div className="days">
          {days.map((d) => {
            const l = dateLabel(d);
            return (
              <button key={d} className={`day ${date === d ? 'selected' : ''}`} onClick={() => setDate(d)}>
                <small>{l.weekday}</small><strong>{l.day}</strong><small>{l.month}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2><span className="step">4</span> Pick a time</h2>
        {!serviceId || !barberId ? (
          <p className="muted">Select a service and a barber to see available times.</p>
        ) : slotsLoading ? (
          <p className="muted">Loading times…</p>
        ) : slots.length === 0 ? (
          <p className="muted">No free times on this day. Try another date or barber.</p>
        ) : (
          <div className="slots">
            {slots.map((s) => (
              <button key={s} className={`chip ${slot === s ? 'selected' : ''}`} onClick={() => setSlot(s)}>
                {fmtTime(s, tz)}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <div className="alert error">{error}</div>}

      {slot && service && barber && (
        <section className="card summary">
          <h2>Confirm</h2>
          <p><strong>{service.name}</strong> with <strong>{barber.name}</strong></p>
          <p>{fmtDateTime(slot, tz)} · {service.duration_min} min · {money(service.price_cents, settings!.currency)}</p>
          <label className="form">Notes (optional)
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything your barber should know?" />
          </label>
          <button className="btn btn-primary btn-lg" onClick={book} disabled={busy}>
            {busy ? 'Booking…' : 'Confirm booking'}
          </button>
        </section>
      )}
    </div>
  );
}
