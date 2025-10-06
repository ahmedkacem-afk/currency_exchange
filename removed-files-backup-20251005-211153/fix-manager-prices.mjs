// Direct fix for manager_prices camelCase to lowercase field names
const SUPABASE_URL = 'https://dvarinlmaibtdozdqiju.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXJpbmxtYWlidGRvemRxaWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDY0MTIsImV4cCI6MjA3NDEyMjQxMn0.hBpw-E-3HgP0hQQOejPN3naY4QMW_VLpQTc9A7xY_HY';

async function fixManagerPrices() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('Checking manager_prices table...');
  
  try {
    // Check if camelCase fields exist and have data
    const { data: camelData } = await supabase
      .from('manager_prices')
      .select('id, "sellOld", "sellNew", "buyOld", "buyNew"')
      .maybeSingle();
      
    console.log('CamelCase data check:', camelData);
    
    // Check if lowercase fields exist
    const { data: lowerData } = await supabase
      .from('manager_prices')
      .select('id, sellold, sellnew, buyold, buynew')
      .maybeSingle();
      
    console.log('Lowercase data check:', lowerData);
    
    // If camelCase data exists, migrate it
    if (camelData && camelData.sellOld !== undefined) {
      console.log('Found camelCase data, will migrate to lowercase');
      
      // Create new record with lowercase fields
      const newRecord = {
        id: 1,
        sellold: camelData.sellOld,
        sellnew: camelData.sellNew,
        buyold: camelData.buyOld,
        buynew: camelData.buyNew
      };
      
      console.log('Deleting old record...');
      // Delete the existing record
      await supabase
        .from('manager_prices')
        .delete()
        .eq('id', 1);
      
      console.log('Creating new record with lowercase fields:', newRecord);
      // Insert the new record
      const { data, error } = await supabase
        .from('manager_prices')
        .insert(newRecord)
        .select();
        
      if (error) {
        console.error('Error creating new record:', error);
      } else {
        console.log('Successfully migrated data to lowercase fields:', data);
      }
    } 
    // If lowercase data exists, we're good
    else if (lowerData && lowerData.sellold !== undefined) {
      console.log('Data already using lowercase fields:', lowerData);
    }
    // No data exists, create default
    else {
      console.log('No data found, creating default with lowercase fields');
      
      const defaultRecord = {
        id: 1,
        sellold: 5.0,
        sellnew: 5.2,
        buyold: 4.8,
        buynew: 5.0
      };
      
      const { data, error } = await supabase
        .from('manager_prices')
        .insert(defaultRecord)
        .select();
        
      if (error) {
        console.error('Error creating default record:', error);
      } else {
        console.log('Successfully created default record with lowercase fields:', data);
      }
    }
  } catch (error) {
    console.error('Error fixing manager_prices:', error);
  }
}

// Run the fix
fixManagerPrices().then(() => console.log('Done!'));
