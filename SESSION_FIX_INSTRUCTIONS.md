# How to Fix Session Issues with shouldCreateUser Option

Your file already has the `shouldCreateUser: false` option, but it includes a `data` field that you may not need. To simplify it as requested, follow these steps:

## Changes Needed

Find this code in your supabaseApi.js file:

```javascript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      full_name: name
    },
    emailRedirectTo: null,
    shouldCreateUser: false // Don't create auth user automatically (prevent session change)
  }
});
```

And replace it with:

```javascript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    emailRedirectTo: null,
    shouldCreateUser: false // This prevents session changes
  }
});
```

## Important Notes

1. This modification needs to be made in all places where you're using `auth.signUp` in the file.
2. Your file appears to have some structural or duplicate issues that make automated editing difficult.
3. The key part is to make sure the `shouldCreateUser: false` option is included.

## Testing

After making these changes, you should test that:
1. New users can be created without affecting your admin session
2. Your session remains active and you don't get logged out during user creation

If you continue to experience issues, let me know and we can explore other approaches.