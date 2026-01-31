const fs = require('fs');
const path = require('path');

const getKeyFilePath = () => {
  const configuredPath = process.env.CPABE_KEYSTORE_PATH;
  if (configuredPath && typeof configuredPath === 'string') return configuredPath;
  return path.join(__dirname, '..', 'data', 'cpabeKeys.json');
};

const ensureDir = async (filePath) => {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
};

const readStore = async () => {
  const filePath = getKeyFilePath();
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = async (store) => {
  const filePath = getKeyFilePath();
  await ensureDir(filePath);
  await fs.promises.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
};

exports.getUserRideKey = async ({ userId, rideId, kind }) => {
  const store = await readStore();
  const u = store[String(userId)];
  if (!u) return null;
  const rideKeys = u.rideKeys || {};
  const entry = rideKeys[String(rideId)];
  if (!entry) return null;
  return entry[kind] || null;
};

exports.setUserRideKey = async ({ userId, rideId, kind, secretKeyB64 }) => {
  const store = await readStore();
  const uid = String(userId);
  const rid = String(rideId);
  if (!store[uid]) store[uid] = {};
  if (!store[uid].rideKeys) store[uid].rideKeys = {};
  if (!store[uid].rideKeys[rid]) store[uid].rideKeys[rid] = {};
  store[uid].rideKeys[rid][kind] = secretKeyB64;
  await writeStore(store);
};
