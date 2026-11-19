// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // Ataovy azo antoka fa misy io
import App from './App.jsx'
import { Toaster } from 'sonner' // <-- ITO
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster richColors position="top-right" /> {/* <-- ITO */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)