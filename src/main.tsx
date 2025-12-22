import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// DEBUG: Expor variáveis Vite no `window.__ZE_ENV__` para inspeção em runtime.
// Uso temporário — remova este bloco após a verificação em ambiente de preview/prod.
;(window as any).__ZE_ENV__ = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_SIGNED_URL_SERVER_URL: import.meta.env.VITE_SIGNED_URL_SERVER_URL,
};
console.log('DEBUG window.__ZE_ENV__:', (window as any).__ZE_ENV__);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
