import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorText, money, split, toLocalInput } from '../lib/format';

export default function NewOrder() {
  const { profile, settings, categories, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalInput(tomorrow));
  const [hours, setHours] = useState('2');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [accountType, setAccountType] = useState(profile?.account_type ?? 'person');
  const [orgName, setOrgName] = useState(profile?.org_name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNum = Math.max(0, Math.floor(Number(price.replace(/\s/g, '')) || 0));
  const { fee, payout } = split(priceNum, settings.commission_percent);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!categoryId) { setError('Xizmat turini tanlang'); return; }
    if (priceNum <= 0) { setError('Narxni kiriting'); return; }
    if (new Date(startsAt) <= new Date()) { setError('Vaqt kelajakda bo\'lishi kerak'); return; }
    if (accountType === 'organization' && !orgName.trim()) { setError('Tashkilot nomini kiriting'); return; }
    setBusy(true);

    // Remember who is ordering (person or organization) on the profile.
    if (profile && (profile.account_type !== accountType || (profile.org_name ?? '') !== orgName.trim() || !profile.phone)) {
      const { error } = await supabase.from('profiles').update({
        account_type: accountType,
        org_name: accountType === 'organization' ? orgName.trim() : null,
        phone: profile.phone || phone.trim() || null,
      }).eq('id', profile.id);
      if (error) { setError(errorText(error)); setBusy(false); return; }
      await refreshProfile();
    }

    const { error } = await supabase.rpc('create_order', {
      p_category_id: categoryId,
      p_title: title,
      p_description: description,
      p_address: address,
      p_city: city,
      p_starts_at: new Date(startsAt).toISOString(),
      p_duration_hours: Number(hours) || 1,
      p_price: priceNum,
      p_contact_phone: phone,
    });
    setBusy(false);
    if (error) setError(errorText(error));
    else navigate('/my-orders', { state: { created: true } });
  };

  return (
    <div className="narrow">
      <h1>Yangi buyurtma</h1>
      <p className="muted">Buyurtmangiz barcha ishchilarga ko'rinadi. Birinchi qabul qilgan ishchi siz bilan bog'lanadi.</p>
      <form onSubmit={submit} className="form card">
        <fieldset>
          <legend>Kim buyurtma beryapti?</legend>
          <div className="chips">
            <button type="button" className={`chip ${accountType === 'person' ? 'selected' : ''}`} onClick={() => setAccountType('person')}>👤 Jismoniy shaxs</button>
            <button type="button" className={`chip ${accountType === 'organization' ? 'selected' : ''}`} onClick={() => setAccountType('organization')}>🏢 Tashkilot</button>
          </div>
          {accountType === 'organization' && (
            <label>Tashkilot nomi<input required value={orgName} onChange={(e) => setOrgName(e.target.value)} /></label>
          )}
        </fieldset>

        <fieldset>
          <legend>Qanday xizmat kerak?</legend>
          <div className="chips">
            {categories.filter((c) => c.active).map((c) => (
              <button type="button" key={c.id} className={`chip ${categoryId === c.id ? 'selected' : ''}`} onClick={() => setCategoryId(c.id)}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <label>Qisqacha nomi<input required maxLength={120} placeholder="Masalan: 3 xonali kvartirani tozalash" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Batafsil (ixtiyoriy)<textarea rows={3} placeholder="Nima qilish kerak, qanday asboblar kerak…" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        </fieldset>

        <fieldset>
          <legend>Vaqt va joy</legend>
          <div className="row">
            <label>Qachon<input type="datetime-local" required value={startsAt} min={toLocalInput(new Date())} onChange={(e) => setStartsAt(e.target.value)} /></label>
            <label>Davomiyligi (soat)<input type="number" min="0.5" max="240" step="0.5" required value={hours} onChange={(e) => setHours(e.target.value)} /></label>
          </div>
          <div className="row">
            <label>Shahar<input placeholder="Toshkent" value={city} onChange={(e) => setCity(e.target.value)} /></label>
            <label>Manzil<input required placeholder="Ko'cha, uy, mo'ljal" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
          </div>
          <label>Aloqa uchun telefon<input type="tel" required placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        </fieldset>

        <fieldset>
          <legend>Narx</legend>
          <label>Qancha to'laysiz ({settings.currency === 'UZS' ? "so'm" : settings.currency})
            <input inputMode="numeric" required placeholder="200000" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d\s]/g, ''))} />
          </label>
          {priceNum > 0 && (
            <div className="breakdown">
              <div className="row between"><span>Siz to'laysiz</span><strong>{money(priceNum, settings.currency)}</strong></div>
              <div className="row between muted"><span>Ishchi oladi ({100 - settings.commission_percent}%)</span><span>{money(payout, settings.currency)}</span></div>
              <div className="row between muted"><span>Platforma xizmat haqi ({settings.commission_percent}%)</span><span>{money(fee, settings.currency)}</span></div>
            </div>
          )}
        </fieldset>

        {error && <div className="alert error">{error}</div>}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Yuborilmoqda…' : 'Buyurtmani joylash'}</button>
      </form>
    </div>
  );
}
