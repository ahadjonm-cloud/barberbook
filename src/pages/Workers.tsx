import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Worker } from '../types';
import WorkerCard from '../components/WorkerCard';

export default function Workers() {
  const { categories } = useAuth();
  const [params, setParams] = useSearchParams();
  const category = params.get('category');
  const [workers, setWorkers] = useState<Worker[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase.from('workers').select('*').eq('active', true).order('jobs_done', { ascending: false })
      .then(({ data }) => setWorkers((data as Worker[]) ?? []));
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (workers ?? []).filter((w) =>
      (!category || w.category_ids.includes(category)) &&
      (!needle || [w.display_name, w.city, w.bio].some((s) => s?.toLowerCase().includes(needle))));
  }, [workers, category, q]);

  const setCategory = (id: string | null) => setParams(id ? { category: id } : {});

  return (
    <>
      <div className="row between wrap">
        <h1>Ishchilar ro'yxati</h1>
        <Link to="/order/new" className="btn btn-primary">Buyurtma berish</Link>
      </div>
      <p className="muted">Buyurtma bersangiz, u barcha mos ishchilarga ko'rinadi va ulardan biri qabul qiladi.</p>

      <input className="search" placeholder="Ism, shahar yoki ko'nikma bo'yicha qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips filter">
        <button className={`chip ${!category ? 'selected' : ''}`} onClick={() => setCategory(null)}>Barchasi</button>
        {categories.filter((c) => c.active).map((c) => (
          <button key={c.id} className={`chip ${category === c.id ? 'selected' : ''}`} onClick={() => setCategory(c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {workers === null ? <p className="muted">Yuklanmoqda…</p>
        : shown.length === 0 ? <div className="card center muted">Hozircha bu bo'yicha ishchilar yo'q.</div>
        : <div className="grid">{shown.map((w) => <WorkerCard key={w.profile_id} worker={w} />)}</div>}
    </>
  );
}
