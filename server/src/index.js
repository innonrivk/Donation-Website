import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import contentRoutes from './routes/content.js';
import donationRoutes from './routes/donations.js';
import webhookRoutes from './routes/webhooks.js';
import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscriptions.js';
import milestoneRoutes from './routes/milestones.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy headers (e.g. Nginx, Vite proxy) for correct client IP detection in rate limiting
app.set('trust proxy', 1);

// Stripe webhooks need raw body, so mount BEFORE json middleware
app.use('/api/v1/webhooks', webhookRoutes);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/v1/content', contentRoutes);

// Rate limit donation endpoints: 100 requests per IP per 15 minutes in production
const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 999999,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many donation attempts. Please try again in a few minutes.',
  },
});
app.use('/api/v1/donations', donationLimiter, donationRoutes);

// Auth routes — rate limited to 100 requests per IP per 15 minutes in production
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 999999,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many requests. Please try again later.',
  },
});
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/milestones', milestoneRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`   Content: http://localhost:${PORT}/api/v1/content`);
  console.log(`   Auth: http://localhost:${PORT}/api/v1/auth\n`);
});

