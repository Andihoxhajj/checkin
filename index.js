require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;





// SQL Server configuration
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    trustedConnection: true
  },
  authentication: {
    type: 'default',
    options: {
      trustedConnection: true
    }
  }
};

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
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

// Helper function for date formatting
const formatDateForSQL = (date) => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

// Helper function for error handling
const handleDatabaseError = (err, res) => {
  console.error('Database error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Database error',
    message: err.message || 'An unexpected error occurred'
  });
};

// Database connection pool
let pool;
async function initializeDatabase() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('Connected to SQL Server database');

    // Create tables if they don't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'workers')
      CREATE TABLE workers (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(100) UNIQUE NOT NULL,
        password NVARCHAR(MAX) NOT NULL,
        role NVARCHAR(20) NOT NULL,
        department NVARCHAR(50),
        position NVARCHAR(50),
        hire_date DATETIME,
        status NVARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      );

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'shifts')
      CREATE TABLE shifts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        worker_id NVARCHAR(50) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status NVARCHAR(20) DEFAULT 'scheduled',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (worker_id) REFERENCES workers (id)
      );

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'attendance')
      CREATE TABLE attendance (
        id INT IDENTITY(1,1) PRIMARY KEY,
        worker_id NVARCHAR(50) NOT NULL,
        shift_id INT,
        check_in_time DATETIME,
        check_out_time DATETIME,
        status NVARCHAR(20),
        notes NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (worker_id) REFERENCES workers (id),
        FOREIGN KEY (shift_id) REFERENCES shifts (id)
      );

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notifications')
      CREATE TABLE notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        worker_id NVARCHAR(50) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        type NVARCHAR(20) NOT NULL,
        read BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (worker_id) REFERENCES workers (id)
      );

      -- Create indexes for better performance
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_workers_email')
      CREATE INDEX idx_workers_email ON workers(email);

      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_attendance_worker_date')
      CREATE INDEX idx_attendance_worker_date ON attendance(worker_id, check_in_time);

      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_shifts_worker_date')
      CREATE INDEX idx_shifts_worker_date ON shifts(worker_id, start_time);
    `);

    // Insert initial admin user if not exists
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await pool.request()
      .input('id', sql.NVarChar, 'admin123')
      .input('name', sql.NVarChar, 'Admin User')
      .input('email', sql.NVarChar, 'admin@pizzeria.com')
      .input('password', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, 'admin')
      .input('department', sql.NVarChar, 'Management')
      .input('position', sql.NVarChar, 'System Administrator')
      .input('hire_date', sql.DateTime, new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM workers WHERE id = @id)
        INSERT INTO workers (id, name, email, password, role, department, position, hire_date)
        VALUES (@id, @name, @email, @password, @role, @department, @position, @hire_date)
      `);

    // Insert sample workers if not exist
    const worker1Password = bcrypt.hashSync('worker1pass', 10);
    const worker2Password = bcrypt.hashSync('worker2pass', 10);
    
    await pool.request()
      .input('id', sql.NVarChar, 'worker1')
      .input('name', sql.NVarChar, 'John Doe')
      .input('email', sql.NVarChar, 'john@pizzeria.com')
      .input('password', sql.NVarChar, worker1Password)
      .input('role', sql.NVarChar, 'worker')
      .input('department', sql.NVarChar, 'Kitchen')
      .input('position', sql.NVarChar, 'Pizza Chef')
      .input('hire_date', sql.DateTime, new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM workers WHERE id = @id)
        INSERT INTO workers (id, name, email, password, role, department, position, hire_date)
        VALUES (@id, @name, @email, @password, @role, @department, @position, @hire_date)
      `);

    await pool.request()
      .input('id', sql.NVarChar, 'worker2')
      .input('name', sql.NVarChar, 'Jane Smith')
      .input('email', sql.NVarChar, 'jane@pizzeria.com')
      .input('password', sql.NVarChar, worker2Password)
      .input('role', sql.NVarChar, 'worker')
      .input('department', sql.NVarChar, 'Service')
      .input('position', sql.NVarChar, 'Waitress')
      .input('hire_date', sql.DateTime, new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM workers WHERE id = @id)
        INSERT INTO workers (id, name, email, password, role, department, position, hire_date)
        VALUES (@id, @name, @email, @password, @role, @department, @position, @hire_date)
      `);

  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

// Initialize database on startup
initializeDatabase();

// Routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM workers WHERE email = @email');
    
    const worker = result.recordset[0];
    
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
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/workers', authenticateToken, (req, res) => {
  pool.request()
    .query('SELECT id, name, email, role, department, position, hire_date, status FROM workers')
    .then(result => {
      res.json(result.recordset);
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.get('/api/workers/:id', (req, res) => {
  const { id } = req.params;
  pool.request()
    .input('id', sql.NVarChar, id)
    .query('SELECT * FROM workers WHERE id = @id')
    .then(result => {
      const worker = result.recordset[0];
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
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.post('/api/shifts', authenticateToken, (req, res) => {
  const { workerId, startTime, endTime } = req.body;
  
  pool.request()
    .input('workerId', sql.NVarChar, workerId)
    .input('startTime', sql.DateTime, startTime)
    .input('endTime', sql.DateTime, endTime)
    .query('INSERT INTO shifts (worker_id, start_time, end_time) VALUES (@workerId, @startTime, @endTime)')
    .then(result => {
      res.json({ id: result.recordset[0].id, workerId, startTime, endTime });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.post('/api/checkin', authenticateToken, (req, res) => {
  console.log('Check-in request received:', {
    workerId: req.body.workerId,
    user: req.user,
    headers: req.headers,
    body: req.body
  });

  if (!req.body.workerId) {
    console.error('Missing workerId in request body');
    return res.status(400).json({ 
      success: false,
      error: 'Worker ID is required',
      message: 'Please provide a valid worker ID'
    });
  }

  const { workerId } = req.body;
  const checkInTime = new Date().toISOString();
  
  // Verify worker exists
  pool.request()
    .input('workerId', sql.NVarChar, workerId)
    .query('SELECT * FROM workers WHERE id = @workerId')
    .then(result => {
      const worker = result.recordset[0];
      if (worker) {
        // Check if worker is already checked in
        pool.request()
          .input('workerId', sql.NVarChar, workerId)
          .input('checkInTime', sql.DateTime, checkInTime)
          .query('SELECT * FROM attendance WHERE worker_id = @workerId AND check_out_time IS NULL')
          .then(checkInResult => {
            if (checkInResult.recordset.length > 0) {
              console.log('Worker already checked in:', checkInResult.recordset[0]);
              return res.status(400).json({ 
                success: false,
                error: 'Already checked in',
                message: 'You are already checked in'
              });
            }
            
            // Insert check-in record
            pool.request()
              .input('workerId', sql.NVarChar, workerId)
              .input('checkInTime', sql.DateTime, checkInTime)
              .input('status', sql.NVarChar, 'present')
              .query('INSERT INTO attendance (worker_id, check_in_time, status) VALUES (@workerId, @checkInTime, @status)')
              .then(insertResult => {
                console.log('Check-in successful:', {
                  id: insertResult.recordset[0].id,
                  workerId,
                  checkInTime
                });
                res.json({ 
                  success: true,
                  data: {
                    id: insertResult.recordset[0].id, 
                    workerId, 
                    checkInTime
                  },
                  message: 'Successfully checked in'
                });
              })
              .catch(err => {
                console.error('Error inserting check-in record:', err);
                res.status(500).json({ 
                  success: false,
                  error: 'Database error',
                  message: 'Failed to record check-in'
                });
              });
          })
          .catch(err => {
            console.error('Database error during check-in:', err);
            res.status(500).json({ 
              success: false,
              error: 'Database error',
              message: 'Failed to check attendance status'
            });
          });
      } else {
        console.error('Worker not found:', workerId);
        res.status(404).json({ 
          success: false,
          error: 'Worker not found',
          message: 'Invalid worker ID'
        });
      }
    })
    .catch(err => {
      console.error('Error checking worker existence:', err);
      res.status(500).json({ 
        success: false,
        error: 'Database error',
        message: 'Failed to verify worker'
      });
    });
});

app.post('/api/checkout', authenticateToken, (req, res) => {
  console.log('Check-out request received:', {
    workerId: req.body.workerId,
    user: req.user,
    headers: req.headers,
    body: req.body
  });

  if (!req.body.workerId) {
    console.error('Missing workerId in request body');
    return res.status(400).json({ 
      success: false,
      error: 'Worker ID is required',
      message: 'Please provide a valid worker ID'
    });
  }

  const { workerId } = req.body;
  const checkOutTime = new Date().toISOString();
  
  console.log('Starting checkout process for worker:', workerId);
  
  // First check if worker is checked in today
  pool.request()
    .input('workerId', sql.NVarChar, workerId)
    .input('today', sql.DateTime, new Date())
    .query(`
      SELECT * FROM attendance 
      WHERE worker_id = @workerId 
      AND date(check_in_time) = date(@today)
      AND check_out_time IS NULL
    `)
    .then(result => {
      const existingCheckIn = result.recordset[0];
      if (existingCheckIn) {
        console.log('Found existing check-in record:', existingCheckIn);
        
        // Update check-out time
        pool.request()
          .input('checkOutTime', sql.DateTime, checkOutTime)
          .input('workerId', sql.NVarChar, workerId)
          .query(`
            UPDATE attendance 
            SET check_out_time = @checkOutTime 
            WHERE worker_id = @workerId 
            AND date(check_in_time) = date(@today)
            AND check_out_time IS NULL
          `)
          .then(updateResult => {
            console.log('Update result:', {
              changes: updateResult.rowsAffected,
              lastID: updateResult.recordset[0].id,
              sql: updateResult.recordset[0].sql
            });
            
            if (updateResult.rowsAffected === 0) {
              console.log('No records updated for check-out');
              return res.status(400).json({ 
                success: false,
                error: 'Check-out failed',
                message: 'Failed to process check-out'
              });
            }
            
            console.log('Check-out successful:', {
              workerId,
              checkOutTime
            });
            
            res.json({ 
              success: true,
              data: {
                workerId, 
                checkOutTime
              },
              message: 'Successfully checked out'
            });
          })
          .catch(err => {
            console.error('Error updating check-out time:', err);
            res.status(500).json({ 
              success: false,
              error: 'Database error',
              message: 'Failed to record check-out'
            });
          });
      } else {
        console.log('Worker is not checked in today:', workerId);
        res.status(400).json({ 
          success: false,
          error: 'Not checked in',
          message: 'You are not currently checked in'
        });
      }
    })
    .catch(err => {
      console.error('Database error during check-out:', err);
      res.status(500).json({ 
        success: false,
        error: 'Database error',
        message: 'Failed to check attendance status'
      });
    });
});

app.get('/api/attendance/:workerId', authenticateToken, (req, res) => {
  const { workerId } = req.params;
  const { startDate, endDate } = req.query;
  
  let query = 'SELECT * FROM attendance WHERE worker_id = @workerId';
  const params = [workerId];
  
  if (startDate && endDate) {
    query += ' AND check_in_time BETWEEN @startDate AND @endDate';
    params.push(startDate, endDate);
  }
  
  pool.request()
    .input('workerId', sql.NVarChar, workerId)
    .input('startDate', sql.DateTime, startDate)
    .input('endDate', sql.DateTime, endDate)
    .query(query, params)
    .then(result => {
      res.json(result.recordset);
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.get('/api/notifications/:workerId', authenticateToken, (req, res) => {
  const { workerId } = req.params;
  
  pool.request()
    .input('workerId', sql.NVarChar, workerId)
    .query('SELECT * FROM notifications WHERE worker_id = @workerId ORDER BY created_at DESC')
    .then(result => {
      res.json(result.recordset);
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.post('/api/notifications', authenticateToken, (req, res) => {
  const { workerId, message, type } = req.body;
  
  pool.request()
    .input('workerId', sql.NVarChar, workerId)
    .input('message', sql.NVarChar, message)
    .input('type', sql.NVarChar, type)
    .query('INSERT INTO notifications (worker_id, message, type) VALUES (@workerId, @message, @type)')
    .then(result => {
      res.json({ id: result.recordset[0].id, workerId, message, type });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.post('/api/worker-login', (req, res) => {
  const { id, password } = req.body;
  
  pool.request()
    .input('id', sql.NVarChar, id)
    .query('SELECT * FROM workers WHERE id = @id')
    .then(result => {
      const worker = result.recordset[0];
      if (worker) {
        const validPassword = bcrypt.compareSync(password, worker.password);
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
      } else {
        res.status(401).json({ error: 'Invalid worker ID' });
      }
    })
    .catch(err => {
      res.status(500).json({ error: 'Database error' });
    });
});

app.get('/api/attendance/status/:workerId', authenticateToken, (req, res) => {
  const { workerId } = req.params;
  const today = new Date().toISOString().split('T')[0];
  
  console.log('Checking status for worker:', workerId);
  
  pool.request()
    .input('workerId', sql.NVarChar, workerId)
    .input('today', sql.DateTime, today)
    .query(`
      SELECT * FROM attendance 
      WHERE worker_id = @workerId 
      AND date(check_in_time) = date(@today)
      AND check_out_time IS NULL
    `)
    .then(result => {
      const record = result.recordset[0];
      if (record) {
        console.log('Status check result:', record);
        
        res.json({
          success: true,
          data: {
            isCheckedIn: !!record,
            lastCheckIn: record.check_in_time || null
          }
        });
      } else {
        console.log('Status check result:', null);
        
        res.json({
          success: true,
          data: {
            isCheckedIn: false,
            lastCheckIn: null
          }
        });
      }
    })
    .catch(err => {
      console.error('Error checking status:', err);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to check status'
      });
    });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT 1 as status');
    res.json({ 
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Get worker's current shift
app.get('/api/shifts/current/:workerId', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.params;
    const today = new Date();
    
    const result = await pool.request()
      .input('workerId', sql.NVarChar, workerId)
      .input('today', sql.DateTime, today)
      .query(`
        SELECT TOP 1 * FROM shifts 
        WHERE worker_id = @workerId 
        AND CONVERT(DATE, start_time) = CONVERT(DATE, @today)
        AND status = 'scheduled'
        ORDER BY start_time DESC
      `);

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        data: result.recordset[0]
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No shift found',
        message: 'No scheduled shift found for today'
      });
    }
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

// Get worker's attendance summary
app.get('/api/attendance/summary/:workerId', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate } = req.query;
    
    const query = `
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN check_out_time IS NOT NULL THEN 1 ELSE 0 END) as completed_days,
        MIN(check_in_time) as first_check_in,
        MAX(check_out_time) as last_check_out
      FROM attendance 
      WHERE worker_id = @workerId
      ${startDate && endDate ? 'AND check_in_time BETWEEN @startDate AND @endDate' : ''}
    `;

    const request = pool.request()
      .input('workerId', sql.NVarChar, workerId);

    if (startDate && endDate) {
      request.input('startDate', sql.DateTime, startDate)
             .input('endDate', sql.DateTime, endDate);
    }

    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

// Update worker profile
app.put('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, position } = req.body;

    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .query(`
        UPDATE workers 
        SET name = @name,
            email = @email,
            department = @department,
            position = @position
        WHERE id = @id
      `);

    if (result.rowsAffected[0] > 0) {
      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE notifications 
        SET read = 1 
        WHERE id = @id
      `);

    if (result.rowsAffected[0] > 0) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
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