import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import RoleSelector from '../components/RoleSelector';
import { getAllRoles, getUserRole } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useI18n } from '../i18n/I18nProvider';

/**
 * UserManagement Component
 * 
 * Allows managers to manage users and their roles
 */
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const { show } = useToast();
  const { t } = useI18n();

  // Load users and roles
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load all available roles
        const rolesData = await getAllRoles();
        setRoles(rolesData || []);
        
        // Load users from users table with joined role data
        const { data: usersData, error } = await supabase
          .from('users')
          .select('*, role:role_id(*)')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Process users to ensure consistent role format
        const usersWithRoles = (usersData || []).map(user => {
          // Handle case where user has direct role property
          if (user.role && typeof user.role === 'string') {
            return {
              ...user,
              role: {
                id: null,
                name: user.role
              }
            };
          }
          
          // Handle case where role is from joined table but might be null
          if (!user.role && user.role_id) {
            // We have role_id but no joined role data, look for it in roles list
            const matchingRole = roles.find(r => r.id === user.role_id);
            if (matchingRole) {
              return {
                ...user,
                role: matchingRole
              };
            }
          }
          
          // Return user as is if already has proper role structure or no role
          return user;
        });
        
        setUsers(usersWithRoles);
      } catch (error) {
        console.error('Error loading users:', error);
        show({
          type: 'error',
          title: t('userManagement.failedToLoad'),
          message: t('userManagement.couldNotLoadUsers') + ': ' + error.message
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [show]);

  // Handle role change for a user
  const handleRoleChange = async (userId, roleId) => {
    try {
      // First, update the role in the database
      const { data, error } = await supabase
        .from('users')
        .update({ role_id: roleId })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Get the role object for the selected role ID
      const selectedRole = roles.find(r => r.id === roleId);
      
      // Update the user's role in the state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                role_id: roleId,
                role: selectedRole || null
              } 
            : user
        )
      );
      
      // Show success message
      show({
        type: 'success',
        title: t('userManagement.roleUpdated'),
        message: t('userManagement.roleUpdateSuccess')
      });
    } catch (error) {
      console.error('Error updating role:', error);
      show({
        type: 'error',
        title: t('userManagement.roleUpdateFailed'),
        message: error.message
      });
    }
  };

  return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{t('userManagement.title')}</h1>
        
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('userManagement.users')}</h2>
            
            {loading ? (
              <div className="text-gray-500">{t('userManagement.loadingUsers')}</div>
            ) : users.length === 0 ? (
              <div className="text-gray-500">{t('userManagement.noUsersFound')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">{t('userManagement.email')}</th>
                      <th className="py-2 px-4 border-b text-left">{t('userManagement.name')}</th>
                      <th className="py-2 px-4 border-b text-left">{t('userManagement.currentRole')}</th>
                      <th className="py-2 px-4 border-b text-left">{t('userManagement.assignRole')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="py-2 px-4 border-b">
                          {user.email}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {user.role?.name || user.role || (user.role_id ? `Role ID: ${user.role_id}` : null) ? (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {/* Handle different possible formats of role data */}
                              {typeof user.role === 'string' 
                                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                                : user.role?.name 
                                  ? user.role.name.charAt(0).toUpperCase() + user.role.name.slice(1)
                                  : user.role_id 
                                    ? `Role ID: ${user.role_id}`
                                    : 'Unknown'
                              }
                            </span>
                          ) : (
                            <span className="text-gray-500">{t('userManagement.noRoleAssigned')}</span>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <RoleSelector
                            userId={user.id}
                            currentRoleId={user.role_id || (typeof user.role === 'object' ? user.role?.id : null)}
                            onRoleChange={(roleId) => handleRoleChange(user.id, roleId)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
  );
}