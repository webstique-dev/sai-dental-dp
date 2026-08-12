const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'doctor', 'receptionist', 'pharmacy'];
const ROLE_LABELS = {
  admin: 'Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  pharmacy: 'Pharmacy',
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      required: true,
      enum: ROLES,
      default: 'receptionist',
      index: true,
    },
    specialization: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    refreshToken: { type: String, select: false, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    roleLabel: ROLE_LABELS[this.role],
    specialization: this.specialization,
    isActive: this.isActive,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES };