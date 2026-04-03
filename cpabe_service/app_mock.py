"""
Mock CP-ABE (Ciphertext-Policy Attribute-Based Encryption) Service
For demonstration purposes - simulates ABE encryption without requiring actual cpabe tools.

In a production environment, replace this with actual CP-ABE implementation using:
- charm-crypto library (Python)
- cpabe toolkit (C)
- OpenABE (C++)
"""

import base64
import hashlib
import json
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_DIR = os.environ.get('CPABE_DATA_DIR', os.path.join(os.path.dirname(__file__), 'data'))

# In-memory key store for demo
KEYS_STORE = {}

def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _hash_attributes(attributes):
    """Create a deterministic hash from attributes"""
    sorted_attrs = sorted(attributes)
    return hashlib.sha256('|'.join(sorted_attrs).encode()).hexdigest()

def _mock_encrypt(plaintext_bytes, policy):
    """
    Mock encryption that embeds policy for later verification.
    In real CP-ABE, the ciphertext can only be decrypted if attributes satisfy policy.
    """
    policy_hash = hashlib.sha256(policy.encode()).hexdigest()[:16]
    
    # Simple XOR-based "encryption" for demo (NOT secure - just for visualization)
    key = hashlib.sha256(policy.encode()).digest()
    encrypted = bytes([b ^ key[i % len(key)] for i, b in enumerate(plaintext_bytes)])
    
    # Pack: policy_hash + encrypted_data
    packed = json.dumps({
        'v': 1,  # version
        'p': policy,
        'ph': policy_hash,
        'ts': datetime.utcnow().isoformat(),
        'data': base64.b64encode(encrypted).decode()
    }).encode()
    
    return packed

def _mock_decrypt(ciphertext_bytes, secret_key_bytes):
    """
    Mock decryption that checks if attributes satisfy the policy.
    """
    try:
        packed = json.loads(ciphertext_bytes.decode())
        policy = packed['p']
        encrypted_data = base64.b64decode(packed['data'])
        
        # Parse secret key to get attributes
        sk_data = json.loads(secret_key_bytes.decode())
        user_attributes = set(sk_data.get('attributes', []))
        
        # Simple policy evaluation (supports AND, OR)
        if _evaluate_policy(policy, user_attributes):
            # Decrypt
            key = hashlib.sha256(policy.encode()).digest()
            decrypted = bytes([b ^ key[i % len(key)] for i, b in enumerate(encrypted_data)])
            return decrypted
        else:
            raise ValueError('Attributes do not satisfy policy')
    except json.JSONDecodeError:
        raise ValueError('Invalid ciphertext format')

def _evaluate_policy(policy, user_attributes):
    """
    Simple policy evaluator supporting:
    - 'attr1 and attr2' (AND)
    - 'attr1 or attr2' (OR)
    - 'attr1' (single attribute)
    - Parentheses for grouping
    
    For demo purposes - real CP-ABE uses monotonic access structures.
    """
    policy = policy.strip().lower()
    
    # Handle OR
    if ' or ' in policy:
        parts = policy.split(' or ')
        return any(_evaluate_policy(p.strip(), user_attributes) for p in parts)
    
    # Handle AND
    if ' and ' in policy:
        parts = policy.split(' and ')
        return all(_evaluate_policy(p.strip(), user_attributes) for p in parts)
    
    # Single attribute (remove quotes if present)
    attr = policy.strip().strip('"').strip("'")
    return attr in user_attributes or attr.lower() in [a.lower() for a in user_attributes]


@app.get('/health')
def health():
    return jsonify({
        'ok': True,
        'mode': 'mock',
        'description': 'Mock CP-ABE service for demonstration'
    })


@app.post('/keygen')
def keygen():
    """
    Generate a secret key for a set of attributes.
    body: { "attributes": ["host_123", "ride_456"] }
    returns: { "secretKeyB64": "..." }
    """
    _ensure_dir()
    body = request.get_json(force=True) or {}
    attributes = body.get('attributes') or []
    
    if not isinstance(attributes, list) or not all(isinstance(a, str) for a in attributes):
        return jsonify({'error': 'attributes must be a list of strings'}), 400
    
    if not attributes:
        return jsonify({'error': 'at least one attribute is required'}), 400
    
    # Create mock secret key
    sk_data = {
        'v': 1,
        'attributes': attributes,
        'created': datetime.utcnow().isoformat(),
        'hash': _hash_attributes(attributes)
    }
    
    sk_bytes = json.dumps(sk_data).encode()
    
    return jsonify({
        'secretKeyB64': base64.b64encode(sk_bytes).decode('utf-8'),
        'attributes': attributes
    })


@app.post('/encrypt')
def encrypt():
    """
    Encrypt plaintext under a policy.
    body: { "policy": "host_123 or accepted_ride_456", "plaintextB64": "..." }
    returns: { "ciphertextB64": "..." }
    """
    _ensure_dir()
    body = request.get_json(force=True) or {}
    policy = body.get('policy')
    plaintext_b64 = body.get('plaintextB64')
    
    if not isinstance(policy, str) or not policy.strip():
        return jsonify({'error': 'policy is required'}), 400
    if not isinstance(plaintext_b64, str) or not plaintext_b64:
        return jsonify({'error': 'plaintextB64 is required'}), 400
    
    try:
        plaintext = base64.b64decode(plaintext_b64.encode('utf-8'))
        ciphertext = _mock_encrypt(plaintext, policy)
        
        return jsonify({
            'ciphertextB64': base64.b64encode(ciphertext).decode('utf-8'),
            'policy': policy
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.post('/decrypt')
def decrypt():
    """
    Decrypt ciphertext using a secret key.
    body: { "secretKeyB64": "...", "ciphertextB64": "..." }
    returns: { "plaintextB64": "..." }
    """
    _ensure_dir()
    body = request.get_json(force=True) or {}
    sk_b64 = body.get('secretKeyB64')
    ct_b64 = body.get('ciphertextB64')
    
    if not isinstance(sk_b64, str) or not sk_b64:
        return jsonify({'error': 'secretKeyB64 is required'}), 400
    if not isinstance(ct_b64, str) or not ct_b64:
        return jsonify({'error': 'ciphertextB64 is required'}), 400
    
    try:
        secret_key = base64.b64decode(sk_b64.encode('utf-8'))
        ciphertext = base64.b64decode(ct_b64.encode('utf-8'))
        
        plaintext = _mock_decrypt(ciphertext, secret_key)
        
        return jsonify({
            'plaintextB64': base64.b64encode(plaintext).decode('utf-8')
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.get('/info')
def info():
    """Return information about CP-ABE encryption"""
    return jsonify({
        'name': 'CP-ABE Mock Service',
        'version': '1.0.0',
        'description': 'Ciphertext-Policy Attribute-Based Encryption service for D-CARPOOL',
        'capabilities': {
            'encryption': 'Encrypts data under access policies',
            'decryption': 'Decrypts data if user attributes satisfy policy',
            'keygen': 'Generates user secret keys based on attributes'
        },
        'example_policies': [
            'host_123',
            'host_123 or accepted_ride_456',
            'host_123 and admin',
            'rider_789 or host_123 or admin'
        ],
        'note': 'This is a mock implementation for demonstration. Production should use charm-crypto or cpabe toolkit.'
    })


if __name__ == '__main__':
    print("=" * 60)
    print("CP-ABE Mock Service Starting...")
    print("=" * 60)
    print("Mode: MOCK (for demonstration)")
    print("Port: 7001")
    print("")
    print("Endpoints:")
    print("  GET  /health  - Health check")
    print("  GET  /info    - Service information")
    print("  POST /keygen  - Generate secret key")
    print("  POST /encrypt - Encrypt data")
    print("  POST /decrypt - Decrypt data")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=7001, debug=True)
