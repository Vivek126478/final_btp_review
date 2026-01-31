const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const getStorePath = () => {
  const configured = process.env.BOARDING_OTP_PATH;
  if (configured && configured.trim()) return configured.trim();
  return path.join(__dirname, '..', 'data', 'boardingOtps.json');
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
      return { rides: {} };
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    if (!raw) return { rides: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { rides: {} };
    if (!parsed.rides || typeof parsed.rides !== 'object') parsed.rides = {};
    return parsed;
  } catch (e) {
    return { rides: {} };
  }
};

const writeStore = (store) => {
  const storePath = getStorePath();
  ensureDir(storePath);
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
};

const nowMs = () => Date.now();

const generateOtp = () => {
  if (typeof crypto.randomInt === 'function') {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  }
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
};

const hashOtp = (otp, salt) => {
  return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
};

exports.startBoardingSession = ({ rideId, participants, ttlMinutes = 10 }) => {
  const store = readStore();

  const rideKey = String(rideId);
  const salt = crypto.randomBytes(16).toString('hex');
  const expiresAt = nowMs() + ttlMinutes * 60 * 1000;

  const participantMap = {};
  const otpsToSend = [];

  for (const p of participants) {
    const otp = generateOtp();
    participantMap[String(p.participantId)] = {
      participantId: p.participantId,
      riderId: p.riderId,
      email: p.email,
      status: 'pending',
      otpHash: hashOtp(otp, salt),
      verifiedAt: null
    };

    otpsToSend.push({ participantId: p.participantId, riderId: p.riderId, email: p.email, otp });
  }

  store.rides[rideKey] = {
    rideId,
    createdAt: nowMs(),
    expiresAt,
    ttlMinutes,
    salt,
    started: false,
    participants: participantMap
  };

  writeStore(store);

  return {
    session: store.rides[rideKey],
    otpsToSend
  };
};

exports.getBoardingSession = ({ rideId }) => {
  const store = readStore();
  const session = store.rides[String(rideId)] || null;
  return session;
};

exports.verifyPassengerOtp = ({ rideId, participantId, otp }) => {
  const store = readStore();
  const rideKey = String(rideId);
  const session = store.rides[rideKey];

  if (!session) {
    return { ok: false, error: 'No active boarding session for this ride' };
  }

  if (nowMs() > session.expiresAt) {
    return { ok: false, error: 'Boarding OTP session expired. Please start again.' };
  }

  const pKey = String(participantId);
  const p = session.participants?.[pKey];
  if (!p) {
    return { ok: false, error: 'Participant not part of this boarding session' };
  }

  if (p.status === 'verified') {
    return { ok: true, alreadyVerified: true };
  }

  const computed = hashOtp(String(otp || ''), session.salt);
  if (computed !== p.otpHash) {
    return { ok: false, error: 'Invalid OTP' };
  }

  p.status = 'verified';
  p.verifiedAt = nowMs();

  const allVerified = Object.values(session.participants || {}).every(x => x.status === 'verified');
  if (allVerified) {
    session.started = true;
    session.startedAt = nowMs();
  }

  writeStore(store);

  return { ok: true, allVerified, started: session.started };
};

exports.getBoardingStatus = ({ rideId }) => {
  const session = exports.getBoardingSession({ rideId });
  if (!session) return null;

  const participants = Object.values(session.participants || {}).map(p => ({
    participantId: p.participantId,
    riderId: p.riderId,
    email: p.email,
    status: p.status,
    verifiedAt: p.verifiedAt
  }));

  const allVerified = participants.length > 0 && participants.every(p => p.status === 'verified');

  return {
    rideId: session.rideId,
    expiresAt: session.expiresAt,
    started: !!session.started,
    allVerified,
    participants
  };
};
