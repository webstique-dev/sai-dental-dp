const Patient = require('../models/Patient');
const { Appointment } = require('../models/Appointment');
const { Visit } = require('../models/Visit');
const { Consultation } = require('../models/Consultation');
const Diagnosis = require('../models/Diagnosis');
const TreatmentPlan = require('../models/TreatmentPlan');
const Prescription = require('../models/Prescription');
const Investigation = require('../models/Investigation');
const TreatmentRecord = require('../models/TreatmentRecord');
const FollowUp = require('../models/FollowUp');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Medicine = require('../models/Medicine');
const MedicineBatch = require('../models/MedicineBatch');
const Dispensing = require('../models/Dispensing');
const InventoryTransaction = require('../models/InventoryTransaction');
const Service = require('../models/Service');
const { User } = require('../models/User');
const { AuditLog } = require('../models/AuditLog');
const ClinicSettings = require('../models/ClinicSettings');
const { recordAudit } = require('../utils/audit');

async function exportDatabaseBackup(actor) {
  const [
    patients,
    appointments,
    visits,
    consultations,
    diagnoses,
    treatmentPlans,
    prescriptions,
    investigations,
    treatmentRecords,
    followUps,
    invoices,
    payments,
    medicines,
    medicineBatches,
    dispensings,
    inventoryTransactions,
    services,
    users,
    clinicSettings,
  ] = await Promise.all([
    Patient.find().lean(),
    Appointment.find().lean(),
    Visit.find().lean(),
    Consultation.find().lean(),
    Diagnosis.find().lean(),
    TreatmentPlan.find().lean(),
    Prescription.find().lean(),
    Investigation.find().lean(),
    TreatmentRecord.find().lean(),
    FollowUp.find().lean(),
    Invoice.find().lean(),
    Payment.find().lean(),
    Medicine.find().lean(),
    MedicineBatch.find().lean(),
    Dispensing.find().lean(),
    InventoryTransaction.find().lean(),
    Service.find().lean(),
    User.find({}, '-password -refreshToken').lean(),
    ClinicSettings.find().lean(),
  ]);

  await recordAudit({
    user: actor,
    action: 'other',
    entity: 'system',
    description: `Full database JSON backup export triggered by admin`,
    meta: { patientCount: patients.length, totalCollections: 19 },
  });

  return {
    exportedAt: new Date().toISOString(),
    system: 'Sai Dental Clinic Digital Platform',
    version: '1.0.0',
    exportedBy: actor.name || actor.email,
    stats: {
      patients: patients.length,
      appointments: appointments.length,
      visits: visits.length,
      consultations: consultations.length,
      diagnoses: diagnoses.length,
      treatmentPlans: treatmentPlans.length,
      prescriptions: prescriptions.length,
      investigations: investigations.length,
      treatmentRecords: treatmentRecords.length,
      followUps: followUps.length,
      invoices: invoices.length,
      payments: payments.length,
      medicines: medicines.length,
      medicineBatches: medicineBatches.length,
      dispensings: dispensings.length,
      inventoryTransactions: inventoryTransactions.length,
      services: services.length,
      users: users.length,
    },
    data: {
      patients,
      appointments,
      visits,
      consultations,
      diagnoses,
      treatmentPlans,
      prescriptions,
      investigations,
      treatmentRecords,
      followUps,
      invoices,
      payments,
      medicines,
      medicineBatches,
      dispensings,
      inventoryTransactions,
      services,
      users,
      clinicSettings,
    },
  };
}

async function listAuditLogs({ limit = 100, entity } = {}) {
  const query = {};
  if (entity) query.entity = entity;
  return AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 100)
    .populate('user', 'name role email');
}

module.exports = { exportDatabaseBackup, listAuditLogs };
