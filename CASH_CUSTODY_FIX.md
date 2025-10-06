## Cash Custody Notification Fix

### Summary
We've completely removed the `action_payload` field from all notification objects to avoid the "Token 'cash_custody' is invalid" error. Instead, we now include all important information directly in the notification message field.

### Changes Made

1. **Removed `action_payload` Usage:**
   - Eliminated all usage of the `action_payload` field in database operations
   - Kept parameter in functions for backward compatibility but stopped using it
   
2. **Enhanced Message Content:**
   - Added all critical data that was previously in `action_payload` to the message text
   - This includes amount, currency code, and wallet ID information
   
3. **Simplified Code:**
   - Removed complex JSON handling and validation that was causing issues
   - Reduced error surface area by simplifying the database operations

4. **Backward Compatibility:**
   - Code still accepts `actionPayload` parameters but doesn't attempt to save them
   - UI should continue to function normally as it receives the same basic information

### Testing
You can test the fix by:
1. Running the application and submitting a cash custody request
2. Using the `test-minimal-notification.js` script to verify basic functionality
3. Checking the browser console for any remaining errors

### Next Steps
If you continue having issues, consider:
1. Removing the `action_payload` column from your database if you don't need it
2. Adding the column properly if you do need it using the SQL script provided earlier
3. Creating a proper migration that handles column existence checking before insert