const fs = require('fs');
const path = require('path');

const getStorePath = () => {
  const configured = process.env.MODERATION_STORE_PATH;
  if (configured && configured.trim()) return configured.trim();
  return path.join(__dirname, '..', 'data', 'moderationStore.json');
};

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const readStore = () => {
  const storePath = getStorePath();
  try {
    if (!fs.existsSync(storePath)) {
      return { hiddenRides: {}, hostBlocks: {}, spam: {} };
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    if (!raw) return { hiddenRides: {}, hostBlocks: {}, spam: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { hiddenRides: {}, hostBlocks: {}, spam: {} };
    parsed.hiddenRides = parsed.hiddenRides && typeof parsed.hiddenRides === 'object' ? parsed.hiddenRides : {};
    parsed.hostBlocks = parsed.hostBlocks && typeof parsed.hostBlocks === 'object' ? parsed.hostBlocks : {};
    parsed.spam = parsed.spam && typeof parsed.spam === 'object' ? parsed.spam : {};
    return parsed;
  } catch {
    return { hiddenRides: {}, hostBlocks: {}, spam: {} };
  }
};

const writeStore = (store) => {
  const storePath = getStorePath();
  ensureDir(storePath);
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
};

const uniq = (arr) => Array.from(new Set(arr));

exports.hideRideForUser = ({ userId, rideId }) => {
  const store = readStore();
  const u = String(userId);
  const r = String(rideId);
  const list = Array.isArray(store.hiddenRides[u]) ? store.hiddenRides[u] : [];
  store.hiddenRides[u] = uniq([...list, r]);
  writeStore(store);
  return store.hiddenRides[u];
};

exports.unhideRideForUser = ({ userId, rideId }) => {
  const store = readStore();
  const u = String(userId);
  const r = String(rideId);
  const list = Array.isArray(store.hiddenRides[u]) ? store.hiddenRides[u] : [];
  store.hiddenRides[u] = list.filter(x => x !== r);
  writeStore(store);
  return store.hiddenRides[u];
};

exports.getHiddenRideIdsForUser = ({ userId }) => {
  const store = readStore();
  const list = store.hiddenRides[String(userId)];
  return Array.isArray(list) ? list.map(x => String(x)) : [];
};

exports.blockRiderForHost = ({ hostId, riderId }) => {
  const store = readStore();
  const h = String(hostId);
  const r = String(riderId);
  const list = Array.isArray(store.hostBlocks[h]) ? store.hostBlocks[h] : [];
  store.hostBlocks[h] = uniq([...list, r]);
  writeStore(store);
  return store.hostBlocks[h];
};

exports.unblockRiderForHost = ({ hostId, riderId }) => {
  const store = readStore();
  const h = String(hostId);
  const r = String(riderId);
  const list = Array.isArray(store.hostBlocks[h]) ? store.hostBlocks[h] : [];
  store.hostBlocks[h] = list.filter(x => x !== r);
  writeStore(store);
  return store.hostBlocks[h];
};

exports.isRiderBlockedByHost = ({ hostId, riderId }) => {
  const store = readStore();
  const list = store.hostBlocks[String(hostId)];
  if (!Array.isArray(list)) return false;
  return list.includes(String(riderId));
};

const nowMs = () => Date.now();

exports.recordRapidLeave = ({ userId }) => {
  const store = readStore();
  const u = String(userId);

  const windowDays = parseInt(process.env.SPAM_WINDOW_DAYS || '7');
  const threshold = parseInt(process.env.SPAM_RAPID_LEAVE_THRESHOLD || '3');

  const windowMs = (Number.isNaN(windowDays) ? 7 : windowDays) * 24 * 60 * 60 * 1000;
  const cutoff = nowMs() - windowMs;

  const entry = store.spam[u] && typeof store.spam[u] === 'object' ? store.spam[u] : {};
  const raw = Array.isArray(entry.rapidLeaves) ? entry.rapidLeaves : [];
  const filtered = raw.filter(ts => typeof ts === 'number' && ts >= cutoff);

  filtered.push(nowMs());

  const flagged = filtered.length >= (Number.isNaN(threshold) ? 3 : threshold);

  store.spam[u] = {
    rapidLeaves: filtered,
    flagged: flagged,
    flaggedAt: flagged ? (entry.flaggedAt || nowMs()) : null
  };

  writeStore(store);
  return store.spam[u];
};

exports.isUserFlagged = ({ userId }) => {
  const store = readStore();
  const entry = store.spam[String(userId)];
  return !!(entry && entry.flagged);
};
