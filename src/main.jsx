import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
import { runMigrations } from './lib/migrations.js'
import { initializeDatabase, validateAndUpdateSchema } from './lib/schema-manager.js'
import { supabase } from './lib/supabase.js'
import SupabaseConnectionError from './components/SupabaseConnectionError.jsx'

// Check if Supabase URL and key are defined
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <SupabaseConnectionError 
        error="Supabase configuration missing. Please make sure you have set the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables." 
      />
    </React.StrictMode>,
  )
} else {
  // Initialize the app with schema checks and migrations
  async function initializeApp() {
    try {
      console.log('Connecting to Supabase...');
      
      // Check basic connection to Supabase
      const { error } = await supabase.from('wallets').select('id').limit(1)
      
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection error: ${error.message}`)
      }
      
      console.log('Connected to Supabase successfully')
      
      // Initialize database with required tables
      console.log('Initializing database schema...')
      const dbInitialized = await initializeDatabase()
      if (!dbInitialized) {
        console.warn('Database initialization had some issues, but we will continue')
      }
      
      // Validate and update schema if needed
      console.log('Validating database schema...')
      await validateAndUpdateSchema()
      
      // Run any pending database migrations
      console.log('Running migrations...')
      await runMigrations()
      
      console.log('Database setup completed successfully!')
    } catch (error) {
      console.error('Failed to initialize app:', error)
      
      ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
          <SupabaseConnectionError error={error.message} />
        </React.StrictMode>,
      )
    }
  }

  // Run initialization but don't wait for it to render the app
  initializeApp();
  
  // Render the app immediately
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
}


