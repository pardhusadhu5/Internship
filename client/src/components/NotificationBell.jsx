import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api/client';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const ref = useRef(null);

  const load = () => api.notifications().then(setData).catch(() => {});

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.markRead(id);
    load();
  };

  const markAllRead = async () => {
    await api.markAllRead();
    load();
  };

  return (
    <div className="notif-wrapper" ref={ref}>
      <button className="btn btn-icon notif-btn" onClick={() => setOpen(!open)}>
        <Bell size={20} />
        {data.unread > 0 && <span className="notif-badge">{data.unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {data.unread > 0 && (
              <button className="btn btn-sm btn-secondary" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          {data.notifications.length === 0 ? (
            <div className="notif-empty">No notifications</div>
          ) : (
            data.notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => !n.read && markRead(n.id)}
              >
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{new Date(n.created_at).toLocaleString('en-IN')}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
