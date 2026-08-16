'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchAdminStats } from '../../utils/api';

const COLORS = ['#4f46e5', '#e0e7ff'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const lineData = stats?.weekly?.length
    ? stats.weekly
    : [ { name: 'Mon', bookings: 0 }, { name: 'Tue', bookings: 0 }, { name: 'Wed', bookings: 0 }, { name: 'Thu', bookings: 0 }, { name: 'Fri', bookings: 0 }, { name: 'Sat', bookings: 0 }, { name: 'Sun', bookings: 0 } ];
  const bookedPercentage = stats?.bookedPercentage ?? 0;
  const pieData = [
    { name: 'Booked', value: bookedPercentage },
    { name: 'Available', value: stats?.availablePercentage ?? 100 }
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Overview</p>
        <h1 className="text-4xl font-black tracking-tight text-slate-800">Admin Dashboard</h1>
        <p className="mt-3 text-base text-slate-600">A quick read on rooms, bookings, and requests that need attention.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Rooms ready to book', value: stats?.totalRooms ?? 0, tone: 'from-indigo-500 to-violet-500' },
          { label: 'Confirmed bookings', value: stats?.totalBookings ?? 0, tone: 'from-blue-500 to-cyan-500' },
          { label: 'Requests waiting', value: stats?.pendingRequests ?? 0, tone: 'from-amber-500 to-orange-500' },
          { label: 'Admin changes logged', value: stats?.totalOverrides ?? 0, tone: 'from-rose-500 to-pink-500' }
        ].map((stat) => (
          <div key={stat.label} className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_40px_rgba(79,70,229,0.08)] backdrop-blur-xl">
            <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-r ${stat.tone} px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white`}>
              Current
            </div>
            <p className="mb-2 text-4xl font-black text-slate-800">{loading ? '...' : stat.value}</p>
            <p className="text-sm font-bold text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_40px_rgba(79,70,229,0.08)] backdrop-blur-xl">
          <h2 className="mb-6 text-xl font-black text-slate-800">Bookings This Week</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)' }} />
                <Line type="monotone" dataKey="bookings" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_40px_rgba(79,70,229,0.08)] backdrop-blur-xl">
          <h2 className="mb-6 text-xl font-black text-slate-800">Rooms In Use Today</h2>
          <div className="relative flex flex-1 items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} innerRadius={78} outerRadius={110} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-black text-slate-800">{bookedPercentage}%</span>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Booked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
