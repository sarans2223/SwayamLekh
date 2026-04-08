import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/variables.css';
import './styles/globals.css';
import './styles/animations.css';
import 'katex/dist/katex.min.css';

if (import.meta.env.DEV) console.log("Main entry point loaded.");

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("Root element not found");

  ReactDOM.createRoot(rootElement).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
  if (import.meta.env.DEV) console.log("React render command executed successfully.");
} catch (error) {
  console.error("CRITICAL BROWSER ERROR:", error);
}