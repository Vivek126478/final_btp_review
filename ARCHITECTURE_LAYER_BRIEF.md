# D-CARPOOL — Architecture Layer Brief (for Diagram Explanation)

This document explains the architecture **layer-by-layer** and summarizes **how API calls and blockchain anchoring work** in the current implementation.

---

## 1) Frontend Layer (React Web App)

### What it contains
- **Pages / Screens**
  - Search Rides
  - Post Ride
  - Ride Details
  - My Rides
  - Admin Dashboard
- **API client**
  - Centralized Axios wrapper in `client/src/utils/api.js`
  - All UI actions call backend REST APIs through this wrapper

### How it is used
- User interacts with UI.
- UI triggers API calls (search, create ride, join request, start boarding OTP, complete ride, file complaint).
- Frontend only displays results and state; the backend remains the source of truth for ride status and complaint records.

### How API calls work (frontend view)
- Axios sends REST requests to backend.
- Authentication info is attached via request headers (as per current backend auth setup).

---

## 2) Backend Layer (Node.js + Express)

### What it contains
- **Express server**
  - Route registration, middleware, error handling
- **Controllers**
  - **Ride Controller**: ride creation, search, join/accept/reject, leave, start boarding OTP, complete/cancel, hide/unhide, host block/unblock
  - **Complaint Controller**: file complaint + on-chain dispute anchoring (best-effort)
  - **Admin Controller**: manage users, rides, complaints (admin-only)
- **Middleware**
  - Authentication
  - Role-based access control (RBAC)

### How it is used
- Backend is the **main business logic layer**.
- It validates requests, enforces permissions, updates database records, and triggers side-effects (email + blockchain transactions).

### How API calls work (backend view)
Typical request lifecycle:
1. **Route** receives request
2. **Auth middleware** resolves user + permissions
3. **Controller** executes business logic
4. **Database updates** happen through Sequelize models
5. Optional **support services** run (email, moderation, blockchain)
6. Response returned to frontend

---

## 3) Database Layer (MySQL + Sequelize)

### What it stores
- **Users**: profiles, roles, status
- **Rides**: ride details and current status
  - Includes `blockchainRideId` to link the off-chain ride to the on-chain `rideId`
- **RideParticipants**: join requests + participation status
- **Ratings**: feedback and reputation references
  - Includes `blockchainTxHash` (audit proof for on-chain rating, if used)
- **Complaints**: complaint category, description, status
  - Includes:
    - `blockchainTxHash`
    - `blockchainDisputeId`

### Why DB is still needed
- Stores full application data efficiently (search, filtering, user dashboards).
- Keeps private/sensitive data off-chain.
- Blockchain is used only for **integrity proofs** and **governance actions**.

---

## 4) Blockchain Layer (Local Hardhat)

### What it contains
Smart contracts deployed on **Hardhat local network**:
- **RideContract**
  - On-chain ride markers:
    - `RideStarted` event (when boarding starts)
    - `RideCompleted` event (when ride completes)
- **DPoSGovernance**
  - Maintains delegate set via staking/voting
  - Delegates represent who has authority to vote in disputes
- **DisputeResolution**
  - `openDispute(rideId, evidenceHash)` creates a dispute on-chain
  - Uses DPoS delegates for decision-making

### Where blockchain is used in the app
- **Ride lifecycle anchoring** (tamper-evident timestamps)
  - When host starts boarding → backend calls `RideContract.startRide(blockchainRideId)`
  - When host completes ride → backend calls `RideContract.completeRide(blockchainRideId)`
- **Complaint anchoring + dispute creation**
  - When user files complaint → backend calls `DisputeResolution.openDispute(blockchainRideId, evidenceHash)`
  - Backend stores `txHash` and `disputeId` in DB

### Important note (design choice)
- Blockchain calls are **best-effort**:
  - If the chain transaction fails temporarily, the app still proceeds with core DB workflow.
  - When successful, DB stores the chain references for auditability.

---

## 5) Support Services Layer

### Email Service (OTP)
- Used for **boarding verification**.
- When host starts boarding OTP:
  - backend generates OTP session
  - backend sends OTP to participants via email

### Moderation / Anti-abuse
- Local enforcement features:
  - Rider can **hide** rides from their dashboard/search
  - Host can **block** a rider across host rides
  - Anti-spam signals (join then leave quickly)

---

## 6) Key End-to-End Flows (What to explain during presentation)

### Flow A: Search → Join → Accept
- Frontend calls backend search API
- Backend reads rides from DB (applies hidden/blocked rules)
- Rider sends join request
- Host accepts or rejects
- DB updates participant status

### Flow B: Boarding OTP → Ride Started on-chain
- Host starts boarding OTP
- Backend:
  - sends OTP emails
  - anchors `RideStarted` on-chain via RideContract

### Flow C: Complete Ride → Ride Completed on-chain
- Host completes ride
- Backend:
  - updates ride status in DB
  - anchors `RideCompleted` on-chain via RideContract

### Flow D: Complaint → Dispute Anchor (DPoS)
- User files complaint
- Backend:
  - stores complaint in DB
  - computes an `evidenceHash`
  - calls DisputeResolution `openDispute(rideId, evidenceHash)`
  - stores `blockchainTxHash` + `blockchainDisputeId`
- Delegates (from DPoSGovernance) are the authority for dispute voting.
