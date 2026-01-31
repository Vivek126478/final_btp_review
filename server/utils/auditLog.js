const fs = require('fs');
const path = require('path');

const getLogFilePath = () => {
  const configuredPath = process.env.AUDIT_LOG_PATH;
  if (configuredPath && typeof configuredPath === 'string') return configuredPath;
  return path.join(__dirname, '..', 'logs', 'audit.log.jsonl');
};

const safeJson = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
};

const ensureDir = async (filePath) => {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
};

exports.writeAuditLog = async ({
  action,
  actor,
  rideId,
  ip,
  userAgent,
  before,
  after,
  meta
}) => {
  const filePath = getLogFilePath();
  await ensureDir(filePath);

  const entry = {
    ts: new Date().toISOString(),
    action,
    actor: safeJson(actor || null),
    rideId: rideId ?? null,
    ip: ip || null,
    userAgent: userAgent || null,
    before: before !== undefined ? safeJson(before) : undefined,
    after: after !== undefined ? safeJson(after) : undefined,
    meta: meta !== undefined ? safeJson(meta) : undefined
  };

  const line = JSON.stringify(entry) + '\n';
  await fs.promises.appendFile(filePath, line, { encoding: 'utf8' });
};
