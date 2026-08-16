'use client';
import { useState, useEffect } from 'react';
import { fetchRooms, fetchOverrideLogs, overrideBooking } from '../../../utils/api';

export default function AdminOverridePage() {
  const [rooms, setRooms] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({
    action: 'assign',
    bookingId: '',
    roomId: '',
    userId: '',
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  useEffect(() => {
    fetchRooms().then(setRooms).catch(console.error);
    fetchOverrideLogs().then(setLogs).catch(console.error);
  }, []);

  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!confirm('This override can change existing bookings and will be added to the audit log. Continue?')) return;

    const payload = {
      action: form.action,
      bookingId: form.bookingId ? Number(form.bookingId) : undefined,
      userId: form.userId ? Number(form.userId) : undefined,
      roomId: form.roomId ? Number(form.roomId) : undefined,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      reason: form.reason
    };

    try {
      const res = await overrideBooking(payload);
      if (res.ok) {
        alert('Manual override successful.');
        setForm({ action: 'assign', bookingId: '', roomId: '', userId: '', date: '', startTime: '', endTime: '', reason: '' });
        fetchOverrideLogs().then(setLogs).catch(console.error);
      } else {
        const data = await res.json();
        alert(data?.error || 'We could not complete this override.');
      }
    } catch (error) {
      console.error(error);
      alert('We could not complete this override.');
    }
  };

  const describeLog = (log) => {
    try {
      const details = JSON.parse(log.details);
      if (log.action === 'MANUAL_CANCEL') {
        return `Admin #${details.adminId} cancelled booking #${details.bookingId}${details.reason ? `: ${details.reason}` : '.'}`;
      }
      if (log.action === 'MANUAL_OVERRIDE') {
        return `Admin #${details.adminId} ${details.action === 'reassign' ? 'reassigned' : 'assigned'} booking #${details.affectedBookingId}. ${details.cancelledConflicts?.length || 0} conflict(s) were cancelled${details.reason ? `: ${details.reason}` : '.'}`;
      }
    } catch {
      return log.details;
    }
    return log.details;
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-rose-500">Override</p>
        <h1 className="text-4xl font-black tracking-tight text-slate-800">Manual Override</h1>
        <p className="mt-3 text-base font-semibold text-rose-600">Use this only when an admin needs to step in and make a clear, logged change.</p>
      </div>

      <div className="rounded-[28px] border border-rose-200 bg-white/80 p-8 shadow-[0_18px_40px_rgba(244,63,94,0.08)] backdrop-blur-xl">
        <form onSubmit={handleManualOverride} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">What do you need to do?</label>
            <select required className="soft-input" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}>
              <option value="assign">Assign a new booking</option>
              <option value="reassign">Move an existing booking</option>
              <option value="cancel">Cancel an existing booking</option>
            </select>
          </div>

          {form.action !== 'assign' && (
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Booking ID</label>
              <input type="number" required placeholder="The booking you want to change" className="soft-input" value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })} />
            </div>
          )}

          {form.action !== 'cancel' && (
            <>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Room</label>
              <select required className="soft-input" value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })}>
                <option value="">Select Room...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">User ID</label>
              <input type="number" required={form.action === 'assign'} disabled={form.action === 'reassign'} placeholder={form.action === 'assign' ? 'Who should get this booking?' : 'Kept from the existing booking'} className="soft-input disabled:opacity-60" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Date</label>
              <input type="date" required className="soft-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Start Time</label>
              <input type="time" required className="soft-input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">End Time</label>
              <input type="time" required className="soft-input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Reason</label>
            <textarea className="soft-input min-h-24" placeholder="Add a short note so people understand the change" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>

          <button type="submit" className="primary-btn w-full bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_12px_24px_rgba(244,63,94,0.22)] hover:shadow-[0_16px_30px_rgba(244,63,94,0.25)]">
            Save override
          </button>
        </form>
      </div>

      <div className="mt-8 overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_18px_40px_rgba(79,70,229,0.08)] backdrop-blur-xl">
        <div className="border-b border-slate-100 bg-slate-50/80 p-5">
          <h2 className="text-lg font-black text-slate-800">Override Log</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">No override activity yet.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="grid gap-2 p-5 md:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-500">{log.action}</p>
                  <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <p className="break-words text-sm font-medium text-slate-700">{describeLog(log)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
