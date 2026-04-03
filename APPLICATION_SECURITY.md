# D-CARPOOL — Application Security (Detailed)

This document explains how security works in the current D-CARPOOL implementation, what mechanisms are used, and how secrets/keys are stored and protected (especially for local Hardhat development).

---

## 1) Security Goals

- **Confidentiality**: protect sensitive user and ride data (identity, contact details, private notes).
- **Integrity**: ensure critical actions (ride start/complete, dispute creation) are tamper-evident.
- **Authorization**: ensure only the right users can perform driver/admin actions.
- **Abuse prevention**: reduce spam and misuse (rapid join/leave, repeated abuse).
- **Auditability**: keep traceable references (DB logs + on-chain tx hashes/events).

---

## 2) Authentication (How users are identified)

### What is implemented
- The frontend calls backend REST APIs through `client/src/utils/api.js` (Axios wrapper).
- The backend uses authentication middleware to identify the user for protected endpoints.

### How it works in practice
- The client attaches an auth identifier in the request headers (current setup uses header-based identification).
- The server middleware reads the header, finds the user in the database, and sets `req.user`.

### Why this matters
- All authorization checks (driver/admin actions) depend on `req.user` being correctly resolved.

---

## 3) Authorization & Access Control (RBAC)

### Role-based access control (RBAC)
- The backend distinguishes between normal users and admins.
- Admin-only routes (examples):
  - viewing all complaints
  - updating complaint status
  - user moderation (ban/unban)

### Driver-only restrictions (ride ownership enforcement)
Key ride actions are restricted to the ride’s driver/host:
- Accept/reject join requests
- Start boarding OTP
- Complete/cancel ride

**How it works**:
- Controller checks that `req.user.id` matches the ride’s `driverId` before allowing changes.

---

## 4) Data Integrity Using Blockchain (Where and why)

D-CARPOOL uses a **hybrid security model**:
- **Off-chain database** for full application state and performance.
- **On-chain anchoring** for integrity and auditability.

### 4.1 Ride lifecycle anchoring
Implemented on local Hardhat using `RideContract`:
- When boarding starts:
  - backend calls `RideContract.startRide(blockchainRideId)`
  - emits **`RideStarted`** on-chain
- When ride completes:
  - backend calls `RideContract.completeRide(blockchainRideId)`
  - emits **`RideCompleted`** on-chain

**Security value**:
- These events create a tamper-evident timeline for disputes and accountability.
- The app can prove that a ride was marked “started/completed” at a specific chain timestamp.

### 4.2 Complaint evidence anchoring (Dispute creation)
Implemented using `DisputeResolution` + DPoS:
- When a complaint is filed:
  - backend computes an `evidenceHash` (hash of evidence/complaint payload reference)
  - backend calls `DisputeResolution.openDispute(blockchainRideId, evidenceHash)`
  - backend stores on the complaint:
    - `blockchainTxHash`
    - `blockchainDisputeId`

**Security value**:
- Only a hash goes on-chain (privacy-preserving).
- The hash ensures the evidence can’t be silently changed later (integrity proof).

### 4.3 Best-effort blockchain calls (resilience)
Blockchain calls are implemented as **best-effort**:
- If chain interaction fails (node down, RPC failure, reverted tx), the backend still completes the main DB workflow.
- When chain call succeeds, the app stores tx references for auditability.

**Why this matters**:
- Users are not blocked from using the app due to temporary chain issues.
- You still get security benefits when chain is available.

---

## 5) DPoS Security Model (Dispute governance)

### What DPoS adds
Instead of disputes being decided by one centralized admin, DPoS introduces:
- **Delegate-based authority** (a small elected set)
- **On-chain voting and outcome finalization**

### How it works in the project
- `DPoSGovernance` maintains the delegate set (based on staking/voting).
- `DisputeResolution` checks governance to verify who is a delegate.
- Only delegates can vote on disputes.

**Security value**:
- Reduces single point of failure in dispute decisions.
- Makes dispute outcomes verifiable and harder to manipulate.

---

## 6) Privacy & Sensitive Data Protection

### Off-chain storage for sensitive content
- Complaint descriptions and user details remain in the database.
- Only hashes or transaction references are anchored on-chain.

### Cryptography / encryption (CP-ABE integration approach)
- The backend includes a best-effort encryption step for sensitive ride fields.
- If the encryption service is unavailable, the system falls back safely so core workflows don’t break.

**Security value**:
- Supports privacy-by-design and prevents over-exposure of sensitive content.

---

## 7) OTP-based Boarding Verification (Safety control)

### What it does
- When a driver starts boarding verification:
  - backend generates a one-time passcode (OTP)
  - OTP is sent to ride participants via email
  - participants must verify OTP to confirm boarding

### Why it matters
- Adds a real-world safety layer by ensuring the correct passenger boarding.
- Reduces impersonation or incorrect boarding scenarios.

---

## 8) Abuse Prevention & Moderation

### 8.1 Hide rides (user privacy/control)
- A rider can hide a ride from:
  - their dashboard
  - search results

### 8.2 Host block (local blocking)
- A host can block a specific rider across the host’s rides.
- This is enforced server-side during join flows.

### 8.3 Anti-spam signals (rapid leave)
- The backend records suspicious behavior like repeatedly joining and leaving quickly.
- Flagged users can be prevented from joining future rides.

**Security value**:
- Protects the platform from repeated abuse and reduces nuisance behavior.

---

## 9) Auditability & Traceability

### Database traceability
- The DB is the operational source of truth (rides, participants, complaints).
- It also stores blockchain references:
  - `Ride.blockchainRideId`
  - `Complaint.blockchainTxHash`, `Complaint.blockchainDisputeId`
  - `Rating.blockchainTxHash` (if rating is anchored)

### Blockchain traceability
- Anyone can verify:
  - that a dispute was opened on-chain
  - ride started/completed events were emitted

---

## 10) Secrets & Key Management (How keys are stored)

### 10.1 Where secrets are stored
The application uses environment variables (via `.env`) for secrets/config such as:
- **Database credentials** (host/user/password/db)
- **Email service credentials** (SMTP user/pass)
- **Blockchain RPC URL** (`BLOCKCHAIN_RPC_URL`)
- **Private key for backend signer** (`PRIVATE_KEY`)
- **Contract addresses**
  - `RIDE_CONTRACT_ADDRESS`
  - `DISPUTE_RESOLUTION_CONTRACT_ADDRESS`

`.env.example` provides placeholders and is safe to commit.

### 10.2 How the blockchain private key is used
- The backend uses `PRIVATE_KEY` only to sign transactions from the server (using ethers).
- This is used for server-initiated anchoring:
  - `startRide` / `completeRide`
  - `openDispute`

### 10.3 How secrets should be protected
- **Do not commit `.env`** to Git.
- Keep `.env.example` committed but without real values.
- On local Hardhat, using Hardhat test keys is acceptable for development.
- For real deployment:
  - store secrets in a secret manager (or CI/CD protected env vars)
  - rotate keys regularly
  - use separate keys per environment (dev/staging/prod)

---

## 11) Security Recommendations (Next improvements)

These improvements are recommended if you want to harden the system further:

### Authentication hardening
- Use **JWT (Authorization: Bearer)** or secure sessions instead of simple header identity.
- Add refresh tokens and token expiry.

### API protections
- Add rate limiting (login, join requests, complaint filing).
- Add input validation (schema-based validation) for all critical endpoints.

### Blockchain safety
- Use a dedicated “backend anchoring key” with limited funds/permissions.
- Add retry queue for failed best-effort blockchain calls.

### Data protection
- Encrypt highly sensitive fields at rest.
- Restrict who can access complaint descriptions and user PII.

### Logging & monitoring
- Structured logs for auth failures and suspicious activity.
- Alerts for repeated spam behavior or suspicious admin actions.

---

## 12) Summary (One slide explanation)

- D-CARPOOL uses **RBAC + OTP + moderation controls** for access and safety.
- It uses **blockchain events and dispute anchoring** to provide **tamper-evident integrity**.
- It uses a **hybrid model**: DB for performance/private data, blockchain for accountability.
- Secrets/keys are stored in **environment variables** and must not be committed.
