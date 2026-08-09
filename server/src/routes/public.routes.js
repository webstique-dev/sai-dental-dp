const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const publicSite = require('../services/public.site.service');

const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many booking requests from this device. Please try again later.' },
});

router.get(
  '/services',
  asyncHandler(async (req, res) => {
    const services = await publicSite.listPublicServices();
    res.json({ success: true, services });
  }),
);

router.get(
  '/doctors',
  asyncHandler(async (req, res) => {
    const doctors = await publicSite.listPublicDoctors();
    res.json({ success: true, doctors });
  }),
);

router.post(
  '/appointments/request',
  bookingLimiter,
  asyncHandler(async (req, res) => {
    const booking = await publicSite.requestAppointment(req.body);
    res.status(201).json({ success: true, message: 'Booking received. Our team will confirm shortly.', booking });
  }),
);

module.exports = router;