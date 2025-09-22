import React from 'react';
import { useI18n } from '../i18n/I18nProvider';

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
  
  const baseClasses = "w-full border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-2 outline-none transition";
  const classes = `${baseClasses} ${className}`;
  
  // Get the default label if not provided
  const fieldLabel = label || t('create.role', 'Role');
  
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
      >
        <option value="user">{t('roles.user', 'User')}</option>
        <option value="manager">{t('roles.manager', 'Manager')}</option>
        <option value="admin">{t('roles.admin', 'Administrator')}</option>
      </select>
    </div>
  );
}

export default RoleSelector;
