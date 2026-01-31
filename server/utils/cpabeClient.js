const fetch = require('node-fetch');

const CPABE_URL = process.env.CPABE_SERVICE_URL || 'http://127.0.0.1:7001';

const postJson = async (path, body) => {
  const res = await fetch(`${CPABE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `CP-ABE service error (${res.status})`);
  }
  return data;
};

exports.cpabeKeygen = async (attributes) => {
  const data = await postJson('/keygen', { attributes });
  return data.secretKeyB64;
};

exports.cpabeEncrypt = async ({ policy, plaintextB64 }) => {
  const data = await postJson('/encrypt', { policy, plaintextB64 });
  return data.ciphertextB64;
};

exports.cpabeDecrypt = async ({ secretKeyB64, ciphertextB64 }) => {
  const data = await postJson('/decrypt', { secretKeyB64, ciphertextB64 });
  return data.plaintextB64;
};
