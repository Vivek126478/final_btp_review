# D-CARPOOL (Decentralized Peer-to-Peer Carpooling) — Presentation Summary

## 1) One-line Description
**D-CARPOOL** is a full-stack decentralized carpooling platform that combines a modern React frontend, an Express + MySQL backend, and Solidity smart contracts on a local Hardhat blockchain to deliver transparent ride operations, reputation, and dispute governance.

---

## 2) What Problems We Solve
- **Trust**: users need confidence in drivers/riders and ride outcomes.
- **Accountability**: ride actions (start/complete, disputes) should be verifiable.
- **Safety**: SOS alerts, complaint handling, and anti-abuse features.
- **Privacy**: sensitive ride fields can be protected with encryption (CP-ABE integration in backend).

---

## 3) High-level Architecture (End-to-End)

### Frontend (React)
- UI pages for:
  - Searching rides
  - Posting rides
  - Ride details + join requests
  - My rides dashboard
  - Profile and ratings
  - Admin dashboard (users/rides/complaints)

### Backend (Node.js + Express)
- REST APIs for:
  - authentication and user profiles
  - ride create/search/join/cancel/complete
  - join requests & approvals
  - complaints and admin actions
  - SOS alerts

### Database (MySQL via Sequelize)
- Stores the application’s operational data:
  - users, rides, ride participants, ratings, complaints, SOS alerts

### Blockchain (Solidity + Hardhat)
- Stores verifiable proof for:
  - ride creation (depending on usage flow)
  - ride completion (on-chain event)
  - ride start marker (on-chain event)
  - reputation ratings (on-chain contract)
  - governance/dispute resolution via DPoS delegates

---

## 4) Project Structure (What lives where)

- `client/` — React frontend
  - `client/src/pages/*` (UI screens)
  - `client/src/utils/api.js` (REST API wrapper)
  - `client/src/utils/web3.js` (ethers + MetaMask helpers)
  - `client/src/contracts/` (ABIs copied for frontend usage)

- `server/` — Express backend
  - `server/controllers/*` (business logic)
  - `server/routes/*` (REST routes)
  - `server/models/*` (Sequelize models)
  - `server/utils/*` (email, IPFS, audit log, moderation store, blockchain helper)

- `contracts/` — Hardhat + Solidity contracts
  - `contracts/contracts/*.sol`
  - `contracts/scripts/deploy.js` (deploy + ABI/address export)
  - `contracts/deployments/abis/*.json` (ABIs used by backend)

---

## 5) Frontend (How it Works)

### Key pages and user flows

#### A) Search rides
- UI calls: `rideAPI.searchRides(params)`
- Backend returns paginated rides.
- If user is logged in, hidden rides are filtered from results.

#### B) Post ride
- UI calls: `rideAPI.createRide(payload)`
- Backend stores ride in DB, and can also store a `blockchainRideId` to link DB ride ↔ chain ride.

#### C) Ride details
- UI calls: `rideAPI.getRideById(id)`
- User can:
  - request to join
  - host can accept/reject requests
  - host can start boarding OTP
  - host can complete/cancel ride

#### D) My Rides
- Shows rides as Driver and Rider.
- Rider can hide rides from their dashboard and search.

#### E) Admin dashboard
- Fetches:
  - users
  - rides
  - complaints
- Admin can ban/unban users and update complaint status.

---

## 6) Backend (How REST APIs and Controllers Work)

### Backend API wrapper (frontend)
- File: `client/src/utils/api.js`
- Uses Axios with `API_BASE_URL`
- Adds `x-user-id` header (based on current local auth mechanism).

### Example: Ride lifecycle (important endpoints)

#### Create ride
- `POST /api/rides`
- Controller: `server/controllers/rideController.js::createRide`
- Stores ride in DB and encrypts sensitive fields (best-effort CP-ABE).

#### Search rides
- `GET /api/rides/search`
- Controller: `rideController.js::searchRides`
- Supports filters (location/date/tags/etc.) and hides user-hidden rides.

#### Join ride (request-based)
- `POST /api/rides/:id/join`
- Creates a pending request / participation.
- Host accepts/rejects.

#### Boarding OTP (ride start flow)
- `POST /api/rides/:id/boarding/start`
- Starts OTP session and sends OTP emails.
- **Blockchain enhancement**: best-effort call to `RideContract.startRide(blockchainRideId)`.

#### Complete ride
- `POST /api/rides/:id/complete`
- DB:
  - ride → `completed`
  - participants → `completed`
- **Blockchain enhancement**: best-effort call to `RideContract.completeRide(blockchainRideId)`.

---

## 7) Database Layer (Models)

### Core models
- `User`
  - walletAddress, username/email, phone, role, status flags
- `Ride`
  - ride details + `blockchainRideId` linking to chain
- `RideParticipant`
  - rider ↔ ride relationship with status (pending/accepted/joined/completed)
- `Rating`
  - includes `blockchainTxHash` as proof of on-chain rating submission
- `Complaint`
  - complaint records
  - **enhancement**: stores `blockchainTxHash` and `blockchainDisputeId` for on-chain dispute anchoring

---

## 8) Blockchain Layer (Smart Contracts)

### A) RideContract (`contracts/contracts/RideContract.sol`)
On-chain events and state:
- `RideCreated`
- `RideJoined`
- `RideLeft`
- `RideCompleted`
- `RideCancelled`
- **New**: `RideStarted` + `rideStartedAt[rideId]` + `startRide(rideId)`

**Why this matters**:
- Ride start/complete timestamps become verifiable evidence for disputes.

### B) Reputation contract (`contracts/contracts/Reputation.sol`)
- On-chain rating logic and average rating calculation.
- DB stores the `blockchainTxHash` for traceability.

### C) DPoS Governance (`contracts/contracts/DPoSGovernance.sol`)
- Candidate registration via stake
- Voter staking-based votes
- Top-N delegates derived by `getDelegates()`

### D) DisputeResolution (`contracts/contracts/DisputeResolution.sol`)
- Anyone can open dispute with:
  - `openDispute(rideId, evidenceHash)`
- Only current delegates can vote.
- Quorum-based finalization.

---

## 9) Blockchain ↔ Backend Integration (Local Hardhat)

### Contract deployment pipeline
- File: `contracts/scripts/deploy.js`
- Deploys:
  - UserIdentity
  - RideContract
  - Reputation
  - DPoSGovernance
  - DisputeResolution

Produces:
- `contracts/deployments/contract-addresses.json`
- `contracts/deployments/abis/*.json`
- Updates root `.env` with contract addresses.

### Backend transaction signer
- File: `server/utils/blockchain.js`
- Uses:
  - `BLOCKCHAIN_RPC_URL` (default `http://127.0.0.1:8545`)
  - `PRIVATE_KEY`
  - ABIs from `contracts/deployments/abis/`

Used for:
- `RideContract.startRide(blockchainRideId)` best-effort
- `RideContract.completeRide(blockchainRideId)` best-effort
- `DisputeResolution.openDispute(blockchainRideId, evidenceHash)` best-effort

---

## 10) Security (What We Implemented)

### A) Role-based access control (RBAC)
- Admin routes protected by middleware.
- Driver-only actions:
  - start boarding OTP
  - complete/cancel ride
  - accept/reject join requests

### B) Tamper-evident actions (Blockchain)
- Ride lifecycle markers are written on-chain.
- Complaint disputes are anchored on-chain using a hash.

### C) Evidence privacy
- Only `evidenceHash` goes on-chain (not full complaint text).
- The complaint description stays in DB.

### D) Sensitive data encryption (CP-ABE integration)
- Backend encrypts sensitive ride fields (notes/vehicle info) best-effort.
- Fallback to plaintext to avoid breaking functionality if microservice is down.

### E) Abuse prevention & moderation
- User can hide rides from dashboard/search.
- Hosts can block specific riders locally across their rides.
- Anti-spam: detect “join then leave quickly” patterns and restrict joining.

### F) Audit logging (accountability)
- Backend writes audit logs for critical actions (ride create etc.).

---

## 11) Demo / Presentation Walkthrough (Suggested Order)

1. **Explain architecture** (React + Express + MySQL + Hardhat)
2. **Search + Join flow**
   - show join request and host approval
3. **Boarding OTP flow**
   - host starts OTP
   - mention on-chain `RideStarted`
4. **Complete ride**
   - DB status changes
   - on-chain `RideCompleted`
5. **Ratings**
   - show reputation
   - mention `blockchainTxHash`
6. **Complaints + Dispute anchoring**
   - file complaint
   - show stored `blockchainTxHash` and `blockchainDisputeId`
   - explain DPoS delegate voting concept
7. **Security & moderation**
   - hide ride
   - block rider
   - spam prevention

---

## 12) Local Run Commands (Quick Reference)

### Blockchain
- Terminal 1 (`contracts/`): `npx hardhat node`
- Terminal 2 (`contracts/`): deploy script (e.g. `npm run deploy:local`)

### Backend
- (`server/`): `npm install`
- (`server/`): `npm run migrate`
- (`server/`): `npm run dev`

### Frontend
- (`client/`): `npm install`
- (`client/`): `npm start`

---

## 13) Key Innovation Highlights (What to say in presentation)

- **Hybrid architecture**: DB for scalability + blockchain for accountability.
- **DPoS governance**: decentralized decision-making for disputes.
- **On-chain ride lifecycle**: verifiable ride start/complete events.
- **Evidence anchoring**: privacy-preserving dispute evidence hashes.
- **Security layers**: RBAC + encryption + moderation + audit logging.
