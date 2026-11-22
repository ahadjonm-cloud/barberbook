import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { money } from '../lib/format';
import type { Barber, Service } from './types';

export default function Home() {
  const { settings } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  useEffect(() => {
    supabase.from('services').select('*').eq('active', true).order('price_cents')
      .then(({ data }) => setServices((data as Service[]) ?? []));
    supabase.from('barbers').select('*').eq('active', true).order('name')
      .then(({ data }) => setBarbers((data as Barber[]) ?? []));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Look sharp. Book in seconds.</h1>
        <p>Pick a service, choose your barber and grab a time that suits you.</p>
        <Link to="/book" className="btn btn-primary btn-lg">Book an appointment</Link>
      </section>

      <section>
        <h2>Services</h2>
        <div className="grid">
          {services.map((s) => (
            <div key={s.id} className="card">
              <div className="row between">
                <h3>{s.name}</h3>
                <span className="price">{money(s.price_cents, settings?.currency)}</span>
              </div>
              <p className="muted">{s.description}</p>
              <span className="pill">{s.duration_min} min</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Our barbers</h2>
        <div className="grid">
          {barbers.map((b) => (
            <div key={b.id} className="card barber">
              {b.photo_url
                ? <img src={b.photo_url} alt={b.name} className="avatar" />
                : <div className="avatar placeholder">{b.name[0]}</div>}
              <div>
                <h3>{b.name}</h3>
                <p className="muted">{b.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
