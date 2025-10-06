/**
 * User and Profile Creation Guide
 * 
 * This document explains how user data is handled in the application
 * and clarifies the relationship between the auth.users system table 
 * and the custom profiles table.
 */

# User Data in the Application

The application uses Supabase for authentication and user management, which requires understanding 
how users and profiles work together.

## User Tables

There are two main tables that store user data:

1. **auth.users** (System Table)
   - Created and managed by Supabase Auth
   - Contains authentication information (email, password hash, etc.)
   - Cannot be directly modified through standard queries
   - Referenced by user_id in the profiles table

2. **profiles** (Application Table)
   - Custom table created by our application
   - Links to auth.users via user_id foreign key
   - Stores user profile information and role_id
   - Used for role-based access control

## How User Creation Works

When a user signs up:

1. Supabase creates an entry in auth.users with authentication details
2. Our trigger function handle_new_user() automatically creates a profile
3. The first user gets the manager role; other users get no role by default

## Role Assignment

- User roles are stored in the profiles table as role_id
- Only managers can assign roles to other users
- Roles define what parts of the application a user can access

## Accessing User Information

To get complete user information, you need to:

1. Get the authentication details from Supabase Auth (session.user)
2. Get the profile information from the profiles table
3. Get the role details from the roles table using the role_id

## Common Mistakes

- **Don't query a "users" table** - It doesn't exist in our schema
- Always use the profiles table for user information
- Join with roles table to get role information

## Code Example

```javascript
// Getting complete user information
const { data: session } = await supabase.auth.getSession();
if (session?.user) {
  // Get profile with role information
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles:role_id(*)')
    .eq('user_id', session.user.id)
    .single();
    
  console.log('User:', {
    ...session.user,
    profile,
    role: profile?.roles?.name
  });
}
```

## Database Checks

If you're experiencing issues with the role system, check:

1. That profiles table exists and has role_id column
2. That roles table exists and has the correct roles
3. That users have profiles with valid role_id values

Run this query to check the setup:

```sql
SELECT 
  auth.users.email,
  profiles.id as profile_id,
  profiles.role_id,
  roles.name as role_name
FROM
  auth.users
LEFT JOIN
  profiles ON auth.users.id = profiles.user_id
LEFT JOIN
  roles ON profiles.role_id = roles.id;
```