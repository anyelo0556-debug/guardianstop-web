import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'
import { LangProvider } from '@/hooks/useLang'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <LangProvider>
          <App />
        </LangProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
