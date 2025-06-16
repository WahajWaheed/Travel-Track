import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Database Configuration
const sqlConfig = {
  user: "sa",
  password: "Str0ngP@ssword!",
  database: "TRAVELLING",
  server: "localhost",
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000
  },
  port: 1433
};

// File Upload Configuration
const ASSETS_PATH = '/Users/wahajwaheed/Documents/travel-app-uploads';
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(ASSETS_PATH, { recursive: true });
      cb(null, ASSETS_PATH);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Initialize Connection Pool
let pool;
let poolConnect;

const initializePool = async () => {
  try {
    pool = new sql.ConnectionPool(sqlConfig);
    poolConnect = pool.connect();
    console.log('Creating new connection pool');
    
    pool.on('error', err => {
      console.error('Pool error:', err);
      setTimeout(initializePool, 5000);
    });
    
    await poolConnect;
    console.log('Connected to SQL Server');
    return pool;
  } catch (err) {
    console.error('Initial connection error:', err);
    setTimeout(initializePool, 5000);
    throw err;
  }
};

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(ASSETS_PATH));

// Database Health Check Middleware
const checkDatabase = async (req, res, next) => {
  try {
    if (!pool.connected) await initializePool();
    await pool.request().query('SELECT 1 AS test');
    next();
  } catch (err) {
    console.error('Database connection check failed:', err);
    res.status(503).json({ 
      success: false, 
      message: "Database connection unavailable",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Initialize Database Connection
initializePool().then(() => {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Upload directory: ${ASSETS_PATH}`);
  });
});

// API Endpoints

// Authentication Endpoints
app.post('/login', checkDatabase, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.request()
      .input('email', sql.VarChar(255), email)
      .input('password', sql.VarChar(255), password)
      .query(`
        SELECT userID, accountName, userEmail, lastTrip,
               numOfCitiesTravelled, numOfForeignCitiesTravelled
        FROM user_info 
        WHERE userEmail = @email AND userPassword = @password
      `);

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        user: result.recordset[0],
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: "Invalid credentials",
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ 
      success: false, 
      message: "Database error",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/signup', checkDatabase, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const { accountName, email, age, password } = req.body;

    if (!accountName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
        timestamp: new Date().toISOString()
      });
    }

    await transaction.begin();
    const request = new sql.Request(transaction);

    // Check existing user
    const checkResult = await request
      .input('email', sql.VarChar(255), email)
      .input('accountName', sql.VarChar(255), accountName)
      .query(`
        SELECT CASE 
          WHEN userEmail = @email THEN 'email' 
          WHEN accountName = @accountName THEN 'username' 
        END AS conflict_type
        FROM user_info 
        WHERE userEmail = @email OR accountName = @accountName
      `);

    if (checkResult.recordset.length > 0) {
      await transaction.rollback();
      const conflictType = checkResult.recordset[0].conflict_type;
      return res.status(409).json({
        success: false,
        message: conflictType === 'email' 
          ? "Email already exists" 
          : "Username already taken",
        timestamp: new Date().toISOString()
      });
    }

    // Create new user
    const insertResult = await request
      .input('accountName', sql.VarChar(50), accountName)
      .input('email', sql.VarChar(100), email)
      .input('password', sql.VarChar(255), password)
      .input('age', sql.Int, age || null)
      .query(`
        INSERT INTO user_info 
        (accountName, userEmail, userPassword, userAge)
        OUTPUT INSERTED.userID, INSERTED.accountName
        VALUES (@accountName, @email, @password, @age)
      `);

    await transaction.commit();
    res.status(201).json({
      success: true,
      user: insertResult.recordset[0],
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Signup Error:', err);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Travel History Endpoints
app.post('/travel-history', checkDatabase, upload.array('images'), async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const requiredFields = ['userID', 'title', 'area_name', 'startDate', 'endDate'];
    const missing = requiredFields.filter(field => !req.body[field]);
    if (missing.length) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missing.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    await transaction.begin();
    const request = new sql.Request(transaction);

    // Insert travel history
    const historyResult = await request
      .input('userID', sql.Int, req.body.userID)
      .input('title', sql.NVarChar(255), req.body.title)
      .input('area_name', sql.NVarChar(255), req.body.area_name)
      .input('descriptionOfArea', sql.NVarChar(sql.MAX), req.body.description || '')
      .input('experiences', sql.NVarChar(sql.MAX), req.body.experiences || '')
      .input('startDate', sql.Date, req.body.startDate)
      .input('endDate', sql.Date, req.body.endDate)
      .query(`
        INSERT INTO travel_history 
        (userID, title, area_name, descriptionOfArea, experiences, startDate, end_date)
        OUTPUT INSERTED.history_id
        VALUES (@userID, @title, @area_name, @descriptionOfArea, @experiences, @startDate, @endDate)
      `);

    const historyId = historyResult.recordset[0].history_id;

    // Handle media uploads
    if (req.files?.length > 0) {
      for (const file of req.files) {
        await request
          .input('userID', sql.Int, req.body.userID)
          .input('history_id', sql.Int, historyId)
          .input('media_url', sql.NVarChar(255), file.filename)
          .query(`
            INSERT INTO travel_media 
            (userID, history_id, media_url, media_type) 
            VALUES (@userID, @history_id, @media_url, 'photo')
          `);
      }
    }

    await transaction.commit();
    res.status(201).json({ 
      success: true,
      message: 'Entry created successfully',
      historyId,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    await transaction.rollback();
    if (req.files) {
      req.files.forEach(file => fs.unlinkSync(path.join(ASSETS_PATH, file.filename)));
    }
    console.error('POST Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Submission failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/travel-history/:userID', checkDatabase, async (req, res) => {
  try {
    const userID = parseInt(req.params.userID);
    if (isNaN(userID)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID",
        timestamp: new Date().toISOString()
      });
    }

    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        SELECT 
          th.history_id,
          th.title,
          th.area_name,
          th.descriptionOfArea,
          th.experiences,
          CONVERT(varchar, th.startDate, 23) AS startDate,
          CONVERT(varchar, th.end_date, 23) AS end_date,
          tm.media_url
        FROM travel_history th
        LEFT JOIN travel_media tm ON th.history_id = tm.history_id
        WHERE th.userID = @userID
      `);

    const travels = result.recordset.reduce((acc, row) => {
      const existing = acc.find(t => t.history_id === row.history_id);
      const mediaUrl = row.media_url ? `/uploads/${row.media_url}` : null;

      if (existing) {
        if (mediaUrl) existing.media.push(mediaUrl);
      } else {
        acc.push({
          ...row,
          country: 'Pakistan',
          media: mediaUrl ? [mediaUrl] : []
        });
      }
      return acc;
    }, []);

    res.status(200).json({ 
      success: true, 
      travels,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('GET Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to load history',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Future Goals Endpoints
app.post('/future-goals', checkDatabase, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const { userID, title, description, target_date } = req.body;
    await transaction.begin();
    const request = new sql.Request(transaction);

    await request
      .input('userID', sql.Int, userID)
      .input('title', sql.NVarChar(255), title)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('target_date', sql.Date, target_date)
      .query(`
        INSERT INTO future_goals 
        (userID, title, description, target_date) 
        VALUES (@userID, @title, @description, @target_date)
      `);

    await transaction.commit();
    res.status(201).json({ 
      success: true, 
      message: "Future goal added",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ 
      success: false, 
      message: "Failed to add future goal",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/future-goals/:userID', checkDatabase, async (req, res) => {
  try {
    const userID = parseInt(req.params.userID);
    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        SELECT fg.*, u.accountName 
        FROM future_goals fg
        JOIN user_info u ON fg.userID = u.userID
        WHERE fg.userID = @userID
        ORDER BY fg.target_date ASC
      `);
    
    res.json({ 
      success: true, 
      goals: result.recordset,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Social Features Endpoints
app.post('/likes', checkDatabase, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const { userID, history_id } = req.body;
    await transaction.begin();
    const request = new sql.Request(transaction);

    const result = await request
      .input('userID', sql.Int, userID)
      .input('history_id', sql.Int, history_id)
      .query(`
        INSERT INTO likes (userID, history_id)
        OUTPUT INSERTED.like_id, INSERTED.created_at
        VALUES (@userID, @history_id)
      `);

    await transaction.commit();
    res.status(201).json({
      success: true,
      like: result.recordset[0],
      message: "Like added successfully",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    await transaction.rollback();
    if (err.number === 2627) {
      res.status(409).json({
        success: false,
        message: "User has already liked this travel entry",
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to add like",
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});


// Get comments for a trip
app.get('/comments/:history_id', checkDatabase, async (req, res) => {
  try {
    const result = await pool.request()
      .input('history_id', sql.Int, req.params.history_id)
      .query(`
        SELECT c.*, u.accountName 
        FROM comments c
        JOIN user_info u ON c.userID = u.userID
        WHERE c.history_id = @history_id
        ORDER BY c.created_at DESC
      `);
      
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get likes for a trip
app.get('/likes/:history_id', checkDatabase, async (req, res) => {
  try {
    const result = await pool.request()
      .input('history_id', sql.Int, req.params.history_id)
      .query(`
        SELECT l.*, u.accountName 
        FROM likes l
        JOIN user_info u ON l.userID = u.userID
        WHERE l.history_id = @history_id
        ORDER BY l.created_at DESC
      `);
      
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Modify the /travel-history endpoint in your backend
app.get('/travel-history', checkDatabase, async (req, res) => {
  try {
    // Perform the database query
    const result = await pool.request().query(`
      SELECT th.*, u.accountName, tm.media_url
      FROM travel_history th
      JOIN user_info u ON th.userID = u.userID
      LEFT JOIN travel_media tm ON th.history_id = tm.history_id
      ORDER BY th.startDate DESC
    `);
    
    // Return a success response with the travel data and timestamp
    res.json({ 
      success: true, 
      travels: result.recordset,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching travel history:', err); // Log the full error for debugging
    res.status(500).json({ 
      success: false, 
      error: 'An error occurred while fetching travel history', // Avoid revealing full error messages to the client
    });
  }
});
// Add this new endpoint for posting comments
app.post('/comments', checkDatabase, async (req, res) => {
  const { userID, history_id, comment_text } = req.body;
  
  try {
    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .input('history_id', sql.Int, history_id)
      .input('comment_text', sql.NVarChar(sql.MAX), comment_text)
      .query(`
        INSERT INTO comments (userID, history_id, comment_text)
        OUTPUT INSERTED.comment_id, INSERTED.created_at
        VALUES (@userID, @history_id, @comment_text)
      `);
      
    // Get commenter details
    const commenter = await pool.request()
      .input('userID', sql.Int, userID)
      .query('SELECT accountName FROM user_info WHERE userID = @userID');

    res.status(201).json({
      success: true,
      comment: {
        ...result.recordset[0],
        accountName: commenter.recordset[0].accountName,
        comment_text
      }
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: err.message
    });
  }
});
// Get travel history records by country
app.get('/travel-history-by-country', checkDatabase, async (req, res) => {
  try {
    const { area_name } = req.query;

    if (!area_name || area_name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Country parameter is required",
        timestamp: new Date().toISOString()
      });
    }

    const trimmedArea = area_name.trim();

    const result = await pool.request()
      .input('area_name', sql.NVarChar(100), trimmedArea)
      .query(`
        SELECT th.*, u.accountName
        FROM travel_history th
        JOIN user_info u ON th.userID = u.userID
        WHERE LOWER(th.area_name) = LOWER(@area_name)
        ORDER BY th.startDate DESC
      `);

    res.json({
      success: true,
      travels: result.recordset,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching travel history by country:', err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch travel history",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
    timestamp: new Date().toISOString()
  });
});