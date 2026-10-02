import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { createQueryClient } from './use-runners';
import './styles.css';

const client = createQueryClient();
createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={client}><App/></QueryClientProvider></StrictMode>,
);
