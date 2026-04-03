// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerkleAuditTrail
 * @dev Stores Merkle roots of ride history batches for verifiable audit trails.
 * Users can prove any ride existed by providing a Merkle proof against the stored root.
 */
contract MerkleAuditTrail {
    
    struct AuditBatch {
        bytes32 merkleRoot;
        uint256 timestamp;
        uint256 rideCount;
        string ipfsMetadata; // Optional: IPFS hash containing the full ride list
    }
    
    // Batch ID => AuditBatch
    mapping(uint256 => AuditBatch) public auditBatches;
    uint256 public batchCount;
    
    // Track which ride IDs are included in which batch
    mapping(uint256 => uint256) public rideIdToBatchId;
    
    address public admin;
    
    event MerkleRootAnchored(
        uint256 indexed batchId, 
        bytes32 merkleRoot, 
        uint256 rideCount,
        uint256 timestamp
    );
    
    event RideProofVerified(
        uint256 indexed rideId,
        uint256 indexed batchId,
        address verifier,
        bool isValid
    );
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Anchors a new Merkle root for a batch of rides
     * @param merkleRoot The root hash of the Merkle tree
     * @param rideIds Array of ride IDs included in this batch
     * @param ipfsMetadata Optional IPFS hash for full data
     */
    function anchorMerkleRoot(
        bytes32 merkleRoot,
        uint256[] calldata rideIds,
        string calldata ipfsMetadata
    ) external onlyAdmin returns (uint256) {
        require(merkleRoot != bytes32(0), "Invalid merkle root");
        require(rideIds.length > 0, "Must include at least one ride");
        
        uint256 batchId = batchCount++;
        
        auditBatches[batchId] = AuditBatch({
            merkleRoot: merkleRoot,
            timestamp: block.timestamp,
            rideCount: rideIds.length,
            ipfsMetadata: ipfsMetadata
        });
        
        // Map each ride to this batch
        for (uint256 i = 0; i < rideIds.length; i++) {
            rideIdToBatchId[rideIds[i]] = batchId;
        }
        
        emit MerkleRootAnchored(batchId, merkleRoot, rideIds.length, block.timestamp);
        
        return batchId;
    }
    
    /**
     * @dev Verifies a Merkle proof for a specific ride
     * @param rideId The ride ID to verify
     * @param rideHash The hash of the ride data (leaf)
     * @param proof The Merkle proof (array of sibling hashes)
     * @param batchId The batch ID containing this ride
     */
    function verifyRideProof(
        uint256 rideId,
        bytes32 rideHash,
        bytes32[] calldata proof,
        uint256 batchId
    ) external returns (bool) {
        require(batchId < batchCount, "Batch does not exist");
        
        AuditBatch memory batch = auditBatches[batchId];
        bytes32 computedHash = rideHash;
        
        // Compute the Merkle root from leaf to root
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                // Hash(current, proof)
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // Hash(proof, current)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        bool isValid = computedHash == batch.merkleRoot;
        
        emit RideProofVerified(rideId, batchId, msg.sender, isValid);
        
        return isValid;
    }
    
    /**
     * @dev View function to verify without emitting event (gas-free)
     */
    function verifyProofView(
        bytes32 rideHash,
        bytes32[] calldata proof,
        uint256 batchId
    ) external view returns (bool) {
        require(batchId < batchCount, "Batch does not exist");
        
        AuditBatch memory batch = auditBatches[batchId];
        bytes32 computedHash = rideHash;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == batch.merkleRoot;
    }
    
    /**
     * @dev Get batch info
     */
    function getBatch(uint256 batchId) external view returns (
        bytes32 merkleRoot,
        uint256 timestamp,
        uint256 rideCount,
        string memory ipfsMetadata
    ) {
        AuditBatch memory batch = auditBatches[batchId];
        return (batch.merkleRoot, batch.timestamp, batch.rideCount, batch.ipfsMetadata);
    }
}
