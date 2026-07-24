import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RootApplication } from './RootApplication';
import './visualRefresh.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found.');

createRoot(root).render(
  <StrictMode>
    <RootApplication />
  </StrictMode>,
);
