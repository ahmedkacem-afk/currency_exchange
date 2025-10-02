# Supabase Integration Migration Guide

This guide helps you transition from the current flat structure to the new organized Supabase integration.

## Overview of Changes

1. **New Directory Structure**: All Supabase-related code is now organized in the `src/lib/supabase` directory
2. **Modular Files**: Code is split into logical modules by functionality
3. **React Hooks**: Added custom React hooks for common operations
4. **Improved Error Handling**: Consistent error handling across all API functions
5. **Simplified Imports**: A single entry point for easier imports

## Migration Steps

### Step 1: Update Import Statements

Replace imports from individual files with imports from the central module:

**Before:**
```javascript
import { supabase } from './lib/supabase';
import { getCurrentUser } from './lib/auth';
```

**After:**
```javascript
import { supabase, getCurrentUser } from './lib/supabase';
```

### Step 2: Replace Direct API Calls with Hooks

For React components, replace direct API calls with the provided hooks:

**Before:**
```javascript
import { getWallets, createWallet } from './lib/supabaseApi';

function MyComponent() {
  const [wallets, setWallets] = useState([]);
  
  useEffect(() => {
    async function fetchWallets() {
      const { wallets: data } = await getWallets();
      setWallets(data);
    }
    
    fetchWallets();
  }, []);
}
```

**After:**
```javascript
import { useWallets } from './lib/supabase';

function MyComponent() {
  const { wallets, loading, createWallet } = useWallets();
  
  // wallets are automatically fetched and kept in state
}
```

### Step 3: Update AuthContext Usage

Update the AuthContext.jsx file to use the new structure:

1. Replace the existing file with the new version provided
2. Update any imports that reference it

### Step 4: Update Error Handling

Use the improved error handling throughout your application:

**Before:**
```javascript
try {
  await createWallet(data);
} catch (error) {
  console.error('Error:', error);
}
```

**After:**
```javascript
try {
  await createWallet(data);
} catch (error) {
  console.error('Error creating wallet:', error.message);
  // The error will already be properly formatted
}
```

### Step 5: Remove Deprecated Files

After completing the migration, the following files can be removed:
- `src/lib/supabase.js` (replaced by `src/lib/supabase/client.js`)
- `src/lib/supabaseApi.js` (replaced by the tables/ directory)
- `src/lib/auth.js` (replaced by `src/lib/supabase/auth.js`)

## Benefits of New Structure

- **Maintainability**: Code is now organized by functionality, making it easier to find and modify
- **Testing**: Smaller, focused modules are easier to test
- **Reusability**: Custom hooks encapsulate common patterns for reuse
- **Consistency**: Standardized error handling and API patterns
- **Documentation**: Better documented code with clear function signatures

## Troubleshooting

If you encounter issues during migration:

1. Check import paths to ensure they point to the new structure
2. Verify that all function signatures match
3. Look for missing parameters in function calls
4. Check the console for any error messages

For any issues, refer to the README.md in the supabase directory for detailed documentation.