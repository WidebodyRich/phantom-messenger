import { Buffer } from 'buffer';

// Polyfill Node.js globals BEFORE any other imports
globalThis.Buffer = Buffer;
globalThis.process = globalThis.process || { env: {}, browser: true, version: '' };

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
