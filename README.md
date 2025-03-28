# ZK Co-Processor

A zero-knowledge co-processor for offloading computational tasks from Ethereum L1 using EigenLayer's restaking mechanism for security.

## Overview

ZK Co-Processor is an educational demonstration project that showcases how zero-knowledge proofs can be used to offload computational tasks from Ethereum's Layer 1 to specialized processors, dramatically reducing gas costs while maintaining security through cryptographic proofs.

The project consists of:

1. **Smart Contracts**: Solidity contracts implementing the ZK Co-Processor logic
2. **Frontend**: React-based educational dashboard for interacting with the contracts
3. **Tests**: Comprehensive test suite for the smart contracts

## Live Demo

[View the ZK Co-Processor Dashboard](https://zkco.onrender.com)

## Features

- **ZK Computation Offloading**: Demonstrate how complex computations can be performed off-chain
- **EigenLayer Integration**: Use EigenLayer's restaking mechanism for security
- **Educational Dashboard**: Interactive UI explaining ZK proofs and their benefits
- **Task Complexity Analysis**: See how task complexity affects gas usage and performance
- **Network Integration**: Works with Sepolia testnet for real blockchain interaction
- **Performance Visualization**: Visualize the gas savings and performance improvements

## Smart Contract Architecture

The contracts follow a modular design:

- `ZKCoProcessor.sol`: Main contract implementing the co-processor logic
- `IAVS.sol`: Interface for EigenLayer's Actively Validated Service
- `IRISC0Verifier.sol`: Interface for RISC-0 ZK proof verification

## Getting Started

### Prerequisites

- Node.js v14+
- npm or yarn
- Foundry for smart contract development
- MetaMask wallet extension

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zkco.git
   cd zkco
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install Foundry and smart contract dependencies:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   cd ..
   forge install
   ```

### Development

1. Run the Foundry tests:
   ```bash
   forge test
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Deploy the smart contracts to Sepolia testnet:
   ```bash
   export PRIVATE_KEY=your_private_key
   forge script operator/script/deploy.s.sol --rpc-url https://sepolia.infura.io/v3/YOUR_INFURA_KEY --broadcast
   ```

### Building for Production

1. Build the smart contracts:
   ```bash
   forge build
   ```

2. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

3. Serve the production build:
   ```bash
   serve -s build
   ```

## Usage

1. Connect your MetaMask wallet to the application
2. Ensure you're on the Sepolia testnet
3. Enter data for a computational task
4. Submit the task to see gas usage comparison between ZK and normal processing
5. Explore detailed information about the computation

## Deployment

### Deploying to Render.com

This project is configured for easy deployment on Render.com:

1. Create a new account on [Render.com](https://render.com) if you don't have one
2. Click on "New" and select "Blueprint" from the dropdown
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` configuration
5. Click "Apply" to deploy the application

The frontend will be deployed as a static site, while the smart contracts should be deployed separately to the Sepolia testnet as described in the Development section.

### Alternative Deployment Options

#### Vercel

The frontend of this project can also be deployed to Vercel:

1. Connect your GitHub repository to Vercel
2. Set the build command to `cd frontend && npm run build`
3. Set the output directory to `frontend/build`

#### Heroku

To deploy on Heroku (requires account verification):

1. Install the Heroku CLI and log in
2. Create a new Heroku app: `heroku create zkco-app`
3. Add the Node.js buildpack: `heroku buildpacks:add heroku/nodejs`
4. Add the static buildpack: `heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static`
5. Deploy your application: `git push heroku main`

## Educational Resources

Learn more about the technologies used in this project:

- [Zero-Knowledge Proofs](https://ethereum.org/en/zero-knowledge-proofs/)
- [EigenLayer](https://docs.eigenlayer.xyz/)
- [RISC Zero](https://www.risczero.com/docs)
- [Foundry](https://book.getfoundry.sh/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- EigenLayer team for their restaking mechanism
- RISC Zero for their ZK proving system
- Ethereum Foundation for their educational resources
