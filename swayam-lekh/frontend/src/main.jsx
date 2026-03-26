import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/variables.css';
import './styles/globals.css';
import './styles/animations.css';

console.log("Main entry point. Clearing session storage for fresh JEE overhaul test.");
sessionStorage.clear();

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("Root element not found");

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
  console.log("React render command executed successfully.");
} catch (error) {
  console.error("CRITICAL BROWSER ERROR:", error);
}