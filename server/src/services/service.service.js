const Service = require('../models/Service');
const { SERVICE_CATEGORIES } = Service;
const { nextServiceCode } = require('../models/Counter');
const { recordAudit } = require('../utils/audit');
const ApiError = require('../utils/ApiError');

function assertCategory(c) {
  if (c && !SERVICE_CATEGORIES.includes(c)) throw new ApiError(400, 'Invalid service category.');
  return c;
}

function sanitize(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    name: d.name,
    code: d.code,
    category: d.category,
    description: d.description || '',
    unitPrice: d.unitPrice,
    taxPercent: d.taxPercent,
    isActive: d.isActive,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

async function create(payload, actor) {
  const name = String((payload && payload.name) || '').trim();
  if (!name) throw new ApiError(400, 'Service name is required.');

  const code = String((payload && payload.code) || '').trim().toUpperCase() || (await nextServiceCode());
  const existing = await Service.findOne({ code });
  if (existing) throw new ApiError(409, 'A service with this code already exists.');

  const unitPrice = Number(payload && payload.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new ApiError(400, 'Unit price must be a non-negative number.');
  const taxPercent = Number((payload && payload.taxPercent) || 0);
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
    throw new ApiError(400, 'Tax percent must be between 0 and 100.');
  }

  const doc = await Service.create({
    name,
    code,
    category: assertCategory(payload.category) || 'procedure',
    description: (payload && payload.description) ? String(payload.description).trim() : '',
    unitPrice,
    taxPercent,
    isActive: payload && payload.isActive === false ? false : true,
    createdBy: actor._id,
  });

  await recordAudit({
    user: actor,
    action: 'create',
    entity: 'service',
    entityId: doc._id,
    description: `Service "${doc.name}" (${doc.code}) created at ₹${doc.unitPrice}`,
    meta: { code: doc.code, unitPrice: doc.unitPrice },
  });

  return sanitize(doc);
}

async function list({ q, category, activeOnly } = {}) {
  const query = {};
  if (category) query.category = category;
  if (activeOnly) query.isActive = true;
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: rx }, { code: rx }, { description: rx }];
  }
  const docs = await Service.find(query).sort({ name: 1 });
  return docs.map(sanitize);
}

async function get(id, actor) {
  const doc = await Service.findById(id);
  if (!doc) throw new ApiError(404, 'Service not found');
  return sanitize(doc);
}

async function update(id, payload, actor) {
  const doc = await Service.findById(id);
  if (!doc) throw new ApiError(404, 'Service not found');

  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) throw new ApiError(400, 'Service name is required.');
    doc.name = name;
  }
  if (payload.code !== undefined) {
    const code = String(payload.code).trim().toUpperCase();
    if (!code) throw new ApiError(400, 'Service code is required.');
    const dup = await Service.findOne({ code, _id: { $ne: doc._id } });
    if (dup) throw new ApiError(409, 'A service with this code already exists.');
    doc.code = code;
  }
  if (payload.category !== undefined) doc.category = assertCategory(payload.category);
  if (payload.description !== undefined) doc.description = String(payload.description).trim();
  if (payload.unitPrice !== undefined) {
    const unitPrice = Number(payload.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new ApiError(400, 'Unit price must be a non-negative number.');
    doc.unitPrice = unitPrice;
  }
  if (payload.taxPercent !== undefined) {
    const taxPercent = Number(payload.taxPercent);
    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      throw new ApiError(400, 'Tax percent must be between 0 and 100.');
    }
    doc.taxPercent = taxPercent;
  }
  if (payload.isActive !== undefined) doc.isActive = Boolean(payload.isActive);

  await doc.save();

  await recordAudit({
    user: actor,
    action: 'update',
    entity: 'service',
    entityId: doc._id,
    description: `Service "${doc.name}" (${doc.code}) updated`,
    meta: { code: doc.code, unitPrice: doc.unitPrice, isActive: doc.isActive },
  });

  return sanitize(doc);
}

module.exports = { create, list, get, update };