import { supabase } from './src/lib/supabase.js';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'manager@example.com',
      password: 'password123',
      options: {
        data: {
          name: 'Test Manager'
        }
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }
    
    console.log('Auth user created:', authData.user.id);
    
    // Create user profile in 'users' table
    if (authData?.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: 'manager@example.com',
            name: 'Test Manager',
            role: 'admin', // Give them admin role
            created_at: new Date().toISOString(),
          }
        ]);
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return;
      }
      
      console.log('User profile created successfully');
    }
    
    console.log('Test user creation completed successfully');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestUser();
