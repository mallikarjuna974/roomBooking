'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addRoom, uploadImageToCloudinary } from '../../../utils/api';

export default function AddRoomPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', capacity: '', location: '' });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.capacity || !form.location.trim()) {
      setError('Please fill in name, capacity, and location.');
      return;
    }

    const capacityNum = Number(form.capacity);
    if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
      setError('Capacity must be a positive whole number.');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary(imageFile);
        if (!imageUrl) {
          setError('Image upload failed. You can retry, or submit without a photo.');
          setIsSubmitting(false);
          return;
        }
      }

      const result = await addRoom({
        name: form.name.trim(),
        capacity: capacityNum,
        location: form.location.trim(),
        imageUrl
      });

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      router.push('/admin/manage-rooms');
    } catch (err) {
      console.error('Add room error:', err);
      setError('Something went wrong while creating the room. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Add Room</h1>
      <p className="text-gray-500 mb-8">Create a new room for people to book.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Room name</label>
          <input
            type="text"
            className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Innovation Hall"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Capacity</label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="e.g. 24"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
            <input
              type="text"
              className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Block A"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Room photo (optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="mt-3 h-40 w-full object-cover rounded-xl border border-gray-100" />
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {isSubmitting ? 'Creating room...' : 'Create room'}
        </button>
      </form>
    </div>
  );
}