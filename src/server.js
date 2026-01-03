// server/src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const formRoutes = require('./routes/form.routes');
const responseRoutes = require('./routes/response.routes');
const templateRoutes = require('./routes/template.routes'); // optional
const uploadRoutes = require('./routes/upload.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const sharingRoutes = require('./routes/sharing.routes');
const versionRoutes = require('./routes/version.routes');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
connectDB();

// ✅ create app BEFORE using app.use(...)
const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ 
  origin: true, // Allow all origins in development
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 200 to 500 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/';
  }
});
app.use('/api', limiter);

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Form Builder API running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/templates', templateRoutes); // make sure this line is AFTER app is defined
// upload route
app.use('/api/uploads', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', sharingRoutes);
app.use('/api', versionRoutes);

// serve uploaded files statically with CORS headers
const uploadsStatic = path.join(__dirname, '..', 'uploads');
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use('/uploads', express.static(uploadsStatic));

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
