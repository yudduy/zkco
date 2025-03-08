// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/ZKCoProcessor.sol";

/**
 * @title DeployZKCoProcessor
 * @dev Script to deploy the ZKCoProcessor contract to Sepolia testnet
 */
contract DeployZKCoProcessor is Script {
    function run() external {
        // Get the private key for deployment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the ZKCoProcessor contract
        // We're passing address(0) for the verifier contract since we don't have one yet
        ZKCoProcessor zkco = new ZKCoProcessor(address(0));
        
        // Log the deployment address
        console.log("ZKCoProcessor deployed at:", address(zkco));
        
        // Set the base reward amount (optional)
        // zkco.setBaseRewardAmount(0.002 ether);
        
        // Log a sample comparison for testing the frontend
        zkco.logComparison(15000, 75000, 150);
        
        // End broadcasting transactions
        vm.stopBroadcast();
    }
}
