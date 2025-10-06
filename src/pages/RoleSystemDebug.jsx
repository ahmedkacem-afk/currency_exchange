import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { getAllRoles, getUserRole, hasAnyRole } from '../lib/supabase/tables/roles';
import { supabase } from '../lib/supabase';

export default function RoleSystemDebug() {
  const { user, userRole } = useAuth();
  const [debugInfo, setDebugInfo] = useState({
    loading: true,
    roles: [],
    currentRole: null,
    roleChecks: {},
    profile: null,
    error: null
  });

  useEffect(() => {
    async function checkRoles() {
      try {
        // Only run tests if we have a user
        if (!user) {
          setDebugInfo(prev => ({
            ...prev,
            loading: false,
            error: 'No authenticated user'
          }));
          return;
        }

        // Get all roles
        const roles = await getAllRoles();
        
        // Get user's role from API
        const apiRole = await getUserRole(user.id);
        
        // Run role checks
        const roleChecks = {};
        for (const role of roles) {
          roleChecks[role.name] = await hasAnyRole([role.name], user.id);
        }
        
        // Get user data
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }
        
        setDebugInfo({
          loading: false,
          roles,
          currentRole: apiRole,
          roleChecks,
          profile,
          error: null
        });
      } catch (error) {
        console.error('Error in role debug:', error);
        setDebugInfo(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }
    
    checkRoles();
  }, [user]);
  
  // Force a role refresh
  const refreshRole = async () => {
    try {
      setDebugInfo(prev => ({ ...prev, loading: true }));
      
      // Get user's role from API
      const apiRole = await getUserRole(user.id);
      
      // Update state
      setDebugInfo(prev => ({
        ...prev,
        loading: false,
        currentRole: apiRole
      }));
      
      // Reload the page to update auth context
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing role:', error);
      setDebugInfo(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };
  
  // Assign manager role to current user
  const assignManagerRole = async () => {
    try {
      setDebugInfo(prev => ({ ...prev, loading: true }));
      
      // Get manager role
      const { data: roles } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'manager')
        .single();
        
      if (!roles) {
        throw new Error('Manager role not found');
      }
      
      // Update user
      const { data, error } = await supabase
        .from('users')
        .update({ role_id: roles.id })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Refresh role
      await refreshRole();
    } catch (error) {
      console.error('Error assigning manager role:', error);
      setDebugInfo(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Role System Debug</h1>
      
      {debugInfo.loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-600"></div>
          <span>Loading role information...</span>
        </div>
      ) : debugInfo.error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{debugInfo.error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">User Information</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">User ID:</div>
              <div>{user?.id}</div>
              <div className="font-medium">Email:</div>
              <div>{user?.email}</div>
              <div className="font-medium">Context Role:</div>
              <div className="font-bold">{userRole || 'No role from context'}</div>
              <div className="font-medium">API Role:</div>
              <div className="font-bold">{debugInfo.currentRole?.name || 'No role from API'}</div>
            </div>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
            {debugInfo.profile ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">Profile ID:</div>
                <div>{debugInfo.profile.id}</div>
                <div className="font-medium">Role ID:</div>
                <div>{debugInfo.profile.role_id || 'No role ID'}</div>
                <div className="font-medium">Created At:</div>
                <div>{new Date(debugInfo.profile.created_at).toLocaleString()}</div>
              </div>
            ) : (
              <p className="text-red-600">No profile found</p>
            )}
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Available Roles</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Has Role</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {debugInfo.roles.map(role => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                      <td className="px-6 py-4">{role.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          debugInfo.roleChecks[role.name] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {debugInfo.roleChecks[role.name] ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button 
              onClick={refreshRole}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Refresh Role Information
            </button>
            <button 
              onClick={assignManagerRole}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
            >
              Assign Manager Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
}