// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract RideContract {
    enum RideStatus { ACTIVE, COMPLETED, CANCELLED }

    struct Ride {
        uint256 rideId;
        address driver;
        string startLocation;
        string endLocation;
        uint256 dateTime;
        uint8 availableSeats;
        uint8 totalSeats;
        string[] tags;
        RideStatus status;
        uint256 createdAt;
    }

    struct RideParticipant {
        address rider;
        uint256 joinedAt;
        bool hasLeft;
        bool hasBoarded;
    }

    uint256 private rideCounter;
    mapping(uint256 => Ride) public rides;
    mapping(uint256 => RideParticipant[]) public rideParticipants;
    mapping(address => uint256[]) public driverRides;
    mapping(address => uint256[]) public riderRides;


    mapping(uint256 => uint256) public rideStartedAt;
    mapping(uint256 => bytes32) public anchoredHashes;

    event RideCreated(
        uint256 indexed rideId,
        address indexed driver,
        string startLocation,
        string endLocation,
        uint256 dateTime,
        uint8 totalSeats
    );
    event RideStarted(uint256 indexed rideId, uint256 timestamp);
    event RideJoined(uint256 indexed rideId, address indexed rider, uint256 timestamp);
    event RiderBoarded(uint256 indexed rideId, address indexed rider, uint256 timestamp);
    event RideLeft(uint256 indexed rideId, address indexed rider, uint256 timestamp);
    event RideCompleted(uint256 indexed rideId, uint256 timestamp);
    event RideCancelled(uint256 indexed rideId, address indexed cancelledBy, uint256 timestamp);
    event RideAgreementAnchored(uint256 indexed rideId, bytes32 agreementHash);

    modifier rideExists(uint256 _rideId) {
        require(_rideId < rideCounter, "Ride does not exist");
        _;
    }

    modifier onlyDriver(uint256 _rideId) {
        require(rides[_rideId].driver == msg.sender, "Only driver can perform this action");
        _;
    }

    function createRide(
        string memory _startLocation,
        string memory _endLocation,
        uint256 _dateTime,
        uint8 _totalSeats,
        string[] memory _tags
    ) public returns (uint256) {
        require(bytes(_startLocation).length > 0, "Start location cannot be empty");
        require(bytes(_endLocation).length > 0, "End location cannot be empty");
        require(_dateTime > block.timestamp, "Ride date must be in the future");
        require(_totalSeats > 0 && _totalSeats <= 10, "Invalid seat count");

        uint256 rideId = rideCounter++;

        rides[rideId] = Ride({
            rideId: rideId,
            driver: msg.sender,
            startLocation: _startLocation,
            endLocation: _endLocation,
            dateTime: _dateTime,
            availableSeats: _totalSeats,
            totalSeats: _totalSeats,
            tags: _tags,
            status: RideStatus.ACTIVE,
            createdAt: block.timestamp
        });

        driverRides[msg.sender].push(rideId);

        emit RideCreated(rideId, msg.sender, _startLocation, _endLocation, _dateTime, _totalSeats);

        return rideId;
    }

    function joinRide(uint256 _rideId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        
        require(ride.status == RideStatus.ACTIVE, "Ride is not active");
        require(ride.driver != msg.sender, "Driver cannot join their own ride");
        require(ride.availableSeats > 0, "No seats available");
        require(!hasUserJoinedRide(_rideId, msg.sender), "Already joined this ride");

        ride.availableSeats--;
        
        rideParticipants[_rideId].push(RideParticipant({
            rider: msg.sender,
            joinedAt: block.timestamp,
            hasLeft: false,
            hasBoarded: false
        }));

        riderRides[msg.sender].push(_rideId);

        emit RideJoined(_rideId, msg.sender, block.timestamp);
    }

    function startRide(uint256 _rideId) public rideExists(_rideId) onlyDriver(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.ACTIVE, "Ride is not active");
        require(rideStartedAt[_rideId] == 0, "Ride already started");

        rideStartedAt[_rideId] = block.timestamp;
        emit RideStarted(_rideId, block.timestamp);
    }

    function leaveRide(uint256 _rideId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        
        require(ride.status == RideStatus.ACTIVE, "Ride is not active");
        
        RideParticipant[] storage participants = rideParticipants[_rideId];
        bool found = false;
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].rider == msg.sender && !participants[i].hasLeft) {
                participants[i].hasLeft = true;
                ride.availableSeats++;
                found = true;
                break;
            }
        }
        
        require(found, "Not a participant of this ride");

        emit RideLeft(_rideId, msg.sender, block.timestamp);
    }

    function completeRide(uint256 _rideId) public rideExists(_rideId) onlyDriver(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.ACTIVE, "Ride is not active");
        
        ride.status = RideStatus.COMPLETED;
        
        emit RideCompleted(_rideId, block.timestamp);
    }

    function cancelRide(uint256 _rideId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.ACTIVE, "Ride is not active");
        require(ride.driver == msg.sender || hasUserJoinedRide(_rideId, msg.sender), 
                "Not authorized to cancel");
        
        ride.status = RideStatus.CANCELLED;
        
        emit RideCancelled(_rideId, msg.sender, block.timestamp);
    }

    function getRide(uint256 _rideId) public view rideExists(_rideId) returns (Ride memory) {
        return rides[_rideId];
    }

    function getRideParticipants(uint256 _rideId) public view rideExists(_rideId) 
        returns (RideParticipant[] memory) {
        return rideParticipants[_rideId];
    }

    function getDriverRides(address _driver) public view returns (uint256[] memory) {
        return driverRides[_driver];
    }

    function getRiderRides(address _rider) public view returns (uint256[] memory) {
        return riderRides[_rider];
    }

    function hasUserJoinedRide(uint256 _rideId, address _user) public view returns (bool) {
        RideParticipant[] memory participants = rideParticipants[_rideId];
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].rider == _user && !participants[i].hasLeft) {
                return true;
            }
        }
        
        return false;
    }

    function getActiveRides() public view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active rides
        for (uint256 i = 0; i < rideCounter; i++) {
            if (rides[i].status == RideStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        // Create array of active ride IDs
        uint256[] memory activeRides = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < rideCounter; i++) {
            if (rides[i].status == RideStatus.ACTIVE) {
                activeRides[index] = i;
                index++;
            }
        }
        
        return activeRides;
    }

    function getTotalRides() public view returns (uint256) {
        return rideCounter;
    }

    // --- Cryptographic Boarding Pass Verification ---
    // The driver calls this to verify a rider's boarding signature on-chain.
    // The rider signs keccak256(abi.encodePacked(rideId, driver, "BOARDING_PASS")) off-chain,
    // then the driver submits that signature here to mark the rider as boarded.
    function boardRider(
        uint256 _rideId,
        address _rider,
        bytes memory _signature
    ) public rideExists(_rideId) onlyDriver(_rideId) {
        Ride storage ride = rides[_rideId];
        require(ride.status == RideStatus.ACTIVE, "Ride is not active");

        // Reconstruct the message the rider was expected to sign
        bytes32 messageHash = keccak256(abi.encodePacked(_rideId, ride.driver, "BOARDING_PASS"));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        // Recover signer and verify it matches the claimed rider
        address recovered = ECDSA.recover(ethSignedHash, _signature);
        require(recovered == _rider, "Invalid boarding signature");

        // Mark the rider as boarded
        RideParticipant[] storage participants = rideParticipants[_rideId];
        bool found = false;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i].rider == _rider && !participants[i].hasLeft && !participants[i].hasBoarded) {
                participants[i].hasBoarded = true;
                found = true;
                break;
            }
        }
        require(found, "Rider is not an active participant");

        emit RiderBoarded(_rideId, _rider, block.timestamp);
    }

    // --- Web3 Ride Agreement Integrity ---
    // The Host anchors the initial ride agreement hash to prevent bait-and switch.
    function anchorRideAgreement(uint256 _rideId, bytes32 _agreementHash) public rideExists(_rideId) onlyDriver(_rideId) {
        require(anchoredHashes[_rideId] == 0, "Agreement hash already anchored");
        anchoredHashes[_rideId] = _agreementHash;
        emit RideAgreementAnchored(_rideId, _agreementHash);
    }
}
