import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
// Removed automatic migrations and schema manager initialization
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
  // Initialize the app (skip automatic migrations/schema manipulation)
  async function initializeApp() {
    try {
      console.log('Connecting to Supabase...');
      
      // Check basic connection to Supabase
      const { error } = await supabase.from('wallets').select('id').limit(1)
      
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection error: ${error.message}`)
      }
      
      console.log('Connected to Supabase successfully')
      
      console.log('Skipping automatic migrations and schema manager. App will use existing schema.')
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
  
  // Handle redirects from 404.html
  const handleRedirectFromNotFound = () => {
    const redirectPath = window.sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      window.sessionStorage.removeItem('redirectPath');
      console.log('Handling redirect from 404 page to:', redirectPath);
      // The BrowserRouter will use this path when it initializes
      window.history.replaceState(null, '', redirectPath);
    }
  };

  // Handle potential redirects before rendering
  handleRedirectFromNotFound();

  // Render the app immediately
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
}


