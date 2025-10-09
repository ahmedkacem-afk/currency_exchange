/**
 * Notifications API
 * 
 * This module handles all database operations related to notifications
 */

import supabase, { handleApiError, sanitizeJsonData } from '../client'
import { generateUUID } from '../../uuid'

/**
 * Get notifications for the current user
 * 
 * @returns {Promise<Array>} - List of notifications
 */
export async function getUserNotifications() {
  try {
    console.log('Notifications API: Fetching user notifications...');
    
    // Get user ID from session
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Notifications API: No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    // Get notifications for the user
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    console.log(`Notifications API: Found ${data?.length || 0} notifications for user`);
    return data || [];
  } catch (error) {
    console.error('Notifications API: Error in getUserNotifications:', error);
    throw handleApiError(error, 'Get User Notifications');
  }
}

/**
 * Mark a notification as read
 * 
 * @param {string} notificationId - ID of the notification to mark as read
 * @returns {Promise<Object>} - Updated notification
 */
export async function markAsRead(notificationId) {
  try {
    console.log(`Notifications API: Marking notification ${notificationId} as read`);
    
    // Get user ID from session
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Notifications API: No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    // Update the notification
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id) // Ensure the user can only update their own notifications
      .select('*')
      .single();
      
    if (error) throw error;
    
    console.log('Notifications API: Successfully marked notification as read:', data);
    return data;
  } catch (error) {
    console.error('Notifications API: Error in markAsRead:', error);
    throw handleApiError(error, 'Mark Notification As Read');
  }
}

/**
 * Mark all notifications as read for the current user
 * 
 * @returns {Promise<void>}
 */
export async function markAllAsRead() {
  try {
    console.log('Notifications API: Marking all notifications as read');
    
    // Get user ID from session
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Notifications API: No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    // Update all notifications for the user
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_read', false);
      
    if (error) throw error;
    
    console.log('Notifications API: Successfully marked all notifications as read');
  } catch (error) {
    console.error('Notifications API: Error in markAllAsRead:', error);
    throw handleApiError(error, 'Mark All Notifications As Read');
  }
}

/**
 * Create a new notification
 * 
 * @param {Object} notification - Notification data
 * @param {string} notification.userId - User ID to notify
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message
 * @param {string} notification.type - Notification type
 * @param {string} notification.referenceId - Reference ID (optional)
 * @param {boolean} notification.requiresAction - Whether the notification requires action (default: false)
 * @returns {Promise<Object>} - Created notification
 */
export async function createNotification({
  userId,
  title,
  message,
  type,
  referenceId,
  requiresAction = false,
  actionPayload = null // Keeping parameter for backward compatibility but won't use it
}) {
  try {
    console.log(`Notifications API: Creating notification for user ${userId}`);
    console.log('Full notification params:', JSON.stringify({
      userId,
      title,
      message,
      type,
      referenceId,
      requiresAction,
      actionPayload
    }, null, 2));
    
    // Validate input
    if (!userId) throw new Error('User ID is required');
    if (!title) throw new Error('Title is required');
    if (!message) throw new Error('Message is required');
    if (!type) throw new Error('Type is required');
    
    // Create notification
    // Prepare base notification object
    // Log the referenceId for debugging
    console.log('Creating notification with referenceId:', referenceId, typeof referenceId);
    
    const notification = {
      id: generateUUID(),
      user_id: userId,
      title,
      message,
      type,
      reference_id: (referenceId && typeof referenceId === 'string') ? referenceId : null,
      requires_action: requiresAction,
      is_read: false,
      action_taken: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
      // Don't initialize JSONB fields with default values
    };
    
    // Only add action_payload field if it's provided and valid
    if (actionPayload !== null && actionPayload !== undefined) {
      try {
        if (typeof actionPayload === 'string') {
          try {
            // If it's a string, try to parse it as JSON
            notification.action_payload = JSON.parse(actionPayload);
          } catch (parseErr) {
            // If parsing fails, use the string as a simple value
            console.warn('Could not parse actionPayload as JSON, using as string');
            notification.action_payload = actionPayload;
          }
        } else if (typeof actionPayload === 'object') {
          // Serialize and deserialize to ensure it's a plain JSON object
          notification.action_payload = JSON.parse(JSON.stringify(actionPayload));
        }
      } catch (err) {
        console.warn('Invalid JSON for action_payload, omitting field:', err);
        // Don't include the field if it's invalid
      }
    }
    
    try {
      // Log the notification object for debugging
      console.log('Notification to be created:', notification);
      
      // Try to stringify each field individually for better debugging
      Object.keys(notification).forEach(key => {
        try {
          const value = notification[key];
          const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          console.log(`Field ${key}:`, strValue);
        } catch (err) {
          console.error(`Error stringifying field ${key}:`, err);
        }
      });
    } catch (err) {
      console.error('Error while logging notification:', err);
    }
    
    // Create notification object with all fields except action_payload
    const sanitizedNotification = {
      id: notification.id,
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      reference_id: notification.reference_id,
      requires_action: notification.requires_action,
      is_read: notification.is_read,
      action_taken: notification.action_taken,
      created_at: notification.created_at,
      updated_at: notification.updated_at
    };
    
    // Handle action_payload separately, ensuring it's a valid JSON string
    // that will be stored in a JSONB column
    if (actionPayload) {
      try {
        // If it's already a string, make sure it's valid JSON
        if (typeof actionPayload === 'string') {
          // Validate by parsing and re-stringifying to ensure proper format
          sanitizedNotification.action_payload = JSON.stringify(JSON.parse(actionPayload));
        } else {
          // If it's an object, convert it to a JSON string
          sanitizedNotification.action_payload = JSON.stringify(actionPayload);
        }
        
        console.log('Using action_payload:', sanitizedNotification.action_payload);
      } catch (err) {
        console.warn('Invalid action_payload format, using empty object:', err);
        sanitizedNotification.action_payload = '{}';
      }
    } else {
      // Use empty object as default
      sanitizedNotification.action_payload = '{}';
    }
    
    console.log('Final notification payload:', sanitizedNotification);
    
    // Make sure action_payload is properly formatted as a JSONB value
    // PostgreSQL expects a properly formatted JSON string for JSONB columns
    try {
      // This will ensure it's a valid JSON string
      if (typeof sanitizedNotification.action_payload === 'string') {
        // Parse and re-stringify to normalize the format
        const parsed = JSON.parse(sanitizedNotification.action_payload);
        sanitizedNotification.action_payload = JSON.stringify(parsed);
      }
    } catch (err) {
      console.warn('Error formatting action_payload, using empty object:', err);
      sanitizedNotification.action_payload = '{}';
    }
    
    console.log('Sending notification to database:', sanitizedNotification);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(sanitizedNotification)
      .select('*')
      .single();
      
    if (error) {
      console.error('Error inserting notification:', error);
      throw error;
    }
    
    console.log('Notifications API: Successfully created notification:', data);
    return data;
  } catch (error) {
    console.error('Notifications API: Error in createNotification:', error);
    throw handleApiError(error, 'Create Notification');
  }
}

/**
 * Take action on a notification
 * 
 * @param {string} notificationId - ID of the notification
 * @param {string} action - Action to take ('approve' or 'reject')
 * @param {Object} data - Additional data for the action
 * @returns {Promise<Object>} - Result of the action
 */
export async function takeAction(notificationId, action, data = {}) {
  try {
    console.log(`Notifications API: Taking action ${action} on notification ${notificationId}`);
    
    // Get user ID from session
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user || !user.id) {
      console.error('Notifications API: No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    // Get the notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', user.id) // Ensure the user can only act on their own notifications
      .single();
      
    if (notificationError) throw notificationError;
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    if (!notification.requires_action) {
      throw new Error('This notification does not require action');
    }
    
    if (notification.action_taken) {
      throw new Error('Action has already been taken on this notification');
    }
    
    // Handle the action based on notification type
    let result;
    
    if (notification.type === 'custody_request') {
      // Handle custody request actions
      if (action === 'approve') {
        // Approve the custody request
        result = await approveCustodyRequest(notification.reference_id);
      } else if (action === 'reject') {
        // Reject the custody request
        result = await rejectCustodyRequest(notification.reference_id, data.reason);
      } else {
        throw new Error(`Invalid action ${action} for custody request`);
      }
    } else {
      throw new Error(`Unsupported notification type: ${notification.type}`);
    }
    
    // Mark notification as actioned
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        action_taken: true,
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
      
    if (updateError) throw updateError;
    
    console.log(`Notifications API: Successfully took action ${action} on notification:`, result);
    return result;
  } catch (error) {
    console.error(`Notifications API: Error taking action ${action} on notification:`, error);
    throw handleApiError(error, `Take Action: ${action}`);
  }
}

/**
 * Approve a custody request
 * 
 * @param {string} custodyId - ID of the custody record
 * @returns {Promise<Object>} - Updated custody record
 */
async function approveCustodyRequest(custodyId) {
  // Get the custody record
  const { data: custody, error: custodyError } = await supabase
    .from('cash_custody')
    .select('*')
    .eq('id', custodyId)
    .single();
    
  if (custodyError) throw custodyError;
  
  if (!custody) {
    throw new Error('Custody record not found');
  }
  
  // Update the custody status
  const { data, error } = await supabase
    .from('cash_custody')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', custodyId)
    .select('*')
    .single();
    
  if (error) throw error;
  
  // Create notification for the treasurer
  await createNotification({
    userId: custody.treasurer_id,
    title: 'Custody Request Approved',
    message: `The custody request for ${custody.amount} ${custody.currency_code} has been approved.`,
    type: 'custody_approval',
    referenceId: custodyId
  });
  
  return data;
}

/**
 * Reject a custody request
 * 
 * @param {string} custodyId - ID of the custody record
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} - Updated custody record
 */
async function rejectCustodyRequest(custodyId, reason) {
  // Get the custody record
  const { data: custody, error: custodyError } = await supabase
    .from('cash_custody')
    .select('*')
    .eq('id', custodyId)
    .single();
    
  if (custodyError) throw custodyError;
  
  if (!custody) {
    throw new Error('Custody record not found');
  }
  
  // Update the custody status
  const { data, error } = await supabase
    .from('cash_custody')
    .update({
      status: 'rejected',
      notes: custody.notes ? `${custody.notes}\nRejection reason: ${reason}` : `Rejection reason: ${reason}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', custodyId)
    .select('*')
    .single();
    
  if (error) throw error;
  
  // Create notification for the treasurer
  await createNotification({
    userId: custody.treasurer_id,
    title: 'Custody Request Rejected',
    message: `The custody request for ${custody.amount} ${custody.currency_code} has been rejected. Reason: ${reason}`,
    type: 'custody_rejection',
    referenceId: custodyId
  });
  
  return data;
}

/**
 * Subscribe to notifications for real-time updates
 * 
 * @param {Function} callback - Function to call when notifications change
 * @returns {Object} - Subscription object
 */
export async function subscribeToNotifications(callback) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) {
    console.warn('Notifications API: Cannot subscribe to notifications - no authenticated user');
    return null;
  }
  
  // Use the .channel() method for Supabase realtime subscriptions
  const channel = supabase
    .channel(`public:notifications:user_id=eq.${user.id}`)
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      payload => {
        console.log('New notification received:', payload);
        callback(payload.new);
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      payload => {
        console.log('Notification updated:', payload);
        callback(payload.new);
      }
    )
    .subscribe();
    
  return channel;
}