// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../operator/src/ZKCoProcessor.sol";

contract ZKCoProcessorTest is Test {
    ZKCoProcessor zkco;
    address operator = address(0x1);
    address user = address(0x2);
    
    // Events to test
    event ComputationRequested(bytes32 indexed taskId, address requester, uint256 complexity, uint256 reward);
    event ProofSubmitted(bytes32 indexed taskId, address operator, bytes32 resultHash);
    event ComparisonLogged(uint256 zkGasUsed, uint256 normalGasUsed, uint256 timeSaved);
    event RewardPaid(address indexed operator, uint256 amount, bytes32 indexed taskId);
    event OperatorRegistered(address indexed operator, uint256 stake);

    function setUp() public {
        // Deploy the ZKCoProcessor contract without a verifier
        zkco = new ZKCoProcessor(address(0));
        
        // Fund operator and user with some ETH
        vm.deal(operator, 10 ether);
        vm.deal(user, 10 ether);
        
        // Register the operator
        vm.prank(operator);
        zkco.registerAsOperator{value: 1 ether}();
    }

    function testRequestComputation() public {
        // Switch to user account
        vm.startPrank(user);
        
        bytes memory inputData = abi.encodePacked("test data");
        uint256 complexity = inputData.length;
        uint256 reward = zkco.calculateReward(complexity);
        
        // We don't check the exact taskId since it includes the timestamp and sender
        // Just check that the event is emitted with the correct requester address
        vm.expectEmit(false, true, false, false);
        emit ComputationRequested(bytes32(0), user, complexity, reward);
        
        // Request computation with enough ETH for reward
        zkco.requestComputation{value: reward}(inputData);
        
        vm.stopPrank();
    }

    function testSubmitProof() public {
        // Request a computation first as user
        vm.startPrank(user);
        
        bytes memory inputData = abi.encodePacked("test data");
        uint256 complexity = inputData.length;
        uint256 reward = zkco.calculateReward(complexity);
        
        zkco.requestComputation{value: reward}(inputData);
        
        // Calculate the taskId (same way as in the contract)
        bytes32 taskId = keccak256(abi.encodePacked(inputData, block.timestamp, user));
        
        vm.stopPrank();
        
        // Now switch to operator
        vm.startPrank(operator);
        
        bytes memory proof = abi.encodePacked("valid proof");
        bytes32 resultHash = keccak256(abi.encodePacked("result"));
        
        // Expect ProofSubmitted event
        vm.expectEmit(true, true, false, false);
        emit ProofSubmitted(taskId, operator, resultHash);
        
        // Expect RewardPaid event
        vm.expectEmit(true, false, true, false);
        emit RewardPaid(operator, reward, taskId);
        
        // Submit proof
        zkco.submitProof(taskId, proof, resultHash);
        
        // Verify operator received reward in their balance
        assertEq(zkco.operatorRewards(operator), reward);
        
        vm.stopPrank();
    }
    
    function testLogComparison() public {
        uint256 zkGasUsed = 10000;
        uint256 normalGasUsed = 50000;
        uint256 timeSaved = 200;

        // Expect ComparisonLogged event with correct parameters
        vm.expectEmit(true, true, true, true);
        emit ComparisonLogged(zkGasUsed, normalGasUsed, timeSaved);
        
        zkco.logComparison(zkGasUsed, normalGasUsed, timeSaved);
    }
    
    function testComputationTime() public {
        // Request a computation as user
        vm.startPrank(user);
        
        bytes memory inputData = abi.encodePacked("test data");
        uint256 complexity = inputData.length;
        uint256 reward = zkco.calculateReward(complexity);
        
        zkco.requestComputation{value: reward}(inputData);
        bytes32 taskId = keccak256(abi.encodePacked(inputData, block.timestamp, user));
        
        vm.stopPrank();
        
        // Advance the block timestamp by 100 seconds
        skip(100);
        
        // Submit proof as operator
        vm.startPrank(operator);
        bytes memory proof = abi.encodePacked("valid proof");
        bytes32 resultHash = keccak256(abi.encodePacked("result"));
        zkco.submitProof(taskId, proof, resultHash);
        vm.stopPrank();
        
        // Check computation time is approximately 100 seconds
        assertApproxEqAbs(zkco.getComputationTime(taskId), 100, 1);
    }
    
    function testRewardCalculation() public {
        // Test reward calculation with different complexity levels
        uint256 baseReward = 0.001 ether;
        
        // Complexity 0 should yield base reward
        assertEq(zkco.calculateReward(0), baseReward);
        
        // Complexity 100 should yield 2x base reward
        assertEq(zkco.calculateReward(100), baseReward * 2);
        
        // Complexity 200 should yield 3x base reward
        assertEq(zkco.calculateReward(200), baseReward * 3);
    }
    
    function testClaimRewards() public {
        // Setup: request computation, submit proof to earn rewards
        vm.startPrank(user);
        bytes memory inputData = abi.encodePacked("test data");
        uint256 reward = zkco.calculateReward(inputData.length);
        zkco.requestComputation{value: reward}(inputData);
        bytes32 taskId = keccak256(abi.encodePacked(inputData, block.timestamp, user));
        vm.stopPrank();
        
        vm.startPrank(operator);
        bytes memory proof = abi.encodePacked("valid proof");
        bytes32 resultHash = keccak256(abi.encodePacked("result"));
        zkco.submitProof(taskId, proof, resultHash);
        
        // Check rewards balance
        assertEq(zkco.operatorRewards(operator), reward);
        
        // Get balance before claim
        uint256 balanceBefore = operator.balance;
        
        // Claim rewards
        zkco.claimRewards();
        
        // Check rewards were claimed
        assertEq(zkco.operatorRewards(operator), 0);
        assertEq(operator.balance, balanceBefore + reward);
        
        vm.stopPrank();
    }
    
    function testTotalTasksProcessed() public {
        // Check initial count is zero
        assertEq(zkco.totalTasksProcessed(), 0);
        
        // Process a task
        vm.startPrank(user);
        bytes memory inputData = abi.encodePacked("test data");
        uint256 reward = zkco.calculateReward(inputData.length);
        zkco.requestComputation{value: reward}(inputData);
        bytes32 taskId = keccak256(abi.encodePacked(inputData, block.timestamp, user));
        vm.stopPrank();
        
        vm.startPrank(operator);
        bytes memory proof = abi.encodePacked("valid proof");
        bytes32 resultHash = keccak256(abi.encodePacked("result"));
        zkco.submitProof(taskId, proof, resultHash);
        vm.stopPrank();
        
        // Check count increased
        assertEq(zkco.totalTasksProcessed(), 1);
    }
    
    function testOperatorRegistration() public {
        address newOperator = address(0x3);
        vm.deal(newOperator, 5 ether);
        
        // Register a new operator
        vm.prank(newOperator);
        vm.expectEmit(true, false, false, false);
        emit OperatorRegistered(newOperator, 1 ether);
        zkco.registerAsOperator{value: 1 ether}();
        
        // Check operator is registered
        (bool registered, uint256 stake, , ) = zkco.operators(newOperator);
        assertTrue(registered);
        assertEq(stake, 1 ether);
    }
    
    function testInsufficientReward() public {
        vm.startPrank(user);
        bytes memory inputData = abi.encodePacked("test data");
        
        // Try to request with insufficient ETH
        vm.expectRevert("Insufficient ETH for reward");
        zkco.requestComputation{value: 0}(inputData);
        
        vm.stopPrank();
    }
    
    function testInsufficientStake() public {
        address poorOperator = address(0x4);
        vm.deal(poorOperator, 0.01 ether);
        
        // Try to register with insufficient stake
        vm.prank(poorOperator);
        vm.expectRevert("Insufficient stake");
        zkco.registerAsOperator{value: 0.01 ether}();
    }
}
