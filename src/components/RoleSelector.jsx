import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { getAllRoles } from '../lib/api';

/**
 * Role selector component for user forms
 * @param {Object} props - Component props
 * @param {string} props.value - Selected role value
 * @param {Function} props.onChange - Change handler function
 * @param {string} [props.label] - Optional label for the selector
 * @param {boolean} [props.required] - Whether the field is required
 * @param {string} [props.className] - Additional CSS classes
 */
function RoleSelector({ value, onChange, label, required = false, className = '' }) {
  const { t } = useI18n();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const baseClasses = "w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition";
  const classes = `${baseClasses} ${className}`;
  
  // Get the default label if not provided
  const fieldLabel = label || t('create.role', 'Role');
  
  useEffect(() => {
    async function loadRoles() {
      setLoading(true);
      try {
        const rolesData = await getAllRoles();
        setRoles(rolesData);
        
        // If no value is selected and we have roles, select the first one by default
        if (!value && rolesData.length > 0) {
          onChange(rolesData[0].name);
        }
      } catch (err) {
        console.error('Failed to load roles:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadRoles();
  }, [onChange, value]);
  
  return (
    <div>
      <label className="block text-sm mb-1">
        {fieldLabel}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={classes}
        required={required}
        disabled={loading}
      >
        {loading ? (
          <option value="">Loading roles...</option>
        ) : error ? (
          <option value="">Error loading roles</option>
        ) : roles.length === 0 ? (
          <option value="">No roles available</option>
        ) : (
          roles.map(role => (
            <option key={role.id} value={role.name}>
              {t(`roles.${role.name}`, role.name.charAt(0).toUpperCase() + role.name.slice(1))}
            </option>
          ))
        )}
      </select>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}

export default RoleSelector;
