const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...\n");

  const provider = hre.ethers.provider;
  const latestBlock = await provider.getBlock('latest');
  const blockGasLimit = latestBlock?.gasLimit ? Number(latestBlock.gasLimit) : 0;
  const maxAllowedGasLimit = 15_000_000;
  const deployGasLimit = blockGasLimit > 0 ? Math.min(blockGasLimit, maxAllowedGasLimit) : maxAllowedGasLimit;
  const deployOverrides = { gasLimit: deployGasLimit };

  // Deploy UserIdentity Contract
  console.log("Deploying UserIdentity Contract...");
  const UserIdentity = await hre.ethers.getContractFactory("UserIdentity");
  const userIdentity = await UserIdentity.deploy(deployOverrides);
  await userIdentity.waitForDeployment();
  const userIdentityAddress = await userIdentity.getAddress();
  console.log("✅ UserIdentity deployed to:", userIdentityAddress);

  // Deploy RideContract
  console.log("\nDeploying RideContract...");
  const RideContract = await hre.ethers.getContractFactory("RideContract");
  const rideContract = await RideContract.deploy(deployOverrides);
  await rideContract.waitForDeployment();
  const rideContractAddress = await rideContract.getAddress();
  console.log("✅ RideContract deployed to:", rideContractAddress);

  // Deploy Reputation Contract
  console.log("\nDeploying Reputation Contract...");
  const Reputation = await hre.ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy(deployOverrides);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("✅ Reputation deployed to:", reputationAddress);

  // Deploy DPoS Governance Contract
  console.log("\nDeploying DPoSGovernance Contract...");
  const DPoSGovernance = await hre.ethers.getContractFactory("DPoSGovernance");
  const delegateCount = 5;
  const minCandidateStakeWei = hre.ethers.parseEther("0.01");
  const dposGovernance = await DPoSGovernance.deploy(delegateCount, minCandidateStakeWei, deployOverrides);
  await dposGovernance.waitForDeployment();
  const dposGovernanceAddress = await dposGovernance.getAddress();
  console.log("✅ DPoSGovernance deployed to:", dposGovernanceAddress);

  // Deploy Dispute Resolution Contract
  console.log("\nDeploying DisputeResolution Contract...");
  const DisputeResolution = await hre.ethers.getContractFactory("DisputeResolution");
  const quorum = 3;
  const votingPeriodSeconds = 60 * 60 * 24; // 24 hours
  const disputeResolution = await DisputeResolution.deploy(dposGovernanceAddress, quorum, votingPeriodSeconds, deployOverrides);
  await disputeResolution.waitForDeployment();
  const disputeResolutionAddress = await disputeResolution.getAddress();
  console.log("✅ DisputeResolution deployed to:", disputeResolutionAddress);

  // Save contract addresses and ABIs
  const contractAddresses = {
    UserIdentity: userIdentityAddress,
    RideContract: rideContractAddress,
    Reputation: reputationAddress,
    DPoSGovernance: dposGovernanceAddress,
    DisputeResolution: disputeResolutionAddress,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save addresses
  fs.writeFileSync(
    path.join(deploymentsDir, "contract-addresses.json"),
    JSON.stringify(contractAddresses, null, 2)
  );

  // Copy ABIs to a shared location for frontend
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const abisDir = path.join(__dirname, "../deployments/abis");
  
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  // Copy UserIdentity ABI
  const userIdentityArtifact = require(path.join(artifactsDir, "UserIdentity.sol/UserIdentity.json"));
  fs.writeFileSync(
    path.join(abisDir, "UserIdentity.json"),
    JSON.stringify(userIdentityArtifact.abi, null, 2)
  );

  // Copy RideContract ABI
  const rideContractArtifact = require(path.join(artifactsDir, "RideContract.sol/RideContract.json"));
  fs.writeFileSync(
    path.join(abisDir, "RideContract.json"),
    JSON.stringify(rideContractArtifact.abi, null, 2)
  );

  // Copy Reputation ABI
  const reputationArtifact = require(path.join(artifactsDir, "Reputation.sol/Reputation.json"));
  fs.writeFileSync(
    path.join(abisDir, "Reputation.json"),
    JSON.stringify(reputationArtifact.abi, null, 2)
  );

  // Copy DPoSGovernance ABI
  const dposGovernanceArtifact = require(path.join(artifactsDir, "DPoSGovernance.sol/DPoSGovernance.json"));
  fs.writeFileSync(
    path.join(abisDir, "DPoSGovernance.json"),
    JSON.stringify(dposGovernanceArtifact.abi, null, 2)
  );

  // Copy DisputeResolution ABI
  const disputeResolutionArtifact = require(path.join(artifactsDir, "DisputeResolution.sol/DisputeResolution.json"));
  fs.writeFileSync(
    path.join(abisDir, "DisputeResolution.json"),
    JSON.stringify(disputeResolutionArtifact.abi, null, 2)
  );

  console.log("\n✅ Contract addresses and ABIs saved to deployments/");
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("UserIdentity:", userIdentityAddress);
  console.log("RideContract:", rideContractAddress);
  console.log("Reputation:", reputationAddress);
  console.log("DPoSGovernance:", dposGovernanceAddress);
  console.log("DisputeResolution:", disputeResolutionAddress);
  console.log("========================\n");

  // Update .env file with contract addresses
  const envPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(/USER_IDENTITY_CONTRACT_ADDRESS=.*/, `USER_IDENTITY_CONTRACT_ADDRESS=${userIdentityAddress}`);
    envContent = envContent.replace(/RIDE_CONTRACT_ADDRESS=.*/, `RIDE_CONTRACT_ADDRESS=${rideContractAddress}`);
    envContent = envContent.replace(/REPUTATION_CONTRACT_ADDRESS=.*/, `REPUTATION_CONTRACT_ADDRESS=${reputationAddress}`);

    if (/DPOS_GOVERNANCE_CONTRACT_ADDRESS=.*/.test(envContent)) {
      envContent = envContent.replace(/DPOS_GOVERNANCE_CONTRACT_ADDRESS=.*/, `DPOS_GOVERNANCE_CONTRACT_ADDRESS=${dposGovernanceAddress}`);
    } else {
      envContent += `\nDPOS_GOVERNANCE_CONTRACT_ADDRESS=${dposGovernanceAddress}`;
    }

    if (/DISPUTE_RESOLUTION_CONTRACT_ADDRESS=.*/.test(envContent)) {
      envContent = envContent.replace(/DISPUTE_RESOLUTION_CONTRACT_ADDRESS=.*/, `DISPUTE_RESOLUTION_CONTRACT_ADDRESS=${disputeResolutionAddress}`);
    } else {
      envContent += `\nDISPUTE_RESOLUTION_CONTRACT_ADDRESS=${disputeResolutionAddress}`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env file with contract addresses\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
