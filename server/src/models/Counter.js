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

async function nextTreatmentPlanNumber() {
  const seq = await nextSequence('treatmentPlanNumber');
  const year = new Date().getFullYear();
  return `PL-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextPrescriptionNumber() {
  const seq = await nextSequence('prescriptionNumber');
  const year = new Date().getFullYear();
  return `RX-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextInvestigationNumber() {
  const seq = await nextSequence('investigationNumber');
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextTreatmentRecordNumber() {
  const seq = await nextSequence('treatmentRecordNumber');
  const year = new Date().getFullYear();
  return `TR-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextFollowUpNumber() {
  const seq = await nextSequence('followUpNumber');
  const year = new Date().getFullYear();
  return `FU-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextInvoiceNumber() {
  const seq = await nextSequence('invoiceNumber');
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextServiceCode() {
  const seq = await nextSequence('serviceCode');
  return `SRV-${String(seq).padStart(5, '0')}`;
}

async function nextPaymentNumber() {
  const seq = await nextSequence('paymentNumber');
  const year = new Date().getFullYear();
  return `RCT-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextDispensingNumber() {
  const seq = await nextSequence('dispensingNumber');
  const year = new Date().getFullYear();
  return `DISP-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextReturnNumber() {
  const seq = await nextSequence('returnNumber');
  const year = new Date().getFullYear();
  return `RET-${year}-${String(seq).padStart(6, '0')}`;
}

async function nextDailyTokenNumber(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const dateStr = d.toISOString().split('T')[0];
  const seq = await nextSequence(`token-${dateStr}`);
  return `T-${String(seq).padStart(3, '0')}`;
}

module.exports = {
  Counter,
  nextSequence,
  nextPatientId,
  nextOpNumber,
  nextAppointmentNumber,
  nextTreatmentPlanNumber,
  nextPrescriptionNumber,
  nextInvestigationNumber,
  nextTreatmentRecordNumber,
  nextFollowUpNumber,
  nextInvoiceNumber,
  nextServiceCode,
  nextPaymentNumber,
  nextDispensingNumber,
  nextReturnNumber,
  nextDailyTokenNumber,
};