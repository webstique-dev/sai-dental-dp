const { AuditLog } = require('../models/AuditLog');

function clientIp(req) {
  return (
    (req.headers && req.headers['x-forwarded-for']) ||
    (req.socket && req.socket.remoteAddress) ||
    ''
  );
}

async function recordAudit({ user, action, entity, entityId, description, meta, req }) {
  const entry = {
    user: user ? user._id : null,
    action,
    entity,
    entityId: entityId || undefined,
    description,
    meta: meta || undefined,
  };
  if (req) entry.ip = clientIp(req);

  try {
    await AuditLog.create(entry);
  } catch (err) {
    console.error('[audit] failed to record:', err.message);
  }
}

module.exports = { recordAudit, clientIp };