# 🔗 D-CARPOOL Blockchain Security Features

> A comprehensive guide to the blockchain-based security mechanisms implemented in the D-CARPOOL decentralized carpooling platform.

---

## 📋 Table of Contents

1. [Soulbound Tokens (SBT) - Academic Identity](#1-soulbound-tokens-sbt---academic-identity)
2. [Zero-Knowledge Proof (ZKP) - Driver Verification](#2-zero-knowledge-proof-zkp---driver-verification)
3. [On-Chain Hash Integrity - Ride Agreements](#3-on-chain-hash-integrity---ride-agreements)
4. [DPoS Governance - Dispute Resolution](#4-dpos-governance---dispute-resolution)
5. [Merkle Tree Audit Trail - Ride History](#5-merkle-tree-audit-trail---ride-history)
6. [CP-ABE Encryption - Attribute-Based Access](#6-cp-abe-encryption---attribute-based-access)
7. [Shamir's Secret Sharing - SOS Emergency Data](#7-shamirs-secret-sharing---sos-emergency-data)
8. [Smart Contract Summary](#8-smart-contract-summary)

---

## 1. Soulbound Tokens (SBT) - Academic Identity

### 📖 What is it?
Soulbound Tokens are **non-transferable NFTs** that represent a user's verified academic identity. Once minted, they cannot be sold, traded, or transferred to another wallet - they are permanently "bound" to the user's soul (wallet).

### 🎯 Significance
- **Identity Verification**: Ensures only verified IIIT Kottayam students can use the platform
- **Non-Transferable**: Prevents identity fraud and account selling
- **On-Chain Proof**: Academic credentials stored permanently on blockchain
- **Trust Building**: Other users can verify someone is a legitimate student

### ⚙️ Procedure
```
┌─────────────────────────────────────────────────────────────┐
│  1. User registers with @iiitkottayam.ac.in email           │
│                          ↓                                  │
│  2. Email verification via OTP                              │
│                          ↓                                  │
│  3. User connects MetaMask wallet                           │
│                          ↓                                  │
│  4. System calls UserIdentity.mintSBT()                     │
│                          ↓                                  │
│  5. SBT minted to user's wallet (non-transferable)          │
│                          ↓                                  │
│  6. User can now create/join rides with verified status     │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Advantages
| Advantage | Description |
|-----------|-------------|
| **Sybil Resistance** | One person = one SBT, prevents fake accounts |
| **Permanent Record** | Academic verification stored forever on-chain |
| **Privacy Preserving** | Only stores verification status, not personal data |
| **Decentralized Trust** | No central authority needed for verification |
| **Gas Efficient** | Minimal on-chain storage, details stored off-chain |

### 📁 Implementation Files
- Contract: `contracts/contracts/UserIdentity.sol`
- Frontend: `client/src/pages/Profile.js`
- API: `server/controllers/authController.js`

---

## 2. Zero-Knowledge Proof (ZKP) - Driver Verification

### 📖 What is it?
Zero-Knowledge Proofs allow drivers to **prove they have valid credentials** (license, vehicle registration) **without revealing the actual documents**. The verifier learns nothing except that the statement is true.

### 🎯 Significance
- **Privacy Protection**: Driver's license number never exposed
- **Trustless Verification**: No need to trust a central authority
- **Selective Disclosure**: Prove "age > 18" without revealing actual age
- **Compliance**: Verify credentials without storing sensitive documents

### ⚙️ Procedure
```
┌─────────────────────────────────────────────────────────────┐
│  PROVER (Driver)                  VERIFIER (Platform)       │
│                                                             │
│  1. Has private inputs:                                     │
│     - License number                                        │
│     - Expiry date                                           │
│     - Vehicle registration                                  │
│                          ↓                                  │
│  2. Generates ZK proof:                                     │
│     proof = ZK.prove(privateInputs, publicStatement)        │
│                          ↓                                  │
│  3. Sends proof + public signals to contract                │
│                          ↓                                  │
│  4. Contract verifies:                                      │
│     ZKPDriverVerifier.verifyProof(proof, signals)           │
│                          ↓                                  │
│  5. If valid: Driver marked as verified ✓                   │
│     Actual credentials NEVER revealed!                      │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Advantages
| Advantage | Description |
|-----------|-------------|
| **Zero Knowledge** | Verifier learns nothing beyond validity |
| **Succinct** | Proof is small, fast to verify |
| **Non-Interactive** | Single message from prover to verifier |
| **Universally Verifiable** | Anyone can verify the proof |
| **Document Privacy** | Sensitive documents never leave user's device |

### 📁 Implementation Files
- Contract: `contracts/contracts/ZKPDriverVerifier.sol`
- Frontend: `client/src/pages/RideDetails.js`
- Verification flow in ride creation

---

## 3. On-Chain Hash Integrity - Ride Agreements

### 📖 What is it?
Every ride agreement is **hashed and stored on the blockchain**, creating an immutable record that can verify if any ride details were tampered with after creation.

### 🎯 Significance
- **Tamper Detection**: Any modification to ride details is detectable
- **Dispute Evidence**: Original agreement can be proven
- **Audit Trail**: Complete history of ride terms
- **Legal Compliance**: Immutable record for disputes

### ⚙️ Procedure
```
┌─────────────────────────────────────────────────────────────┐
│  RIDE CREATION                                              │
│                                                             │
│  1. Host creates ride with details:                         │
│     {source, destination, dateTime, price, seats, vehicle}  │
│                          ↓                                  │
│  2. System computes agreement hash:                         │
│     hash = keccak256(JSON.stringify(rideDetails))           │
│                          ↓                                  │
│  3. Hash stored on RideContract:                            │
│     RideContract.createRide(rideId, agreementHash)          │
│                          ↓                                  │
│  VERIFICATION (Later)                                       │
│                          ↓                                  │
│  4. Retrieve original agreement data from database          │
│                          ↓                                  │
│  5. Recompute hash from stored data                         │
│                          ↓                                  │
│  6. Compare with on-chain hash:                             │
│     computedHash === storedHash ? ✓ Valid : ✗ Tampered      │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Advantages
| Advantage | Description |
|-----------|-------------|
| **Immutability** | Hash cannot be changed once stored |
| **Efficiency** | Only 32-byte hash stored on-chain |
| **Verifiability** | Anyone can verify agreement integrity |
| **Non-Repudiation** | Host cannot deny original terms |
| **Cost Effective** | Minimal gas cost for hash storage |

### 📁 Implementation Files
- Contract: `contracts/contracts/RideContract.sol`
- Backend: `server/controllers/rideController.js`
- Verification: `server/utils/blockchain.js`

---

## 4. DPoS Governance - Dispute Resolution

### 📖 What is it?
**Delegated Proof of Stake (DPoS)** enables community-elected delegates to vote on dispute resolutions. Instead of centralized admin decisions, disputes are resolved through democratic voting.

### 🎯 Significance
- **Decentralized Justice**: No single party controls outcomes
- **Community Governance**: Users elect trusted delegates
- **Transparent Process**: All votes recorded on-chain
- **Stake-Based Trust**: Delegates have skin in the game

### ⚙️ Procedure
```
┌─────────────────────────────────────────────────────────────┐
│  DELEGATE ELECTION                                          │
│                                                             │
│  1. Candidates register with minimum stake (0.01 ETH)       │
│  2. Community votes for preferred candidates                │
│  3. Top N candidates become active delegates                │
│                                                             │
│  DISPUTE RESOLUTION                                         │
│                                                             │
│  4. User raises dispute with evidence                       │
│                          ↓                                  │
│  5. Dispute created on DisputeResolution contract           │
│                          ↓                                  │
│  6. Delegates review evidence and cast votes                │
│     - FAVOR_COMPLAINANT                                     │
│     - FAVOR_ACCUSED                                         │
│     - ABSTAIN                                               │
│                          ↓                                  │
│  7. After voting period (24h), results tallied              │
│                          ↓                                  │
│  8. Quorum (3/5 delegates) required for valid resolution    │
│                          ↓                                  │
│  9. Outcome enforced: refund, ban, or dismissal             │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Advantages
| Advantage | Description |
|-----------|-------------|
| **Decentralization** | No single point of control |
| **Accountability** | Delegates can be voted out |
| **Transparency** | All votes publicly visible |
| **Efficiency** | Faster than full consensus |
| **Fairness** | Multiple perspectives considered |

### 📁 Implementation Files
- Contract: `contracts/contracts/DPoSGovernance.sol`
- Contract: `contracts/contracts/DisputeResolution.sol`
- Frontend: `client/src/pages/Admin.js`

---

## 5. Merkle Tree Audit Trail - Ride History

### 📖 What is it?
A **Merkle Tree** is a binary tree of hashes where each leaf is a ride's hash, and parent nodes are hashes of their children. The root hash is stored on-chain, allowing efficient verification of any ride's existence.

### 🎯 Significance
- **Efficient Proofs**: Verify ride existence with O(log n) hashes
- **Batch Anchoring**: Store millions of rides with one hash
- **Audit Compliance**: Prove historical ride data integrity
- **Storage Efficient**: Only root hash stored on-chain

### ⚙️ Procedure
```
┌─────────────────────────────────────────────────────────────┐
│  MERKLE TREE CONSTRUCTION                                   │
│                                                             │
│          Root Hash (stored on-chain)                        │
│                    /\                                       │
│                   /  \                                      │
│                  /    \                                     │
│           Hash(AB)    Hash(CD)                              │
│             /\          /\                                  │
│            /  \        /  \                                 │
│       Hash(A) Hash(B) Hash(C) Hash(D)                       │
│          |      |       |       |                           │
│       Ride1  Ride2   Ride3   Ride4                          │
│                                                             │
│  VERIFICATION (Prove Ride2 exists)                          │
│                                                             │
│  Proof = [Hash(A), Hash(CD)]                                │
│                                                             │
│  Verify:                                                    │
│  1. Compute Hash(B) from ride data                          │
│  2. Combine with Hash(A) → Hash(AB)                         │
│  3. Combine with Hash(CD) → Root                            │
│  4. Compare with stored root ✓                              │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Advantages
| Advantage | Description |
|-----------|-------------|
| **O(log n) Proofs** | Verify 1 ride among millions with ~20 hashes |
| **Gas Efficient** | Only 32 bytes stored for unlimited rides |
| **Tamper Evident** | Any change invalidates entire tree |
| **Batch Processing** | Anchor thousands of rides at once |
| **Audit Ready** | Prove any historical ride existed |

### 📁 Implementation Files
- Contract: `contracts/contracts/MerkleAuditTrail.sol`
- Backend: `server/utils/merkleTree.js`
- Controller: `server/controllers/adminController.js`
- Frontend: `client/src/pages/Admin.js` (Merkle Audit tab)

---

## 6. CP-ABE Encryption - Attribute-Based Access

### 📖 What is it?
**Ciphertext-Policy Attribute-Based Encryption (CP-ABE)** encrypts data with an access policy (e.g., "host OR passenger"). Only users with attributes satisfying the policy can decrypt.

### 🎯 Significance
- **Fine-Grained Access**: Define WHO can access, not just encrypt for one person
- **Policy-Based**: Access determined by attributes, not identities
- **Dynamic Access**: New users with right attributes auto-gain access
- **Privacy by Design**: Vehicle info only visible to ride participants

### ⚙️ Procedure
```
┌─────────────────────────────────────────────────────────────┐
│  TRADITIONAL ENCRYPTION           CP-ABE ENCRYPTION         │
│                                                             │
│  encrypt(data, Alice_key)         encrypt(data, POLICY)     │
│  Only Alice can decrypt           Anyone with matching      │
│                                   attributes can decrypt    │
│                                                             │
│  D-CARPOOL EXAMPLE:                                         │
│                                                             │
│  Policy: "(ride_456_host) OR (ride_456_accepted)"           │
│                                                             │
│  Host creates ride:                                         │
│  1. Gets key with [ride_456_host] attribute                 │
│  2. Vehicle info encrypted with policy                      │
│                                                             │
│  Passenger joins:                                           │
│  3. Gets key with [ride_456_accepted] attribute             │
│  4. Can now decrypt vehicle info ✓                          │
│                                                             │
│  Random user:                                               │
│  5. Has no attributes for ride_456                          │
│  6. CANNOT decrypt vehicle info ✗                           │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Advantages
| Advantage | Description |
|-----------|-------------|
| **Attribute-Based** | Access by role, not identity |
| **Policy Flexibility** | Complex AND/OR policies supported |
| **Scalable** | No key distribution per user |
| **Forward Security** | Leaving ride revokes access |
| **Privacy Preserving** | Sensitive data encrypted at rest |

### 📁 Implementation Files
- Service: `cpabe_service/app_mock.py`
- Client: `server/utils/cpabeClient.js`
- Helpers: `server/utils/cpabeHelpers.js`
- Key Store: `server/utils/cpabeKeyStore.js`
- Frontend: `client/src/pages/Admin.js` (CP-ABE tab)

---

## 7. Shamir's Secret Sharing - SOS Emergency Data

### 📖 What is it?
**Shamir's Secret Sharing (SSS)** splits a secret into N shares where K shares are needed to reconstruct. With K-1 or fewer shares, **zero information** about the secret is revealed (information-theoretic security).

### 🎯 Significance
- **No Single Point of Trust**: No one party holds complete emergency data
- **Threshold Security**: Need multiple parties to cooperate
- **Privacy Protection**: Even platform admin can't access data alone
- **Emergency Recovery**: Data reconstructed only in actual emergency

### ⚙️ Procedure
```
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURATION (5 shares, threshold 3)                      │
│                                                             │
│  Emergency Data: {                                          │
│    contact: "Mom +91-9876543210",                           │
│    bloodGroup: "O+",                                        │
│    allergies: ["penicillin"],                               │
│    address: "123 Main St, Kerala"                           │
│  }                                                          │
│                    ↓                                        │
│           Shamir Split (5,3)                                │
│                    ↓                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Share 1 → Platform Admin                            │    │
│  │ Share 2 → User's Wallet (encrypted)                 │    │
│  │ Share 3 → Trusted Contact 1                         │    │
│  │ Share 4 → Trusted Contact 2                         │    │
│  │ Share 5 → Blockchain Backup (IPFS)                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  SOS TRIGGERED                                              │
│                    ↓                                        │
│  Collect 3 shares:                                          │
│  - Admin share (auto) ✓                                     │
│  - User share (auto) ✓                                      │
│  - Contact 1 (OTP verified) ✓                               │
│                    ↓                                        │
│  Reconstruct → Emergency services notified                  │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Advantages
| Advantage | Description |
|-----------|-------------|
| **Information-Theoretic** | Unbreakable even with unlimited computing |
| **No Single Trust** | Platform can't abuse emergency data |
| **Threshold Flexibility** | Configure any K-of-N scheme |
| **Verifiable** | Share commitments stored on blockchain |
| **Recoverable** | Emergency data always reconstructable |

### Security Guarantee
```
✓ 3+ shares → Full reconstruction
✗ 2 shares  → ZERO information leaked
✗ 1 share   → ZERO information leaked

This is NOT computational security (like encryption).
It's INFORMATION-THEORETIC security - mathematically impossible to break.
```

### 📁 Implementation Files
- Contract: `contracts/contracts/ShamirSOSVault.sol`
- Utility: `server/utils/shamirSSS.js`
- Controller: `server/controllers/sssController.js`
- Routes: `server/routes/sos.js`
- Frontend: `client/src/pages/Admin.js` (Shamir SSS tab)

---

## 8. Smart Contract Summary

### Deployed Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **UserIdentity** | `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d` | SBT academic identity |
| **RideContract** | `0x59b670e9fA9D0A427751Af201D676719a970857b` | Ride agreement hashes |
| **Reputation** | `0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1` | On-chain ratings |
| **DPoSGovernance** | `0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44` | Delegate elections |
| **DisputeResolution** | `0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f` | Dispute voting |
| **ZKPDriverVerifier** | `0x4A679253410272dd5232B3Ff7cF5dbB88f295319` | ZK proof verification |
| **MerkleAuditTrail** | `0x7a2088a1bFc9d81c55368AE168C2C02570cB814F` | Ride history anchoring |
| **ShamirSOSVault** | `0x09635F643e140090A9A8Dcd712eD6285858ceBef` | SSS share commitments |

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  - MetaMask Integration (ethers.js v6)                      │
│  - Leaflet + OpenStreetMap (free maps)                      │
│  - Admin Dashboard with security demos                      │
├─────────────────────────────────────────────────────────────┤
│                     BACKEND (Node.js)                       │
│  - Express REST API                                         │
│  - Sequelize ORM (MySQL)                                    │
│  - Blockchain interaction utilities                         │
├─────────────────────────────────────────────────────────────┤
│                 BLOCKCHAIN (Hardhat/Ethereum)               │
│  - Solidity 0.8.20                                          │
│  - Local Hardhat Network (Chain ID: 1337)                   │
│  - 8 Smart Contracts                                        │
├─────────────────────────────────────────────────────────────┤
│                  CRYPTOGRAPHIC SERVICES                     │
│  - CP-ABE Service (Flask/Python)                            │
│  - Shamir SSS (secrets.js-grempe)                           │
│  - Merkle Trees (merkletreejs)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    D-CARPOOL SECURITY LAYERS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │    SBT      │   │    ZKP      │   │   DPoS      │              │
│   │  Identity   │   │  Privacy    │   │ Governance  │              │
│   └─────────────┘   └─────────────┘   └─────────────┘              │
│         │                 │                 │                       │
│         └────────────┬────┴────────┬────────┘                       │
│                      │             │                                │
│   ┌─────────────┐    │             │    ┌─────────────┐            │
│   │   Merkle    │────┤  BLOCKCHAIN ├────│   Shamir    │            │
│   │   Audit     │    │    CORE     │    │    SSS      │            │
│   └─────────────┘    │             │    └─────────────┘            │
│                      │             │                                │
│   ┌─────────────┐    │             │    ┌─────────────┐            │
│   │   CP-ABE    │────┴─────────────┴────│    Hash     │            │
│   │ Encryption  │                       │  Integrity  │            │
│   └─────────────┘                       └─────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 References

1. **Soulbound Tokens**: Vitalik Buterin, "Soulbound" (2022)
2. **Zero-Knowledge Proofs**: Goldwasser, Micali, Rackoff (1985)
3. **Merkle Trees**: Ralph Merkle (1979)
4. **CP-ABE**: Bethencourt, Sahai, Waters (2007)
5. **Shamir's Secret Sharing**: Adi Shamir (1979)
6. **DPoS**: Daniel Larimer (2014)

---

## 🎓 Academic Significance

This project demonstrates the integration of **7 cutting-edge cryptographic and blockchain technologies** in a practical application:

1. **Identity Management** - Non-transferable credentials (SBT)
2. **Privacy-Preserving Verification** - Zero-knowledge proofs
3. **Data Integrity** - Cryptographic hashing
4. **Decentralized Governance** - DPoS consensus
5. **Efficient Auditing** - Merkle tree proofs
6. **Fine-Grained Access Control** - Attribute-based encryption
7. **Secret Protection** - Threshold cryptography

Each technology addresses specific security challenges in peer-to-peer carpooling, making D-CARPOOL a comprehensive showcase of blockchain security implementations.

---

*Document generated for D-CARPOOL BTP Project - IIIT Kottayam*
*Last updated: April 2026*
