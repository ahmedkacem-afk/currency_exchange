import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import RoleSelector from '../components/RoleSelector';
import { getAllRoles, getUserRole } from '../lib/api';
import { supabase } from '../lib/supabase';

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

  // Load users and roles
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load all available roles
        const rolesData = await getAllRoles();
        setRoles(rolesData || []);
        
        // Load users from users table
        const { data: usersData, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // For each user, get their role
        const usersWithRoles = await Promise.all(
          (usersData || []).map(async (user) => {
            try {
              const role = await getUserRole(user.id);
              return {
                ...user,
                role
              };
            } catch (err) {
              console.error(`Error getting role for user ${user.id}:`, err);
              return {
                ...user,
                role: null
              };
            }
          })
        );
        
        setUsers(usersWithRoles);
      } catch (error) {
        console.error('Error loading users:', error);
        show({
          type: 'error',
          title: 'Failed to Load',
          message: 'Could not load users. ' + error.message
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
      // Update the user's role in the state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                role_id: roleId,
                role: roles.find(r => r.id === roleId) || null
              } 
            : user
        )
      );
      
      // Show success message
      show({
        type: 'success',
        title: 'Role Updated',
        message: 'User role has been updated successfully'
      });
    } catch (error) {
      console.error('Error updating role:', error);
      show({
        type: 'error',
        title: 'Failed to Update Role',
        message: error.message
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Users</h2>
            
            {loading ? (
              <div className="text-gray-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-gray-500">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Email</th>
                      <th className="py-2 px-4 border-b text-left">Name</th>
                      <th className="py-2 px-4 border-b text-left">Current Role</th>
                      <th className="py-2 px-4 border-b text-left">Assign Role</th>
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
                          {user.role?.name ? (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {user.role.name.charAt(0).toUpperCase() + user.role.name.slice(1)}
                            </span>
                          ) : (
                            <span className="text-gray-500">No role assigned</span>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <RoleSelector
                            userId={user.id}
                            currentRoleId={user.role_id}
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
    </Layout>
  );
}