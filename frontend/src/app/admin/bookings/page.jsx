'use client';
import { useState, useEffect } from 'react';
import { fetchEmergencies, resolveEmergency } from '../../../utils/api';

export default function AdminPendingRequestsPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchEmergencies()
      .then(data => {
        if (Array.isArray(data)) {
          setEmergencies(data);
        } else {
          console.error('Expected an array from /api/admin/emergencies, got:', data);
          setEmergencies([]);
          setLoadError('We could not read the emergency queue. Please refresh or sign in again as an admin.');
        }
      })
      .catch(err => {
        console.error(err);
        setEmergencies([]);
        setLoadError(err.message || 'We could not load emergency requests.');
      });
  }, []);

  const handleAction = async (id, actionType) => {
    let rejectReason = '';
    if (actionType === 'reject') {
      rejectReason = window.prompt('Add a short reason for rejecting this request:');
      if (rejectReason === null) return;
    }
    try {
      const res = await resolveEmergency(id, { action: actionType, rejectReason });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'We could not update this request.');
        return;
      }
      setEmergencies(prev => prev.filter(req => req.id !== id));
    } catch {
      alert('We could not update this request.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Admin</p>
        <h1 className="text-4xl font-black tracking-tight text-slate-800">Emergency Requests</h1>
        <p className="mt-3 text-base text-slate-600">Review urgent room requests and decide what should happen next.</p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_18px_40px_rgba(79,70,229,0.08)] backdrop-blur-xl">
        <div className="grid grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50/80 p-5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          <div className="col-span-2">Requester</div>
          <div className="col-span-2">Room</div>
          <div className="col-span-2">Date & Time</div>
          <div className="col-span-3">Reason</div>
          <div className="col-span-1">Conflict</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-right">Decision</div>
        </div>

        {emergencies.length === 0 && !loadError && (
          <div className="p-16 text-center text-base font-semibold text-slate-500">No emergency requests need review right now.</div>
        )}

        <div className="divide-y divide-slate-100">
          {emergencies.map((req) => (
            <div key={req.id} className="grid grid-cols-12 gap-4 items-center p-5 transition-colors hover:bg-indigo-50/30">
              <div className="col-span-2">
                <p className="font-black text-slate-800">{req.username || 'Unknown User'}</p>
                <p className="truncate text-xs text-slate-500">{req.email || 'No email'}</p>
              </div>
              <div className="col-span-2 font-black text-slate-800">{req.room?.name || 'Unknown Room'}</div>
              <div className="col-span-2 text-sm text-slate-700">
                {req.date}
                <br />
                <span className="text-xs text-slate-500">{req.startTime} - {req.endTime}</span>
              </div>
              <div className="col-span-3 rounded-2xl bg-orange-50 p-3 text-sm font-medium text-orange-800">{req.emergencyReason}</div>
              <div className="col-span-1 text-xs text-slate-600">
                {req.conflictingBooking ? (
                  <>
                    <p className="font-bold">{req.conflictingBooking.username || `User #${req.conflictingBooking.userId}`}</p>
                    <p>{req.conflictingBooking.startTime} - {req.conflictingBooking.endTime}</p>
                  </>
                ) : (
                  'None'
                )}
              </div>
              <div className="col-span-1 flex justify-center">
                <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-700">Pending</span>
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <button onClick={() => handleAction(req.id, 'accept')} className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:brightness-110">Accept</button>
                <button onClick={() => handleAction(req.id, 'reject')} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
