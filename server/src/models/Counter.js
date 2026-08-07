const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Counter = mongoose.model('Counter', counterSchema);

async function nextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return counter.seq;
}

async function nextPatientId() {
  const seq = await nextSequence('patientId');
  const year = new Date().getFullYear();
  return `PAT-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextOpNumber() {
  const seq = await nextSequence('opNumber');
  const year = new Date().getFullYear();
  return `OP-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextAppointmentNumber() {
  const seq = await nextSequence('appointmentNumber');
  const year = new Date().getFullYear();
  return `APT-${year}-${String(seq).padStart(6, '0')}`;
}

module.exports = {
  Counter,
  nextSequence,
  nextPatientId,
  nextOpNumber,
  nextAppointmentNumber,
};