// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAVS
 * @dev Interface for EigenLayer's Actively Validated Service (AVS)
 * 
 * This interface represents a simplified version of EigenLayer's AVS interface
 * for educational purposes. In a production environment, this would include the
 * full AVS interface required by EigenLayer.
 * 
 * AVSs in EigenLayer are services that utilize restaked ETH as security for
 * their operations, enabling them to perform computations or validations without
 * requiring their own separate security layer.
 * 
 * This simplified interface requires only a validatePayload method, which would
 * typically be used to validate computation results or proofs.
 */
interface IAVS {
    /**
     * @dev Validates a payload as part of the AVS protocol
     * 
     * This function is called to validate computation results or proofs. In our ZK
     * Co-Processor implementation, this validates zero-knowledge proofs submitted
     * by operators who have performed off-chain computations.
     * 
     * @param proof The proof data to validate
     */
    function validatePayload(bytes calldata proof) external;
}
