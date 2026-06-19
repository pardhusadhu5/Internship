import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Wallet, Receipt,
  Scale, BarChart3, ScrollText, LogOut, Menu, Sun, Moon, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/admin/reporters', icon: Users, label: 'Reporters' },
  { to: '/admin/advances', icon: Wallet, label: 'Advances' },
  { to: '/admin/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/admin/settlements', icon: Scale, label: 'Settlements' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
];

const reporterLinks = [
  { to: '/reporter', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/reporter/assignments', icon: ClipboardList, label: 'My Assignments' },
  { to: '/reporter/advances', icon: Wallet, label: 'Advance Requests' },
  { to: '/reporter/expenses', icon: Receipt, label: 'My Expenses' },
  { to: '/reporter/settlements', icon: Scale, label: 'Settlements' },
];

export default function Layout({ title, subtitle }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const links = user?.role === 'admin' ? adminLinks : reporterLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h1>Namaste Telangana</h1>
          <span>Journalist Management System</span>
        </div>
        <nav className="sidebar-nav">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link" onClick={() => setSidebarOpen(false)}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-icon mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn btn-icon" onClick={toggle} title="Toggle theme">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <NotificationBell />
            <div className="user-chip">
              <div className="user-avatar">{user?.name?.charAt(0)}</div>
              <span>{user?.name}</span>
              <span className="role-tag">{user?.role}</span>
            </div>
            <button className="btn btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
