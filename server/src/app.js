const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const apiRoutes = require('./routes');
const securityHeaders = require('./middleware/securityHeaders');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');

app.use(securityHeaders);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const reqOrigin = origin.replace(/\/+$/, '');
      if (env.NODE_ENV === 'production') {
        const allowedOrigins = (env.CLIENT_URL || '')
          .split(',')
          .map((o) => o.trim().replace(/\/+$/, ''));
        if (
          allowedOrigins.includes(reqOrigin) ||
          reqOrigin.endsWith('.vercel.app') ||
          reqOrigin.endsWith('.onrender.com') ||
          reqOrigin.includes('localhost')
        ) {
          return callback(null, true);
        }
        return callback(new Error('CORS blocked for origin: ' + origin), false);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sai Dental Clinic API',
    endpoints: ['/api/health'],
  });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
