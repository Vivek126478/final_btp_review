// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShamirSOSVault
 * @dev Stores Shamir's Secret Sharing commitments for SOS emergency data
 * 
 * Security Properties:
 * - Emergency data is split into N shares using Shamir's algorithm
 * - K shares are required to reconstruct (threshold)
 * - Share hashes are stored on-chain for verification
 * - Actual shares are stored off-chain (encrypted)
 * 
 * Use Case: D-CARPOOL SOS Feature
 * - User's emergency info split into 5 shares
 * - 3 shares needed to reconstruct
 * - Shares distributed to: Admin, User wallet, 3 trusted contacts
 */
contract ShamirSOSVault {
    
    struct SOSConfig {
        uint8 totalShares;          // N - total number of shares
        uint8 threshold;            // K - minimum shares to reconstruct
        bytes32 secretHash;         // Hash of original secret (for verification)
        uint256 createdAt;
        bool isActive;
    }
    
    struct ShareCommitment {
        bytes32 shareHash;          // Hash of the share
        address holder;             // Who holds this share
        string holderType;          // "admin", "user", "trusted_contact_1", etc.
        bool isRevealed;            // Has this share been revealed for reconstruction
        uint256 revealedAt;
    }
    
    struct SOSEvent {
        address triggeredBy;
        uint256 triggeredAt;
        uint256 rideId;
        int256 latitude;            // Location * 1e6 for precision
        int256 longitude;
        uint8 sharesCollected;
        bool isResolved;
        string resolution;
    }
    
    // User address => SOS configuration
    mapping(address => SOSConfig) public sosConfigs;
    
    // User address => share index => ShareCommitment
    mapping(address => mapping(uint8 => ShareCommitment)) public shareCommitments;
    
    // User address => SOS events
    mapping(address => SOSEvent[]) public sosEvents;
    
    // Events
    event SOSConfigured(
        address indexed user,
        uint8 totalShares,
        uint8 threshold,
        bytes32 secretHash
    );
    
    event ShareCommitted(
        address indexed user,
        uint8 shareIndex,
        address holder,
        string holderType
    );
    
    event SOSTriggered(
        address indexed user,
        uint256 indexed rideId,
        uint256 eventIndex,
        int256 latitude,
        int256 longitude
    );
    
    event ShareRevealed(
        address indexed user,
        uint256 indexed eventIndex,
        uint8 shareIndex,
        address revealedBy
    );
    
    event SOSResolved(
        address indexed user,
        uint256 indexed eventIndex,
        string resolution
    );
    
    /**
     * @dev Configure SOS with Shamir's Secret Sharing parameters
     * @param totalShares Total number of shares (N)
     * @param threshold Minimum shares needed to reconstruct (K)
     * @param secretHash Hash of the original emergency data
     */
    function configureSOS(
        uint8 totalShares,
        uint8 threshold,
        bytes32 secretHash
    ) external {
        require(totalShares >= 2, "Need at least 2 shares");
        require(threshold >= 2, "Threshold must be at least 2");
        require(threshold <= totalShares, "Threshold cannot exceed total shares");
        require(secretHash != bytes32(0), "Invalid secret hash");
        
        sosConfigs[msg.sender] = SOSConfig({
            totalShares: totalShares,
            threshold: threshold,
            secretHash: secretHash,
            createdAt: block.timestamp,
            isActive: true
        });
        
        emit SOSConfigured(msg.sender, totalShares, threshold, secretHash);
    }
    
    /**
     * @dev Commit a share hash for verification
     * @param shareIndex Index of the share (0 to N-1)
     * @param shareHash Hash of the share data
     * @param holder Address of the share holder
     * @param holderType Type of holder (admin, user, trusted_contact_1, etc.)
     */
    function commitShare(
        uint8 shareIndex,
        bytes32 shareHash,
        address holder,
        string memory holderType
    ) external {
        SOSConfig storage config = sosConfigs[msg.sender];
        require(config.isActive, "SOS not configured");
        require(shareIndex < config.totalShares, "Invalid share index");
        require(shareHash != bytes32(0), "Invalid share hash");
        
        shareCommitments[msg.sender][shareIndex] = ShareCommitment({
            shareHash: shareHash,
            holder: holder,
            holderType: holderType,
            isRevealed: false,
            revealedAt: 0
        });
        
        emit ShareCommitted(msg.sender, shareIndex, holder, holderType);
    }
    
    /**
     * @dev Trigger an SOS event
     * @param rideId ID of the ride during which SOS was triggered
     * @param latitude GPS latitude * 1e6
     * @param longitude GPS longitude * 1e6
     */
    function triggerSOS(
        uint256 rideId,
        int256 latitude,
        int256 longitude
    ) external returns (uint256 eventIndex) {
        SOSConfig storage config = sosConfigs[msg.sender];
        require(config.isActive, "SOS not configured");
        
        SOSEvent memory newEvent = SOSEvent({
            triggeredBy: msg.sender,
            triggeredAt: block.timestamp,
            rideId: rideId,
            latitude: latitude,
            longitude: longitude,
            sharesCollected: 0,
            isResolved: false,
            resolution: ""
        });
        
        sosEvents[msg.sender].push(newEvent);
        eventIndex = sosEvents[msg.sender].length - 1;
        
        emit SOSTriggered(msg.sender, rideId, eventIndex, latitude, longitude);
        
        return eventIndex;
    }
    
    /**
     * @dev Record that a share was revealed for reconstruction
     * @param user Address of the SOS user
     * @param eventIndex Index of the SOS event
     * @param shareIndex Index of the revealed share
     */
    function recordShareReveal(
        address user,
        uint256 eventIndex,
        uint8 shareIndex
    ) external {
        ShareCommitment storage commitment = shareCommitments[user][shareIndex];
        require(
            msg.sender == commitment.holder || 
            msg.sender == user ||
            isAdmin(msg.sender),
            "Not authorized to reveal"
        );
        
        require(!commitment.isRevealed, "Share already revealed");
        require(eventIndex < sosEvents[user].length, "Invalid event index");
        require(!sosEvents[user][eventIndex].isResolved, "SOS already resolved");
        
        commitment.isRevealed = true;
        commitment.revealedAt = block.timestamp;
        sosEvents[user][eventIndex].sharesCollected++;
        
        emit ShareRevealed(user, eventIndex, shareIndex, msg.sender);
    }
    
    /**
     * @dev Resolve an SOS event
     * @param user Address of the SOS user
     * @param eventIndex Index of the SOS event
     * @param resolution Description of resolution
     */
    function resolveSOS(
        address user,
        uint256 eventIndex,
        string memory resolution
    ) external {
        require(isAdmin(msg.sender), "Only admin can resolve");
        require(eventIndex < sosEvents[user].length, "Invalid event index");
        
        SOSEvent storage sosEvent = sosEvents[user][eventIndex];
        require(!sosEvent.isResolved, "Already resolved");
        
        sosEvent.isResolved = true;
        sosEvent.resolution = resolution;
        
        // Reset revealed shares for future use
        SOSConfig storage config = sosConfigs[user];
        for (uint8 i = 0; i < config.totalShares; i++) {
            shareCommitments[user][i].isRevealed = false;
            shareCommitments[user][i].revealedAt = 0;
        }
        
        emit SOSResolved(user, eventIndex, resolution);
    }
    
    /**
     * @dev Verify a share against its commitment
     * @param user Address of the user
     * @param shareIndex Index of the share
     * @param shareData The actual share data to verify
     */
    function verifyShare(
        address user,
        uint8 shareIndex,
        string memory shareData
    ) external view returns (bool) {
        bytes32 computedHash = keccak256(abi.encodePacked(shareData));
        return shareCommitments[user][shareIndex].shareHash == computedHash;
    }
    
    /**
     * @dev Get SOS configuration for a user
     */
    function getSOSConfig(address user) external view returns (
        uint8 totalShares,
        uint8 threshold,
        bytes32 secretHash,
        uint256 createdAt,
        bool isActive
    ) {
        SOSConfig storage config = sosConfigs[user];
        return (
            config.totalShares,
            config.threshold,
            config.secretHash,
            config.createdAt,
            config.isActive
        );
    }
    
    /**
     * @dev Get share commitment details
     */
    function getShareCommitment(address user, uint8 shareIndex) external view returns (
        bytes32 shareHash,
        address holder,
        string memory holderType,
        bool isRevealed
    ) {
        ShareCommitment storage commitment = shareCommitments[user][shareIndex];
        return (
            commitment.shareHash,
            commitment.holder,
            commitment.holderType,
            commitment.isRevealed
        );
    }
    
    /**
     * @dev Get SOS event count for a user
     */
    function getSOSEventCount(address user) external view returns (uint256) {
        return sosEvents[user].length;
    }
    
    /**
     * @dev Get SOS event details
     */
    function getSOSEvent(address user, uint256 eventIndex) external view returns (
        uint256 triggeredAt,
        uint256 rideId,
        int256 latitude,
        int256 longitude,
        uint8 sharesCollected,
        bool isResolved
    ) {
        require(eventIndex < sosEvents[user].length, "Invalid index");
        SOSEvent storage e = sosEvents[user][eventIndex];
        return (
            e.triggeredAt,
            e.rideId,
            e.latitude,
            e.longitude,
            e.sharesCollected,
            e.isResolved
        );
    }
    
    /**
     * @dev Check if threshold is met for reconstruction
     */
    function canReconstruct(address user, uint256 eventIndex) external view returns (bool) {
        require(eventIndex < sosEvents[user].length, "Invalid index");
        SOSConfig storage config = sosConfigs[user];
        return sosEvents[user][eventIndex].sharesCollected >= config.threshold;
    }
    
    // Simple admin check (in production, use proper access control)
    mapping(address => bool) private admins;
    address public owner;
    
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }
    
    function addAdmin(address admin) external {
        require(msg.sender == owner, "Only owner");
        admins[admin] = true;
    }
    
    function isAdmin(address addr) public view returns (bool) {
        return admins[addr] || addr == owner;
    }
}
