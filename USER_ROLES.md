# User Role System

This role system implements role-based access control with four specific roles:

1. **Manager** - Has access to all system features and can manage users
2. **Treasurer** - Manages cash custody and treasury operations
3. **Cashier** - Handles currency exchange transactions and cash custody
4. **Dealings Executioner** - Executes currency dealings and operations

## How Roles Work

- The `manager` role has access to everything in the system
- Each user can have only one role at a time
- The first user in the system is automatically assigned the `manager` role
- Only managers can assign roles to other users

## Database Structure

The role system uses the following tables:

- `roles` - Defines the available roles
- `profiles` - Links users to roles with a `role_id` field

## Permissions

- Row-level security (RLS) policies control access to data
- Managers can view and modify all data
- Other roles have specific permissions based on their function

## Running the Migration

To set up the role system in your database, use the general migration tool:

```bash
npm run migrate
```

Or run the migrations directly:

```bash
node run-migrations-enhanced.js
```

This will:
1. Create the `roles` table if it doesn't exist
2. Insert the four default roles
3. Add a `role_id` column to the `profiles` table
4. Set up RLS policies for security
5. Create helper functions for role management

## Frontend Integration

The role system is integrated with the application's authentication context:

```jsx
// Check if a user has a specific role
const { hasRole } = useAuth();
if (hasRole(['manager', 'treasurer'])) {
  // User has either manager or treasurer role
}
```

## Protected Routes

The application uses a role-based route protection system to restrict access to specific features based on user roles. Routes are grouped by access level:

### Public Routes (Accessible Without Login)
- `/login` - User authentication page (redirects to dashboard if already logged in)
- `/register` - New user registration
- `/reset-password` - Password recovery flow
- `/unauthorized` - Access denied page
- `/treasurer-demo` - Demo page for treasurer features

### Authenticated User Routes (Any Role)
```jsx
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<DashboardPage />} />
  <Route path="/withdrawals" element={<WithdrawalsPage />} />
  <Route path="/update-password" element={<UpdatePasswordPage />} />
  <Route path="/role-debug" element={<RoleSystemDebug />} />
</Route>
```

### Manager-Only Routes
```jsx
<Route element={<ProtectedRoute requiredRoles={["manager"]} />}>
  <Route path="/create" element={<CreateEntitiesPage />} />
  <Route path="/user-management" element={<UserManagement />} />
</Route>
```

### Cashier Routes (Accessible by Manager and Cashier)
```jsx
<Route element={<ProtectedRoute requiredRoles={["manager", "cashier"]} />}>
  <Route path="/cashier" element={<CashierPage />} />
  <Route path="/cashier/buy" element={<BuyCurrencyPage />} />
  <Route path="/cashier/sell" element={<SellCurrencyPage />} />
</Route>
```

### Treasurer Routes (Accessible by Manager and Treasurer)
```jsx
<Route element={<ProtectedRoute requiredRoles={["manager", "treasurer"]} />}>
  <Route path="/treasurer" element={<TreasurerPage />} />
  <Route path="/custody-management" element={<CustodyManagement />} />
  <Route path="/give-custody" element={<GiveCustody />} />
</Route>
```

### Dealings Executioner Routes (Accessible by Manager and Dealings Executioner)
```jsx
<Route element={<ProtectedRoute requiredRoles={["manager", "dealings_executioner"]} />}>
  <Route path="/dealership-executioner" element={<DealershipExecutionerPage />} />
  <Route path="/debt-management" element={<DebtManagementPage />} />
</Route>
```

## User Management

Managers can assign roles to users through the User Management interface at `/user-management`. Only users with the manager role can access this page and modify user roles.

## Debugging Role Issues

### Role Debug Page

The application includes a dedicated debugging page at `/role-debug` that helps diagnose role-related issues:

- Shows current user's profile information
- Displays role assignment details
- Verifies database permissions
- Tests role checking functions

This page is accessible to all authenticated users to help troubleshoot permission problems.

### Common Role Issues and Solutions

1. **"User role null not in required roles"**
   - Cause: User's profile doesn't have a valid role_id or the role isn't being properly loaded
   - Solution: Check the user's profile in the database and ensure the role_id is set correctly

2. **Infinite Recursion in Policies**
   - Cause: Row Level Security (RLS) policies creating circular references
   - Solution: Run the policy fix script:
     ```bash
     node fix-policy-recursion.js
     ```

3. **Permission Denied Errors**
   - Cause: Insufficient database permissions for the current user role
   - Solution: Verify that the RLS policies are correctly set up for each role

### Fixing Infinite Recursion in Database Policies

The most common serious issue with the role system is infinite recursion in Row Level Security (RLS) policies. This happens when policies reference each other in a circular way.

To fix this issue, run the following SQL queries in your Supabase SQL Editor:

- Creates a `manager_ids` view to avoid recursion
- Replaces problematic policies with optimized versions
- Updates the profiles table policies to use the view
- Resets other affected policies

After running the script, the error "infinite recursion detected in policy for relation 'profiles'" should be resolved.

### Diagnostic Steps

To diagnose role-related issues, check the following in your database:

1. Verify role assignments in the database:
   ```sql
   SELECT p.id, p.user_id, p.role_id, r.name as role_name
   FROM profiles p
   LEFT JOIN roles r ON p.role_id = r.id;
   ```

2. Check that Row Level Security policies are properly configured:
   ```sql
   SELECT tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

3. Ensure the manager_ids view exists:
   ```sql
   CREATE OR REPLACE VIEW manager_ids AS
   SELECT user_id FROM profiles 
   JOIN roles ON profiles.role_id = roles.id 
   WHERE roles.name = 'manager';
   ```

### Console Debugging

When troubleshooting role issues, enable detailed console logging by adding this to your browser console:

```javascript
localStorage.setItem('DEBUG_AUTH', 'true');
```

This will provide detailed information about:
- User authentication state
- Role checking operations
- Protected route access decisions
- Profile loading issues

## Implementing Role Checks in Custom Components

You can use the role system to conditionally render UI elements based on user roles:

### Basic Role Check

```jsx
import { useAuth } from '../lib/AuthContext';

function MyComponent() {
  const { hasRole } = useAuth();
  
  return (
    <div>
      {hasRole(['manager']) && (
        <button className="bg-blue-500 text-white px-4 py-2">
          Manager Action
        </button>
      )}
    </div>
  );
}
```

### Role-Based UI Elements

```jsx
import { useAuth } from '../lib/AuthContext';

function NavigationMenu() {
  const { hasRole } = useAuth();
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      {/* Everyone sees this */}
      <a href="/">Dashboard</a>
      
      {/* Only managers see this */}
      {hasRole(['manager']) && (
        <a href="/user-management">User Management</a>
      )}
      
      {/* Treasurers and managers see this */}
      {hasRole(['treasurer', 'manager']) && (
        <a href="/treasury">Treasury Operations</a>
      )}
      
      {/* Cashiers and managers see this */}
      {hasRole(['cashier', 'manager']) && (
        <a href="/cashier">Currency Exchange</a>
      )}
    </nav>
  );
}
```

### Advanced Role-Based Logic

```jsx
import { useAuth } from '../lib/AuthContext';

function ActionButton({ action, requiredRoles = [], children }) {
  const { hasRole, user } = useAuth();
  
  // Only show if user has required role
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return null;
  }
  
  return (
    <button 
      onClick={() => action(user)}
      className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
    >
      {children}
    </button>
  );
}

// Usage:
<ActionButton 
  action={approveTransaction} 
  requiredRoles={['manager', 'treasurer']}
>
  Approve Transaction
</ActionButton>
```