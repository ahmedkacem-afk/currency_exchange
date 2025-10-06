/**
 * useNotifications Hook
 * 
 * Custom React hook for notifications management
 */

import { useState, useEffect, useCallback } from 'react'
import * as notificationsApi from '../tables/notifications'

/**
 * Hook to fetch and manage user notifications
 * 
 * @returns {Object} - Notifications data and functions
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [actionableCount, setActionableCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await notificationsApi.getUserNotifications()
      
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
      setActionableCount(data.filter(n => n.requires_action && !n.action_taken).length)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Load notifications on component mount
  useEffect(() => {
    fetchNotifications()
    
    // Set up real-time subscription for notifications
    let subscription = null;
    
    // Create an async function to set up the subscription
    const setupSubscription = async () => {
      subscription = await notificationsApi.subscribeToNotifications((payload) => {
        console.log('Real-time notification update:', payload)
        fetchNotifications()
      })
    }
    
    // Call the async function
    setupSubscription()
    
    // Clean up subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [fetchNotifications])
  
  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true } 
            : n
        )
      )
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
      throw err
    }
  }, [])
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead()
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      
      // Reset unread count
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      throw err
    }
  }, [])
  
  // Take action on a notification
  const takeAction = useCallback(async (notificationId, action, data = {}) => {
    try {
      await notificationsApi.takeAction(notificationId, action, data)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, action_taken: true, requires_action: false } 
            : n
        )
      )
      
      // Update actionable count
      setActionableCount(prev => Math.max(0, prev - 1))
      
      return true
    } catch (err) {
      console.error(`Error taking action ${action} on notification:`, err)
      throw err
    }
  }, [])
  
  return {
    notifications,
    unreadCount,
    actionableCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    takeAction,
    refresh: fetchNotifications
  }
}

export default useNotifications