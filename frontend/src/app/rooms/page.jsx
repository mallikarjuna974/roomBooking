'use client';
import { useState, useEffect } from 'react';
import { fetchRooms, requestBooking } from '../../utils/api';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '' });
  const [conflict, setConflict] = useState(null);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRooms()
      .then(data => {
        const safeRooms = Array.isArray(data) ? data.filter(room => room && room.id) : [];
        setRooms(safeRooms);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const selectRoom = (room) => {
    setActiveRoom(room);
    setConflict(null);
    setEmergencyReason('');
    setForm({ date: '', startTime: '', endTime: '' });
  };

  const handleBook = async (e, isEmergency = false) => {
    if (e) e.preventDefault();

    if (!activeRoom || !activeRoom.id) {
      alert('Please choose a room before booking.');
      return;
    }

    if (!localStorage.getItem('token')) {
      alert('Please sign in first, then you can finish the booking.');
      return;
    }

    if (!form.date || !form.startTime || !form.endTime) {
      alert('Please fill in date, start time, and end time.');
      return;
    }

    if (form.startTime >= form.endTime) {
      alert('Please choose an end time that is after the start time.');
      return;
    }

    const payload = { roomId: activeRoom.id, ...form, isEmergency, emergencyReason };

    setIsSubmitting(true);
    try {
      const res = await requestBooking(payload);
      if (res.ok) {
        alert(isEmergency ? 'Your emergency request has been sent to the admin team.' : 'Your room is booked.');
        setActiveRoom(null);
        setConflict(null);
        setEmergencyReason('');
        setForm({ date: '', startTime: '', endTime: '' });
      } else if (res.status === 409) {
        setConflict(await res.json().catch(() => ({ suggestions: [] })));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'We could not complete this booking. Please try another slot.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Something went wrong while booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = (Array.isArray(rooms) ? rooms : []).filter(Boolean).filter(room => {
    const searchValue = searchQuery.toLowerCase();
    const roomName = (room?.name || '').toLowerCase();
    const roomLocation = (room?.location || '').toLowerCase();
    return roomName.includes(searchValue) || roomLocation.includes(searchValue);
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Rooms</h1>
          <p className="text-gray-500 mt-2">Find a room that fits your meeting, class, or quick discussion.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
          <span className="text-gray-400 mr-2">🔍</span>
          <input type="text" placeholder="Search by room or location" className="outline-none text-sm w-48 text-gray-700" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="text-center py-20 animate-pulse text-gray-500">Getting the rooms ready...</div>}

      {!isLoading && filteredRooms.length === 0 && (
        <div className="text-center py-20 text-gray-500 font-medium bg-white rounded-2xl border border-gray-100 shadow-sm">No rooms match that search yet.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredRooms.map(room => (
          <div key={room.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all flex flex-col ${activeRoom?.id === room.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-100'}`}>
            <div className="relative h-48 bg-gray-100">
              {room?.imageUrl ? <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-400">Photo coming soon</div>}
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="font-extrabold text-xl text-gray-900 mb-2">{room?.name || 'Unnamed Room'}</h3>
              <div className="flex gap-4 text-sm text-gray-500 mb-4">
                <span>👥 {room?.capacity ?? 0}</span>
                <span>📍 {room?.location || 'Unknown location'}</span>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-50">
                <button onClick={() => selectRoom(room)} className="block text-center w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-colors">
                  {activeRoom?.id === room.id ? 'Selected — see form below' : 'View and book'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeRoom && (
        <div className="mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Book {activeRoom.name}</h2>
            <button onClick={() => { setActiveRoom(null); setConflict(null); }} className="text-gray-400 hover:text-gray-900 font-bold text-xl">&times;</button>
          </div>

          <form onSubmit={(e) => handleBook(e, false)} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
              <input type="date" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                <input type="time" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                <input type="time" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl mt-4 hover:bg-indigo-700 disabled:bg-indigo-300">
              {isSubmitting ? 'Checking availability...' : 'Check availability and book'}
            </button>
          </form>

          {conflict && (
            <div className="mt-6 bg-orange-50 border border-orange-200 p-4 rounded-xl">
              <p className="text-orange-800 font-bold mb-2">That slot is already taken.</p>
              {Array.isArray(conflict.suggestions) && conflict.suggestions.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-bold text-gray-700">Here are a few open options</p>
                  {conflict.suggestions.map((slot, index) => (
                    <button
                      key={`${slot.roomId}-${slot.date}-${slot.startTime}-${index}`}
                      type="button"
                      onClick={() => {
                        setForm({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
                        const suggestedRoom = rooms.find(room => room.id === slot.roomId);
                        if (suggestedRoom) setActiveRoom(suggestedRoom);
                        setConflict(null);
                      }}
                      className="block w-full rounded-lg border border-orange-100 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:border-orange-300"
                    >
                      {slot.roomName || activeRoom.name} - {slot.startTime} to {slot.endTime}
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-white p-3 rounded-lg border border-orange-100 mb-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Need this room urgently?</p>
                <input type="text" placeholder="Tell the admin why this is urgent" required className="w-full border border-gray-200 p-2 rounded-lg text-sm mb-2" value={emergencyReason} onChange={e => setEmergencyReason(e.target.value)} />
                <button onClick={() => handleBook(null, true)} disabled={!emergencyReason.trim() || isSubmitting} className="w-full bg-red-600 text-white font-bold py-2 rounded-lg text-sm disabled:bg-red-300">
                  Send emergency request
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}