"use client"
import { NavLink } from "react-router-dom"
import { useI18n } from "../i18n/I18nProvider"
import { useAuth } from "../lib/AuthContext"
import { KeyIcon, LogoutIcon } from "./Icons"
import { supabase } from "../lib/supabase"
import { getAccessibleMenuItems } from "../lib/menuConfig"

export function Sidebar({ isOpen, setIsOpen, profile, dir }) {
  const { t } = useI18n()
  const { userRole } = useAuth()

  const accessibleMenuItems = getAccessibleMenuItems(userRole)

  // Icon mapping for menu items
  const getIcon = (iconType) => {
    const iconProps = "w-5 h-5 mr-2.5"
    const icons = {
      dashboard: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      withdrawals: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      create: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      ),
      cashier: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <line x1="12" y1="4" x2="12" y2="20"></line>
          <path d="M6 8h4"></path>
          <path d="M6 12h4"></path>
          <path d="M6 16h4"></path>
        </svg>
      ),
      treasurer: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20m-9-7l18 0m-9-13l-9 13h18l-9-13z"></path>
        </svg>
      ),
      executioner: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          <path d="M9 14l2 2 4-4"></path>
        </svg>
      ),
      debtManagement: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
          <path d="M16 2v4"></path>
          <path d="M8 2v4"></path>
          <path d="M12 14v4"></path>
          <path d="M12 10v2"></path>
        </svg>
      ),
      custody: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 5v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5"></path>
          <polyline points="17 5 12 1 7 5"></polyline>
          <path d="M12 12v6"></path>
          <path d="M9 12h6"></path>
        </svg>
      ),
      userManagement: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      walletManagement: (
        <svg
          className={iconProps}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path>
          <path d="M16 10H8"></path>
          <path d="M12 14v-8"></path>
        </svg>
      ),
    }
    return icons[iconType] || null
  }

  return (
    <>
      {/* Overlay - only visible on mobile */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} md:hidden z-30`}
        onClick={() => setIsOpen(false)}
      />

      {/* Side drawer - visible on all screens */}
      <div
  className={`fixed top-0 bottom-0 ${dir === "rtl" ? "right-0" : "left-0"} h-full w-80 bg-gradient-to-b from-emerald-50 to-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${dir === "rtl" ? "rounded-l-xl" : "rounded-r-xl"} ${isOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"} overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-white scrollbar-hide-unless-scroll`}
        style={{ overflowX: 'hidden' }}
      >
        {/* Collapse button alongside sidebar edge - only visible on desktop */}
        <button
          onClick={() => {
            const newState = !isOpen
            setIsOpen(newState)
            localStorage.setItem("sidebarState", newState ? "open" : "closed")
          }}
          className={`hidden md:flex absolute top-20 bg-emerald-600 text-white rounded-full p-1.5 shadow-md hover:bg-emerald-700 transform transition-transform duration-300 ${
            dir === "rtl"
              ? "right-auto -left-4" // For RTL: position on left side
              : "-right-4" // For LTR: position on right side
          }`}
          aria-label={isOpen ? t("sidebar.collapse", "Collapse sidebar") : t("sidebar.expand", "Expand sidebar")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={dir === "rtl" ? "rotate-180" : ""}
          >
            {/* Arrow pointing left for LTR, will be flipped for RTL */}
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
  <div className="flex flex-col h-full min-h-0">
          {/* Header with user info */}
          <div className="p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-emerald-800">{t("appTitle")}</h2>
              {/* Close button - only for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/50 text-emerald-700 md:hidden"
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            {profile && (
              <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                <div className="font-medium text-sm text-emerald-900">{profile.name}</div>
                <div className="text-xs text-emerald-700">{profile.email}</div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4">
            <h3 className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-3 px-2">
              {t("nav.menu", "Menu")}
            </h3>
            <nav className="flex flex-col space-y-2 text-sm">
              {accessibleMenuItems.map((item) => (
                <NavLink key={item.id} onClick={() => setIsOpen(false)} to={item.path} end={item.path === "/"}>
                  {({ isActive }) => (
                    <div
                      className={`px-4 py-3 rounded-lg flex items-center transition-colors ${isActive ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-900 hover:bg-emerald-50"}`}
                    >
                      <span className={isActive ? "text-emerald-100" : "text-emerald-500"}>{getIcon(item.icon)}</span>
                      <span>{t(item.label)}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-emerald-100 bg-gradient-to-b from-white to-emerald-50">
            <h3 className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-3 px-2">
              {t("nav.account", "Account")}
            </h3>
            <div className="flex flex-col space-y-2">
              <NavLink onClick={() => setIsOpen(false)} to="/update-password">
                {({ isActive }) => (
                  <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-900 hover:bg-emerald-50"}`}
                  >
                    <KeyIcon className={`w-5 h-5 ${isActive ? "text-emerald-100" : "text-emerald-500"}`} />
                    <span>{t("nav.changePassword", "Change Password")}</span>
                  </div>
                )}
              </NavLink>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = "/login"
                }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-emerald-900 hover:bg-emerald-50 transition-colors"
              >
                <LogoutIcon className="w-5 h-5 text-emerald-500" />
                <span>{t("nav.logout", "Sign Out")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
