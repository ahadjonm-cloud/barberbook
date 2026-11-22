import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { AccountType } from '../types';

export default function Login() {
  const { session } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('person');
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (session) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === 'Invalid login credentials' ? "Email yoki parol noto'g'ri" : error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, phone, account_type: accountType, org_name: accountType === 'organization' ? orgName : '' } },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo("Emailingizga tasdiqlash xati yuborildi. Tasdiqlab, keyin kiring.");
    }
    setBusy(false);
  };

  return (
    <div className="auth card">
      <h2>{mode === 'signin' ? 'Kirish' : "Ro'yxatdan o'tish"}</h2>
      <form onSubmit={submit} className="form">
        {mode === 'signup' && (
          <>
            <div className="chips">
              <button type="button" className={`chip ${accountType === 'person' ? 'selected' : ''}`} onClick={() => setAccountType('person')}>👤 Jismoniy shaxs</button>
              <button type="button" className={`chip ${accountType === 'organization' ? 'selected' : ''}`} onClick={() => setAccountType('organization')}>🏢 Tashkilot</button>
            </div>
            {accountType === 'organization' && (
              <label>Tashkilot nomi<input required value={orgName} onChange={(e) => setOrgName(e.target.value)} /></label>
            )}
            <label>{accountType === 'organization' ? "Mas'ul shaxs ismi" : 'Ism familiya'}<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Telefon<input type="tel" placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          </>
        )}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Parol<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert success">{info}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Kuting…' : mode === 'signin' ? 'Kirish' : "Ro'yxatdan o'tish"}</button>
      </form>
      <p className="muted center">
        {mode === 'signin' ? "Akkauntingiz yo'qmi? " : 'Akkauntingiz bormi? '}
        <button className="link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
          {mode === 'signin' ? "Ro'yxatdan o'tish" : 'Kirish'}
        </button>
      </p>
    </div>
  );
}
