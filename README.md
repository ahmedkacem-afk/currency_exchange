# Currency Exchange Manager

A multi-currency exchange management system built with React, Vite, and Supabase.

## Features

- **Multi-Currency Support**: Manage any number of currencies beyond just USD and LYD
- **Wallet Management**: Create and manage wallets with multiple currencies
- **Price Management**: Set buying and selling prices for currency exchange
- **Withdrawals**: Process withdrawals from wallets with detailed tracking
- **User Authentication**: Secure login system with role-based access
- **Reports**: Generate reports on transactions and balances
- **Responsive Design**: Works on desktop and mobile devices

## New Multi-Currency Support

This application now supports multiple currencies beyond just USD and LYD. You can:

- Add any currency to a wallet
- View total balances for each currency across all wallets
- Withdraw any currency from wallets
- Track transactions for all currencies

For more details on the database schema and how multi-currency support works, see [DATABASE.md](./DATABASE.md).

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Supabase account and project

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Database Setup

The application will automatically:

1. Check if all required tables exist
2. Create missing tables if needed
3. Run any pending migrations
4. Set up default currency types

You can see the database schema and migration details in [DATABASE.md](./DATABASE.md).

## Usage

### Managing Currencies

1. Go to the Dashboard
2. Select a wallet from the dropdown
3. Click "Add Currency" to add a new currency to the wallet
4. Enter the initial balance and select the currency type

### Setting Manager Prices

1. Go to the Dashboard
2. Scroll down to the Manager Prices section
3. Update the buying and selling prices
4. Click "Save Prices" to save changes

### Processing Withdrawals

1. Go to the Withdrawals page
2. Select a wallet
3. Choose the currency you want to withdraw
4. Enter the amount and reason
5. Click "Confirm Withdraw" to process

### Creating Entities

1. Go to the Create Entities page
2. Fill in the form to create a new wallet, user, or operation
3. Click "Create" to save

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.