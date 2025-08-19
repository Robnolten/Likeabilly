import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Zorg dat er een element met id="root" in index.html staat
const rootElement = document.getElementById('root');
if (rootElement) {
  // Voor React 18:
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  // Als je nog met React 17 werkt, gebruik dan:
  // ReactDOM.render(<App />, rootElement);
}   