const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseOrThrow(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function registerUser({ username, email, password }) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
}

export async function fetchRooms() {
  return parseOrThrow(await fetch(`${BASE_URL}/api/rooms`));
}

export async function fetchRoom(id) {
  return parseOrThrow(await fetch(`${BASE_URL}/api/rooms/${id}`));
}

export async function addRoom(payload) {
  const res = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function deleteRoom(id) {
  return parseOrThrow(await fetch(`${BASE_URL}/api/rooms/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  }));
}

export async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  return data.success ? data.imageUrl : null;
}

export async function requestBooking(payload) {
  try {
    return await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Book error:', error);
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: 'Network error. Please check your connection and try again.' })
    };
  }
}

export async function fetchMyBookings(userId) {
  return parseOrThrow(await fetch(`${BASE_URL}/api/user/${userId}/bookings`, {
    headers: authHeaders()
  }));
}

export async function cancelBooking(id) {
  try {
    return await fetch(`${BASE_URL}/api/bookings/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return { ok: false, status: 500 };
  }
}

export async function fetchEmergencies() {
  return parseOrThrow(await fetch(`${BASE_URL}/api/admin/emergencies`, {
    headers: authHeaders()
  }));
}

export async function resolveEmergency(id, { action, rejectReason }) {
  return fetch(`${BASE_URL}/api/admin/emergencies/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, rejectReason })
  });
}

export async function overrideBooking(payload) {
  return fetch(`${BASE_URL}/api/admin/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
}

export async function fetchAdminStats() {
  try {
    return await parseOrThrow(await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: authHeaders()
    }));
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return null;
  }
}

export async function fetchOverrideLogs() {
  try {
    const data = await parseOrThrow(await fetch(`${BASE_URL}/api/admin/overrides`, {
      headers: authHeaders()
    }));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch override logs error:', error);
    return [];
  }
}

export async function fetchNotifications(userId) {
  try {
    const data = await parseOrThrow(await fetch(`${BASE_URL}/api/user/${userId}/notifications`, {
      headers: authHeaders()
    }));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return [];
  }
}

export async function markNotificationsRead(userId) {
  try {
    return await fetch(`${BASE_URL}/api/user/${userId}/notifications/read`, {
      method: 'PUT',
      headers: authHeaders()
    });
  } catch (error) {
    console.error('Mark read error:', error);
    return { ok: false, status: 500 };
  }
}