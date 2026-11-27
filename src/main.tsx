import React from 'react';
import { createRoot } from 'react-dom/client';
import { FileRouter } from '@instinct/files';
import { App } from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(<FileRouter><App /></FileRouter>);

// PWA: register service worker (offline shell + faster loads; harmless if unsupported)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
