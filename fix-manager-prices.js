// Script to fix manager_prices table fields
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.production file
const envContent = fs.readFileSync('./.env.production', 'utf8');
const envVars = envContent
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      acc[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
    return acc;
  }, {});

// Create Supabase client
const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function fixManagerPricesTable() {
  console.log('Checking manager_prices table...');
  
  try {
    // First try to read data with camelCase fields
    const { data: camelCaseData, error: camelCaseError } = await supabase
      .from('manager_prices')
      .select('id, "sellOld", "sellNew", "buyOld", "buyNew"')
      .single();
    
    if (!camelCaseError && camelCaseData) {
      console.log('Found camelCase data:', camelCaseData);
      
      // Delete existing record
      const { error: deleteError } = await supabase
        .from('manager_prices')
        .delete()
        .eq('id', 1);
      
      if (deleteError) {
        console.error('Error deleting record:', deleteError);
        return;
      }
      
      // Insert with lowercase fields
      const newData = {
        id: 1,
        sellold: camelCaseData.sellOld,
        sellnew: camelCaseData.sellNew,
        buyold: camelCaseData.buyOld,
        buynew: camelCaseData.buyNew
      };
      
      console.log('Inserting lowercase data:', newData);
      
      const { data: insertResult, error: insertError } = await supabase
        .from('manager_prices')
        .insert(newData)
        .select();
      
      if (insertError) {
        console.error('Error inserting data:', insertError);
      } else {
        console.log('Successfully fixed manager_prices table:', insertResult);
      }
    } else {
      console.log('No camelCase data found or could not access camelCase fields.');
      
      // Check if lowercase data already exists
      const { data: lowercaseData, error: lowercaseError } = await supabase
        .from('manager_prices')
        .select('id, sellold, sellnew, buyold, buynew')
        .single();
      
      if (!lowercaseError && lowercaseData) {
        console.log('Lowercase data already exists:', lowercaseData);
      } else {
        console.log('No lowercase data found, creating default');
        
        // Create default record with lowercase fields
        const defaultData = {
          id: 1,
          sellold: 5.0,
          sellnew: 5.2,
          buyold: 4.8,
          buynew: 5.0
        };
        
        const { data: insertResult, error: insertError } = await supabase
          .from('manager_prices')
          .insert(defaultData)
          .select();
        
        if (insertError) {
          console.error('Error inserting default data:', insertError);
        } else {
          console.log('Created default manager_prices record:', insertResult);
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixManagerPricesTable().then(() => {
  console.log('Done.');
});
