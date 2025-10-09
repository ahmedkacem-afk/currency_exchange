import { useState, useEffect } from 'react'
import { useNotifications } from '../lib/supabase/hooks/useNotifications'
import { Bell, BellAlert, Check, X } from '../components/Icons.jsx'

/**
 * Notifications Component
 * 
 * Displays user notifications and allows interaction with actionable items
 */
export default function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { 
    notifications, 
    unreadCount, 
    actionableCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    takeAction,
    refresh
  } = useNotifications()
  
  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && event.target.closest('.notifications-panel') === null) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  // Handle notification approval
  const handleApprove = async (notification) => {
    try {
      await takeAction(notification.id, 'approve')
      refresh()
    } catch (error) {
      console.error('Error approving notification:', error)
    }
  }
  
  // Handle notification rejection
  const handleReject = async (notification) => {
    try {
      const reason = prompt('Please enter a reason for rejection:')
      if (reason === null) return // User cancelled
      
      await takeAction(notification.id, 'reject', { reason })
      refresh()
    } catch (error) {
      console.error('Error rejecting notification:', error)
    }
  }
  
  // Handle marking a notification as read
  const handleMarkAsRead = async (notification) => {
    try {
      await markAsRead(notification.id)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  return (
    <div className="notifications-panel relative">
      {/* Notifications bell icon with badge */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <div className="relative">
            <BellAlert className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          </div>
        ) : (
          <Bell className="w-6 h-6" />
        )}
      </button>
      
      {/* Notifications panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-full sm:w-96 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="py-2 px-3 bg-gray-100 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center text-gray-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-4 text-center text-gray-500">No notifications</div>
            ) : (
              <div>
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-3 border-b border-gray-100 ${notification.is_read ? 'bg-white' : 'bg-emerald-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-medium">{notification.title}</h4>
                      {!notification.is_read && (
                        <button 
                          onClick={() => handleMarkAsRead(notification)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    
                    {/* Date */}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    
                    {/* Action buttons if required */}
                    {notification.requires_action && !notification.action_taken && notification.type === 'custody_request' && (
                      <div className="mt-2 flex space-x-2">
                        {/* Use CustodyApprovalButton component for custody requests */}
                        <button 
                          onClick={() => handleApprove(notification)}
                          className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-xs flex items-center"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(notification)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-xs flex items-center"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="py-2 px-3 bg-gray-100 text-xs text-gray-500 border-t border-gray-200">
            {actionableCount > 0 ? (
              `${actionableCount} ${actionableCount === 1 ? 'item requires' : 'items require'} your action`
            ) : (
              'No pending actions'
            )}
          </div>
        </div>
      )}
    </div>
  )
}