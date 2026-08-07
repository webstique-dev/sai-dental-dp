const asyncHandler = require('../utils/asyncHandler');

const getHealth = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dental Clinic API is running',
  });
});

module.exports = { getHealth };