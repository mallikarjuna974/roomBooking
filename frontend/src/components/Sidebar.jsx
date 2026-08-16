'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setIsAdmin(parsed?.role === 'admin');
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_20px_60px_rgba(99,102,241,0.08)] z-20">
      <div className="flex h-20 items-center border-b border-indigo-100/70 px-6">
        <div className="flex items-center gap-3 text-xl font-black tracking-tight text-indigo-600">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-indigo-200">
            🏢
          </span>
          RoomBook
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          User
        </p>

        {[
          { href: '/dashboard', label: 'Dashboard', icon: '📊' },
          { href: '/rooms', label: 'Rooms', icon: '🛋️' },
          { href: '/my-bookings', label: 'My Bookings', icon: '📅' },
          { href: '/notifications', label: 'Notifications', icon: '🔔' }
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
              isActive(item.href)
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="my-5 border-t border-indigo-100" />

            <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              Admin
            </p>

            {[
              { href: '/admin/add-room', label: 'Add Room', icon: '➕' },
              { href: '/admin/manage-rooms', label: 'Manage Inventory', icon: '🗂️' },
              { href: '/admin/bookings', label: 'Pending Requests', icon: '🚨' },
              { href: '/admin/overrides', label: 'Manual Override', icon: '⚡' }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  isActive(item.href)
                    ? item.href === '/admin/overrides'
                      ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-200'
                      : 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-200'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}