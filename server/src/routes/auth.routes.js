const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controllers');
const { protect } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many refresh requests. Please login again.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
});

router.post('/login', loginLimiter, authController.login);
router.post('/register', registerLimiter, authController.register);
router.post('/change-password', protect, authController.changePassword);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.me);

module.exports = router;