import React from 'react';

/**
 * Component to display a connection error with Supabase
 * 
 * @param {Object} props - Component props
 * @param {string} props.error - Error message to display
 */
export default function SupabaseConnectionError({ error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-red-600 p-4">
          <h2 className="text-white text-xl font-bold">Connection Error</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-red-600 font-medium">
            Could not connect to the database
          </div>
          
          <div className="text-gray-700">
            {error || 'An unknown error occurred while connecting to Supabase.'}
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-2">Troubleshooting Steps:</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Check that your Supabase URL and anon key are correct in the .env file</li>
              <li>Verify that your Supabase project is active</li>
              <li>Check your network connection</li>
              <li>Make sure your browser allows connections to Supabase</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}