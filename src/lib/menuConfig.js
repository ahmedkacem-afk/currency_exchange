/**
 * Menu Configuration with Role-Based Access Control
 * Defines which menu items are accessible to each role
 *
 * Role Permissions:
 * - Manager: Full access to all menu items
 * - Treasurer: Treasury Management and Cash Custody
 * - Cashier: Cash Custody and Cashier Interface
 * - Dealership Executioner: Only Dealership Executioner
 */

export const menuItems = [
  {
    id: "dashboard",
    path: "/",
    label: "nav.dashboard",
    icon: "dashboard",
    roles: ["manager"], // Only managers can see dashboard
  },
  {
    id: "withdrawals",
    path: "/withdrawals",
    label: "nav.withdrawals",
    icon: "withdrawals",
    roles: ["manager", "treasurer"], // Treasury Management
  },
  {
    id: "create",
    path: "/create",
    label: "nav.create",
    icon: "create",
    roles: ["manager"], // Only managers can create entities
  },
  {
    id: "cashier",
    path: "/cashier",
    label: "nav.cashier",
    icon: "cashier",
    roles: ["manager", "cashier"], // Cashier interface for cashiers
  },
  {
    id: "treasurer",
    path: "/treasurer",
    label: "nav.treasurer",
    icon: "treasurer",
    roles: ["manager", "treasurer"], // Treasury Management for treasurers
  },
  {
    id: "dealership-executioner",
    path: "/dealership-executioner",
    label: "nav.executioner",
    icon: "executioner",
    roles: ["manager", "validator"], // Only dealership executioners
  },
  {
    id: "debt-management",
    path: "/debt-management",
    label: "nav.debtManagement",
    icon: "debtManagement",
    roles: ["manager", "treasurer"], // Treasury Management
  },
  {
    id: "custody-management",
    path: "/custody-management",
    label: "nav.cashCustody",
    icon: "custody",
    roles: ["manager", "treasurer", "cashier"], // Cash Custody for treasurers and cashiers
  },
  {
    id: "user-management",
    path: "/user-management",
    label: "nav.userManagement",
    icon: "userManagement",
    roles: ["manager"], // Only managers can manage users
  },
  {
    id: "wallet-management",
    path: "/wallet-management",
    label: "nav.walletManagement",
    icon: "walletManagement",
    roles: ["manager", "treasurer"],
  },
]

/**
 * Get menu items accessible to a specific role
 * @param {string} userRole - The user's role
 * @returns {Array} - Filtered menu items
 */
export function getAccessibleMenuItems(userRole) {
  if (!userRole) return []

  // Manager has access to all items
  if (userRole === "manager") {
    return menuItems
  }

  // Filter items based on user's role
  return menuItems.filter((item) => item.roles.includes(userRole))
}

/**
 * Check if a user can access a specific menu item
 * @param {string} userRole - The user's role
 * @param {string} menuItemId - The menu item ID
 * @returns {boolean} - Whether the user can access the item
 */
export function canAccessMenuItem(userRole, menuItemId) {
  if (!userRole) return false

  if (userRole === "manager") return true

  const item = menuItems.find((m) => m.id === menuItemId)
  return item ? item.roles.includes(userRole) : false
}
