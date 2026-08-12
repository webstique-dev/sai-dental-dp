const ClinicSettings = require('../models/ClinicSettings');
const { recordAudit } = require('../utils/audit');

async function getSettings() {
  let doc = await ClinicSettings.findOne().sort({ createdAt: -1 });
  if (!doc) {
    doc = await ClinicSettings.create({});
  }
  return doc;
}

async function updateSettings(payload, actor) {
  let doc = await ClinicSettings.findOne().sort({ createdAt: -1 });
  if (!doc) {
    doc = new ClinicSettings({});
  }

  if (payload.clinicName !== undefined) doc.clinicName = String(payload.clinicName).trim();
  if (payload.tagline !== undefined) doc.tagline = String(payload.tagline).trim();
  if (payload.phone !== undefined) doc.phone = String(payload.phone).trim();
  if (payload.email !== undefined) doc.email = String(payload.email).trim();
  if (payload.address !== undefined) doc.address = String(payload.address).trim();
  if (payload.city !== undefined) doc.city = String(payload.city).trim();
  if (payload.state !== undefined) doc.state = String(payload.state).trim();
  if (payload.pincode !== undefined) doc.pincode = String(payload.pincode).trim();
  if (payload.workingHours !== undefined) doc.workingHours = String(payload.workingHours).trim();
  if (payload.slotDurationMinutes !== undefined) doc.slotDurationMinutes = Number(payload.slotDurationMinutes) || 30;

  if (Array.isArray(payload.branches)) {
    doc.branches = payload.branches.map((b) => ({
      name: String(b.name || 'Branch').trim(),
      address: String(b.address || '').trim(),
      phone: String(b.phone || '').trim(),
      isPrimary: Boolean(b.isPrimary),
    }));
  }

  doc.updatedBy = actor._id;
  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'clinic-settings',
    entityId: doc._id,
    description: `Clinic profile settings updated by admin`,
    meta: { clinicName: doc.clinicName },
  });

  return doc;
}

module.exports = { getSettings, updateSettings };
