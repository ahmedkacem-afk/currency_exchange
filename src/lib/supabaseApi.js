import { supabase } from './supabase'
import { generateUUID } from './uuid'
import { prepareNewEntity, prepareEntityUpdate, formatErrorMessage } from './entityHelpers'

// Using entity helpers to ensure consistent handling of UUIDs and timestamps
// This provides UUIDs for all tables that require them (all except manager_prices)

// Authentication
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  
  // Get user profile from database
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', data.user.id)
    .single();
    
  if (profileError) throw profileError;
  
  return {
    token: data.session.access_token,
    user: profile
  }
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Wallets
export async function getWallets() {
  console.log('Fetching wallets from Supabase')
  try {
    // Get wallets with legacy fields
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id, name, usd, lyd')
      .order('name', { ascending: true })
      
    if (error) throw error
    
    // Initialize walletsWithCurrencies with just the legacy fields
    const walletsWithCurrencies = wallets.map(wallet => {
      const currencies = {};
      
      // Add legacy USD and LYD to currencies object if they exist
      if (wallet.usd !== null && wallet.usd !== undefined) {
        currencies.USD = Number(wallet.usd) || 0;
      }
      
      if (wallet.lyd !== null && wallet.lyd !== undefined) {
        currencies.LYD = Number(wallet.lyd) || 0;
      }
      
      return {
        ...wallet,
        currencies
      };
    });
    
    try {
      // Try to get all wallet currencies - this may fail if table doesn't exist yet
      const { data: walletCurrencies } = await supabase
        .from('wallet_currencies')
        .select('wallet_id, currency_code, balance')
      
      // If we have wallet_currencies data, add them to the wallets
      if (walletCurrencies && walletCurrencies.length > 0) {
        // Update each wallet with its currencies
        walletsWithCurrencies.forEach(wallet => {
          walletCurrencies
            .filter(c => c.wallet_id === wallet.id)
            .forEach(c => {
              // Only add if not already present from legacy fields or if higher
              const currBalance = Number(c.balance) || 0;
              const existingBalance = wallet.currencies[c.currency_code] || 0;
              wallet.currencies[c.currency_code] = Math.max(currBalance, existingBalance);
            });
        });
      }
    } catch (currenciesError) {
      // If wallet_currencies table doesn't exist yet, just continue with legacy fields
      console.warn('Could not fetch wallet currencies, continuing with legacy fields only:', currenciesError);
    }
    
    console.log('Wallets fetched successfully with currencies:', walletsWithCurrencies)
    return { wallets: walletsWithCurrencies }
  } catch (error) {
    console.error('Error fetching wallets:', error)
    throw error
  }
}

export async function createWallet(payload) {
  const { name, usd = 0, lyd = 0, currencies = {} } = payload
  
  try {
    // Use prepareNewEntity to add UUID and created_at
    const walletData = prepareNewEntity({
      name, 
      usd, 
      lyd
    });
    
    // Create the wallet first
    const { data, error } = await supabase
      .from('wallets')
      .insert(walletData)
      .select('id, name, usd, lyd')
      .single()
      
    if (error) throw error
    
    // Now add any additional currencies
    const walletCurrencies = [];
    
    // Skip USD and LYD as they're stored in the legacy fields
    for (const code in currencies) {
      if (code !== 'USD' && code !== 'LYD' && currencies[code] > 0) {
        walletCurrencies.push({
          wallet_id: data.id,
          currency_code: code,
          balance: currencies[code]
        });
      }
    }
    
    // Insert additional currencies if any
    if (walletCurrencies.length > 0) {
      const { error: currencyError } = await supabase
        .from('wallet_currencies')
        .insert(walletCurrencies);
        
      if (currencyError) throw currencyError;
    }
    
    // Return wallet with currencies
    return { 
      wallet: {
        ...data,
        currencies
      }
    }
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw new Error(formatErrorMessage(error));
  }
}

// Summary and statistics
export async function getSummary() {
  try {
    // Get legacy USD and LYD totals
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id, usd, lyd')
    
    if (error) throw error
    
    // Calculate legacy USD and LYD totals
    const totalUsd = wallets.reduce((sum, wallet) => sum + Number(wallet.usd || 0), 0);
    const totalLyd = wallets.reduce((sum, wallet) => sum + Number(wallet.lyd || 0), 0);
    
    // Initialize currency totals with legacy currencies
    const currencyTotals = {
      USD: totalUsd,
      LYD: totalLyd
    };
    
    try {
      // Try to get all wallet currencies - this may fail if table doesn't exist yet
      const { data: walletCurrencies } = await supabase
        .from('wallet_currencies')
        .select('currency_code, balance')
      
      // Calculate totals for all currencies from wallet_currencies
      if (walletCurrencies && walletCurrencies.length > 0) {
        walletCurrencies.forEach(currency => {
          const code = currency.currency_code;
          const balance = Number(currency.balance) || 0;
          
          if (!currencyTotals[code]) {
            currencyTotals[code] = 0;
          }
          
          currencyTotals[code] += balance;
        });
        
        // Use the higher value if both exist in legacy and currency tables
        currencyTotals.USD = Math.max(currencyTotals.USD || 0, totalUsd);
        currencyTotals.LYD = Math.max(currencyTotals.LYD || 0, totalLyd);
      }
    } catch (currenciesError) {
      // If wallet_currencies table doesn't exist yet, just continue with legacy fields
      console.warn('Could not fetch wallet currencies, continuing with legacy totals only:', currenciesError);
    }
    
    return { 
      totalUsd,  // Keep for backward compatibility
      totalLyd,  // Keep for backward compatibility
      count: wallets.length,
      currencyTotals  // All currency totals, including legacy if wallet_currencies doesn't exist
    };
  } catch (error) {
    console.error('Error getting summary:', error);
    throw error;
  }
}

export async function getAllStats() {
  // Get recent transactions - using exact field names from the schema
  const { data: recentTx, error: txError } = await supabase
    .from('transactions')
    .select('type, dinarprice')
    .order('id', { ascending: false })
    .limit(30)
    
  if (txError) throw txError
  
  // Get wallet summaries
  const { data: summary, error: summaryError } = await getSummary()
  
  if (summaryError) throw summaryError
  
  // Calculate buy and sell averages
  const buys = recentTx.filter(tx => tx.type === 'buy')
  const sells = recentTx.filter(tx => tx.type === 'sell')
  
  const buyAverage = buys.length > 0
    ? buys.reduce((sum, tx) => sum + Number(tx.dinarprice), 0) / buys.length
    : null
    
  const sellAverage = sells.length > 0
    ? sells.reduce((sum, tx) => sum + Number(tx.dinarprice), 0) / sells.length
    : null
  
  return {
    transactions: recentTx,
    summary,
    buyAverage,
    sellAverage
  }
}

export async function getWalletStats(walletId) {
  console.log('Getting wallet stats for walletId:', walletId)
  
  // Get wallet info
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('id, name, usd, lyd')
    .eq('id', walletId)
    .single()
    
  if (walletError) {
    console.error('Error fetching wallet:', walletError)
    throw walletError
  }
  
  console.log('Wallet found:', wallet)
  
  // Get recent transactions for this wallet - using exact field names from the schema
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, type, dinarprice')
    .eq('walletid', walletId)
    .order('id', { ascending: false })
    .limit(30)
    
  if (txError) throw txError
  
  // Process transaction data to calculate buy and sell stats
  const buys = transactions.filter(tx => tx.type === 'buy')
  const sells = transactions.filter(tx => tx.type === 'sell')
  
  // Calculate buy stats
  const buyPrices = buys.map(tx => Number(tx.dinarprice)).sort((a, b) => a - b)
  const buy = buyPrices.length > 0 ? {
    min: buyPrices[0],
    max: buyPrices[buyPrices.length - 1],
    median: buyPrices[Math.floor(buyPrices.length / 2)] || buyPrices[0]
  } : null
  
  // Calculate sell stats
  const sellPrices = sells.map(tx => Number(tx.dinarprice)).sort((a, b) => a - b)
  const sell = sellPrices.length > 0 ? {
    min: sellPrices[0],
    max: sellPrices[sellPrices.length - 1],
    median: sellPrices[Math.floor(sellPrices.length / 2)] || sellPrices[0]
  } : null
  
  return {
    wallet,
    transactions,
    buy,
    sell
  }
}

// Prices management
export async function getPrices() {
  try {
    // Get prices with lowercase fields
    const { data: lowercaseData, error: lowercaseError } = await supabase
      .from('manager_prices')
      .select('id, sellold, sellnew, buyold, buynew')
      .single();
      
    if (!lowercaseError && lowercaseData) {
      console.log('Got manager prices with lowercase fields');
      return lowercaseData;
    }
    
    // If no record exists, create a default record
    if (lowercaseError && lowercaseError.code === 'PGRST116') {
      console.log('No manager_prices record found, creating default');
      
      // Use lowercase field names for new records
      const defaultPrices = {
        id: 1,
        sellold: 5.0,
        sellnew: 5.2,
        buyold: 4.8,
        buynew: 5.0
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('manager_prices')
        .insert(defaultPrices)
        .select('id, sellold, sellnew, buyold, buynew')
        .single();
      
      if (insertError) throw insertError;
      return insertData;
    }
    
    // Some other error occurred
    throw camelCaseError || lowercaseError;
  } catch (error) {
    console.error('Error in getPrices:', error);
    throw error;
  }
}

export async function setPrices(payload) {
  try {
    // Check if a record exists with lowercase field names
    const { data: lowercaseData, error: lowercaseError } = await supabase
      .from('manager_prices')
      .select('id, sellold, sellnew, buyold, buynew')
      .eq('id', 1)
      .maybeSingle();
    
    // If no record exists, create a new record with lowercase field names
    if (lowercaseError && lowercaseError.code === 'PGRST116') {
      console.log('No manager_prices record found, creating one with lowercase fields');
      
      const { data: insertData, error: insertError } = await supabase
        .from('manager_prices')
        .insert({ id: 1, ...payload })
        .select('id, sellold, sellnew, buyold, buynew')
        .single();
      
      if (insertError) throw insertError;
      return insertData;
    }
    
    // If camelCase exists, update camelCase fields
    if (camelCaseData) {
      console.log('Updating manager_prices with camelCase fields');
      
      const camelCasePayload = {
        sellOld: payload.sellold,
        sellNew: payload.sellnew,
        buyOld: payload.buyold,
        buyNew: payload.buynew,
        sellDisabled: payload.sellDisabled,
        buyDisabled: payload.buyDisabled
      };
      
      const { data, error } = await supabase
        .from('manager_prices')
        .update(camelCasePayload)
        .eq('id', 1)
        .select('id, "sellOld", "sellNew", "buyOld", "buyNew"')
        .single();
      
      if (error) throw error;
      
      // Convert to lowercase field names for app consistency
      return {
        id: data.id,
        sellold: data.sellOld,
        sellnew: data.sellNew,
        buyold: data.buyOld,
        buynew: data.buyNew,
        sellDisabled: payload.sellDisabled,
        buyDisabled: payload.buyDisabled
      };
    }
    
    // If lowercase exists, update lowercase fields
    if (lowercaseData) {
      console.log('Updating manager_prices with lowercase fields');
      
      const { data, error } = await supabase
        .from('manager_prices')
        .update(payload)
        .eq('id', 1)
        .select('id, sellold, sellnew, buyold, buynew')
        .single();
      
      if (error) throw error;
      return {
        ...data,
        sellDisabled: payload.sellDisabled,
        buyDisabled: payload.buyDisabled
      };
    }
    
    // If we get here, something unexpected happened
    throw new Error('Could not determine manager_prices schema format');
  } catch (error) {
    console.error('Error in setPrices:', error);
    throw error;
  }
}

// Withdrawal operations
export async function withdraw(walletId, payload) {
  const { amount, dinarPrice, type, operationName } = payload
  
  // Start a transaction (will need to get wallet, update balance, and record transaction)
  // First get the wallet
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('usd, lyd')
    .eq('id', walletId)
    .single()
    
  if (walletError) throw walletError
  
  // Calculate new balances
  let newUsd = Number(wallet.usd)
  let newLyd = Number(wallet.lyd)
  
  if (type === 'buy') {
    // Buying USD (giving LYD, getting USD)
    newUsd += amount
    newLyd -= amount * dinarPrice
  } else {
    // Selling USD (giving USD, getting LYD)
    newUsd -= amount
    newLyd += amount * dinarPrice
  }
  
  // Update wallet balance
  const { error: updateError } = await supabase
    .from('wallets')
    .update({ usd: newUsd, lyd: newLyd })
    .eq('id', walletId)
    
  if (updateError) throw updateError  
  
  // Record transaction with UUID - using exact field names from schema
  const transactionData = {
    id: generateUUID(),
    walletid: walletId,
    type,
    dinarprice: dinarPrice
    // Removed createdAt as per requirement
  };
  
  console.log('Creating transaction:', transactionData)
  
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single()
    
  if (txError) throw txError
  
  return {
    transaction,
    wallet: {
      id: walletId,
      usd: newUsd,
      lyd: newLyd
    }
  }
}

// Users
export async function createUser(payload) {
  const { name, email, phone, password, role = 'user' } = payload;
  
  try {
    console.log('Creating user with role:', role);
    
    // First, get the role_id from the roles table
    let roleId = null;
    if (role) {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', role)
        .single();
      
      if (roleError) {
        console.error('Error fetching role:', roleError);
        throw new Error(`Role '${role}' not found. Please choose a valid role.`);
      } else {
        roleId = roleData.id;
        console.log(`Found role ID for ${role}:`, roleId);
      }
    } else {
      throw new Error('A role must be selected when creating a user.');
    }
    
    // For admin-created users who want to avoid session changes,
    // we'll create just a database user with a custom UUID
    console.log('Admin creating database-only user to avoid session changes');
    
    // Generate our own UUID for this user
    const generatedUserId = generateUUID();
    console.log('Generated user ID:', generatedUserId);
    
    // Since we're bypassing auth, no auth error check is needed
    console.log('Proceeding with database-only user creation');
    
    // Extract first and last name
    const firstName = name.split(' ')[0] || '';
    const lastName = name.split(' ').slice(1).join(' ') || '';
    
    // Create user directly in the database with our generated ID
    console.log('Creating user record in database with ID:', generatedUserId);
    
    // Create user record with our generated UUID
    const userData = {
      id: generatedUserId,
      email,
      name,
      phone,
      role,
      role_id: roleId,
      first_name: firstName,
      last_name: lastName,
      is_email_verified: true,
      auth_linked: false  // This user isn't linked to auth system
    };
    
    // Insert the user record directly
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select('id, name, email, role')
      .single();
    
    if (userError) {
      console.error('Error creating/updating user record:', userError);
      throw userError;
    }
    
    console.log('User record created/updated successfully:', userRecord.id);
    
    // For treasurer role, create a treasury wallet
    let hasCustody = false;
    let custodyId = null;
    let treasuryWallet = null;
    
    if (role === 'treasurer') {
      try {
        console.log('Creating treasury wallet for treasurer user...', name);
        // Import the createTreasuryWallet function directly
        const { createTreasuryWallet } = await import('./supabase/tables/wallet_custody_helpers');
        
        // Create treasury wallet with user's name
        treasuryWallet = await createTreasuryWallet(generatedUserId, name);
        
        if (treasuryWallet) {
          console.log('Treasury wallet created successfully:', treasuryWallet.id);
          hasCustody = true;
        }
      } catch (treasuryError) {
        console.error('Failed to create treasury wallet:', treasuryError);
        // Non-critical error, continue with user creation
      }
    } else if (role === 'cashier' || role === 'manager') {
      try {
        console.log(`Setting up initial custody for ${role}...`);
        
        // First, get the default currency code (USD)
        const { data: currencies, error: currencyError } = await supabase
          .from('currency_types')
          .select('code')
          .eq('code', 'USD')
          .single();
          
        if (currencyError) {
          console.error('Failed to get default currency:', currencyError);
          throw currencyError;
        }
        
        const currencyCode = currencies ? currencies.code : 'USD';
        
        // Create a custody record for the cashier
        const { data: custody, error: custodyError } = await supabase
          .from('custody')
          .insert({
            user_id: generatedUserId,
            currency_code: currencyCode,
            amount: 0
            // updated_at will be set automatically by default
          })
          .select('id')
          .single();
        
        if (custodyError) {
          console.error('Failed to create custody record:', custodyError);
          throw custodyError;
        }
        
        custodyId = custody.id;
        hasCustody = true;
        
        // Update the user record with the custody ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            has_custody: true, 
            custody_id: custodyId 
          })
          .eq('id', generatedUserId);
          
        if (updateError) {
          console.error('Failed to update user with custody ID:', updateError);
          throw updateError;
        }
        
        console.log('Custody setup completed successfully with ID:', custodyId);
      } catch (custodyError) {
        console.error('Failed to set up custody, but user was created:', custodyError);
        // Non-critical error, continue with user creation
      }
    }
    
    console.log('User created successfully, manager should remain logged in.');
    
    // Format and return the user data
    const formattedUser = {
      id: generatedUserId,
      name,
      email,
      phone,
      role,
      firstName,
      lastName,
      hasCustody,
      custodyId,
      treasuryWallet: treasuryWallet ? {
        id: treasuryWallet.id,
        name: treasuryWallet.name
      } : null,
      needsEmailVerification: false,
      authLinked: false
    };
    
    return {
      user: formattedUser,
      message: 'User created successfully.'
    };
    
  } catch (error) {
    console.error('Error creating user:', error);
    
    try {
      console.error('Error details:', JSON.stringify(error, null, 2));
    } catch (e) {
      console.error('Could not stringify error:', e);
    }
    
    // Handle specific error cases
    if (error.message?.includes('already registered') || 
        error.message?.includes('already in use') ||
        (error.code === '23505')) {
      throw new Error('This email is already registered');
    }
    
    if (error.message?.includes('network') || 
        error.message?.includes('connection')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // For authentication 500 errors, provide a more specific message
    if (error.status === 500 && error.message?.includes('auth')) {
      throw new Error('Authentication service error. Please try again later or contact support.');
    }
    
    // Use our error formatter for other cases
    throw new Error(formatErrorMessage(error));
  }
}

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, phone')
    .order('name', { ascending: true })
    
  if (error) throw error
  return { users: data }
}

export async function updateUser(id, payload) {
  const { name, role, phone } = payload
  
  const { data, error } = await supabase
    .from('users')
    .update({ name, role, phone })
    .eq('id', id)
    .select('id, name, email, role, phone')
    .single()
    
  if (error) throw error
  return { user: data }
}

// Operations
export async function getOperations() {
  const { data, error } = await supabase
    .from('operations')
    .select('id, name')
    .order('name', { ascending: true })
    
  if (error) throw error
  return { operations: data }
}

export async function createOperation(payload) {
  const { name } = payload
  
  try {
    // Use prepareNewEntity to add UUID and created_at
    const operationData = prepareNewEntity({ name });
    
    const { data, error } = await supabase
      .from('operations')
      .insert(operationData)
      .select('id, name')
      .single()
      
    if (error) throw error
    return { operation: data }
  } catch (error) {
    console.error('Error creating operation:', error);
    throw new Error(formatErrorMessage(error));
  }
}

// Transaction functions
export async function getTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, dinarprice, walletid')
    .order('id', { ascending: false })
    
  if (error) throw error
  return { transactions: data }
}

export async function createTransaction(payload) {
  const { 
    type,
    amount,
    dinarPrice,
    walletId
  } = payload
  
  try {    
    // Make sure we're using the exact field names from the schema
    const transactionData = {
      id: generateUUID(),
      type, 
      dinarprice: dinarPrice,
      walletid: walletId
      // Removed createdAt as per requirement
    };
    
    console.log('Creating transaction with data:', transactionData)
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single()
      
    if (error) throw error
    return { transaction: data }
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw new Error(formatErrorMessage(error));
  }
}
