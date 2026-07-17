import { createContext, useContext, useState } from 'react'
import {
  applyAccessibilityPreferences,
  initializeAccessibilityPreferences,
  saveAccessibilityPreferences
} from '../services/accessibilityPreferences'

const AccessibilityPreferencesContext = createContext(null)

export const AccessibilityPreferencesProvider = ({ children, initialPreferences }) => {
  const [preferences, setPreferences] = useState(() => initialPreferences || initializeAccessibilityPreferences())

  const savePreferences = (nextPreferences) => {
    if (!saveAccessibilityPreferences(nextPreferences)) return false

    applyAccessibilityPreferences(nextPreferences)
    setPreferences(nextPreferences)
    return true
  }

  return (
    <AccessibilityPreferencesContext.Provider value={{ preferences, savePreferences }}>
      {children}
    </AccessibilityPreferencesContext.Provider>
  )
}

export const useAccessibilityPreferences = () => {
  const context = useContext(AccessibilityPreferencesContext)
  if (!context) throw new Error('useAccessibilityPreferences must be used within AccessibilityPreferencesProvider')
  return context
}
