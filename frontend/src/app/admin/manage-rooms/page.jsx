'use client';
import { useState, useEffect } from 'react';
import { fetchRooms, deleteRoom } from '../../../utils/api';

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetchRooms().then(setRooms).catch(console.error);
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this room from the portal? Existing bookings for it may also be affected.')) return;
    try {
      const result = await deleteRoom(id);
      if (result?.error) {
        alert(result.error);
        return;
      }
      setRooms(rooms.filter(r => r.id !== id));
    } catch (error) {
      alert(error.message || 'We could not remove this room. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manage Rooms</h1>
        <p className="text-gray-500 mt-2">Keep the room list accurate for everyone who books.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-4 gap-4 p-5 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
          <div className="col-span-1">Room</div>
          <div className="col-span-1">Location</div>
          <div className="col-span-1">Capacity</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y divide-gray-50">
          {rooms.length === 0 && (
            <div className="p-10 text-center text-sm font-semibold text-gray-500">
              No rooms have been added yet.
            </div>
          )}
          {rooms.map(room => (
            <div key={room.id} className="grid grid-cols-4 gap-4 p-5 items-center hover:bg-gray-50 transition-colors">
              <div className="col-span-1 font-bold text-gray-900">{room.name}</div>
              <div className="col-span-1 text-sm text-gray-500">{room.location}</div>
              <div className="col-span-1 text-sm text-gray-500">{room.capacity} seats</div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => handleDelete(room.id)} className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
