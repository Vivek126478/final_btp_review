// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract Reputation {
    struct Rating {
        address rater;
        address ratee;
        uint256 rideId;
        uint8 stars; // 0-5
        string comment;
        uint256 timestamp;
    }

    struct UserReputation {
        uint256 totalRatings;
        uint256 sumOfStars;
        uint256 averageRating; // Stored as (average * 100) for precision
    }

    mapping(address => UserReputation) public userReputations;
    mapping(address => Rating[]) public ratingsReceived;
    mapping(address => Rating[]) public ratingsGiven;
    mapping(bytes32 => bool) public hasRated; // Hash of (rater, ratee, rideId)

    event RatingSubmitted(
        address indexed rater,
        address indexed ratee,
        uint256 indexed rideId,
        uint8 stars,
        uint256 timestamp
    );

    modifier validStars(uint8 _stars) {
        require(_stars >= 0 && _stars <= 5, "Stars must be between 0 and 5");
        _;
    }

    function submitRating(
        address _ratee,
        uint256 _rideId,
        uint8 _stars,
        string memory _comment
    ) public validStars(_stars) {
        require(_ratee != address(0), "Invalid ratee address");
        require(_ratee != msg.sender, "Cannot rate yourself");
        
        bytes32 ratingHash = keccak256(abi.encodePacked(msg.sender, _ratee, _rideId));
        require(!hasRated[ratingHash], "Already rated this user for this ride");

        Rating memory newRating = Rating({
            rater: msg.sender,
            ratee: _ratee,
            rideId: _rideId,
            stars: _stars,
            comment: _comment,
            timestamp: block.timestamp
        });

        ratingsReceived[_ratee].push(newRating);
        ratingsGiven[msg.sender].push(newRating);
        hasRated[ratingHash] = true;

        // Update reputation
        UserReputation storage reputation = userReputations[_ratee];
        reputation.totalRatings++;
        reputation.sumOfStars += _stars;
        reputation.averageRating = (reputation.sumOfStars * 100) / reputation.totalRatings;

        emit RatingSubmitted(msg.sender, _ratee, _rideId, _stars, block.timestamp);
    }


    function getUserReputation(address _user) public view returns (
        uint256 totalRatings,
        uint256 averageRating
    ) {
        UserReputation memory reputation = userReputations[_user];
        return (reputation.totalRatings, reputation.averageRating);
    }

    function getRatingsReceived(address _user) public view returns (Rating[] memory) {
        return ratingsReceived[_user];
    }

    function getRatingsGiven(address _user) public view returns (Rating[] memory) {
        return ratingsGiven[_user];
    }

    function hasUserRated(address _rater, address _ratee, uint256 _rideId) 
        public view returns (bool) {
        bytes32 ratingHash = keccak256(abi.encodePacked(_rater, _ratee, _rideId));
        return hasRated[ratingHash];
    }

    function getAverageRatingFormatted(address _user) public view returns (uint256) {
        // Returns average rating with 2 decimal places (e.g., 450 = 4.50 stars)
        return userReputations[_user].averageRating;
    }
}
