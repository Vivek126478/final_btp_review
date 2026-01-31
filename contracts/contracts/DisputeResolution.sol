// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DPoSGovernance.sol";

contract DisputeResolution {
    enum Decision {
        None,
        Approve,
        Reject
    }

    struct Dispute {
        uint256 rideId;
        address openedBy;
        bytes32 evidenceHash;
        uint256 openedAt;
        bool finalized;
        Decision finalDecision;
        uint256 approveVotes;
        uint256 rejectVotes;
    }

    DPoSGovernance public immutable governance;
    uint256 public immutable votingPeriodSeconds;
    uint256 public immutable quorum;

    uint256 public disputeCount;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // disputeId => delegate => voted?

    event DisputeOpened(uint256 indexed disputeId, uint256 indexed rideId, address indexed openedBy, bytes32 evidenceHash);
    event DelegateVoted(uint256 indexed disputeId, address indexed delegate, Decision decision);
    event DisputeFinalized(uint256 indexed disputeId, Decision decision);

    modifier onlyDelegate() {
        require(governance.isDelegate(msg.sender), "Only delegate");
        _;
    }

    constructor(address governanceAddress, uint256 _quorum, uint256 _votingPeriodSeconds) {
        require(governanceAddress != address(0), "Invalid governance address");
        require(_quorum > 0, "Quorum must be > 0");
        require(_votingPeriodSeconds > 0, "Voting period must be > 0");

        governance = DPoSGovernance(governanceAddress);
        quorum = _quorum;
        votingPeriodSeconds = _votingPeriodSeconds;
    }

    function openDispute(uint256 rideId, bytes32 evidenceHash) external returns (uint256) {
        uint256 id = disputeCount++;
        disputes[id] = Dispute({
            rideId: rideId,
            openedBy: msg.sender,
            evidenceHash: evidenceHash,
            openedAt: block.timestamp,
            finalized: false,
            finalDecision: Decision.None,
            approveVotes: 0,
            rejectVotes: 0
        });

        emit DisputeOpened(id, rideId, msg.sender, evidenceHash);
        return id;
    }

    function delegateVote(uint256 disputeId, Decision decision) external onlyDelegate {
        require(decision == Decision.Approve || decision == Decision.Reject, "Invalid decision");

        Dispute storage d = disputes[disputeId];
        require(!d.finalized, "Already finalized");
        require(block.timestamp <= d.openedAt + votingPeriodSeconds, "Voting ended");
        require(!hasVoted[disputeId][msg.sender], "Already voted");

        hasVoted[disputeId][msg.sender] = true;

        if (decision == Decision.Approve) {
            d.approveVotes++;
        } else {
            d.rejectVotes++;
        }

        emit DelegateVoted(disputeId, msg.sender, decision);

        if (d.approveVotes >= quorum) {
            _finalize(disputeId, Decision.Approve);
        } else if (d.rejectVotes >= quorum) {
            _finalize(disputeId, Decision.Reject);
        }
    }

    function finalizeIfExpired(uint256 disputeId) external {
        Dispute storage d = disputes[disputeId];
        require(!d.finalized, "Already finalized");
        require(block.timestamp > d.openedAt + votingPeriodSeconds, "Not expired");

        if (d.approveVotes > d.rejectVotes) {
            _finalize(disputeId, Decision.Approve);
        } else if (d.rejectVotes > d.approveVotes) {
            _finalize(disputeId, Decision.Reject);
        } else {
            _finalize(disputeId, Decision.None);
        }
    }

    function _finalize(uint256 disputeId, Decision decision) internal {
        Dispute storage d = disputes[disputeId];
        if (d.finalized) return;

        d.finalized = true;
        d.finalDecision = decision;

        emit DisputeFinalized(disputeId, decision);
    }
}
