// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



contract UserIdentity {
    struct User {
        address walletAddress;
        string username;
        string email;
        string ipfsHash; // IPFS hash for profile picture and documents
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;
    address[] public userAddresses;

    address public admin;

    event UserRegistered(address indexed walletAddress, string username, uint256 timestamp);
    event UserUpdated(address indexed walletAddress, string username);
    event UserDeactivated(address indexed walletAddress);
    event UserReactivated(address indexed walletAddress);
    event SoulboundTokenMinted(address indexed userAddress, uint256 timestamp);

    mapping(address => bool) public hasStudentSBT;

    modifier userExists() {
        require(users[msg.sender].walletAddress != address(0), "User does not exist");
        _;
    }

    modifier userNotExists() {
        require(users[msg.sender].walletAddress == address(0), "User already exists");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerUser(
        string memory _username,
        string memory _email,
        string memory _ipfsHash
    ) public userNotExists {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(usernameToAddress[_username] == address(0), "Username already taken");

        users[msg.sender] = User({
            walletAddress: msg.sender,
            username: _username,
            email: _email,
            ipfsHash: _ipfsHash,
            isActive: true,
            registeredAt: block.timestamp
        });

        usernameToAddress[_username] = msg.sender;
        userAddresses.push(msg.sender);

        emit UserRegistered(msg.sender, _username, block.timestamp);
    }

    function updateUser(
        string memory _username,
        string memory _email,
        string memory _ipfsHash
    ) public userExists {
        User storage user = users[msg.sender];
        
        // If username is changing, update the mapping
        if (keccak256(bytes(user.username)) != keccak256(bytes(_username))) {
            require(usernameToAddress[_username] == address(0), "Username already taken");
            delete usernameToAddress[user.username];
            usernameToAddress[_username] = msg.sender;
        }

        user.username = _username;
        user.email = _email;
        user.ipfsHash = _ipfsHash;

        emit UserUpdated(msg.sender, _username);
    }

    function deactivateUser() public userExists {
        users[msg.sender].isActive = false;
        emit UserDeactivated(msg.sender);
    }

    function reactivateUser() public userExists {
        users[msg.sender].isActive = true;
        emit UserReactivated(msg.sender);
    }

    function getUser(address _address) public view returns (User memory) {
        return users[_address];
    }

    function getUserByUsername(string memory _username) public view returns (User memory) {
        address userAddress = usernameToAddress[_username];
        require(userAddress != address(0), "User not found");
        return users[userAddress];
    }

    function isUserRegistered(address _address) public view returns (bool) {
        return users[_address].walletAddress != address(0);
    }

    function getAllUsers() public view returns (address[] memory) {
        return userAddresses;
    }

    function getTotalUsers() public view returns (uint256) {
        return userAddresses.length;
    }

    function mintStudentSBT(address _userAddress) public {
        require(msg.sender == admin, "Only admin can mint SBT");
        require(!hasStudentSBT[_userAddress], "User already has SBT");
        hasStudentSBT[_userAddress] = true;
        emit SoulboundTokenMinted(_userAddress, block.timestamp);
    }
}
