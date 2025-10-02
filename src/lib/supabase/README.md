# Supabase Integration

This directory contains a well-organized integration with Supabase for the Currency Exchange application.

## Directory Structure

```
supabase/
├── client.js           # Core Supabase client initialization
├── auth.js             # Authentication-related functions
├── index.js            # Main entry point that re-exports all modules
├── hooks/              # React hooks for Supabase functionality
│   ├── useAuth.js      # Authentication hook
│   ├── useWallets.js   # Hooks for wallet data
│   ├── useTransactions.js  # Hooks for transaction data
│   └── useManagerPrices.js # Hook for manager prices
├── tables/             # Database table operations
│   ├── users.js        # User-related database operations
│   ├── wallets.js      # Wallet-related database operations
│   ├── transactions.js # Transaction-related database operations
│   └── manager_prices.js # Manager prices operations
└── utils/              # Utility functions
    └── validation.js   # Validation and error handling utilities
```

## Usage

### Basic Import

Import the Supabase client and any needed functions:

```javascript
import { supabase, signIn, signOut } from '../lib/supabase';
```

### React Hooks

Use the provided React hooks in your components:

```javascript
import { useAuth, useWallets, useTransactions } from '../lib/supabase';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { wallets, loading, createWallet } = useWallets();
  
  // Use the hooks in your component...
}
```

### Direct Database Operations

If you need direct access to the table operations:

```javascript
import { createWallet, getTransactionsByWallet } from '../lib/supabase';

// Then use these functions directly
const result = await createWallet({ name: 'My Wallet' });
```

## Authentication Flow

1. Use the `useAuth` hook to access authentication state and functions
2. Call the `login` function to authenticate users
3. Access the authenticated user via `user` and `profile` properties
4. Check `isAuthenticated` to conditionally render content
5. Call `logout` to sign out

## Error Handling

All API functions include proper error handling and will throw formatted errors that can be caught in try/catch blocks.

```javascript
try {
  await createWallet({ name: 'My Wallet' });
} catch (error) {
  console.error('Failed to create wallet:', error.message);
}
```

## Migrations

For database schema changes, refer to the `/migrations` folder at the project root.