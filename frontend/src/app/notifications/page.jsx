'use client';
import { useState, useEffect } from 'react';
import { fetchNotifications, markNotificationsRead } from '../../utils/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      fetchNotifications(user.id).then(data => setNotifications(Array.isArray(data) ? data : [])).catch(console.error);
    }
  }, []);

  const handleMarkAsRead = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    if (!userId) return;
    const res = await markNotificationsRead(userId);
    if (res.ok) {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } else {
      alert('We could not update your notifications right now.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Inbox</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-800">Notifications</h1>
          <p className="mt-3 text-base text-slate-600">Updates about bookings, emergency requests, and reminders will appear here.</p>
        </div>
        <button onClick={handleMarkAsRead} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100">
          Mark all read
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_18px_40px_rgba(79,70,229,0.08)] backdrop-blur-xl">
        <div className="divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-base font-semibold text-slate-500">You are all caught up.</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-4 p-5 transition-colors ${n.read ? 'bg-white/60' : 'bg-indigo-50/40'}`}>
                <div className={`mt-1 flex h-11 w-11 items-center justify-center rounded-full ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : n.type === 'warning' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <span className="text-lg font-black">•</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read ? 'text-slate-600' : 'font-black text-slate-800'}`}>{n.title}</p>
                </div>
                <span className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
