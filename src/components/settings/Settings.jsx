import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../../common/SafeIcon'
import { useAuth } from '../../contexts/AuthContext'
import { useMode } from '../../contexts/ModeContext'
import { getUserPreferences, updateUserPreferences } from '../../domain/preferences/repository'
import DaySetup from './DaySetup'
import ModePreferences from '../mode/ModePreferences'
import AccessibilitySettings from '../accessibility/AccessibilitySettings'

const { FiSettings, FiEye, FiSliders } = FiIcons

const Settings = () => {
  const { user } = useAuth()
  const { currentMode, allModes } = useMode()
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [lastUpdates, setLastUpdates] = useState(null)
  const [showModePrefs, setShowModePrefs] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [selectedModeForPrefs, setSelectedModeForPrefs] = useState(null)

  useEffect(() => {
    if (user) loadPreferences()
    else {
      setPreferences(null)
      setLoading(false)
    }
  }, [user])

  const loadPreferences = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getUserPreferences(user)
      setPreferences(data)
    } catch (error) {
      console.error('Error loading preferences:', error)
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePreferences = async (updates) => {
    setSaveError(null)
    setLastUpdates(updates)
    try {
      const updated = await updateUserPreferences(user, updates)
      setPreferences(updated)
    } catch (error) {
      console.error('Error updating preferences:', error)
      setSaveError(error)
      throw error
    }
  }

  const handleOpenModePreferences = (mode) => {
    setSelectedModeForPrefs(mode)
    setShowModePrefs(true)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-medium text-slate-900">Settings</h1>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>Could not load preferences: {loadError.message}</p>
          <button onClick={loadPreferences} className="shrink-0 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
            Retry loading
          </button>
        </div>
      )}

      {saveError && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>Could not save preferences: {saveError.message}</p>
          <button onClick={() => handleUpdatePreferences(lastUpdates)} disabled={!lastUpdates} className="shrink-0 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
            Retry saving
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-slate-200 p-6"
        >
          <h2 className="text-lg font-medium text-slate-900 mb-4">Account</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <p className="text-slate-900">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Mode Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg border border-slate-200 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <SafeIcon icon={FiSliders} className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-medium text-slate-900">
              Mode Preferences
            </h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Customize how each mode looks and behaves
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allModes
              .filter((mode) => mode.id !== 'all')
              .map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleOpenModePreferences(mode)}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-left
                    ${
                      currentMode.id === mode.id
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-slate-200 hover:border-purple-200 bg-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                      w-10 h-10 rounded-lg
                      bg-gradient-to-br ${mode.gradient}
                      flex items-center justify-center
                      text-xl
                    `}
                    >
                      {mode.icon}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {mode.label}
                      </div>
                      <div className="text-xs text-slate-600">
                        {mode.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </motion.div>

        {/* Accessibility Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-lg border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SafeIcon icon={FiEye} className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-medium text-slate-900">
                Accessibility
              </h2>
            </div>
            <button
              onClick={() => setShowAccessibility(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <SafeIcon icon={FiSettings} className="w-4 h-4" />
              Configure
            </button>
          </div>
          <p className="text-sm text-slate-600">
            Customize text size, contrast, animations, and more to fit your needs
          </p>
        </motion.div>

        {/* Day Setup */}
        {preferences && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <DaySetup
              preferences={preferences}
              onUpdate={handleUpdatePreferences}
            />
          </motion.div>
        )}

        {/* App Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-lg border border-slate-200 p-6"
        >
          <h2 className="text-lg font-medium text-slate-900 mb-4">
            App Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Theme
              </label>
              <select
                value={preferences?.theme || 'low-stim'}
                onChange={(e) =>
                  handleUpdatePreferences({ theme: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="low-stim">Low Stimulation</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                checked={preferences?.notifications_enabled || false}
                onChange={(e) =>
                  handleUpdatePreferences({
                    notifications_enabled: e.target.checked
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="notifications" className="ml-2 text-sm text-slate-700">
                Enable notifications
              </label>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModePrefs && selectedModeForPrefs && (
          <ModePreferences
            modeId={selectedModeForPrefs.id}
            onClose={() => {
              setShowModePrefs(false)
              setSelectedModeForPrefs(null)
            }}
          />
        )}

        {showAccessibility && (
          <AccessibilitySettings onClose={() => setShowAccessibility(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Settings
