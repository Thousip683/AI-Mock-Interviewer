import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';

import connectDB from './config/db.js';
import interviewRoutes from './routes/interviews.js';


const app = express();
const PORT = process.env.PORT || 5000;

// Log startup environment check
console.log('====================================================');
console.log('🚀 Starting AI Mock Interview Server');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🔑 Clerk Auth: Publishable Key ${process.env.CLERK_PUBLISHABLE_KEY ? '✅ (Configured)' : '❌ (Missing)'}, Secret Key ${process.env.CLERK_SECRET_KEY ? '✅ (Configured)' : '❌ (Missing)'}`);
console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? `✅ (Key set, starts with ${process.env.GEMINI_API_KEY.substring(0, 6)}...)` : '❌ (Missing)'}`);
if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AIzaSy')) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY does not start with standard prefix "AIzaSy". If you receive [400 Bad Request] API key not valid, please verify your Gemini API key in server/.env.');
}
console.log(`🍃 MongoDB URI: ${process.env.MONGODB_URI ? '✅ (Configured)' : '❌ (Missing - will fallback to local storage)'}`);
console.log('====================================================');

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());

// Global HTTP Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[HTTP] 📥 ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusSymbol = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    console.log(`[HTTP] 📤 ${req.method} ${req.originalUrl} ${statusSymbol} ${status} (${duration}ms)`);
  });

  next();
});

app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/interviews', interviewRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  console.log('[HTTP] 💓 Health check endpoint queried');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[ERROR_HANDLER] ❌ Error processing [${req.method} ${req.originalUrl}] (Status: ${status}):`, err.message);
  if (err.stack) {
    console.error(`[ERROR_HANDLER] 📜 Stack Trace:\n${err.stack}`);
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development'
      ? { stack: err.stack }
      : {}),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server ready and listening on http://localhost:${PORT}`);
});