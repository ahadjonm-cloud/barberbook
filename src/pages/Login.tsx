import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { session } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/book';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (session) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, phone } },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo('Check your email to confirm your account, then sign in.');
    }
    setBusy(false);
  };

  return (
    <div className="auth card">
      <h2>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
      <form onSubmit={submit} className="form">
        {mode === 'signup' && (
          <>
            <label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Phone<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          </>
        )}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert success">{info}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}</button>
      </form>
      <p className="muted center">
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button className="link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
