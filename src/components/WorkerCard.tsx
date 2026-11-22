import { useAuth } from '../lib/auth';
import { initials, money } from '../lib/format';
import type { Worker } from '../types';

export default function WorkerCard({ worker: w }: { worker: Worker }) {
  const { categories, settings } = useAuth();
  const cats = categories.filter((c) => w.category_ids.includes(c.id));

  return (
    <div className="card worker">
      <div className="row">
        <div className="avatar placeholder">{initials(w.display_name)}</div>
        <div>
          <strong>{w.display_name}</strong>
          <div className="muted small">
            {w.city && <>📍 {w.city} · </>}{w.jobs_done} ta ish bajargan
          </div>
        </div>
      </div>
      {cats.length > 0 && (
        <div className="chips small-chips">
          {cats.map((c) => <span key={c.id} className="pill">{c.icon} {c.name}</span>)}
        </div>
      )}
      {w.bio && <p className="muted small desc">{w.bio}</p>}
      {w.hourly_rate != null && <div className="price small">{money(w.hourly_rate, settings.currency)} / soat</div>}
    </div>
  );
}
