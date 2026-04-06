# 🎨 AI Diagram Prompts for D-CARPOOL

> Ready-to-use prompts for Eraser.io, Mermaid, Draw.io AI, and similar tools

---

## 📋 Table of Contents

1. [System Architecture Prompts](#1-system-architecture-prompts)
2. [Security Architecture Prompts](#2-security-architecture-prompts)
3. [User Flow Prompts](#3-user-flow-prompts)
4. [Data Flow Prompts](#4-data-flow-prompts)
5. [Smart Contract Prompts](#5-smart-contract-prompts)
6. [Sequence Diagram Prompts](#6-sequence-diagram-prompts)
7. [Component Diagram Prompts](#7-component-diagram-prompts)

---

## 1. System Architecture Prompts

### 🔷 High-Level Architecture

```
Create a system architecture diagram for a decentralized carpooling application called D-CARPOOL with the following components:

FRONTEND (React.js):
- Web browser client
- MetaMask wallet integration
- Leaflet/OpenStreetMap for location
- TailwindCSS styling

BACKEND (Node.js/Express):
- REST API server on port 4000
- JWT authentication
- Sequelize ORM
- Cryptographic utilities

BLOCKCHAIN (Ethereum/Hardhat):
- Local Hardhat node on port 8545
- 8 smart contracts: UserIdentity, RideContract, Reputation, DPoSGovernance, DisputeResolution, ZKPDriverVerifier, MerkleAuditTrail, ShamirSOSVault

DATABASE:
- MySQL database
- Tables: Users, Rides, RideParticipants, Ratings, Complaints, SOSAlerts

EXTERNAL SERVICES:
- CP-ABE encryption service (Flask/Python) on port 7001
- IPFS for decentralized storage
- Email service (Nodemailer)

Show connections between all layers with arrows indicating data flow direction.
Use a modern tech company visual style with icons for each technology.
```

---

### 🔷 Three-Tier Architecture

```
Create a clean three-tier architecture diagram:

TIER 1 - PRESENTATION LAYER:
- React.js web application
- Components: Navbar, LocationAutocomplete, MapPreview, RideCards, Chat
- State management: React Context
- Blockchain: ethers.js v6 for MetaMask

TIER 2 - APPLICATION LAYER:
- Express.js REST API
- Controllers: Auth, Ride, Rating, Complaint, SOS, Admin
- Middleware: JWT authentication, role-based access
- Services: Blockchain interaction, Email, IPFS, Encryption

TIER 3 - DATA LAYER:
- MySQL (primary database)
- Ethereum blockchain (immutable records)
- JSON files (temporary data)
- IPFS (decentralized storage)

Style: Modern, minimalist with connecting arrows between tiers.
Color scheme: Blue for frontend, Green for backend, Purple for data layer.
```

---

### 🔷 Microservices Style

```
Create a microservices-style architecture diagram showing:

CLIENT APPS:
- Web Browser (React SPA)
- MetaMask Extension

API GATEWAY:
- Express.js server (port 4000)
- Routes: /auth, /rides, /ratings, /complaints, /sos, /admin

SERVICES:
1. Authentication Service (JWT, bcrypt)
2. Ride Management Service (CRUD, matching)
3. Rating & Reputation Service
4. Dispute Resolution Service (DPoS voting)
5. SOS Emergency Service (Shamir SSS)
6. Audit Service (Merkle trees)

EXTERNAL INTEGRATIONS:
- CP-ABE Encryption Service (port 7001)
- IPFS Gateway
- SMTP Email Server

DATA STORES:
- MySQL (relational data)
- Hardhat Ethereum Node (blockchain)
- In-memory cache (OTPs, sessions)

Use container-style boxes with service names and icons.
```

---

## 2. Security Architecture Prompts

### 🔐 Security Layers Diagram

```
Create a layered security architecture diagram for D-CARPOOL with 3 security layers:

LAYER 1 - IDENTITY & ACCESS CONTROL:
- Soulbound Tokens (SBT) - non-transferable academic identity
- JWT Authentication - access/refresh tokens
- Email Verification - OTP for @iiitkottayam.ac.in
- MetaMask Wallet - transaction signing

LAYER 2 - DATA PROTECTION:
- CP-ABE Encryption - attribute-based policies for vehicle info
- Shamir's Secret Sharing - split emergency data into 5 shares
- Hash Integrity - keccak256 for ride agreements
- Merkle Trees - efficient batch verification

LAYER 3 - VERIFICATION & GOVERNANCE:
- Zero-Knowledge Proofs - driver license verification without exposure
- DPoS Governance - delegate voting for disputes
- On-chain audit trail - immutable records

Style: Shield/fortress metaphor with layers getting more secure toward center.
Use lock icons, shield icons, and encryption symbols.
```

---

### 🔐 Cryptographic Flow

```
Create a diagram showing cryptographic operations in D-CARPOOL:

ENCRYPTION FLOWS:
1. Vehicle Info → CP-ABE Encrypt → Stored (only ride participants can decrypt)
2. Emergency Data → Shamir Split (5,3) → 5 shares distributed
3. Ride Agreement → Keccak256 Hash → Stored on blockchain

VERIFICATION FLOWS:
1. Driver License → ZK Circuit → Proof → On-chain verification
2. Academic Email → SBT Minting → Permanent on-chain identity
3. Dispute → DPoS Delegate Voting → Resolution

AUDIT FLOWS:
1. Daily Rides → Merkle Tree → Root Hash → Blockchain anchor
2. Any ride → Merkle Proof → Verify existence

Show data transformation at each step with encryption/hashing symbols.
```

---

## 3. User Flow Prompts

### 👤 User Journey

```
Create a user journey flowchart for D-CARPOOL:

ONBOARDING:
1. User visits website
2. Clicks "Register"
3. Enters @iiitkottayam.ac.in email + password
4. Receives OTP via email
5. Verifies OTP
6. Connects MetaMask wallet
7. Mints Soulbound Token (SBT)
8. Profile complete ✓

POSTING A RIDE (Host):
1. Click "Post Ride"
2. Enter source location (autocomplete)
3. Enter destination (autocomplete)
4. Select date/time
5. Enter price and seats
6. Enter vehicle details
7. Vehicle info encrypted (CP-ABE)
8. Ride hash stored on blockchain
9. Ride posted ✓

JOINING A RIDE (Passenger):
1. Search rides by route/date
2. View matching rides
3. Click "Join Request"
4. Host receives notification
5. Host approves/rejects
6. If approved: Join ride chat
7. On ride day: Boarding OTP exchange
8. Complete ride
9. Rate each other

Style: Flowchart with decision diamonds, process rectangles, and swim lanes for different user roles.
```

---

### 👤 Ride Lifecycle

```
Create a ride lifecycle state diagram:

STATES:
1. CREATED - Ride posted by host
2. OPEN - Accepting join requests
3. PENDING - Has pending requests
4. CONFIRMED - Passengers approved
5. IN_PROGRESS - Ride happening
6. COMPLETED - Ride finished successfully
7. CANCELLED - Ride cancelled
8. DISPUTED - Dispute raised

TRANSITIONS:
- CREATED → OPEN: Automatically
- OPEN → PENDING: Join request received
- PENDING → CONFIRMED: Host approves
- CONFIRMED → IN_PROGRESS: Ride time reached
- IN_PROGRESS → COMPLETED: All boarding confirmed
- ANY → CANCELLED: Host/system cancels
- COMPLETED → DISPUTED: User raises complaint

Show transitions with labeled arrows.
Include icons for each state.
```

---

## 4. Data Flow Prompts

### 📊 Request/Response Flow

```
Create a data flow diagram showing API request lifecycle:

REQUEST PATH:
1. Browser → HTTP Request
2. Express Router → Route matching
3. Auth Middleware → JWT verification
4. Controller → Business logic
5. Service Layer → External calls
6. Model → Database query
7. Response → JSON

BLOCKCHAIN PATH:
1. Frontend → MetaMask popup
2. User signs transaction
3. ethers.js → Contract call
4. Hardhat Node → Execute
5. Event emitted
6. Frontend catches event

ENCRYPTION PATH:
1. Sensitive data input
2. Backend → CP-ABE service call
3. Encrypt with policy
4. Store ciphertext
5. On request → Check attributes
6. Decrypt if authorized

Show parallel paths with merge points.
```

---

### 📊 Ride Creation Data Flow

```
Create a sequence diagram for ride creation:

ACTORS:
- User Browser
- React App
- MetaMask
- Express API
- MySQL DB
- CP-ABE Service
- Ethereum Blockchain

FLOW:
1. User fills ride form
2. React validates input
3. API call: POST /api/rides
4. Server validates user auth
5. Encrypt vehicle info via CP-ABE
6. Store ride in MySQL
7. Calculate agreement hash
8. MetaMask prompts for signature
9. User signs transaction
10. RideContract.createRide() called
11. Transaction confirmed
12. Return ride ID to user
13. Display success

Show async operations and error handling branches.
```

---

## 5. Smart Contract Prompts

### ⛓️ Contract Relationships

```
Create a smart contract dependency diagram:

CONTRACTS:
1. UserIdentity
   - Manages Soulbound Tokens
   - Functions: mintSBT(), verifySBT(), revokeSBT()
   - No dependencies

2. RideContract
   - Stores ride agreement hashes
   - Functions: createRide(), joinRide(), completeRide()
   - Depends on: UserIdentity (verify users)

3. Reputation
   - On-chain ratings
   - Functions: rateUser(), getAverageRating()
   - Depends on: UserIdentity, RideContract

4. DPoSGovernance
   - Delegate elections
   - Functions: registerCandidate(), vote(), delegate()
   - Depends on: UserIdentity

5. DisputeResolution
   - Dispute voting
   - Functions: createDispute(), castVote(), resolveDispute()
   - Depends on: DPoSGovernance, RideContract

6. ZKPDriverVerifier
   - Zero-knowledge proofs
   - Functions: submitProof(), verifyProof()
   - Depends on: UserIdentity

7. MerkleAuditTrail
   - Batch anchoring
   - Functions: anchorRoot(), verifyProof()
   - Standalone

8. ShamirSOSVault
   - Emergency data shares
   - Functions: configureSOS(), commitShare(), triggerSOS()
   - Depends on: UserIdentity

Show inheritance (OpenZeppelin) and call relationships.
Use boxes with contract names and key functions listed.
```

---

### ⛓️ Contract Interaction Flow

```
Create a diagram showing smart contract interactions during dispute resolution:

SCENARIO: User raises dispute about a completed ride

STEP 1: Frontend
- User clicks "Raise Dispute"
- Enters complaint details + evidence IPFS hash

STEP 2: DisputeResolution Contract
- createDispute(rideId, reason, evidenceHash)
- Emits DisputeCreated event

STEP 3: DPoSGovernance Contract
- getActiveDelegates() returns top 5 delegates

STEP 4: Notification
- Backend notifies delegates via email/push

STEP 5: Voting Period (24 hours)
- Each delegate calls castVote(disputeId, verdict)
- Verdicts: FAVOR_COMPLAINANT, FAVOR_ACCUSED, ABSTAIN

STEP 6: Resolution
- After deadline: resolveDispute(disputeId)
- Tallies votes, requires 3/5 quorum
- Executes outcome (refund, ban, dismiss)

STEP 7: Reputation Update
- Reputation contract updated based on outcome

Show timeline and parallel delegate voting.
```

---

## 6. Sequence Diagram Prompts

### 📈 Authentication Sequence

```
Create a sequence diagram for user authentication:

PARTICIPANTS:
- Browser
- React App
- Express Server
- MySQL
- Blockchain (MetaMask)

LOGIN FLOW:
Browser -> React: Enter email/password
React -> Express: POST /api/auth/login
Express -> MySQL: Find user by email
MySQL --> Express: User record
Express -> Express: bcrypt.compare(password)
Express --> React: JWT token (if valid)
React -> Browser: Store token, redirect

BLOCKCHAIN CONNECTION:
Browser -> MetaMask: Request accounts
MetaMask -> Browser: Prompt user
Browser -> MetaMask: User approves
MetaMask --> React: Wallet address
React -> Express: POST /api/auth/link-wallet
Express -> MySQL: Update user wallet
Express --> React: Success
React -> Blockchain: Check SBT ownership
Blockchain --> React: Has SBT? true/false
React -> Browser: Show verified badge

Show error branches for invalid credentials.
```

---

### 📈 SOS Emergency Sequence

```
Create a sequence diagram for SOS emergency trigger:

PARTICIPANTS:
- User Phone
- React App
- Express Server
- ShamirSOSVault Contract
- Trusted Contacts
- Emergency Services

SETUP (One-time):
User -> React: Configure emergency data
React -> Express: POST /api/sos/configure
Express -> Express: Shamir split (5,3)
Express -> Contract: commitShare(hash1, hash2, ...)
Express -> IPFS: Store encrypted shares
Express -> Contacts: Send share links
Express --> React: Configuration complete

EMERGENCY TRIGGER:
User -> React: Press SOS button
React -> Express: POST /api/sos/trigger
Express -> Contract: triggerSOS(userId)
Contract -> Contract: Emit SOSTriggered event
Express -> Express: Get admin share (auto)
Express -> Express: Get user share (auto)
Express -> Contact1: Request share (SMS)
Contact1 -> Express: Verify OTP, provide share
Express -> Express: Reconstruct (3 shares)
Express -> Emergency: Send alert with data
Express -> Contacts: Notify all with location
Express --> React: SOS activated

Show the threshold requirement clearly.
```

---

## 7. Component Diagram Prompts

### 🧩 React Component Hierarchy

```
Create a React component hierarchy diagram:

APP (Root)
├── AuthContext (Provider)
├── Router
│   ├── Navbar (always visible)
│   │   ├── Logo
│   │   ├── NavLinks
│   │   └── WalletButton
│   │
│   ├── Public Routes
│   │   ├── Home
│   │   ├── Login
│   │   └── Register
│   │
│   ├── Protected Routes
│   │   ├── PostRide
│   │   │   ├── LocationAutocomplete (source)
│   │   │   ├── LocationAutocomplete (dest)
│   │   │   ├── OpenStreetMapPreview
│   │   │   └── VehicleForm
│   │   │
│   │   ├── SearchRides
│   │   │   ├── SearchFilters
│   │   │   └── RideCard (list)
│   │   │
│   │   ├── RideDetails
│   │   │   ├── RideInfo
│   │   │   ├── ParticipantList
│   │   │   ├── ChatWindow
│   │   │   └── ActionButtons
│   │   │
│   │   ├── MyRides
│   │   │   ├── HostedRides
│   │   │   └── JoinedRides
│   │   │
│   │   └── Profile
│   │       ├── UserInfo
│   │       ├── WalletSection
│   │       └── SOSConfig
│   │
│   └── Admin Routes
│       └── Admin
│           ├── UsersPanel
│           ├── RidesPanel
│           ├── MerkleAuditPanel
│           ├── CPABEPanel
│           └── ShamirSSSPanel

Show parent-child relationships with tree structure.
Color code: Public (blue), Protected (green), Admin (red).
```

---

### 🧩 Backend Module Structure

```
Create a backend architecture component diagram:

SERVER.JS (Entry Point)
│
├── CONFIG
│   └── database.js (Sequelize connection)
│
├── MIDDLEWARE
│   └── auth.js (JWT verification)
│
├── ROUTES (API endpoints)
│   ├── auth.js → authController
│   ├── rides.js → rideController
│   ├── ratings.js → ratingController
│   ├── complaints.js → complaintController
│   ├── sos.js → sosController, sssController
│   └── admin.js → adminController
│
├── CONTROLLERS (Business logic)
│   ├── authController.js
│   ├── rideController.js
│   ├── ratingController.js
│   ├── complaintController.js
│   ├── sosController.js
│   ├── sssController.js
│   └── adminController.js
│
├── MODELS (Sequelize)
│   ├── User.js
│   ├── Ride.js
│   ├── RideParticipant.js
│   ├── Rating.js
│   ├── Complaint.js
│   ├── SOSAlert.js
│   └── Ticket.js
│
├── UTILS (Shared utilities)
│   ├── blockchain.js (ethers.js)
│   ├── merkleTree.js
│   ├── shamirSSS.js
│   ├── cpabeClient.js
│   ├── ipfsService.js
│   ├── emailService.js
│   └── auditLog.js
│
└── SERVICES
    └── pnrService.js

Show data flow from routes → controllers → models → utils.
```

---

## 🎯 Tips for Using These Prompts

### For Eraser.io:
1. Copy the prompt text
2. Use "Generate with AI" feature
3. Select "Architecture Diagram" or "Flowchart"
4. Refine with follow-up prompts

### For Mermaid (in Markdown):
Add "Convert this to Mermaid diagram syntax" at the end of any prompt.

### For Draw.io:
1. Use the AI assistant plugin
2. Paste the prompt
3. Choose diagram type
4. Export as PNG/SVG

### For Lucidchart:
1. Use AI diagram generation
2. Paste component list
3. Let it auto-arrange
4. Customize styling

---

## 🎨 Style Suggestions

| Style | Best For | Prompt Addition |
|-------|----------|-----------------|
| **Minimalist** | Presentations | "Use clean lines, minimal colors, white background" |
| **Tech Company** | Documentation | "Use modern tech icons, gradient backgrounds" |
| **Blueprint** | Technical specs | "Use grid layout, technical drawing style" |
| **Colorful** | Marketing | "Use vibrant colors, rounded shapes, shadows" |
| **Dark Mode** | Developer docs | "Dark background, neon accent colors" |

---

*Generated for D-CARPOOL BTP Project - IIIT Kottayam*
