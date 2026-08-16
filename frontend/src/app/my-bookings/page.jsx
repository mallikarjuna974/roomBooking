'use client';
import { useState, useEffect } from 'react';
import { fetchMyBookings, cancelBooking } from '../../utils/api';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      fetchMyBookings(user.id).then(data => setBookings(Array.isArray(data) ? data : [])).catch(console.error);
    }
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking? The room will become available for others.')) return;
    const res = await cancelBooking(id);
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } else {
      alert('We could not cancel this booking. Please try again.');
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    if (activeTab === 'pending') return b.status === 'pending_emergency';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(`${b.date}T00:00:00`);
    if (activeTab === 'past') return b.status !== 'cancelled' && bookingDate < today;
    return b.status === 'confirmed' && bookingDate >= today;
  });

  const tabLabels = {
    upcoming: 'Upcoming',
    pending: 'Waiting for admin',
    past: 'Past',
    cancelled: 'Cancelled'
  };

  const statusLabels = {
    confirmed: 'Confirmed',
    pending_emergency: 'Waiting for admin',
    cancelled: 'Cancelled'
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Bookings</p>
        <h1 className="text-4xl font-black tracking-tight text-slate-800">My Bookings</h1>
        <p className="mt-3 text-base text-slate-600">Keep track of your rooms and cancel anything you no longer need.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {['upcoming', 'pending', 'past', 'cancelled'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200'
                : 'border border-indigo-100 bg-white text-slate-600 hover:text-indigo-700'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_18px_40px_rgba(79,70,229,0.08)] backdrop-blur-xl">
        <div className="divide-y divide-slate-100">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-base font-semibold text-slate-500">
              {activeTab === 'upcoming' && 'You do not have any upcoming bookings yet.'}
              {activeTab === 'pending' && 'No emergency requests are waiting for admin review.'}
              {activeTab === 'past' && 'No past bookings to show yet.'}
              {activeTab === 'cancelled' && 'No cancelled bookings here.'}
            </div>
          ) : (
            filteredBookings.map(b => (
              <div key={b.id} className="flex flex-col gap-4 p-5 transition-colors hover:bg-indigo-50/30 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100 shadow-inner">
                    {b.room?.imageUrl ? <img src={b.room.imageUrl} className="h-full w-full object-cover" alt={b.room?.name || 'Room'} /> : <div className="flex h-full items-center justify-center text-xl">🏢</div>}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{b.room?.name || 'Room'}</h3>
                    <p className="text-sm text-slate-500">{b.date} • {b.startTime} - {b.endTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'pending_emergency' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                    {statusLabels[b.status] || b.status}
                  </span>
                  {b.status !== 'cancelled' && activeTab !== 'past' && (
                    <button onClick={() => handleCancel(b.id)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
