import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Worker } from '../types';
import WorkerCard from '../components/WorkerCard';

export default function Home() {
  const { categories, settings } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    supabase.from('workers').select('*').eq('active', true).order('jobs_done', { ascending: false }).limit(6)
      .then(({ data }) => setWorkers((data as Worker[]) ?? []));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Ishchi kerakmi? Yoki ish qidiryapsizmi?</h1>
        <p>
          Odamlar va tashkilotlar vaqt, joy va narxni belgilab buyurtma beradi.
          Buyurtma ishchilar paneliga tushadi va istalgan ishchi uni qabul qiladi.
        </p>
        <div className="row center-row wrap">
          <Link to="/order/new" className="btn btn-primary btn-lg">Buyurtma berish</Link>
          <Link to="/worker" className="btn btn-lg">Ishchi bo'lib ishlash</Link>
        </div>
      </section>

      <section>
        <h2>Qanday ishlaydi</h2>
        <div className="grid steps">
          <div className="card"><span className="step">1</span><h3>Buyurtma bering</h3><p className="muted">Xizmat turi, vaqt, manzil va qancha to'lashingizni yozing.</p></div>
          <div className="card"><span className="step">2</span><h3>Ishchi qabul qiladi</h3><p className="muted">Buyurtma barcha ishchilarga ko'rinadi. Birinchi qabul qilgan ishchi sizga biriktiriladi.</p></div>
          <div className="card"><span className="step">3</span><h3>Ish bajariladi</h3><p className="muted">Ishchi bilan telefon orqali bog'lanasiz. Ish tugagach, "Bajarildi" deb belgilaysiz.</p></div>
        </div>
        <p className="muted small">Ishchi buyurtma narxining {100 - settings.commission_percent}% ini oladi, {settings.commission_percent}% platforma xizmat haqi.</p>
      </section>

      <section>
        <h2>Xizmat turlari</h2>
        <div className="chips">
          {categories.filter((c) => c.active).map((c) => (
            <Link key={c.id} to={`/workers?category=${c.id}`} className="chip">{c.icon} {c.name}</Link>
          ))}
        </div>
      </section>

      {workers.length > 0 && (
        <section>
          <div className="row between"><h2>Ishchilar</h2><Link to="/workers">Barchasi →</Link></div>
          <div className="grid">
            {workers.map((w) => <WorkerCard key={w.profile_id} worker={w} />)}
          </div>
        </section>
      )}
    </>
  );
}
