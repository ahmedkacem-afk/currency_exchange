import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { getAllRoles } from '../lib/api';

/**
 * Role selector component for user forms
 * @param {Object} props - Component props
 * @param {string} props.userId - User ID whose role is being selected
 * @param {string} props.currentRoleId - Current role ID of the user
 * @param {Function} props.onRoleChange - Function called when role changes (receives roleId)
 * @param {string} [props.label] - Optional label for the selector
 * @param {boolean} [props.required] - Whether the field is required
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.forceRefresh] - Whether to force refresh the roles list
 */
function RoleSelector({ userId, currentRoleId, onRoleChange, label, required = false, className = '', forceRefresh = false }) {
  const { t } = useI18n();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const baseClasses = "w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition";
  const classes = `${baseClasses} ${className}`;
  
  // Get the default label if not provided
  const fieldLabel = label || t('create.role', 'Role');
  
  // Function to trigger a manual refresh of roles
  const refreshRoles = useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1);
  }, []);
  
  useEffect(() => {
    async function loadRoles() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('RoleSelector: Fetching roles from database...');
        const rolesData = await getAllRoles();
        console.log('RoleSelector: Received roles data:', rolesData);
        
        // Check if we got valid roles data
        if (Array.isArray(rolesData) && rolesData.length > 0) {
          console.log(`RoleSelector: Found ${rolesData.length} roles in database:`, 
            rolesData.map(r => r.name).join(', '));
          
          // Ensure each role has an id (use name as id if not present)
          const processedRoles = rolesData.map(role => ({
            ...role,
            id: role.id || role.name
          }));
          
          setRoles(processedRoles);
          
          // Log the current role ID for debugging
          console.log(`RoleSelector for user ${userId}: Current role ID = ${currentRoleId}`);
          
          // If no role is selected and we're required to have one, select the first by default
          if (required && !currentRoleId && processedRoles.length > 0 && typeof onRoleChange === 'function') {
            console.log(`RoleSelector: Auto-selecting first role: ${processedRoles[0].name} with ID ${processedRoles[0].id}`);
            onRoleChange(processedRoles[0].id);
          }
        } else {
          // If no roles returned, display error but don't fall back to static roles
          console.error('RoleSelector: No roles found in database. Please run fix:roles script.');
          setError('No roles found in database. Please make sure the roles table exists and is populated.');
          setRoles([]);
        }
      } catch (err) {
        console.error('RoleSelector: Failed to load roles:', err);
        setError(`Failed to load roles: ${err.message}. Please make sure the roles table exists and is properly configured.`);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadRoles();
  }, [userId, currentRoleId, onRoleChange, required, refreshKey, forceRefresh]);

  // Add warning UI to indicate when roles are missing
  const missingRoles = roles.length === 0 && !loading;
  
  return (
    <div>
      <div className="flex justify-between items-center">
        <label className="block text-sm mb-1">
          {fieldLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {missingRoles && (
          <button 
            type="button"
            onClick={refreshRoles}
            className="text-xs text-blue-600 hover:underline ml-2"
          >
            {t('common.refresh')}
          </button>
        )}
      </div>
      
      <select
        value={currentRoleId || ''}
        onChange={e => typeof onRoleChange === 'function' ? onRoleChange(e.target.value) : console.warn('RoleSelector: onRoleChange is not a function')}
        className={`${classes} ${missingRoles ? 'border-red-500' : ''}`}
        required={required}
        disabled={loading}
      >
        <option value="">{t('roles.selectRole')}</option>
        {loading ? (
          <option value="" disabled>{t('roles.loadingRoles')}</option>
        ) : roles.length === 0 ? (
          <option value="" disabled>{t('roles.noRolesAvailable')}</option>
        ) : (
          roles.map(role => (
            <option key={role.id} value={role.id}>
              {t(`roles.${role.name}`, role.name.charAt(0).toUpperCase() + role.name.slice(1))}
            </option>
          ))
        )}
      </select>
      
      {error && (
        <div className="text-red-500 text-xs mt-1">
          {error}
          <div className="mt-1">
            <span className="font-semibold">{t('roles.solution')}:</span> {t('roles.runFixRoles')}
          </div>
        </div>
      )}
      
      {missingRoles && !error && (
        <div className="text-orange-500 text-xs mt-1">
          {t('roles.noRolesInDatabase')}
          <div>
            {t('roles.runFixRolesToCreate')}
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleSelector;
