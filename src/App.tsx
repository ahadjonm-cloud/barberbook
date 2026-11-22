import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import type { Role } from './types';
import Home from './pages/Home';
import Login from './pages/Login';
import Book from './pages/Book';
import MyAppointments from './pages/MyAppointments';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && (!profile || !roles.includes(profile.role))) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { session, profile, settings, signOut } = useAuth();
  const isStaff = profile?.role === 'barber' || profile?.role === 'admin';

  return (
    <>
      <header className="nav">
        <NavLink to="/" className="brand">✂ {settings?.name ?? 'Barbershop'}</NavLink>
        <nav>
          <NavLink to="/book">Book</NavLink>
          {session && <NavLink to="/appointments">My appointments</NavLink>}
          {isStaff && <NavLink to="/dashboard">Dashboard</NavLink>}
          {profile?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {session
            ? <button className="link" onClick={signOut}>Sign out</button>
            : <NavLink to="/login">Sign in</NavLink>}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/book" element={<RequireAuth><Book /></RequireAuth>} />
          <Route path="/appointments" element={<RequireAuth><MyAppointments /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth roles={['barber', 'admin']}><Dashboard /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth roles={['admin']}><Admin /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer muted">
        {settings?.address} {settings?.phone && <>· {settings.phone}</>}
      </footer>
    </>
  );
}
