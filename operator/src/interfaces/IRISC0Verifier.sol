// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IRISC0Verifier
 * @dev Interface for verifying RISC-0 proofs on-chain.
 * The actual implementation would verify ZK proofs from RISC-0.
 */
interface IRISC0Verifier {
    /**
     * @dev Verifies a RISC-0 proof
     * @param imageId The ID of the RISC-0 program image
     * @param input The input data for the computation
     * @param proof The ZK proof from RISC-0
     * @param journal The journal data (computation output)
     * @return True if the proof is valid, false otherwise
     */
    function verifyProof(
        bytes32 imageId,
        bytes calldata input,
        bytes calldata proof,
        bytes calldata journal
    ) external view returns (bool);

    /**
     * @dev Gets the performance benchmarking data for a given proof
     * @param proofHash The hash of the proof being queried
     * @return zkGasUsed ZK proof gas used
     * @return normalGasUsed Estimated gas usage for normal (non-ZK) processing
     * @return timeSaved Estimated time saved by using ZK proofs
     */
    function getBenchmarkData(bytes32 proofHash) 
        external 
        view 
        returns (
            uint256 zkGasUsed,
            uint256 normalGasUsed,
            uint256 timeSaved
        );
} 