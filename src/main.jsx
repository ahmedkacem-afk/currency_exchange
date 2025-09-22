import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
import { runMigrations } from './lib/migrations.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Run database migrations if needed
runMigrations().then(result => {
  console.log('Database migrations completed:', result)
}).catch(error => {
  console.error('Migrations failed:', error)
})


