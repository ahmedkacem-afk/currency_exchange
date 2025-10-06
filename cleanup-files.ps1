# PowerShell Script to safely remove unnecessary files
# This script will remove one-time scripts, test files, and debugging tools
# that are no longer needed for the application to function

# Create a backup directory for removed files
$backupDir = ".\removed-files-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force

# Function to move a file to the backup directory
function Backup-AndRemove($filePath) {
    if (Test-Path $filePath) {
        $targetPath = Join-Path $backupDir (Split-Path $filePath -Leaf)
        Write-Host "Moving $filePath to $targetPath"
        Move-Item -Path $filePath -Destination $targetPath
    } else {
        Write-Host "File not found: $filePath" -ForegroundColor Yellow
    }
}

Write-Host "Backing up and removing one-time scripts..." -ForegroundColor Green

# Test scripts - no longer needed after initial testing
Backup-AndRemove ".\test-cash-custody-insert.js"
Backup-AndRemove ".\test-entity-creation.js"
Backup-AndRemove ".\test-minimal-notification.js"
Backup-AndRemove ".\test-notification-payload.js"
Backup-AndRemove ".\test-role-system.js"
Backup-AndRemove ".\test-uuid.js"

# Check/Verification scripts - used once to verify functionality
Backup-AndRemove ".\check-jsonb-support.js"
Backup-AndRemove ".\check-wallets.js"
Backup-AndRemove ".\verify_jsonb_support.js"
Backup-AndRemove ".\verify_jsonb_support.sql"

# Debug scripts - only needed during development for debugging
Backup-AndRemove ".\debug-cash-custody.js"
Backup-AndRemove ".\diagnose-role-system.js"

# One-time fix scripts - already applied their fixes
Backup-AndRemove ".\add-action-payload-column-rest.js"
Backup-AndRemove ".\add-action-payload-column.js"
Backup-AndRemove ".\add-action-payload-manual.sql"
Backup-AndRemove ".\add-is-treasury-column.js"
Backup-AndRemove ".\cash-custody-fix-info.js"
Backup-AndRemove ".\create-test-user.js"
Backup-AndRemove ".\fix-cash-custody-queries.js"
Backup-AndRemove ".\fix-cash-custody.js"
Backup-AndRemove ".\fix-foreign-key-relationships-advanced.sql"
Backup-AndRemove ".\fix-foreign-key-relationships.sql"
Backup-AndRemove ".\fix-is-treasury-column.js"
Backup-AndRemove ".\fix-manager-prices.js"
Backup-AndRemove ".\fix-manager-prices.mjs"
Backup-AndRemove ".\fix-notifications-schema.js"
Backup-AndRemove ".\fix-policy-recursion.js"
Backup-AndRemove ".\fix-roles-migration.js"
Backup-AndRemove ".\fix-schema-manager.js"
Backup-AndRemove ".\fix-user-role.js"
Backup-AndRemove ".\schema-fix-functions.sql"

# Migration scripts that have already been run
# (Keeping run-migrations-enhanced.js because it's used in package.json scripts)
Backup-AndRemove ".\run-action-payload-migration.js"
Backup-AndRemove ".\run-cash-custody-migration.js"
Backup-AndRemove ".\run-user-roles-migration.js"
Backup-AndRemove ".\run-user-roles-migration-direct.js"
Backup-AndRemove ".\setup-roles-direct.js"

# Extra SQL files that have been applied
Backup-AndRemove ".\recreate_cash_custody_table.sql"

Write-Host "Done! All unnecessary files have been moved to: $backupDir" -ForegroundColor Green
Write-Host "If everything works correctly, you can delete the backup directory later."