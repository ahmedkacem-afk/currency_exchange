# Using shouldCreateUser: false with Supabase Auth.signUp

## Overview

To create a user in Supabase Auth without automatically signing them in and affecting the current session, you can use the `shouldCreateUser: false` option in the `auth.signUp` method.

## Implementation

```javascript
await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    emailRedirectTo: null,
    shouldCreateUser: false // This is the key option that prevents session change
  }
});
```

## How It Works

1. The `shouldCreateUser: false` option tells Supabase Auth to create the auth user record without automatically creating a session for that user
2. This prevents any automatic login that would disrupt the current admin session
3. The created user can later sign in normally with their credentials
4. Your current admin session remains intact during the user creation process

## Complete Example

I've created two example files that demonstrate this approach:

1. `src/lib/auth-with-no-session-change.js` - A reusable module that implements this approach
2. `test-auth-signup.js` - A simple test file showing how to use the option directly

## Important Notes

- This approach may require proper configuration on your Supabase project
- If you continue experiencing session issues, consider:
  - Using admin API keys instead of user session tokens for user creation
  - Implementing a server-side solution to completely separate user creation from session management
  - Using a trigger-based approach where database records trigger auth user creation

Feel free to adapt these examples to your specific use case.