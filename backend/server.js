const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const mail = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
async function sendMail(to, subject, message) {
  if (!to || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    await mail.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: message
    });
  } catch (error) {
    console.error('Mail error:', error.message);
  }
}

const createNotification = async (userId, title, type = 'info') => {
  try {
    await pool.query(
      'INSERT INTO rb_notifications ("userId", title, type, read, "createdAt") VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)',
      [userId, title, type]
    );

    const result = await pool.query(
      'SELECT email FROM rb_users WHERE id = $1',
      [userId]
    );

    const email = result.rows[0]?.email;

    if (email) {
      await sendMail(email, title, title);
    }
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  next();
};

async function isRoomFree(roomId, date, startTime, endTime, excludeBookingId = null) {
  const { rows } = await pool.query(
    `SELECT * FROM rb_bookings
     WHERE "roomId" = $1 AND date = $2 AND status IN ('confirmed','pending_emergency')`,
    [roomId, date]
  );

  return !rows.some(b => {
    if (excludeBookingId && b.id === Number(excludeBookingId)) return false;
    return b.startTime < endTime && startTime < b.endTime;
  });
}

async function suggestAlternatives(roomId, date, startTime, endTime, minCapacity = 0) {
  const slots = [];

  for (let h = 9; h < 18; h++) {
    slots.push([
      `${String(h).padStart(2, '0')}:00`,
      `${String(h + 1).padStart(2, '0')}:00`
    ]);
  }

  const suggestions = [];

  for (const [s, e] of slots) {
    if (s === startTime && e === endTime) continue;

    if (await isRoomFree(roomId, date, s, e)) {
      suggestions.push({
        roomId,
        date,
        startTime: s,
        endTime: e
      });
    }
  }

  const { rows: otherRooms } = await pool.query(
    'SELECT * FROM rb_rooms WHERE id != $1 AND capacity >= $2',
    [roomId, minCapacity]
  );

  for (const room of otherRooms) {
    if (await isRoomFree(room.id, date, startTime, endTime)) {
      suggestions.push({
        roomId: room.id,
        roomName: room.name,
        date,
        startTime,
        endTime
      });
    }
  }

  return suggestions.slice(0, 5);
}

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rb_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rb_rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL,
        location VARCHAR(255) NOT NULL,
        "imageUrl" TEXT
      );

      CREATE TABLE IF NOT EXISTS rb_bookings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES rb_users(id) ON DELETE CASCADE,
        "roomId" INTEGER REFERENCES rb_rooms(id) ON DELETE CASCADE,
        date VARCHAR(50) NOT NULL,
        "startTime" VARCHAR(50) NOT NULL,
        "endTime" VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        "emergencyReason" TEXT,
        "resolutionReason" TEXT
      );

      CREATE TABLE IF NOT EXISTS rb_notifications (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES rb_users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rb_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        details TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(
      `ALTER TABLE rb_bookings ADD COLUMN IF NOT EXISTS "resolutionReason" TEXT;`
    );

    const userCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM rb_users'
    );

    if (userCount.rows[0].count === 0) {
      const defaultPassword = await bcrypt.hash('Admin@123', 10);

      await pool.query(
        'INSERT INTO rb_users (username, email, password, role) VALUES ($1, $2, $3, $4)',
        ['roomadmin', 'roomadmin@gmail.com', defaultPassword, 'admin']
      );

      console.log('Default admin user created: roomadmin@gmail.com / Admin@123');
    }

    const roomCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM rb_rooms'
    );

    if (roomCount.rows[0].count === 0) {
      await pool.query(
        `INSERT INTO rb_rooms (name, capacity, location, "imageUrl") VALUES
          ('Innovation Hall', 24, 'Block A', ''),
          ('Board Room', 12, 'Block B', ''),
          ('Conference Suite', 30, 'Block C', '')`
      );

      console.log('Seed rooms created for demo data');
    }

    console.log('PostgreSQL Tables Verified');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};

initDB();

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    const existingUser = await pool.query(
      'SELECT * FROM rb_users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email or username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      'INSERT INTO rb_users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashedPassword, 'user']
    );

    const user = rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    const { rows } = await pool.query(
      'SELECT * FROM rb_users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, role FROM rb_users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(rows[0]);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
});

app.post('/api/admin/users/:id/promote', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE rb_users
       SET role = 'admin'
       WHERE id = $1
       RETURNING id, username, email, role`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    await pool.query(
      'INSERT INTO rb_logs (action, details) VALUES ($1, $2)',
      [
        'PROMOTE_ADMIN',
        `Admin #${req.user.id} promoted user #${req.params.id} to admin`
      ]
    );

    res.json(rows[0]);
  } catch {
    res.status(500).json({
      error: 'Promotion failed'
    });
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image provided'
      });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'room-booking'
        },
        (error, result) => (
          error ? reject(error) : resolve(result)
        )
      );

      uploadStream.end(req.file.buffer);
    });

    res.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Image upload failed:', error.message);

    res.status(500).json({
      error: 'Image upload failed — check Cloudinary credentials in .env'
    });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rb_rooms ORDER BY id'
    );

    res.json(rows);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch rooms'
    });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rb_rooms WHERE id = $1',
      [req.params.id]
    );

    res.json(rows[0] || null);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch room'
    });
  }
});

app.post('/api/rooms', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, capacity, location, imageUrl } = req.body;

    if (!name || !capacity || !location) {
      return res.status(400).json({
        error: 'Missing fields'
      });
    }

    const { rows } = await pool.query(
      'INSERT INTO rb_rooms (name, capacity, location, "imageUrl") VALUES ($1, $2, $3, $4) RETURNING *',
      [name, capacity, location, imageUrl || '']
    );

    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({
      error: 'Failed to create room'
    });
  }
});

app.delete('/api/rooms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM rb_rooms WHERE id = $1',
      [req.params.id]
    );

    res.json({
      message: 'Room deleted'
    });
  } catch {
    res.status(500).json({
      error: 'Failed to delete room'
    });
  }
});

app.post('/api/bookings', verifyToken, async (req, res) => {
  try {
    const {
      roomId,
      date,
      startTime,
      endTime,
      isEmergency,
      emergencyReason
    } = req.body;

    const userId = req.user.id;

    if (!roomId || !date || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing fields'
      });
    }

    const free = await isRoomFree(
      roomId,
      date,
      startTime,
      endTime
    );

    if (free) {
      const { rows } = await pool.query(
        `INSERT INTO rb_bookings
        ("userId", "roomId", date, "startTime", "endTime", status)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *`,
        [
          userId,
          roomId,
          date,
          startTime,
          endTime,
          'confirmed'
        ]
      );

      const roomResult = await pool.query(
        'SELECT name FROM rb_rooms WHERE id = $1',
        [roomId]
      );

      await createNotification(
        userId,
        `Booking confirmed for ${roomResult.rows[0]?.name || 'room'} on ${date}`,
        'success'
      );

      return res.status(201).json({
        success: true,
        booking: rows[0]
      });
    }

    if (isEmergency && emergencyReason) {
      const { rows } = await pool.query(
        `INSERT INTO rb_bookings
        ("userId", "roomId", date, "startTime", "endTime", status, "emergencyReason")
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          userId,
          roomId,
          date,
          startTime,
          endTime,
          'pending_emergency',
          emergencyReason
        ]
      );

      await createNotification(
        userId,
        'Emergency booking request sent to admin for approval',
        'warning'
      );

      return res.status(201).json({
        success: true,
        emergency: rows[0]
      });
    }

    const alternatives = await suggestAlternatives(
      roomId,
      date,
      startTime,
      endTime,
      0
    );

    res.status(409).json({
      success: false,
      message: 'Room is already booked for this time slot',
      suggestions: alternatives
    });
  } catch (error) {
    console.error('Booking error:', error);

    res.status(500).json({
      error: 'Booking failed'
    });
  }
});

app.delete('/api/bookings/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rb_bookings WHERE id = $1',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (
      rows[0].userId !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'Not authorized'
      });
    }

    await pool.query(
      'UPDATE rb_bookings SET status = $1 WHERE id = $2',
      ['cancelled', req.params.id]
    );

    res.json({
      message: 'Booking cancelled'
    });
  } catch {
    res.status(500).json({
      error: 'Failed to cancel booking'
    });
  }
});

app.get('/api/admin/emergencies', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, row_to_json(r) as room, u.username, u.email
      FROM rb_bookings b
      LEFT JOIN rb_rooms r ON b."roomId" = r.id
      LEFT JOIN rb_users u ON b."userId" = u.id
      WHERE b.status = 'pending_emergency'
      ORDER BY b.id
    `);

    res.json(rows);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch emergencies'
    });
  }
});

app.post('/api/admin/emergencies/:id/resolve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { action, rejectReason } = req.body;
    const emergencyId = req.params.id;

    const { rows: emergencyRows } = await pool.query(
      'SELECT * FROM rb_bookings WHERE id = $1',
      [emergencyId]
    );

    if (emergencyRows.length === 0) {
      return res.status(404).json({
        error: 'Emergency not found'
      });
    }

    const em = emergencyRows[0];

    if (action === 'accept') {
      const { rows: bumped } = await pool.query(`
        UPDATE rb_bookings
        SET status = 'cancelled'
        WHERE "roomId" = $1
        AND date = $2
        AND status = 'confirmed'
        AND ("startTime" < $4 AND "endTime" > $3)
        RETURNING *
      `, [
        em.roomId,
        em.date,
        em.startTime,
        em.endTime
      ]);

      await pool.query(
        'UPDATE rb_bookings SET status = $1 WHERE id = $2',
        ['confirmed', emergencyId]
      );

      await createNotification(
        em.userId,
        'Your emergency room request was accepted',
        'success'
      );

      for (const b of bumped) {
        await createNotification(
          b.userId,
          `Your booking on ${b.date} at ${b.startTime} was cancelled to accommodate an emergency request`,
          'warning'
        );
      }

      await pool.query(
        'INSERT INTO rb_logs (action, details) VALUES ($1, $2)',
        [
          'EMERGENCY_ACCEPT',
          `Admin #${req.user.id} accepted emergency #${emergencyId}, bumped ${bumped.length} booking(s)`
        ]
      );

      res.json({
        message: 'Emergency accepted',
        bumpedCount: bumped.length
      });
    } else {
      await pool.query(
        `UPDATE rb_bookings
         SET status = $1, "resolutionReason" = $2
         WHERE id = $3`,
        [
          'cancelled',
          rejectReason || null,
          emergencyId
        ]
      );

      await createNotification(
        em.userId,
        `Your emergency room request was rejected${rejectReason ? `: ${rejectReason}` : ''}`,
        'warning'
      );

      await pool.query(
        'INSERT INTO rb_logs (action, details) VALUES ($1, $2)',
        [
          'EMERGENCY_REJECT',
          `Admin #${req.user.id} rejected emergency #${emergencyId}${rejectReason ? ` — ${rejectReason}` : ''}`
        ]
      );

      res.json({
        message: 'Emergency rejected'
      });
    }
  } catch (error) {
    console.error('Resolve error:', error);

    res.status(500).json({
      error: 'Resolution failed'
    });
  }
});

app.post('/api/admin/override', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      bookingId,
      userId,
      roomId,
      date,
      startTime,
      endTime,
      action
    } = req.body;

    if (action === 'cancel') {
      if (!bookingId) {
        return res.status(400).json({
          error: 'bookingId required to cancel'
        });
      }

      await pool.query(
        'UPDATE rb_bookings SET status = $1 WHERE id = $2',
        ['cancelled', bookingId]
      );

      await pool.query(
        'INSERT INTO rb_logs (action, details) VALUES ($1, $2)',
        [
          'MANUAL_CANCEL',
          `Admin #${req.user.id} cancelled booking #${bookingId}`
        ]
      );

      return res.json({
        success: true
      });
    }

    let targetId = bookingId;

    if (bookingId) {
      await pool.query(
        `UPDATE rb_bookings
         SET "roomId"=$1,
             date=$2,
             "startTime"=$3,
             "endTime"=$4,
             status=$5
         WHERE id=$6`,
        [
          roomId,
          date,
          startTime,
          endTime,
          'confirmed',
          bookingId
        ]
      );
    } else {
      const { rows: newBooking } = await pool.query(
        `INSERT INTO rb_bookings
        ("userId", "roomId", date, "startTime", "endTime", status)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *`,
        [
          userId,
          roomId,
          date,
          startTime,
          endTime,
          'confirmed'
        ]
      );

      targetId = newBooking[0].id;
    }

    const { rows: conflicts } = await pool.query(`
      UPDATE rb_bookings
      SET status = 'cancelled'
      WHERE "roomId" = $1
      AND date = $2
      AND status = 'confirmed'
      AND id != $3
      AND ("startTime" < $5 AND "endTime" > $4)
      RETURNING *
    `, [
      roomId,
      date,
      targetId,
      startTime,
      endTime
    ]);

    for (const c of conflicts) {
      await createNotification(
        c.userId,
        `Your booking on ${c.date} at ${c.startTime} was cancelled by an admin override`,
        'warning'
      );
    }

    await pool.query(
      'INSERT INTO rb_logs (action, details) VALUES ($1, $2)',
      [
        'MANUAL_OVERRIDE',
        `Admin #${req.user.id} force-${bookingId ? 'reassigned' : 'assigned'} room ${roomId} on ${date}. Cancelled ${conflicts.length} conflicting booking(s).`
      ]
    );

    res.json({
      success: true,
      bookingId: targetId,
      cancelledConflicts: conflicts.length
    });
  } catch (error) {
    console.error('Override error:', error);

    res.status(500).json({
      error: 'Override failed'
    });
  }
});

app.get('/api/admin/overrides', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rb_logs ORDER BY "createdAt" DESC LIMIT 100'
    );

    res.json(rows);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch logs'
    });
  }
});

app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const totalRooms = await pool.query(
      'SELECT COUNT(*)::int AS c FROM rb_rooms'
    );

    const totalBookings = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM rb_bookings
       WHERE status = 'confirmed'`
    );

    const pending = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM rb_bookings
       WHERE status = 'pending_emergency'`
    );

    const overrides = await pool.query(
      `SELECT COUNT(*)::int AS c FROM rb_logs`
    );

    const weekly = await pool.query(`
      SELECT to_char(date::date, 'Dy') AS name,
             COUNT(*)::int AS bookings
      FROM rb_bookings
      WHERE date::date BETWEEN CURRENT_DATE - INTERVAL '6 days'
      AND CURRENT_DATE
      GROUP BY date::date, to_char(date::date, 'Dy')
      ORDER BY date::date
    `);

    const roomsBookedToday = await pool.query(`
      SELECT COUNT(DISTINCT "roomId")::int AS c
      FROM rb_bookings
      WHERE date = to_char(CURRENT_DATE, 'YYYY-MM-DD')
      AND status = 'confirmed'
    `);

    const bookedPct = totalRooms.rows[0].c > 0
      ? Math.round(
          (roomsBookedToday.rows[0].c / totalRooms.rows[0].c) * 100
        )
      : 0;

    res.json({
      totalRooms: totalRooms.rows[0].c,
      totalBookings: totalBookings.rows[0].c,
      pendingRequests: pending.rows[0].c,
      totalOverrides: overrides.rows[0].c,
      weekly: weekly.rows,
      bookedPercentage: bookedPct,
      availablePercentage: 100 - bookedPct
    });
  } catch (error) {
    console.error('Stats error:', error);

    res.status(500).json({
      error: 'Failed to compute stats'
    });
  }
});

app.get('/api/user/:userId/notifications', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rb_notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [req.params.userId]
    );

    res.json(rows);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch notifications'
    });
  }
});

app.put('/api/user/:userId/notifications/read', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE rb_notifications SET read = true WHERE "userId" = $1',
      [req.params.userId]
    );

    res.json({
      success: true
    });
  } catch {
    res.status(500).json({
      error: 'Failed to update notifications'
    });
  }
});

app.get('/api/user/:userId/bookings', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, row_to_json(r) as room
      FROM rb_bookings b
      LEFT JOIN rb_rooms r ON b."roomId" = r.id
      WHERE b."userId" = $1
      ORDER BY b.date DESC
    `, [req.params.userId]);

    res.json(rows);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch bookings'
    });
  }
});

async function runReminderSweep() {
  console.log('Running daily reminder sweep...');

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateString = tomorrow.toISOString().split('T')[0];

    const { rows } = await pool.query(
      'SELECT * FROM rb_bookings WHERE date = $1 AND status = $2',
      [dateString, 'confirmed']
    );

    for (const booking of rows) {
      await createNotification(
        booking.userId,
        `Reminder: You have a room booked tomorrow at ${booking.startTime}`,
        'info'
      );
    }

    console.log(`Sent ${rows.length} reminder notifications`);
  } catch (err) {
    console.error('Reminder sweep failed:', err);
  }
}

cron.schedule('0 8 * * *', runReminderSweep);

app.post('/api/admin/reminders/run', verifyToken, requireAdmin, async (req, res) => {
  await runReminderSweep();
  res.json({
    ok: true
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});