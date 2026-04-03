/**
 * Merkle Tree Utility for Ride Audit Trail
 * Builds Merkle trees from ride hashes and generates proofs
 */
const crypto = require('crypto');

/**
 * Compute SHA256 hash of data
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Convert hex string to Buffer for comparison
 */
function hexToBuffer(hex) {
  return Buffer.from(hex.replace('0x', ''), 'hex');
}

/**
 * Hash two nodes together (sorted for consistency)
 */
function hashPair(a, b) {
  const bufA = hexToBuffer(a);
  const bufB = hexToBuffer(b);
  
  // Sort to ensure consistent ordering
  const sorted = Buffer.compare(bufA, bufB) <= 0 
    ? Buffer.concat([bufA, bufB])
    : Buffer.concat([bufB, bufA]);
  
  return '0x' + crypto.createHash('sha256').update(sorted).digest('hex');
}

/**
 * Build a Merkle tree from leaf hashes
 * @param {string[]} leaves - Array of hex hashes (leaf nodes)
 * @returns {Object} - { root, tree, leaves }
 */
function buildMerkleTree(leaves) {
  if (!leaves || leaves.length === 0) {
    throw new Error('Cannot build Merkle tree from empty leaves');
  }
  
  // Normalize leaves to include 0x prefix
  const normalizedLeaves = leaves.map(l => l.startsWith('0x') ? l : '0x' + l);
  
  // Store tree levels (bottom to top)
  const tree = [normalizedLeaves];
  
  let currentLevel = normalizedLeaves;
  
  while (currentLevel.length > 1) {
    const nextLevel = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Hash pair
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Odd node - promote to next level
        nextLevel.push(currentLevel[i]);
      }
    }
    
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }
  
  return {
    root: currentLevel[0],
    tree,
    leaves: normalizedLeaves
  };
}

/**
 * Generate Merkle proof for a leaf
 * @param {Object} tree - Merkle tree object from buildMerkleTree
 * @param {number} leafIndex - Index of the leaf to prove
 * @returns {string[]} - Array of sibling hashes (proof)
 */
function generateProof(tree, leafIndex) {
  const proof = [];
  let index = leafIndex;
  
  for (let level = 0; level < tree.tree.length - 1; level++) {
    const currentLevel = tree.tree[level];
    
    // Find sibling
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;
    
    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
    }
    
    // Move to parent index
    index = Math.floor(index / 2);
  }
  
  return proof;
}

/**
 * Verify a Merkle proof
 * @param {string} leaf - The leaf hash to verify
 * @param {string[]} proof - The Merkle proof
 * @param {string} root - The expected Merkle root
 * @returns {boolean}
 */
function verifyProof(leaf, proof, root) {
  let computedHash = leaf.startsWith('0x') ? leaf : '0x' + leaf;
  
  for (const sibling of proof) {
    computedHash = hashPair(computedHash, sibling);
  }
  
  return computedHash.toLowerCase() === root.toLowerCase();
}

/**
 * Create a ride hash from ride data
 * @param {Object} ride - Ride object
 * @returns {string} - Hex hash
 */
function createRideHash(ride) {
  const data = JSON.stringify({
    id: ride.id,
    hostId: ride.hostId,
    startLocation: ride.startLocation,
    endLocation: ride.endLocation,
    rideDateTime: ride.rideDateTime,
    pricePerSeat: ride.pricePerSeat,
    status: ride.status,
    createdAt: ride.createdAt
  });
  
  return '0x' + sha256(data);
}

module.exports = {
  sha256,
  buildMerkleTree,
  generateProof,
  verifyProof,
  createRideHash,
  hashPair
};
