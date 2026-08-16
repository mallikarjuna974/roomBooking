'use client';

import './globals.css';
import Sidebar from '../components/Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isLoginPage) {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!storedUser || !token) {
        router.replace('/login');
        return;
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setTimeout(() => setUser(parsedUser), 0);
          if (pathname.startsWith('/admin') && parsedUser.role !== 'admin') {
            router.replace('/rooms');
          }
        } catch {
          console.error('Failed to parse user data');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.replace('/login');
        }
      }
    }
  }, [isLoginPage, pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <html lang="en">
      <body className="antialiased">
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 flex flex-col">
              <header className="sticky top-0 z-10 border-b border-white/60 bg-white/70 backdrop-blur-xl px-6 py-4 shadow-[0_10px_30px_rgba(99,102,241,0.08)]">
                <div className="flex justify-end items-center gap-4">
                  {user && (
                    <>
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2 text-right shadow-sm">
                        <p className="text-sm font-extrabold text-slate-800">{user.username}</p>
                        <p className="text-[11px] font-semibold text-indigo-600">
                          {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-5 md:p-8">
                <div className="mx-auto max-w-7xl">{children}</div>
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
