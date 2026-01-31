const { cpabeEncrypt, cpabeDecrypt, cpabeKeygen } = require('./cpabeClient');
const { getUserRideKey, setUserRideKey } = require('./cpabeKeyStore');

const PREFIX = 'CPABE:';

const b64 = (buf) => Buffer.from(buf).toString('base64');
const unb64 = (s) => Buffer.from(s, 'base64');

const toCipherText = (ciphertextB64) => `${PREFIX}${ciphertextB64}`;

const parseCipherText = (value) => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith(PREFIX)) return null;
  return value.slice(PREFIX.length);
};

exports.ensureRideKey = async ({ userId, rideId, kind }) => {
  const existing = await getUserRideKey({ userId, rideId, kind });
  if (existing) return existing;

  const attr = kind === 'host' ? `ride_${rideId}_host` : `ride_${rideId}_accepted`;
  const sk = await cpabeKeygen([attr]);
  await setUserRideKey({ userId, rideId, kind, secretKeyB64: sk });
  return sk;
};

exports.encryptRidePrivateField = async ({ rideId, plaintext, policyKind }) => {
  if (plaintext === undefined || plaintext === null) return null;

  const policy = `(ride_${rideId}_host) or (ride_${rideId}_accepted)`;
  const payload = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const ciphertextB64 = await cpabeEncrypt({ policy, plaintextB64: b64(payload) });
  return toCipherText(ciphertextB64);
};

exports.decryptRidePrivateFieldForViewer = async ({
  userId,
  isHost,
  isAccepted,
  rideId,
  value
}) => {
  const ciphertextB64 = parseCipherText(value);
  if (!ciphertextB64) return value;

  if (!userId) return null;

  let sk = null;
  if (isHost) {
    sk = await getUserRideKey({ userId, rideId, kind: 'host' });
  } else if (isAccepted) {
    sk = await getUserRideKey({ userId, rideId, kind: 'accepted' });
  }

  if (!sk) return null;

  const plaintextB64 = await cpabeDecrypt({ secretKeyB64: sk, ciphertextB64 });
  const buf = unb64(plaintextB64);
  const text = buf.toString('utf8');

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
