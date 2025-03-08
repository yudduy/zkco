/**
 * Main entry point for the ZK Co-Processor Dashboard
 * This file is responsible for rendering the App component to the DOM
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/app.css';

// Create a root container for the React application
const container = document.getElementById('root');
const root = createRoot(container);

// Render the App component to the DOM
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
