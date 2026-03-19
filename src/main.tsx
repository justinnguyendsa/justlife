import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import DataMigrator from './components/DataMigrator'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataMigrator>
      <App />
    </DataMigrator>
  </StrictMode>,
)
