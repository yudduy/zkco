/**
 * Custom hook for interacting with the ZK Co-Processor smart contract
 * This hook handles all blockchain interactions and provides a clean interface
 * for the React components to use
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

// Network configurations
const NETWORK_CONFIGS = {
  // Sepolia testnet
  sepolia: {
    chainId: '0xaa36a7', // Sepolia testnet chain ID in hex
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  // Ethereum mainnet
  mainnet: {
    chainId: '0x1', // Ethereum mainnet ID in hex
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io']
  }
};

// ABI for our ZKCoProcessor contract
const ZKCoProcessorABI = [
  "event ComputationRequested(bytes32 indexed taskId, address requester, uint256 complexity, uint256 reward)",
  "event ProofSubmitted(bytes32 indexed taskId, address operator, bytes32 resultHash)",
  "event ComparisonLogged(uint256 zkGasUsed, uint256 normalGasUsed, uint256 timeSaved)",
  "event RewardPaid(address indexed operator, uint256 amount, bytes32 indexed taskId)",
  "event OperatorRegistered(address indexed operator, uint256 stake)",
  "function requestComputation(bytes calldata inputData) external payable",
  "function submitProof(bytes32 taskId, bytes calldata proof, bytes32 resultHash) external",
  "function logComparison(uint256 zkGasUsed, uint256 normalGasUsed, uint256 timeSaved) external",
  "function tasks(bytes32) external view returns (bool completed, uint256 startTime, uint256 endTime, uint256 reward, address operator, uint256 complexity, bytes32 resultHash, bool verified)",
  "function totalTasksProcessed() external view returns (uint256)"
];

/**
 * Custom hook to interact with the ZK Co-Processor contract
 * @returns {Object} Functions and state variables for interacting with the contract
 */
export const useZKVerifier = () => {
  // State variables
  const [contract, setContract] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [networkId, setNetworkId] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Store recent comparisons - limited to 5 for better performance
  const [recentComparisons, setRecentComparisons] = useState([]);

  // Get contract address from environment variables
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || "0x1234567890123456789012345678901234567890";
  
  // Use useRef to maintain event listener references for cleanup
  const eventListeners = useRef({
    chainChanged: null,
    accountsChanged: null,
    comparison: null
  });

  /**
   * Simulate a comparison for demonstration purposes
   * In a real implementation, comparisons would come from actual processing
   * @param {number} complexity - The complexity of the task
   * @param {string} inputData - The original input data (optional)
   */
  const simulateComparison = useCallback((complexity, inputData = '') => {
    if (!contract) return;
    
    try {
      // Calculate simulated gas usage based on input complexity
      const zkGasUsed = Math.floor(10000 + (complexity * 50));
      const normalGasUsed = Math.floor(zkGasUsed * (2 + Math.random() * 3)); // 2-5x more gas for normal processing
      const timeSaved = Math.floor(complexity * (1 + Math.random() * 2));
      
      // Store original input data for reference in UI
      // In a real app, this would be stored in a database or emitted in an event
      localStorage.setItem('lastInputData', inputData);
      
      // Log the comparison to the contract (this will trigger the event listener)
      contract.logComparison(zkGasUsed, normalGasUsed, timeSaved);
    } catch (error) {
      console.error("Error simulating comparison:", error);
    }
  }, [contract]);

  /**
   * Function to check which network the user is currently on
   * @returns {Promise<Object>} Network information
   */
  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return { isCorrect: false, id: '', name: 'Not Connected' };
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      let networkName = 'Unknown Network';
      let isCorrect = false;
      let networkId = '';
      
      // Check if on Sepolia (our target network)
      if (chainId === NETWORK_CONFIGS.sepolia.chainId) {
        networkName = 'Sepolia Testnet';
        isCorrect = true;
        networkId = 'sepolia';
      } 
      // Check if on Ethereum mainnet
      else if (chainId === NETWORK_CONFIGS.mainnet.chainId) {
        networkName = 'Ethereum Mainnet';
        networkId = 'mainnet';
      }
      // Other common networks
      else if (chainId === '0x5') {
        networkName = 'Goerli Testnet';
      } else if (chainId === '0x89') {
        networkName = 'Polygon';
      } else {
        networkName = `Unknown (${chainId})`;
      }
      
      setIsCorrectNetwork(isCorrect);
      setNetworkName(networkName);
      setNetworkId(networkId);
      
      return { isCorrect, id: networkId, name: networkName, chainId };
    } catch (error) {
      console.error("Error checking network:", error);
      return { isCorrect: false, id: '', name: 'Error' };
    }
  }, []);

  /**
   * Switch networks
   * @param {string} targetNetwork - Network ID to switch to ('sepolia' or 'mainnet')
   * @returns {Promise<boolean>} Success status
   */
  const switchNetwork = useCallback(async (targetNetwork) => {
    if (!window.ethereum) return false;
    
    try {
      const config = NETWORK_CONFIGS[targetNetwork];
      if (!config) {
        console.error(`Invalid network: ${targetNetwork}`);
        return false;
      }
      
      // Try to switch to the target network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: config.chainId }]
        });
        return true;
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [config]
            });
            return true;
          } catch (addError) {
            console.error(`Error adding ${targetNetwork} network:`, addError);
            return false;
          }
        }
        console.error(`Error switching to ${targetNetwork}:`, switchError);
        return false;
      }
    } catch (error) {
      console.error("Error switching networks:", error);
      return false;
    }
  }, []);

  /**
   * Helper function to switch to Sepolia
   * @returns {Promise<boolean>} Success status
   */
  const switchToSepolia = useCallback(async () => {
    return await switchNetwork('sepolia');
  }, [switchNetwork]);

  /**
   * Helper function to switch to Ethereum Mainnet
   * @returns {Promise<boolean>} Success status
   */
  const switchToMainnet = useCallback(async () => {
    return await switchNetwork('mainnet');
  }, [switchNetwork]);
  
  /**
   * Initialize the contract and web3 connection
   * @returns {Promise<boolean>} Success status
   */
  const initializeWeb3 = useCallback(async () => {
    if (!window.ethereum) {
      console.error("Ethereum provider not found. Please install MetaMask.");
      return false;
    }
    
    try {
      // Check which network we're on
      // eslint-disable-next-line no-unused-vars
      const { isCorrect, chainId } = await checkNetwork();
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        setIsConnected(false);
        setAccount(null);
        return false;
      }
      
      // Create a Web3Provider
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      
      // Get the signer
      const web3Signer = web3Provider.getSigner();
      setSigner(web3Signer);
      
      // Set account
      setAccount(accounts[0]);
      setIsConnected(true);
      
      // Create contract instance
      const zkContract = new ethers.Contract(contractAddress, ZKCoProcessorABI, web3Signer);
      setContract(zkContract);
      
      // Set up comparison event listener
      const comparisonListener = (zkGasUsed, normalGasUsed, timeSaved) => {
        const newComparison = {
          zkGasUsed: zkGasUsed.toNumber(),
          normalGasUsed: normalGasUsed.toNumber(),
          timeSaved: timeSaved.toNumber(),
          isNew: true, // Flag to indicate this is a new entry for animation
          timestamp: Date.now() // Add timestamp for sorting
        };
        
        setRecentComparisons(prev => {
          // Add the new comparison to the top and keep only the 5 most recent entries
          const newComparisons = [newComparison, ...prev.slice(0, 4)];
          
          // After a delay, remove the isNew flag to stop the animation
          setTimeout(() => {
            setRecentComparisons(current => 
              current.map((comp, i) => i === 0 ? { ...comp, isNew: false } : comp)
            );
          }, 3000);
          
          return newComparisons;
        });
      };
      
      // Save event listener reference for cleanup
      eventListeners.current.comparison = comparisonListener;
      zkContract.on("ComparisonLogged", comparisonListener);
      
      setInitialized(true);
      return true;
    } catch (error) {
      console.error("Error initializing Web3:", error);
      setIsConnected(false);
      return false;
    }
  }, [contractAddress, checkNetwork]);
  
  /**
   * Setup event listeners for MetaMask events
   */
  const setupEventListeners = useCallback(() => {
    if (!window.ethereum) return;
    
    // Listen for network changes
    const chainChangedListener = (_chainId) => {
      // Reset the entire app state when network changes
      window.location.reload();
    };
    
    // Listen for account changes
    const accountsChangedListener = (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        // Re-initialize contract with new signer
        initializeWeb3();
      } else {
        setIsConnected(false);
        setAccount(null);
      }
    };
    
    // Save listener references for cleanup
    eventListeners.current.chainChanged = chainChangedListener;
    eventListeners.current.accountsChanged = accountsChangedListener;
    
    window.ethereum.on('chainChanged', chainChangedListener);
    window.ethereum.on('accountsChanged', accountsChangedListener);
  }, [initializeWeb3]);
  
  /**
   * Cleanup event listeners
   */
  const cleanupEventListeners = useCallback(() => {
    // Remove contract listeners
    if (contract && eventListeners.current.comparison) {
      contract.removeListener("ComparisonLogged", eventListeners.current.comparison);
    }
    
    // Remove ethereum provider listeners
    if (window.ethereum) {
      if (eventListeners.current.chainChanged) {
        window.ethereum.removeListener('chainChanged', eventListeners.current.chainChanged);
      }
      if (eventListeners.current.accountsChanged) {
        window.ethereum.removeListener('accountsChanged', eventListeners.current.accountsChanged);
      }
    }
  }, [contract]);

  // Initialize web3 and set up event listeners when component mounts
  useEffect(() => {
    const init = async () => {
      await initializeWeb3();
      setupEventListeners();
    };
    
    init();
    
    // Cleanup event listeners when component unmounts
    return () => {
      cleanupEventListeners();
    };
  }, [initializeWeb3, setupEventListeners, cleanupEventListeners]);

  /**
   * Request computation function - sends a transaction to the smart contract
   * @param {string} inputData - The data to be processed by the ZK Co-Processor
   * @returns {Promise<object>} The transaction receipt
   */
  const requestComputation = useCallback(async (inputData) => {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed. Please install MetaMask.");
    }
    
    if (!isConnected) {
      // Try to connect
      const success = await initializeWeb3();
      if (!success) {
        throw new Error("Failed to connect to wallet. Please try again.");
      }
    }
    
    if (!contract || !signer) {
      throw new Error("Web3 not initialized. Please try refreshing the page.");
    }
    
    // Make sure we're on Sepolia
    if (!isCorrectNetwork) {
      const switched = await switchToSepolia();
      if (!switched) {
        throw new Error(`Please switch to Sepolia testnet. You are currently on ${networkName}.`);
      }
      
      // Wait for network switch to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-initialize web3 after network switch
      await initializeWeb3();
      
      // If still not on the correct network, throw error
      if (!isCorrectNetwork) {
        throw new Error("Network switch didn't complete properly. Please refresh and try again.");
      }
    }
    
    setIsLoading(true);
    
    try {
      // Convert input data to bytes
      const inputBytes = ethers.utils.toUtf8Bytes(inputData);
      
      // Estimate the cost (task complexity based on data size)
      const complexity = inputBytes.length;
      const baseReward = ethers.utils.parseEther("0.001");
      // eslint-disable-next-line no-unused-vars
      const estimatedReward = baseReward.mul(ethers.BigNumber.from(1 + Math.floor(complexity / 100)));
      
      // This is a testnet, so we're not using real ETH
      // We'll just pay a minimal gas fee
      const minimalPayment = ethers.utils.parseEther("0.0001");
      
      // Send transaction with the reward amount (minimal on testnet)
      const tx = await contract.requestComputation(inputBytes, { value: minimalPayment });
      const receipt = await tx.wait();
      
      // After transaction, simulate a comparison for demonstration purposes
      // In a production app, this would come from actual on-chain events
      setTimeout(() => {
        simulateComparison(complexity, inputData);
      }, 2000);
      
      return receipt;
    } catch (error) {
      console.error("Error requesting computation:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer, isConnected, isCorrectNetwork, switchToSepolia, networkName, simulateComparison, initializeWeb3]);

  /**
   * Get total tasks processed from the contract
   * @returns {Promise<number>} Total tasks processed
   */
  const getTotalTasksProcessed = useCallback(async () => {
    if (!contract) {
      // If contract is not initialized, return mock data for demonstration
      return 12; // Default mock value
    }
    
    try {
      const total = await contract.totalTasksProcessed();
      return total.toNumber();
    } catch (error) {
      console.error("Error getting total tasks:", error);
      return 12; // Fallback to mock data on error
    }
  }, [contract]);

  /**
   * Get the latest comparison data
   * @returns {Array} Array of comparison objects with zkGasUsed, normalGasUsed, timeSaved
   */
  const getLatestComparisons = useCallback(() => {
    // Return the stored recent comparisons
    if (recentComparisons.length === 0) {
      // If no comparisons yet, return some mock data for demonstration
      return [
        { zkGasUsed: 25000, normalGasUsed: 75000, timeSaved: 120, isNew: false, timestamp: Date.now() - 1000 },
        { zkGasUsed: 15000, normalGasUsed: 65000, timeSaved: 95, isNew: false, timestamp: Date.now() - 2000 },
        { zkGasUsed: 30000, normalGasUsed: 85000, timeSaved: 150, isNew: false, timestamp: Date.now() - 3000 }
      ];
    }
    return recentComparisons;
  }, [recentComparisons]);

  /**
   * Connect to MetaMask (or other Web3 provider)
   * @returns {Promise<boolean>} Success status
   */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to use this application.");
      return false;
    }
    
    try {
      const success = await initializeWeb3();
      
      if (success && !isCorrectNetwork) {
        await switchToSepolia();
        // Re-initialize after network switch
        await initializeWeb3();
      }
      
      return success;
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      return false;
    }
  }, [initializeWeb3, isCorrectNetwork, switchToSepolia]);

  /**
   * Toggle between Sepolia and Mainnet
   * Switches to the opposite network from the current one
   * @returns {Promise<boolean>} Success status
   */
  const toggleNetwork = useCallback(async () => {
    if (networkId === 'sepolia') {
      return await switchToMainnet();
    } else {
      return await switchToSepolia();
    }
  }, [networkId, switchToMainnet, switchToSepolia]);

  return {
    requestComputation,
    getTotalTasksProcessed,
    getLatestComparisons,
    isConnected,
    isCorrectNetwork,
    account,
    networkName,
    networkId,
    connectWallet,
    switchToSepolia,
    switchToMainnet,
    toggleNetwork,
    isLoading,
    initialized
  };
}; 