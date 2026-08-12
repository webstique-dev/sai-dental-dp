const mongoose = require('mongoose');

const clinicSettingsSchema = new mongoose.Schema(
  {
    clinicName: { type: String, required: true, trim: true, default: 'Sai Dental Clinic' },
    tagline: { type: String, trim: true, default: 'Advanced Dental Care & Implant Center' },
    phone: { type: String, trim: true, default: '+91 98400 12345' },
    email: { type: String, trim: true, default: 'info@saidental.com' },
    address: { type: String, trim: true, default: '123 Healthcare Avenue, Anna Nagar' },
    city: { type: String, trim: true, default: 'Chennai' },
    state: { type: String, trim: true, default: 'Tamil Nadu' },
    pincode: { type: String, trim: true, default: '600040' },
    workingHours: { type: String, trim: true, default: 'Mon - Sat: 9:00 AM - 8:00 PM, Sun: 10:00 AM - 1:00 PM' },
    slotDurationMinutes: { type: Number, default: 30, min: 10, max: 120 },
    branches: [
      {
        name: { type: String, trim: true, default: 'Main Branch' },
        address: { type: String, trim: true, default: 'Anna Nagar, Chennai' },
        phone: { type: String, trim: true, default: '+91 98400 12345' },
        isPrimary: { type: Boolean, default: true },
      },
    ],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ClinicSettings', clinicSettingsSchema);
