import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import { useAuth } from '../contexts/AuthContext'
import { useMode } from '../contexts/ModeContext'
import ModeSwitcher from './mode/ModeSwitcher'
import ModePreferences from './mode/ModePreferences'
import AccessibilitySettings from './accessibility/AccessibilitySettings'
import GamificationDashboard from './gamification/GamificationDashboard'
import RewardShop from './gamification/RewardShop'
import { gamificationService } from '../services/gamificationService'
import { onboardingService } from '../services/onboardingService'
import { getVisibleNavigationItems, navigationConfig } from '../config/navigation'

const {
  FiCalendar,
  FiCheckSquare,
  FiRepeat,
  FiHome,
  FiInbox,
  FiGrid,
  FiSettings,
  FiLogOut,
  FiUser,
  FiAward,
  FiShoppingCart,
  FiEye
} = FiIcons

const iconByPath = {
  '/': FiCalendar, '/tasks': FiCheckSquare, '/routines': FiRepeat, '/projects': FiGrid,
  '/housework': FiHome, '/inbox': FiInbox, '/settings': FiSettings
}


const Layout = ({ children }) => {
  const { user, signOut } = useAuth()
  const { currentMode, filterByMode } = useMode()
  const [showGamification, setShowGamification] = useState(false)
  const [showRewardShop, setShowRewardShop] = useState(false)
  const [showModePreferences, setShowModePreferences] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [enabledModules, setEnabledModules] = useState([])
  const stats = gamificationService.getUserStats()

  useEffect(() => {
    let active = true
    onboardingService.getEnabledModules()
      .then((modules) => active && setEnabledModules(modules))
      .catch((error) => console.error('Error loading enabled modules:', error))
    return () => { active = false }
  }, [user?.id])
  const currency = gamificationService.getCurrency()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const visibleNavItems = getVisibleNavigationItems(enabledModules, currentMode.id).map((item) => ({ ...item, icon: iconByPath[item.path] }))

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-white border-r border-slate-200 flex flex-col"
      >
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">ADHD Life-OS</h1>
          <p className="text-sm text-slate-500 mt-1">Your daily companion</p>
        </div>

        {/* Mode Switcher */}
        <div className="p-4 border-b border-slate-200">
          <ModeSwitcher />
        </div>

        {/* Gamification Widget */}
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={() => setShowGamification(true)}
            className="w-full bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200 hover:shadow-md transition-all mb-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiAward} className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Level {stats.level}
                </span>
              </div>
              <span className="text-xs text-purple-700">{stats.points} pts</span>
            </div>
            
            {/* Mini Progress Bar */}
            <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all"
                style={{
                  width: `${Math.round((stats.xp / stats.xp_to_next_level) * 100)}%`
                }}
              />
            </div>

            {/* Streak */}
            {stats.current_streak > 0 && (
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-orange-600">
                <span>🔥</span>
                <span>{stats.current_streak}-day streak</span>
              </div>
            )}
          </button>

          {/* Reward Shop Button */}
          <button
            onClick={() => setShowRewardShop(true)}
            className="w-full bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-3 border border-yellow-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiShoppingCart} className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">
                  Reward Shop
                </span>
              </div>
              <div className="flex items-center gap-1 text-yellow-700">
                <span className="text-xs">💰</span>
                <span className="text-xs font-bold">{currency.coins}</span>
              </div>
            </div>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <SafeIcon icon={item.icon} className="text-xl" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          {/* Accessibility Button */}
          <button
            onClick={() => setShowAccessibility(true)}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <SafeIcon icon={FiEye} className="text-xl" />
            <span className="font-medium text-sm">Accessibility</span>
          </button>

          <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 bg-slate-50 rounded-lg">
            <SafeIcon icon={FiUser} />
            <span className="truncate flex-1">{user?.email}</span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <SafeIcon icon={FiLogOut} className="text-xl" />
            <span className="font-medium">Switch Profile</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showGamification && (
          <GamificationDashboard onClose={() => setShowGamification(false)} />
        )}
        {showRewardShop && (
          <RewardShop onClose={() => setShowRewardShop(false)} />
        )}
        {showModePreferences && (
          <ModePreferences 
            modeId={currentMode.id}
            onClose={() => setShowModePreferences(false)} 
          />
        )}
        {showAccessibility && (
          <AccessibilitySettings onClose={() => setShowAccessibility(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Layout