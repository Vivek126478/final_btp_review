import base64
import json
import os
import subprocess
import tempfile
from flask import Flask, request, jsonify

app = Flask(__name__)

DATA_DIR = os.environ.get('CPABE_DATA_DIR', os.path.join(os.path.dirname(__file__), 'data'))
PUBLIC_KEY_PATH = os.path.join(DATA_DIR, 'pub_key')
MASTER_KEY_PATH = os.path.join(DATA_DIR, 'master_key')


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _run(cmd):
    completed = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if completed.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)} | {completed.stderr}")
    return completed.stdout


def ensure_setup():
    _ensure_dir()
    if os.path.exists(PUBLIC_KEY_PATH) and os.path.exists(MASTER_KEY_PATH):
        return
    _run(['cpabe-setup', '-p', PUBLIC_KEY_PATH, '-m', MASTER_KEY_PATH])


@app.get('/health')
def health():
    return jsonify({'ok': True})


@app.post('/keygen')
def keygen():
    """
    body: { "attributes": ["attr1","attr2",...]} 
    returns: { "secretKeyB64": "..." }
    """
    ensure_setup()
    body = request.get_json(force=True) or {}
    attributes = body.get('attributes') or []
    if not isinstance(attributes, list) or not all(isinstance(a, str) for a in attributes):
        return jsonify({'error': 'attributes must be a list of strings'}), 400

    with tempfile.TemporaryDirectory() as tmp:
        sk_path = os.path.join(tmp, 'user_key')
        _run(['cpabe-keygen', '-p', PUBLIC_KEY_PATH, '-m', MASTER_KEY_PATH, '-o', sk_path, *attributes])
        with open(sk_path, 'rb') as f:
            sk = f.read()
        return jsonify({'secretKeyB64': base64.b64encode(sk).decode('utf-8')})


@app.post('/encrypt')
def encrypt():
    """
    body: { "policy": "...", "plaintextB64": "..." }
    returns: { "ciphertextB64": "..." }
    """
    ensure_setup()
    body = request.get_json(force=True) or {}
    policy = body.get('policy')
    plaintext_b64 = body.get('plaintextB64')
    if not isinstance(policy, str) or not policy.strip():
        return jsonify({'error': 'policy is required'}), 400
    if not isinstance(plaintext_b64, str) or not plaintext_b64:
        return jsonify({'error': 'plaintextB64 is required'}), 400

    plaintext = base64.b64decode(plaintext_b64.encode('utf-8'))

    with tempfile.TemporaryDirectory() as tmp:
        pt_path = os.path.join(tmp, 'pt')
        ct_path = os.path.join(tmp, 'ct')
        with open(pt_path, 'wb') as f:
            f.write(plaintext)

        _run(['cpabe-enc', '-p', PUBLIC_KEY_PATH, '-o', ct_path, pt_path, policy])
        with open(ct_path, 'rb') as f:
            ct = f.read()
        return jsonify({'ciphertextB64': base64.b64encode(ct).decode('utf-8')})


@app.post('/decrypt')
def decrypt():
    """
    body: { "secretKeyB64": "...", "ciphertextB64": "..." }
    returns: { "plaintextB64": "..." }
    """
    ensure_setup()
    body = request.get_json(force=True) or {}
    sk_b64 = body.get('secretKeyB64')
    ct_b64 = body.get('ciphertextB64')

    if not isinstance(sk_b64, str) or not sk_b64:
        return jsonify({'error': 'secretKeyB64 is required'}), 400
    if not isinstance(ct_b64, str) or not ct_b64:
        return jsonify({'error': 'ciphertextB64 is required'}), 400

    sk = base64.b64decode(sk_b64.encode('utf-8'))
    ct = base64.b64decode(ct_b64.encode('utf-8'))

    with tempfile.TemporaryDirectory() as tmp:
        sk_path = os.path.join(tmp, 'sk')
        ct_path = os.path.join(tmp, 'ct')
        pt_path = os.path.join(tmp, 'pt')

        with open(sk_path, 'wb') as f:
            f.write(sk)
        with open(ct_path, 'wb') as f:
            f.write(ct)

        _run(['cpabe-dec', '-p', PUBLIC_KEY_PATH, '-o', pt_path, sk_path, ct_path])
        with open(pt_path, 'rb') as f:
            pt = f.read()
        return jsonify({'plaintextB64': base64.b64encode(pt).decode('utf-8')})


if __name__ == '__main__':
    ensure_setup()
    app.run(host='0.0.0.0', port=int(os.environ.get('CPABE_PORT', '7001')))
