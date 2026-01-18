import React from 'react';
import { createRoot } from 'react-dom/client';
import OnomateChat from './chat.tsx';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<OnomateChat />);