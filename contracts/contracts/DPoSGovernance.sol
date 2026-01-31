// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DPoSGovernance {
    struct Candidate {
        bool registered;
        uint256 stake;
        string metadataURI;
        uint256 totalVotes;
    }

    uint256 public immutable minCandidateStake;
    uint256 public immutable delegateCount;

    mapping(address => Candidate) public candidates;
    address[] private candidateList;

    mapping(address => mapping(address => uint256)) public votesByVoter; // voter => candidate => amount

    event CandidateRegistered(address indexed candidate, uint256 stake, string metadataURI);
    event CandidateUnregistered(address indexed candidate);
    event Voted(address indexed voter, address indexed candidate, uint256 amount);
    event Unvoted(address indexed voter, address indexed candidate, uint256 amount);

    constructor(uint256 _delegateCount, uint256 _minCandidateStake) {
        require(_delegateCount > 0, "delegateCount must be > 0");
        require(_minCandidateStake > 0, "minCandidateStake must be > 0");
        delegateCount = _delegateCount;
        minCandidateStake = _minCandidateStake;
    }

    function registerCandidate(string calldata metadataURI) external payable {
        Candidate storage c = candidates[msg.sender];
        require(!c.registered, "Already registered");
        require(msg.value >= minCandidateStake, "Insufficient stake");

        candidates[msg.sender] = Candidate({
            registered: true,
            stake: msg.value,
            metadataURI: metadataURI,
            totalVotes: 0
        });
        candidateList.push(msg.sender);

        emit CandidateRegistered(msg.sender, msg.value, metadataURI);
    }

    function unregisterCandidate() external {
        Candidate storage c = candidates[msg.sender];
        require(c.registered, "Not registered");

        c.registered = false;

        uint256 stakeAmount = c.stake;
        c.stake = 0;

        if (stakeAmount > 0) {
            (bool ok, ) = msg.sender.call{ value: stakeAmount }("");
            require(ok, "Stake refund failed");
        }

        emit CandidateUnregistered(msg.sender);
    }

    function vote(address candidate) external payable {
        require(msg.value > 0, "Vote amount must be > 0");
        Candidate storage c = candidates[candidate];
        require(c.registered, "Candidate not registered");

        votesByVoter[msg.sender][candidate] += msg.value;
        c.totalVotes += msg.value;

        emit Voted(msg.sender, candidate, msg.value);
    }

    function unvote(address candidate, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        uint256 current = votesByVoter[msg.sender][candidate];
        require(current >= amount, "Insufficient voted amount");

        votesByVoter[msg.sender][candidate] = current - amount;

        Candidate storage c = candidates[candidate];
        if (c.totalVotes >= amount) {
            c.totalVotes -= amount;
        } else {
            c.totalVotes = 0;
        }

        (bool ok, ) = msg.sender.call{ value: amount }("");
        require(ok, "Refund failed");

        emit Unvoted(msg.sender, candidate, amount);
    }

    function getCandidateCount() external view returns (uint256) {
        return candidateList.length;
    }

    function getCandidates(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = candidateList.length;
        if (offset >= total) {
            return new address[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        address[] memory out = new address[](end - offset);
        uint256 j = 0;
        for (uint256 i = offset; i < end; i++) {
            out[j++] = candidateList[i];
        }
        return out;
    }

    function isDelegate(address account) public view returns (bool) {
        address[] memory delegates = getDelegates();
        for (uint256 i = 0; i < delegates.length; i++) {
            if (delegates[i] == account) return true;
        }
        return false;
    }

    function getDelegates() public view returns (address[] memory) {
        uint256 n = delegateCount;

        address[] memory top = new address[](n);
        uint256[] memory topVotes = new uint256[](n);
        uint256 filled = 0;

        for (uint256 i = 0; i < candidateList.length; i++) {
            address candAddr = candidateList[i];
            Candidate memory c = candidates[candAddr];
            if (!c.registered) continue;

            uint256 v = c.totalVotes;

            if (filled < n) {
                top[filled] = candAddr;
                topVotes[filled] = v;
                filled++;
                continue;
            }

            uint256 minIdx = 0;
            uint256 minV = topVotes[0];
            for (uint256 k = 1; k < n; k++) {
                if (topVotes[k] < minV) {
                    minV = topVotes[k];
                    minIdx = k;
                }
            }

            if (v > minV) {
                top[minIdx] = candAddr;
                topVotes[minIdx] = v;
            }
        }

        if (filled == n) {
            return top;
        }

        address[] memory out = new address[](filled);
        for (uint256 i = 0; i < filled; i++) {
            out[i] = top[i];
        }
        return out;
    }
}
