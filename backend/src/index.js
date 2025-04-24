const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Enhanced CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Database setup
const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Workers table with password
    db.run(`CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      position TEXT,
      hire_date TEXT,
      status TEXT DEFAULT 'active'
    )`);

    // Shifts table
    db.run(`CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      FOREIGN KEY (worker_id) REFERENCES workers (id)
    )`);

    // Attendance table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id TEXT NOT NULL,
      shift_id INTEGER,
      check_in_time TEXT,
      check_out_time TEXT,
      status TEXT,
      notes TEXT,
      FOREIGN KEY (worker_id) REFERENCES workers (id),
      FOREIGN KEY (shift_id) REFERENCES shifts (id)
    )`);

    // Notifications table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES workers (id)
    )`);

    // Insert initial admin user with hashed password
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO workers (id, name, email, password, role, department, position, hire_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['admin123', 'Admin User', 'admin@pizzeria.com', hashedPassword, 'admin', 'Management', 'System Administrator', new Date().toISOString()]);

    // Insert sample workers
    const worker1Password = bcrypt.hashSync('worker1pass', 10);
    const worker2Password = bcrypt.hashSync('worker2pass', 10);
    
    db.run(`INSERT OR IGNORE INTO workers (id, name, email, password, role, department, position, hire_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['worker1', 'John Doe', 'john@pizzeria.com', worker1Password, 'worker', 'Kitchen', 'Pizza Chef', new Date().toISOString()]);
    
    db.run(`INSERT OR IGNORE INTO workers (id, name, email, password, role, department, position, hire_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['worker2', 'Jane Smith', 'jane@pizzeria.com', worker2Password, 'worker', 'Service', 'Waitress', new Date().toISOString()]);
  });
}

// Routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM workers WHERE email = ?', [email], async (err, worker) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!worker) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, worker.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: worker.id, role: worker.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        department: worker.department,
        position: worker.position
      }
    });
  });
});

app.get('/api/workers', authenticateToken, (req, res) => {
  db.all('SELECT id, name, email, role, department, position, hire_date, status FROM workers', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/workers/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM workers WHERE id = ?', [id], (err, worker) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (worker) {
      const token = jwt.sign(
        { id: worker.id, role: worker.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        user: {
          id: worker.id,
          name: worker.name,
          role: worker.role,
          department: worker.department,
          position: worker.position
        }
      });
    } else {
      res.status(404).json({ error: 'Worker not found' });
    }
  });
});

app.post('/api/shifts', authenticateToken, (req, res) => {
  const { workerId, startTime, endTime } = req.body;
  
  db.run(
    'INSERT INTO shifts (worker_id, start_time, end_time) VALUES (?, ?, ?)',
    [workerId, startTime, endTime],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, workerId, startTime, endTime });
    }
  );
});

app.post('/api/checkin', authenticateToken, (req, res) => {
  console.log('Check-in request received:', {
    workerId: req.body.workerId,
    user: req.user,
    headers: req.headers
  });

  const { workerId } = req.body;
  const checkInTime = new Date().toISOString();
  
  // Check if worker is already checked in
  db.get(
    'SELECT * FROM attendance WHERE worker_id = ? AND check_out_time IS NULL',
    [workerId],
    (err, existingCheckIn) => {
      if (err) {
        console.error('Database error during check-in:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (existingCheckIn) {
        console.log('Worker already checked in:', existingCheckIn);
        return res.status(400).json({ error: 'Worker is already checked in' });
      }
      
      // Insert check-in record
      db.run(
        'INSERT INTO attendance (worker_id, check_in_time, status) VALUES (?, ?, ?)',
        [workerId, checkInTime, 'present'],
        function(err) {
          if (err) {
            console.error('Error inserting check-in record:', err);
            return res.status(500).json({ error: err.message });
          }
          console.log('Check-in successful:', {
            id: this.lastID,
            workerId,
            checkInTime
          });
          res.json({ 
            id: this.lastID, 
            workerId, 
            checkInTime,
            message: 'Successfully checked in'
          });
        }
      );
    }
  );
});

app.post('/api/checkout', authenticateToken, (req, res) => {
  console.log('Check-out request received:', {
    workerId: req.body.workerId,
    user: req.user,
    headers: req.headers
  });

  const { workerId } = req.body;
  const checkOutTime = new Date().toISOString();
  
  // First check if worker is checked in
  db.get(
    'SELECT * FROM attendance WHERE worker_id = ? AND check_out_time IS NULL',
    [workerId],
    (err, existingCheckIn) => {
      if (err) {
        console.error('Database error during check-out:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (!existingCheckIn) {
        console.log('Worker is not checked in');
        return res.status(400).json({ error: 'Worker is not checked in' });
      }
      
      // Update check-out time
      db.run(
        'UPDATE attendance SET check_out_time = ? WHERE worker_id = ? AND check_out_time IS NULL',
        [checkOutTime, workerId],
        function(err) {
          if (err) {
            console.error('Error updating check-out time:', err);
            return res.status(500).json({ error: err.message });
          }
          
          if (this.changes === 0) {
            console.log('No records updated for check-out');
            return res.status(400).json({ error: 'Failed to check out' });
          }
          
          console.log('Check-out successful:', {
            workerId,
            checkOutTime
          });
          
          res.json({ 
            workerId, 
            checkOutTime,
            message: 'Successfully checked out'
          });
        }
      );
    }
  );
});

app.get('/api/attendance/:workerId', authenticateToken, (req, res) => {
  const { workerId } = req.params;
  const { startDate, endDate } = req.query;
  
  let query = 'SELECT * FROM attendance WHERE worker_id = ?';
  const params = [workerId];
  
  if (startDate && endDate) {
    query += ' AND check_in_time BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/notifications/:workerId', authenticateToken, (req, res) => {
  const { workerId } = req.params;
  
  db.all(
    'SELECT * FROM notifications WHERE worker_id = ? ORDER BY created_at DESC',
    [workerId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/notifications', authenticateToken, (req, res) => {
  const { workerId, message, type } = req.body;
  
  db.run(
    'INSERT INTO notifications (worker_id, message, type) VALUES (?, ?, ?)',
    [workerId, message, type],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, workerId, message, type });
    }
  );
});

app.post('/api/worker-login', (req, res) => {
  const { id, password } = req.body;
  
  db.get('SELECT * FROM workers WHERE id = ?', [id], async (err, worker) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!worker) {
      return res.status(401).json({ error: 'Invalid worker ID' });
    }
    
    const validPassword = await bcrypt.compare(password, worker.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = jwt.sign(
      { id: worker.id, role: worker.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        department: worker.department,
        position: worker.position
      }
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Test accounts:');
  console.log('Admin: admin@pizzeria.com / admin123');
  console.log('Workers:');
  console.log('- john@pizzeria.com / worker1pass');
  console.log('- jane@pizzeria.com / worker2pass');
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
}); 