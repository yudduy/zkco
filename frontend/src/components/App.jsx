/**
 * Main App component for the ZK Co-Processor Dashboard
 * This dashboard provides an educational interface to learn about and interact with
 * ZK co-processors for offloading computations from Ethereum L1
 */
import React, { useState, useEffect } from 'react';
import { useZKVerifier } from '../hooks/useZKVerifier';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Educational links about ZK proofs and related technologies
const EDUCATIONAL_LINKS = [
  {
    title: "Introduction to Zero-Knowledge Proofs",
    url: "https://ethereum.org/en/zero-knowledge-proofs/",
    description: "Learn the basics of ZK proofs from Ethereum.org"
  },
  {
    title: "EigenLayer Documentation",
    url: "https://docs.eigenlayer.xyz/",
    description: "Understand EigenLayer's restaking mechanism"
  },
  {
    title: "ZK Co-Processors Explained",
    url: "https://blog.polygon.technology/polygon-2-0-on-chain-zkps/",
    description: "Polygon's explanation of ZK co-processors"
  },
  {
    title: "RISC Zero Documentation",
    url: "https://www.risczero.com/docs",
    description: "Learn about RISC Zero's zkVM for generating ZK proofs"
  }
];

/**
 * App component for the ZK Co-Processor Dashboard
 */
const App = () => {
  // Use our custom hook to interact with the blockchain
  const { 
    requestComputation, 
    getTotalTasksProcessed,
    getLatestComparisons,
    isConnected,
    isCorrectNetwork,
    account,
    networkName,
    networkId,
    connectWallet,
    toggleNetwork,
    isLoading,
    initialized
  } = useZKVerifier();

  // State variables
  const [comparisonData, setComparisonData] = useState(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [inputData, setInputData] = useState('');
  const [comparisons, setComparisons] = useState([]);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);

  // Fetch initial data when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const tasks = await getTotalTasksProcessed();
        setTotalTasks(tasks);
        
        const latestComparisons = await getLatestComparisons();
        // Limit to 5 entries
        setComparisons(latestComparisons.slice(0, 5));
        
        // Set the most recent comparison as the current data for the chart
        if (latestComparisons && latestComparisons.length > 0) {
          setComparisonData(latestComparisons[0]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
    
    // Show network warning if not on Sepolia and connected
    if (isConnected && !isCorrectNetwork) {
      setShowNetworkWarning(true);
    } else {
      setShowNetworkWarning(false);
    }
  }, [getTotalTasksProcessed, getLatestComparisons, isConnected, isCorrectNetwork]);

  // Listen for comparisons updates
  useEffect(() => {
    // If processing is done and we have comparisons
    if (processingComplete && comparisons.length > 0) {
      // Reset the processing complete flag
      setProcessingComplete(false);
      
      // Update the chart with the latest comparison
      setComparisonData(comparisons[0]);
    }
  }, [processingComplete, comparisons]);

  // Handle computation request
  const handleComputationRequest = async () => {
    if (!inputData) {
      alert('Please enter some input data to process');
      return;
    }
    
    try {
      setConnectionError('');
      setProcessingComplete(false);
      
      // Send computation request to the smart contract
      await requestComputation(inputData);
      
      // Update our data
      const tasks = await getTotalTasksProcessed();
      setTotalTasks(tasks);
      
      // Fetch latest comparisons after a short delay to allow blockchain to process
      setTimeout(async () => {
        const latestComparisons = await getLatestComparisons();
        // Limit to 5 entries
        setComparisons(latestComparisons.slice(0, 5));
        setProcessingComplete(true);
      }, 3000);
      
      // Clear the input field
      setInputData('');
    } catch (error) {
      console.error('Error:', error);
      setConnectionError(error.message || 'Error processing computation request');
    }
  };
  
  // Handle network toggle
  const handleNetworkToggle = async () => {
    await toggleNetwork();
    // Note: The page will reload due to network change
  };

  // Handle comparison row click
  const handleComparisonClick = (comparison, index) => {
    // Create extended information for the selected comparison
    const extendedInfo = {
      ...comparison,
      index,
      // Additional calculated fields
      efficiencyPercentage: Math.round(((comparison.normalGasUsed - comparison.zkGasUsed) / comparison.normalGasUsed) * 100),
      // In a real app, the following would be fetched from the contract or from events
      originalMessage: index === 0 ? inputData || "Sample computational task" : `Sample task ${index}`,
      inputBytes: comparison.zkGasUsed / 50, // For demonstration - simulating input bytes based on gas
      verificationDependencies: [
        "RISC0 Verifier",
        "Hash Function Library", 
        "EigenLayer Staking Contract"
      ],
      processingDetails: {
        proverTime: Math.round(comparison.timeSaved * 0.6),
        verifierTime: Math.round(comparison.timeSaved * 0.4),
        proofSize: Math.round(comparison.zkGasUsed / 100),
        trustAssumptions: "Restaked ETH via EigenLayer"
      }
    };
    
    setSelectedComparison(extendedInfo);
    setShowDetailModal(true);
  };

  // Close the detail modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedComparison(null);
  };

  // Chart data configuration for visualization
  const chartData = {
    labels: ['ZK Co-Processor', 'Normal Processing'],
    datasets: [
      {
        label: 'Gas Usage Comparison',
        data: comparisonData ? [comparisonData.zkGasUsed, comparisonData.normalGasUsed] : [0, 0],
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Gas Usage Comparison: ZK vs Normal Processing',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            return `Gas Used: ${value.toLocaleString()} units`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Gas Units'
        }
      }
    }
  };

  // Calculate gas savings percentage if comparison data is available
  const calculateSavings = () => {
    if (!comparisonData) return '0';
    const savings = comparisonData.normalGasUsed - comparisonData.zkGasUsed;
    return Math.round((savings / comparisonData.normalGasUsed) * 100);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>ZK Co-Processor Dashboard</h1>
        <div className="wallet-info">
          {isConnected ? (
            <>
              <div className="connected-wallet">
                <span className="wallet-address">{`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</span>
                <span 
                  className={`network-indicator ${isCorrectNetwork ? 'correct-network' : 'wrong-network'}`}
                >
                  {networkName}
                </span>
              </div>
              <button 
                onClick={handleNetworkToggle} 
                className="network-toggle-btn"
                title={`Switch to ${networkId === 'sepolia' ? 'Ethereum Mainnet' : 'Sepolia Testnet'}`}
              >
                <span className="toggle-icon">⇄</span>
                {networkId === 'sepolia' ? 'Switch to Mainnet' : 'Switch to Sepolia'}
              </button>
            </>
          ) : (
            <button onClick={connectWallet} className="connect-wallet-btn">
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      
      {/* Network warning alert */}
      {showNetworkWarning && (
        <div className="network-warning">
          <p>You are currently on {networkName}. This application runs on Sepolia testnet.</p>
          <button onClick={handleNetworkToggle}>Switch to Sepolia</button>
        </div>
      )}
      
      {/* Connection error message */}
      {connectionError && (
        <div className="error-message">
          <p>{connectionError}</p>
        </div>
      )}
      
      <section className="educational-intro">
        <h2>What is a ZK Co-Processor?</h2>
        <div className="info-container">
          <div className="info-text">
            <p>
              A <strong>Zero-Knowledge Co-Processor</strong> offloads computational tasks from Ethereum's L1 to specialized processors,
              dramatically reducing gas costs while maintaining security through cryptographic proofs.
            </p>
            <p>
              Using <strong>EigenLayer's restaking mechanism</strong>, these Co-Processors leverage existing staked ETH as security
              for off-chain computations, creating an efficient execution environment without sacrificing trustlessness.
            </p>
            <p>
              Common use cases include complex verifications like digital signatures, AI model inference, and 
              computational-heavy operations that would otherwise be prohibitively expensive on-chain.
            </p>
          </div>
          <div className="info-diagram">
            <img src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*bXWR05L1Tq8BrhEQwhyoXg.png" alt="ZK Proof Diagram" />
            <p className="image-caption">Zero-Knowledge cryptography enables verifiable computation off-chain</p>
          </div>
        </div>
        
        <h3>How ZK Proofs Make This Possible</h3>
        <p>
          Zero-Knowledge proofs allow one party (the prover) to prove to another party (the verifier) that a statement is true,
          without revealing any additional information beyond the validity of the statement itself. In blockchain applications, 
          this means computation can happen off-chain, with only a compact proof being submitted and verified on-chain.
        </p>
        
        <div className="educational-links">
          <h3>Learn More About ZK Technology</h3>
          <div className="links-container">
            {EDUCATIONAL_LINKS.map((link, index) => (
              <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="edu-link">
                <h4>{link.title}</h4>
                <p>{link.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
      
      <section className="dashboard-content">
        <div className="stats-section">
          <div className="stats-container">
            <div className="stat-card">
              <h3>Total Tasks Processed</h3>
              <p className="stat-value">{totalTasks}</p>
            </div>
            
            {comparisonData && (
              <div className="stat-card">
                <h3>Time Saved</h3>
                <p className="stat-value">{comparisonData.timeSaved} ms</p>
              </div>
            )}
            
            {comparisonData && (
              <div className="stat-card">
                <h3>Gas Savings</h3>
                <p className="stat-value">
                  {calculateSavings()}%
                </p>
              </div>
            )}
          </div>
          
          <div className="chart-container">
            {comparisonData && <Bar data={chartData} options={chartOptions} />}
          </div>
        </div>
        
        <div className="interactive-section">
          <div className="computation-form">
            <h2>Try it yourself: Request a ZK Computation</h2>
            <p className="computation-explainer">
              Enter any text data below to simulate sending a computation task to the ZK Co-Processor.
              The system will process your input and generate a comparison between ZK and normal processing methods.
              <strong>This is running on Sepolia testnet and does not use real ETH.</strong>
            </p>
            
            <div className="form-content">
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="Enter data for ZK computation (e.g., 'Verify this signature' or 'Calculate merkle proof')..."
                rows={4}
              />
              <div className="input-explanation">
                <h4>How It Works:</h4>
                <p>
                  1. Your text is converted to bytes and sent to the smart contract<br />
                  2. The contract measures computation complexity based on input size<br />
                  3. A simulated ZK proof is generated and verified<br />
                  4. Results comparing gas usage and time are displayed above
                </p>
              </div>
              <button 
                onClick={handleComputationRequest}
                disabled={isLoading || (!isConnected && initialized)}
                className="request-button"
              >
                {isLoading ? (
                  <span className="loading-text">
                    <span className="loading-spinner"></span>
                    <span>Processing...</span>
                  </span>
                ) : (
                  'Request ZK Computation'
                )}
              </button>
              
              {!isConnected && initialized && (
                <p className="connect-wallet-prompt">
                  Please connect your wallet to request computations.
                </p>
              )}
            </div>
          </div>
          
          <div className="recent-comparisons">
            <h2>Recent Proof Comparisons</h2>
            <p className="click-instruction">Click on any row to view detailed information</p>
            <table>
              <thead>
                <tr>
                  <th>ZK Gas Used</th>
                  <th>Normal Gas Used</th>
                  <th>Time Saved (ms)</th>
                  <th>Efficiency Gain</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr className="loading-comparison">
                    <td colSpan="4">
                      <div className="table-loading">
                        <span className="loading-spinner"></span>
                        <span>Processing your computation...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {comparisons.map((comparison, index) => (
                  <tr 
                    key={index} 
                    className={comparison.isNew ? 'highlight-row' : ''}
                    onClick={() => handleComparisonClick(comparison, index)}
                  >
                    <td>{comparison.zkGasUsed.toLocaleString()}</td>
                    <td>{comparison.normalGasUsed.toLocaleString()}</td>
                    <td>{comparison.timeSaved} ms</td>
                    <td>
                      {Math.round(((comparison.normalGasUsed - comparison.zkGasUsed) / comparison.normalGasUsed) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      {/* Detail Modal */}
      {showDetailModal && selectedComparison && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeDetailModal}>×</button>
            <h2>Computation Details</h2>
            
            <div className="detail-section">
              <h3>Performance Metrics</h3>
              <div className="detail-metrics">
                <div className="detail-metric">
                  <span className="metric-label">ZK Gas Used:</span>
                  <span className="metric-value">{selectedComparison.zkGasUsed.toLocaleString()} units</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Normal Gas Used:</span>
                  <span className="metric-value">{selectedComparison.normalGasUsed.toLocaleString()} units</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Time Saved:</span>
                  <span className="metric-value">{selectedComparison.timeSaved} ms</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Efficiency Gain:</span>
                  <span className="metric-value">{selectedComparison.efficiencyPercentage}%</span>
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Computation Input</h3>
              <div className="detail-input">
                <p><strong>Original Message:</strong> {selectedComparison.originalMessage}</p>
                <p><strong>Input Size:</strong> {selectedComparison.inputBytes} bytes</p>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Processing Details</h3>
              <div className="detail-processing">
                <div className="detail-metric">
                  <span className="metric-label">Prover Time:</span>
                  <span className="metric-value">{selectedComparison.processingDetails.proverTime} ms</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Verifier Time:</span>
                  <span className="metric-value">{selectedComparison.processingDetails.verifierTime} ms</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Proof Size:</span>
                  <span className="metric-value">{selectedComparison.processingDetails.proofSize} bytes</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Trust Assumptions:</span>
                  <span className="metric-value">{selectedComparison.processingDetails.trustAssumptions}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Dependencies</h3>
              <ul className="dependencies-list">
                {selectedComparison.verificationDependencies.map((dep, index) => (
                  <li key={index}>{dep}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <footer className="dashboard-footer">
        <p>Built on Ethereum's Sepolia testnet using EigenLayer's restaking technology</p>
        <p>This is an educational demonstration to showcase the potential of ZK Co-Processors</p>
        <p className="version-info">Version 1.0.1 | <a href="https://github.com/yudduy/zkco" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      </footer>
    </div>
  );
};

export default App;  
