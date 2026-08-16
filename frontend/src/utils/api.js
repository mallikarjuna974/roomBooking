'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  return token
    ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    : {
        'Content-Type': 'application/json'
      };
};

const parseJson = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const fetchJson = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }

  return data;
};


export const loginUser = async (credentials) => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await parseJson(res);
    return data || { error: 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Failed to login' };
  }
};


export const registerUser = async (data) => {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await parseJson(res);
    return result || { error: 'Registration failed' };
  } catch (error) {
    console.error('Register error:', error);
    return { error: 'Failed to register' };
  }
};

export const getCurrentUser = async () => {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeader()
    });
    return await parseJson(res);
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};


export const uploadImageToCloudinary = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
      body: formData
    });

    const data = await parseJson(res);
    return data?.imageUrl || null;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
};

// ==========================================
// ROOM MANAGEMENT ENDPOINTS
// ==========================================

/**
 * Fetch all available rooms
 * Public endpoint - no authentication required
 * 
 * @returns {Array} Array of room objects or empty array on error
 */
export const fetchRooms = async () => {
  try {
    const data = await fetchJson('/rooms');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch rooms error:', error);
    return [];
  }
};

/**
 * Fetch single room details by ID
 * 
 * @param {number} id - Room ID
 * @returns {Object|null} Room object or null if not found
 */
export const fetchRoomById = async (id) => {
  try {
    return await fetchJson(`/rooms/${id}`);
  } catch (error) {
    console.error('Fetch room error:', error);
    return null;
  }
};

/**
 * Create a new room (ADMIN ONLY)
 * Requires admin authentication
 * 
 * @param {Object} data - { name, capacity, location, imageUrl }
 * @returns {Object} Created room object or error
 */
export const addRoom = async (data) => {
  try {
    return await fetchJson('/rooms', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Add room error:', error);
    return { error: 'Failed to add room' };
  }
};

/**
 * Delete a room (ADMIN ONLY)
 * Cascades to delete all associated bookings
 * 
 * @param {number} id - Room ID
 * @returns {Object} Success/error response
 */
export const deleteRoom = async (id) => {
  try {
    return await fetchJson(`/rooms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
  } catch (error) {
    console.error('Delete room error:', error);
    return { error: 'Failed to delete room' };
  }
};

// ==========================================
// BOOKING ENDPOINTS
// ==========================================

/**
 * Request a room booking
 * Creates confirmed booking if no conflicts, or emergency request if conflict exists
 * 
 * @param {Object} data - {
 *   roomId: number,
 *   date: "YYYY-MM-DD",
 *   startTime: "HH:MM",
 *   endTime: "HH:MM",
 *   isEmergency: boolean,
 *   emergencyReason: string (if isEmergency=true)
 * }
 * @returns {Response} Fetch response object
 */
export const requestBooking = async (data) => {
  try {
    return await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Book error:', error);
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: 'Network error. Please check your connection and try again.' })
    };
  }
};


export const fetchMyBookings = async (userId) => {
  try {
    const data = await fetchJson(`/user/${userId}/bookings`, {
      headers: getAuthHeader()
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return [];
  }
};


export const cancelBooking = async (id) => {
  try {
    return await fetch(`${API_URL}/bookings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return { ok: false, status: 500 };
  }
};


export const fetchNotifications = async (userId) => {
  try {
    const data = await fetchJson(`/user/${userId}/notifications`, {
      headers: getAuthHeader()
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return [];
  }
};


export const markNotificationsRead = async (userId) => {
  try {
    return await fetch(`${API_URL}/user/${userId}/notifications/read`, {
      method: 'PUT',
      headers: getAuthHeader()
    });
  } catch (error) {
    console.error('Mark read error:', error);
    return { ok: false, status: 500 };
  }
};


export async function fetchEmergencies() {
  try {
    const data = await fetchJson('/admin/emergencies', {
      headers: getAuthHeader()
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch emergencies error:', error);
    return [];
  }
}


export const resolveEmergency = async (id, data) => {
  try {
    return await fetch(`${API_URL}/admin/emergencies/${id}/resolve`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    return { ok: false, status: 500 };
  }
};


export const overrideBooking = async (data) => {
  try {
    return await fetch(`${API_URL}/admin/override`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Override error:', error);
    return { ok: false, status: 500 };
  }
};

export const fetchAdminStats = async () => {
  try {
    return await fetchJson('/admin/stats', {
      headers: getAuthHeader()
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return null;
  }
};

export const fetchOverrideLogs = async () => {
  try {
    const data = await fetchJson('/admin/overrides', {
      headers: getAuthHeader()
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch override logs error:', error);
    return [];
  }
};
