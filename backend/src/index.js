const express = require('express');
const cors = require('cors');
const sql = require('mssql/msnodesqlv8');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const config = {
    connectionString: "Driver={SQL Server Native Client 11.0};Server=GEZIMKRASNIQI\\SQLEXPRESS;Database=CheckInPizza;Trusted_Connection=Yes;",
    driver: 'msnodesqlv8'
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
    pool = await sql.connect(config);
    console.log('Connected to SQL Server database');
    
    // Create initial admin user
    await createInitialAdminUser();
    // Create worker users
    await createWorkerUsers();
    // Create attendance table
    await createAttendanceTable();
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

// Function to create initial admin user
async function createInitialAdminUser() {
  try {
    const request = new sql.Request();
    
    // Check if admin user exists
    const checkResult = await request
      .input('adminEmail', sql.NVarChar, 'admin@pizzeria.com')
      .query('SELECT * FROM workers WHERE email = @adminEmail');
    
    if (checkResult.recordset.length === 0) {
      // Create admin user if not exists
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await request
        .input('id', sql.NVarChar, 'admin123')
        .input('name', sql.NVarChar, 'Admin User')
        .input('email', sql.NVarChar, 'admin@pizzeria.com')
        .input('password', sql.NVarChar, hashedPassword)
        .input('role', sql.NVarChar, 'admin')
        .input('department', sql.NVarChar, 'Management')
        .input('position', sql.NVarChar, 'System Administrator')
        .input('hire_date', sql.DateTime, new Date())
        .query(`
          INSERT INTO workers (id, name, email, password, role, department, position, hire_date)
          VALUES (@id, @name, @email, @password, @role, @department, @position, @hire_date)
        `);
      console.log('Initial admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
}

// Function to create worker users
async function createWorkerUsers() {
  try {
    const request = new sql.Request();
    
    // Create kitchen worker
    const kitchenWorkerPassword = await bcrypt.hash('kitchen123', 10);
    console.log('Creating kitchen worker...');
    const kitchenResult = await request
      .input('id', sql.NVarChar, 'kitchen1')
      .input('name', sql.NVarChar, 'Kitchen Worker')
      .input('email', sql.NVarChar, 'kitchen@pizzeria.com')
      .input('password', sql.NVarChar, kitchenWorkerPassword)
      .input('role', sql.NVarChar, 'worker')
      .input('department', sql.NVarChar, 'Kitchen')
      .input('position', sql.NVarChar, 'Pizza Chef')
      .input('hire_date', sql.DateTime, new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM workers WHERE email = @email OR id = @id)
        INSERT INTO workers (id, name, email, password, role, department, position, hire_date)
        VALUES (@id, @name, @email, @password, @role, @department, @position, @hire_date)
      `);
    console.log('Kitchen worker creation result:', kitchenResult);

    // Create service worker
    const serviceWorkerPassword = await bcrypt.hash('service123', 10);
    console.log('Creating service worker...');
    const serviceResult = await request
      .input('id', sql.NVarChar, 'service1')
      .input('name', sql.NVarChar, 'Service Worker')
      .input('email', sql.NVarChar, 'service@pizzeria.com')
      .input('password', sql.NVarChar, serviceWorkerPassword)
      .input('role', sql.NVarChar, 'worker')
      .input('department', sql.NVarChar, 'Service')
      .input('position', sql.NVarChar, 'Waitress')
      .input('hire_date', sql.DateTime, new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM workers WHERE email = @email OR id = @id)
        INSERT INTO workers (id, name, email, password, role, department, position, hire_date)
        VALUES (@id, @name, @email, @password, @role, @department, @position, @hire_date)
      `);
    console.log('Service worker creation result:', serviceResult);

    // Verify workers were created
    const verifyRequest = new sql.Request();
    const workers = await verifyRequest.query('SELECT * FROM workers WHERE role = \'worker\'');
    console.log('All workers in database:', workers.recordset);

    console.log('Worker users created successfully');
  } catch (err) {
    console.error('Error creating worker users:', err);
  }
}

// Create attendance table during initialization
async function createAttendanceTable() {
  try {
    const request = new sql.Request();
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'attendance')
      CREATE TABLE attendance (
        id INT IDENTITY(1,1) PRIMARY KEY,
        worker_id NVARCHAR(50) NOT NULL,
        check_in_time DATETIME NOT NULL,
        check_out_time DATETIME,
        total_hours DECIMAL(10,2),
        status NVARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (worker_id) REFERENCES workers(id)
      )
    `);

    // Add total_hours column if it doesn't exist
    await request.query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('attendance') 
        AND name = 'total_hours'
      )
      BEGIN
        ALTER TABLE attendance
        ADD total_hours DECIMAL(10,2)
      END
    `);

    console.log('Attendance table created or updated successfully');
  } catch (err) {
    console.error('Error creating/updating attendance table:', err);
  }
}

// Initialize database connection
initializeDatabase();

// Basic test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected'
  });
});

// Debug logging for all routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  console.log('Login attempt:', req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    const request = new sql.Request();
    const result = await request
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM workers WHERE email = @email');

    const user = result.recordset[0];

    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    console.log('Login successful for user:', email);
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error('Login error:', err);
    handleDatabaseError(err, res);
  }
});

// Worker login endpoint (alternative URL)
app.post('/api/worker-login', async (req, res) => {
  console.log('Worker login attempt:', req.body);
  try {
    const { email, id, password } = req.body;

    if ((!email && !id) || !password) {
      console.log('Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email/ID and password are required'
      });
    }

    const request = new sql.Request();
    let result;
    
    // If id looks like an email, treat it as email
    if (id && id.includes('@')) {
      console.log('Searching by email:', id);
      result = await request
        .input('email', sql.NVarChar, id)
        .query('SELECT * FROM workers WHERE email = @email AND role = \'worker\'');
    } else if (email) {
      console.log('Searching by email:', email);
      result = await request
        .input('email', sql.NVarChar, email)
        .query('SELECT * FROM workers WHERE email = @email AND role = \'worker\'');
    } else {
      console.log('Searching by ID:', id);
      result = await request
        .input('id', sql.NVarChar, id)
        .query('SELECT * FROM workers WHERE id = @id AND role = \'worker\'');
    }

    console.log('Query result:', result.recordset);

    const worker = result.recordset[0];

    if (!worker) {
      console.log('Worker not found or not a worker:', email || id);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    const validPassword = await bcrypt.compare(password, worker.password);
    console.log('Password validation result:', validPassword);
    
    if (!validPassword) {
      console.log('Invalid password for worker:', email || id);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Create JWT token with worker-specific claims
    const token = jwt.sign(
      { 
        id: worker.id,
        email: worker.email,
        role: worker.role,
        department: worker.department,
        position: worker.position,
        isWorker: true
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from worker object
    const { password: _, ...workerWithoutPassword } = worker;

    console.log('Worker login successful:', email || id);
    res.json({
      success: true,
      token,
      worker: workerWithoutPassword
    });
  } catch (err) {
    console.error('Worker login error:', err);
    handleDatabaseError(err, res);
  }
});

// Check-in endpoint
app.post('/api/check-in', authenticateToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    console.log('Check-in attempt for worker:', workerId);

    const request = new sql.Request();

    // Check if worker already has an active check-in
    const activeCheck = await request
      .input('checkWorkerId', sql.NVarChar, workerId)
      .query('SELECT * FROM attendance WHERE worker_id = @checkWorkerId AND check_out_time IS NULL');

    if (activeCheck.recordset.length > 0) {
      console.log('Worker already checked in:', workerId);
      return res.status(400).json({
        success: false,
        error: 'Already checked in',
        message: 'You are already checked in'
      });
    }

    // Create new check-in record
    const checkInTime = new Date();
    const result = await request
      .input('insertWorkerId', sql.NVarChar, workerId)
      .input('checkInTime', sql.DateTime, checkInTime)
      .query(`
        INSERT INTO attendance (worker_id, check_in_time)
        VALUES (@insertWorkerId, @checkInTime);
        SELECT SCOPE_IDENTITY() as id;
      `);

    console.log('Check-in successful for worker:', workerId);
    res.json({
      success: true,
      message: 'Check-in successful',
      data: {
        checkInTime: checkInTime,
        id: result.recordset[0].id
      }
    });
  } catch (err) {
    console.error('Check-in error:', err);
    handleDatabaseError(err, res);
  }
});

// Check-out endpoint
app.post('/api/check-out', authenticateToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    console.log('Check-out attempt for worker:', workerId);

    const request = new sql.Request();

    // Get the active check-in record
    const activeCheck = await request
      .input('checkWorkerId', sql.NVarChar, workerId)
      .query('SELECT * FROM attendance WHERE worker_id = @checkWorkerId AND check_out_time IS NULL');

    if (activeCheck.recordset.length === 0) {
      console.log('No active check-in found for worker:', workerId);
      return res.status(400).json({
        success: false,
        error: 'Not checked in',
        message: 'You are not checked in'
      });
    }

    const checkInTime = new Date(activeCheck.recordset[0].check_in_time);
    const checkOutTime = new Date();
    const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // Convert to hours

    // Update the check-out record
    await request
      .input('updateWorkerId', sql.NVarChar, workerId)
      .input('checkOutTime', sql.DateTime, checkOutTime)
      .input('totalHours', sql.Decimal, totalHours)
      .query(`
        UPDATE attendance 
        SET check_out_time = @checkOutTime,
            total_hours = @totalHours,
            updated_at = GETDATE()
        WHERE worker_id = @updateWorkerId AND check_out_time IS NULL
      `);

    console.log('Check-out successful for worker:', workerId);
    res.json({
      success: true,
      message: 'Check-out successful',
      data: {
        checkOutTime: checkOutTime,
        totalHours: totalHours.toFixed(2)
      }
    });
  } catch (err) {
    console.error('Check-out error:', err);
    handleDatabaseError(err, res);
  }
});

// Get attendance records (admin only)
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins can view attendance records'
      });
    }

    const request = new sql.Request();
    const result = await request.query(`
      SELECT 
        a.*,
        w.name as worker_name,
        w.email as worker_email,
        w.department,
        w.position
      FROM attendance a
      JOIN workers w ON a.worker_id = w.id
      ORDER BY a.check_in_time DESC
    `);

    res.json({
      success: true,
      records: result.recordset
    });
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

// Get worker's own attendance records
app.get('/api/worker/attendance', authenticateToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    const request = new sql.Request();
    const result = await request
      .input('workerId', sql.NVarChar, workerId)
      .query(`
        SELECT * FROM attendance 
        WHERE worker_id = @workerId
        ORDER BY check_in_time DESC
      `);

    res.json({
      success: true,
      records: result.recordset
    });
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

// Get all workers (admin only)
app.get('/api/workers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins can view worker list'
      });
    }

    const request = new sql.Request();
    const result = await request.query(`
      SELECT 
        w.id,
        w.name,
        w.email,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM attendance a 
            WHERE a.worker_id = w.id 
            AND a.check_out_time IS NULL
          ) THEN 'Active'
          ELSE 'Passive'
        END as status,
        (
          SELECT TOP 1 
            a.check_in_time as 'check_in_time',
            a.check_out_time as 'check_out_time'
          FROM attendance a
          WHERE a.worker_id = w.id
          ORDER BY a.check_in_time DESC
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as latest_attendance
      FROM workers w
      WHERE w.role = 'worker'
      ORDER BY w.name;
    `);

    // Remove sensitive data
    const workers = result.recordset.map(worker => {
      const { password, ...workerWithoutPassword } = worker;
      return workerWithoutPassword;
    });

    res.json({
      success: true,
      workers
    });
  } catch (err) {
    console.error('Error fetching workers:', err);
    handleDatabaseError(err, res);
  }
});

// Notify status change endpoint
app.post('/api/notify-status-change', authenticateToken, async (req, res) => {
  try {
    const { workerId, status } = req.body;
    console.log('Status change notification:', { workerId, status });

    // Update the worker's status in the database
    const request = new sql.Request();
    await request
      .input('workerId', sql.NVarChar, workerId)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE workers 
        SET status = @status,
            updated_at = GETDATE()
        WHERE id = @workerId
      `);

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (err) {
    console.error('Error updating status:', err);
    handleDatabaseError(err, res);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `The requested endpoint ${req.url} does not exist`
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
