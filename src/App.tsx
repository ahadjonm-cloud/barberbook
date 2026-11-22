import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import Home from './pages/Home';
import Login from './pages/Login';
import Workers from './pages/Workers';
import NewOrder from './pages/NewOrder';
import MyOrders from './pages/MyOrders';
import WorkerPanel from './pages/WorkerPanel';
import Admin from './pages/Admin';

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center muted">Yuklanmoqda…</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { session, profile, settings, signOut } = useAuth();

  return (
    <>
      <header className="nav">
        <NavLink to="/" className="brand"><span className="logo">m1</span>{settings.name}</NavLink>
        <nav>
          <NavLink to="/workers">Ishchilar</NavLink>
          <NavLink to="/order/new">Buyurtma berish</NavLink>
          {session && <NavLink to="/my-orders">Buyurtmalarim</NavLink>}
          <NavLink to="/worker">Ishchi paneli</NavLink>
          {profile?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {session
            ? <button className="link" onClick={signOut}>Chiqish</button>
            : <NavLink to="/login" className="btn btn-primary btn-sm">Kirish</NavLink>}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/order/new" element={<RequireAuth><NewOrder /></RequireAuth>} />
          <Route path="/my-orders" element={<RequireAuth><MyOrders /></RequireAuth>} />
          <Route path="/worker" element={<RequireAuth><WorkerPanel /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer muted">
        © {new Date().getFullYear()} {settings.name}
        {settings.support_phone && <> · Qo'llab-quvvatlash: {settings.support_phone}</>}
      </footer>
    </>
  );
}
