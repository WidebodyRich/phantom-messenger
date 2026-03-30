// ── Polyfills (MUST be first) ──────────────────────────
import { Buffer } from 'buffer';
import process from 'process';

// Ensure Buffer and process are globally available
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;
if (typeof window.Buffer === 'undefined') window.Buffer = Buffer;
if (typeof globalThis.process === 'undefined') globalThis.process = process;
if (typeof window.process === 'undefined') window.process = process;

// Ensure process.env exists
if (!globalThis.process.env) globalThis.process.env = {};

console.log('[Phantom] Build v3.2.0 — Queue + Flush, instant send, no encryption gate');

// ── Preload CryptoKeys BEFORE React renders ────────────
import { preloadCryptoKeys } from './crypto/signalProtocol';
preloadCryptoKeys(); // fire-and-forget — starts async import NOW

// ── App ────────────────────────────────────────────────
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
