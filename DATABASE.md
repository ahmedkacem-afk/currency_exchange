# Database Schema Documentation

This document describes the database schema used by the Currency Exchange Manager application and explains how the application handles both legacy and new data structures.

## Table Overview

The application uses the following tables:

1. `wallets` - Stores wallet information with legacy USD and LYD fields
2. `wallet_currencies` - Stores all currencies for wallets in a flexible structure
3. `currency_types` - Stores information about available currency types
4. `manager_prices` - Stores buy/sell prices for the manager
5. `transactions` - Records of all transactions
6. `users` - User accounts and authentication

## Dual Format Support

The application is designed to work with both legacy and new data formats:

### Legacy Format:
- Wallets stored USD and LYD directly as columns in the `wallets` table
- Only USD and LYD currencies were supported

### New Multi-Currency Format:
- All currencies (including USD and LYD) are stored in the `wallet_currencies` table
- Each wallet can have multiple currencies
- Currency types are defined in the `currency_types` table

## Table Schemas

### `wallets`
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT,
  usd NUMERIC,
  lyd NUMERIC,
  currencies JSONB
);
```

### `wallet_currencies`
```sql
CREATE TABLE wallet_currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  wallet_id UUID,
  currency_code TEXT,
  balance NUMERIC
);
```

### `currency_types`
```sql
CREATE TABLE currency_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  code TEXT,
  name TEXT,
  symbol TEXT
);
```

### `manager_prices`
```sql
CREATE TABLE manager_prices (
  id INT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sellold TEXT,
  sellnew TEXT,
  buyold TEXT,
  buynew TEXT,
  sellDisabled BOOLEAN,
  buyDisabled BOOLEAN
);
```

*Note: The manager_prices table supports both camelCase (sellOld, buyOld) and lowercase (sellold, buyold) field names for backward compatibility.*

### `transactions`
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  wallet_id UUID,
  currency_code TEXT,
  amount NUMERIC,
  type TEXT,
  reason TEXT,
  metadata JSONB
);
```

## How the Application Handles Both Formats

### Wallet Balances

The application checks both places for balances:

1. First looks at legacy fields (`wallet.usd`, `wallet.lyd`)
2. Then looks at the `wallet_currencies` table for additional currencies
3. Combines them into a single `currencies` object for consistent access

Example:
```javascript
const walletsWithCurrencies = wallets.map(wallet => {
  const currencies = {};
  
  // Add USD and LYD from the legacy fields
  if (wallet.usd !== null && wallet.usd !== undefined) {
    currencies.USD = Number(wallet.usd);
  }
  
  if (wallet.lyd !== null && wallet.lyd !== undefined) {
    currencies.LYD = Number(wallet.lyd);
  }
  
  return {
    ...wallet,
    currencies
  };
});

// Add additional currencies from wallet_currencies table
if (walletCurrencies && walletCurrencies.length > 0) {
  walletsWithCurrencies.forEach(wallet => {
    walletCurrencies
      .filter(c => c.wallet_id === wallet.id)
      .forEach(c => {
        // Don't override legacy fields
        if ((c.currency_code === 'USD' && wallet.usd !== undefined) ||
            (c.currency_code === 'LYD' && wallet.lyd !== undefined)) {
          return;
        }
        wallet.currencies[c.currency_code] = Number(c.balance);
      });
  });
}
```

### Manager Prices

The application supports both camelCase and lowercase field names:

1. Tries to get prices with camelCase fields first
2. If that fails, tries with lowercase fields
3. When saving, checks which format exists and updates accordingly

Example:
```javascript
// Try camelCase fields
const { data: camelCaseData, error: camelCaseError } = await supabase
  .from('manager_prices')
  .select('id, "sellOld", "sellNew", "buyOld", "buyNew"')
  .single();
  
if (!camelCaseError && camelCaseData) {
  return {
    sellold: camelCaseData.sellOld,
    sellnew: camelCaseData.sellNew,
    buyold: camelCaseData.buyOld,
    buynew: camelCaseData.buyNew
  };
}

// Try lowercase fields
const { data: lowercaseData, error: lowercaseError } = await supabase
  .from('manager_prices')
  .select('id, sellold, sellnew, buyold, buynew')
  .single();
  
if (!lowercaseError && lowercaseData) {
  return lowercaseData;
}
```

## Database Migration Process

The application handles database migrations automatically:

1. `schema-manager.js` checks if required tables exist and creates them if needed
2. `migrations.js` runs specific migrations for handling schema changes
3. Migrations are run at application startup

## Adding New Currencies

The application allows adding new currencies to wallets:

1. User selects a wallet and clicks "Add Currency"
2. User selects a currency type and enters an initial balance
3. The application adds a record to the `wallet_currencies` table
4. The wallet UI updates to show the new currency

## Future Schema Improvements

In a future version, we could:

1. Remove the legacy `usd` and `lyd` fields from the `wallets` table
2. Migrate all existing balances to the `wallet_currencies` table
3. Add more functionality for currency rate management
4. Implement automatic currency conversion