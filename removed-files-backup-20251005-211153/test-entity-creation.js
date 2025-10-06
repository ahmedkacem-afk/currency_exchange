// This script demonstrates how to create entities with UUIDs
import { supabase } from './src/lib/supabase.js';
import { generateUUID } from './src/lib/uuid.js';
import { prepareNewEntity } from './src/lib/entityHelpers.js';

// Test creating a user with auth integration
async function testCreateUserWithAuth() {
  try {
    console.log('Testing user creation with Auth...');
    
    const email = `test-${Math.floor(Math.random() * 10000)}@example.com`;
    const password = 'Password123!';
    
    // 1. Create user in auth
    console.log(`Creating auth user with email: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Test User',
          role: 'user'
        }
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }
    
    console.log('Auth user created successfully with ID:', authData.user.id);
    
    // 2. Create user profile with the same UUID
    if (authData?.user) {
      console.log('Creating user profile with the same ID...');
        const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: 'Test User',
          email,
          role: 'user'
          // Removed created_at field as per requirements
        })
        .select()
        .single();
      
      if (userError) {
        console.error('Error creating user profile:', userError);
        return;
      }
      
      console.log('User profile created successfully:', userData);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test creating an entity with a generated UUID
async function testCreateEntityWithUUID() {
  try {
    console.log('\nTesting entity creation with UUID...');
    
    const walletData = prepareNewEntity({
      name: `Test Wallet ${Math.floor(Math.random() * 10000)}`,
      usd: 1000,
      lyd: 5000
    });
    
    console.log('Prepared wallet data:', walletData);
    
    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert(walletData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating wallet:', error);
      return;
    }
    
    console.log('Wallet created successfully with generated UUID:', wallet);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
async function runTests() {
  await testCreateUserWithAuth();
  await testCreateEntityWithUUID();
  
  console.log('\nTests completed. Check the results above.');
}

runTests();
