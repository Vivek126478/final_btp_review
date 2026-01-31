# DPoS Delegate Mechanism (How We Used It In This Application)

This document explains **how the DPoS (Delegated Proof of Stake) delegate mechanism is implemented and used in this project** for governance-style dispute resolution / reputation finalization.

It is written specifically for this repository, based on the contracts and deployment scripts in `contracts/`.

---

## 1) Why DPoS in a carpooling app?

In a decentralized ride-sharing/carpooling platform, disputes can happen, for example:

- A rider says the host never arrived.
- A host says the rider didn’t show up.
- A user reports fraud/harassment and wants reputation impact.

Instead of one centralized admin deciding everything, we use **DPoS delegates**:

- Anyone can become a **candidate** by staking ETH.
- Users vote (stake-weighted) to elect the top-N **delegates**.
- Only delegates can vote on disputes.

This gives:

- Transparent governance
- Open participation
- Sybil resistance via stake

---

## 2) What we built (high-level)

### Contracts involved

- `contracts/contracts/DPoSGovernance.sol`
  - Open candidate registration (pay stake)
  - Voting for candidates (pay vote stake)
  - Top `delegateCount` candidates become delegates (computed by `getDelegates()`)

- `contracts/contracts/DisputeResolution.sol`
  - Dispute creation (`openDispute`)
  - Delegate voting (`delegateVote`) restricted by `onlyDelegate`
  - Finalization when quorum is reached or when voting period expires

### Deployment

Deployment happens through Hardhat:

- `contracts/scripts/deploy.js`

This deploy script:

- Deploys `UserIdentity`, `RideContract`, `Reputation`
- Deploys `DPoSGovernance`
- Deploys `DisputeResolution` linked to `DPoSGovernance`
- Writes deployed addresses to:
  - `contracts/deployments/contract-addresses.json`
- Writes ABIs to:
  - `contracts/deployments/abis/`
- Updates root `.env` with:
  - `DPOS_GOVERNANCE_CONTRACT_ADDRESS=...`
  - `DISPUTE_RESOLUTION_CONTRACT_ADDRESS=...`

---

## 3) DPoSGovernance.sol — detailed behavior

**File:** `contracts/contracts/DPoSGovernance.sol`

### Key parameters

- `delegateCount`
  - Number of delegates that exist at any time.
  - In deployment script it is set to `5`.

- `minCandidateStake`
  - Minimum ETH required to register as a candidate.
  - In deployment script it is set to `0.01 ETH`.

### Candidate registration (open model)

Anyone can become a candidate:

- Call `registerCandidate(metadataURI)`
- Send `msg.value >= minCandidateStake`

Contract stores:

- `stake` for candidate
- `metadataURI` (can point to IPFS/HTTP JSON describing candidate)

### Voting (stake-weighted)

Any wallet can vote by staking ETH:

- Call `vote(candidate)`
- Send `msg.value > 0`

The vote value is tracked:

- `votesByVoter[voter][candidate] += amount`
- `candidates[candidate].totalVotes += amount`

### Unvoting (refund)

A voter can withdraw some vote stake:

- Call `unvote(candidate, amount)`

This refunds ETH back to the voter.

### Who is a delegate?

Delegates are derived dynamically:

- `getDelegates()` returns the top `delegateCount` candidates by `totalVotes`.
- `isDelegate(account)` checks membership in `getDelegates()`.

Important note: This implementation computes top delegates **on demand** (no stored sorted set).

---

## 4) DisputeResolution.sol — detailed behavior

**File:** `contracts/contracts/DisputeResolution.sol`

This contract references governance:

- `DPoSGovernance public immutable governance;`

### Dispute lifecycle

#### 4.1 Open a dispute

Anyone can open a dispute:

- `openDispute(rideId, evidenceHash)`

Stored fields:

- `rideId` (matches your internal ride / blockchain ride id concept)
- `openedBy`
- `evidenceHash` (bytes32)
- `openedAt` timestamp

#### 4.2 Delegate voting

Only delegates can vote:

- `delegateVote(disputeId, decision)`
- restricted by `onlyDelegate` which calls `governance.isDelegate(msg.sender)`

Decision:

- `Approve` or `Reject`

Voting rules:

- One vote per delegate per dispute (tracked by `hasVoted`)
- Voting must happen before `openedAt + votingPeriodSeconds`

#### 4.3 Quorum & finalization

Quorum is set in deployment script:

- `quorum = 3`

Finalization:

- If `approveVotes >= quorum` → final decision = Approve
- If `rejectVotes >= quorum` → final decision = Reject

If time expires:

- Anyone can call `finalizeIfExpired(disputeId)`
- decision is based on majority or None if tie

---

## 5) Where DPoS fits in the application flow

### 5.1 Normal ride flow (no dispute)

- Rides are created/joined/completed normally in the app.
- Ratings and reputation can be recorded normally.

### 5.2 When a dispute happens

In the application, DPoS is used when there is a conflict that should not be decided centrally.

Proposed integration points (recommended):

- **Complaint/Dispute submission** page in the UI
  - user uploads evidence off-chain (optional)
  - app hashes evidence and sends `evidenceHash` on-chain
  - app calls `openDispute(rideId, evidenceHash)`

- **Delegate dashboard**
  - show active disputes
  - allow delegates to vote Approve/Reject

- **After finalization**
  - backend reads the dispute outcome
  - backend updates reputation / dispute status in DB

---

## 6) How to run and deploy locally

### 6.1 Start local chain

From `contracts/`:

- Start Hardhat node

### 6.2 Deploy contracts

From `contracts/`:

- Run deployment script (`npm run deploy:local` as mentioned in README)

This will update root `.env` with:

- `DPOS_GOVERNANCE_CONTRACT_ADDRESS`
- `DISPUTE_RESOLUTION_CONTRACT_ADDRESS`

And it will save ABIs into:

- `contracts/deployments/abis/DPoSGovernance.json`
- `contracts/deployments/abis/DisputeResolution.json`

### 6.3 Make frontend ready

Copy ABIs to the frontend (like README suggests for other contracts). For DPoS, you should also copy:

- `contracts/deployments/abis/DPoSGovernance.json` → `client/src/contracts/DPoSGovernance.json`
- `contracts/deployments/abis/DisputeResolution.json` → `client/src/contracts/DisputeResolution.json`

Add addresses to `client/.env`:

- `REACT_APP_DPOS_GOVERNANCE_CONTRACT=<address>`
- `REACT_APP_DISPUTE_RESOLUTION_CONTRACT=<address>`

---

## 7) How the UI should use it (typical calls)

### 7.1 Candidate registration (open candidate model)

Use case: any user wants to become a governance candidate.

- Call `DPoSGovernance.registerCandidate(metadataURI)`
- Send `minCandidateStake` ETH

Metadata suggestions:

- Store JSON at IPFS/HTTP:
  - name
  - bio
  - social links
  - "why vote for me"

### 7.2 Voting for a candidate

Use case: any user wants to vote for a candidate.

- Call `DPoSGovernance.vote(candidateAddress)`
- Send any ETH amount

### 7.3 Listing delegates

Use case: show current elected delegates.

- Call `DPoSGovernance.getDelegates()`

### 7.4 Opening a dispute

Use case: someone files a dispute for a ride.

- Compute evidence hash in UI or backend
- Call `DisputeResolution.openDispute(rideId, evidenceHash)`

### 7.5 Delegate voting

Use case: delegates decide.

- Call `DisputeResolution.delegateVote(disputeId, decision)`

---

## 8) How the backend should use it

Even if voting is done from the frontend (MetaMask), the backend can still:

- Verify that a dispute exists on-chain
- Read final decisions
- Apply the result to the app database

Typical backend patterns:

- **Read-only JSON-RPC provider** using `BLOCKCHAIN_RPC_URL`
- Instantiate contracts using ABI + address

Recommended backend responsibilities:

- After a dispute is finalized, update DB:
  - set complaint status to resolved
  - mark ride outcome
  - adjust reputation scores (if your on-chain Reputation contract is also used, trigger UI to submit those transactions)

---

## 9) Security / Design notes

- **DPoS on demand**: `getDelegates()` is computed by iterating candidates. This is fine for small N locally but may not scale to huge candidate lists.
- **ETH locking**:
  - Candidate stake locked until `unregisterCandidate()`.
  - Vote stake locked until `unvote()`.
- **Delegate snapshot**:
  - `onlyDelegate` checks current delegates at vote time.
  - If voting spans long times and delegates change, results can change. A future enhancement is “snapshot delegates at dispute creation”.

---

## 10) File locations summary

- **Governance contract**
  - `contracts/contracts/DPoSGovernance.sol`

- **Dispute contract**
  - `contracts/contracts/DisputeResolution.sol`

- **Deployment script**
  - `contracts/scripts/deploy.js`

- **Generated deployment info**
  - `contracts/deployments/contract-addresses.json`
  - `contracts/deployments/abis/DPoSGovernance.json`
  - `contracts/deployments/abis/DisputeResolution.json`

---

## Status

- This repo currently contains the **contracts and deployment pipeline** for DPoS.
- If you want, I can also add:
  - a small React page to register candidates + vote
  - a backend API to list candidates/delegates and disputes
  - a delegate voting dashboard
