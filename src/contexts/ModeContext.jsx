import React, { createContext, useContext, useState, useEffect } from 'react'
import { modulePreferencesSchema } from '../domains/schemas'

const ModeContext = createContext()

export const useMode = () => {
  const context = useContext(ModeContext)
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider')
  }
  return context
}

// Available modes/contexts
export const MODES = {
  ALL: {
    id: 'all',
    label: 'All',
    icon: '🌐',
    description: 'View everything',
    color: 'slate',
    gradient: 'from-slate-500 to-slate-600'
  },
  WORK: {
    id: 'work',
    label: 'Work',
    icon: '💼',
    description: 'Professional tasks and projects',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    tags: ['work', 'professional', 'career', 'workplace']
  },
  HOME: {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    description: 'Household chores and personal tasks',
    color: 'green',
    gradient: 'from-green-500 to-green-600',
    tags: ['home', 'household', 'personal', 'housework']
  },
  FAMILY: {
    id: 'family',
    label: 'Family',
    icon: '👨‍👩‍👧‍👦',
    description: 'Family activities and parenting',
    color: 'pink',
    gradient: 'from-pink-500 to-pink-600',
    tags: ['family', 'kids', 'parenting', 'children', 'parent']
  },
  HEALTH: {
    id: 'health',
    label: 'Health',
    icon: '💪',
    description: 'Fitness, wellness, and self-care',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    tags: ['health', 'fitness', 'wellness', 'exercise', 'medical']
  },
  CREATIVE: {
    id: 'creative',
    label: 'Creative',
    icon: '🎨',
    description: 'Creative projects and hobbies',
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    tags: ['creative', 'hobby', 'art', 'music', 'craft']
  },
  FOCUS: {
    id: 'focus',
    label: 'Focus',
    icon: '🎯',
    description: 'Deep work and concentration',
    color: 'indigo',
    gradient: 'from-indigo-500 to-indigo-600',
    tags: ['focus', 'deep-work', 'concentration', 'essential']
  }
}

const MODE_STORAGE_KEY = 'adhd_lifeos_current_mode'
const MODE_PREFERENCES_KEY = 'adhd_lifeos_mode_preferences'

export const ModeProvider = ({ children }) => {
  const [currentMode, setCurrentMode] = useState(MODES.ALL)
  const [modePreferences, setModePreferences] = useState({})
  const [modeHistory, setModeHistory] = useState([])

  // Load saved mode on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(MODE_STORAGE_KEY)
      if (savedMode) {
        const mode = Object.values(MODES).find(m => m.id === savedMode)
        if (mode) {
          setCurrentMode(mode)
        }
      }

      const savedPreferences = localStorage.getItem(MODE_PREFERENCES_KEY)
      if (savedPreferences) {
        const parsedPreferences = JSON.parse(savedPreferences)
        if (parsedPreferences && typeof parsedPreferences === 'object' && !Array.isArray(parsedPreferences)) {
          setModePreferences(Object.fromEntries(Object.entries(parsedPreferences).filter(([, value]) => modulePreferencesSchema.safeParse(value).success)))
        }
      }
    } catch (error) {
      console.error('Error loading mode:', error)
    }
  }, [])

  // Save mode when it changes
  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, currentMode.id)
      
      // Track mode history for analytics
      const timestamp = new Date().toISOString()
      setModeHistory(prev => {
        const newHistory = [...prev, { mode: currentMode.id, timestamp }]
        // Keep last 50 mode switches
        return newHistory.slice(-50)
      })
    } catch (error) {
      console.error('Error saving mode:', error)
    }
  }, [currentMode])

  const switchMode = (modeId) => {
    const mode = Object.values(MODES).find(m => m.id === modeId)
    if (mode) {
      setCurrentMode(mode)
      
      // Show notification
      if (window.showModeChangeNotification) {
        window.showModeChangeNotification(mode)
      }
    }
  }

  const updateModePreferences = (modeId, preferences) => {
    setModePreferences(prev => {
      const candidate = { ...prev[modeId], ...preferences }
      const parsed = modulePreferencesSchema.safeParse(candidate)
      if (!parsed.success) return prev
      const updated = { ...prev, [modeId]: parsed.data }
      localStorage.setItem(MODE_PREFERENCES_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const getModePreferences = (modeId) => {
    return modePreferences[modeId] || {
      theme: 'default',
      viewMode: 'detailed',
      showAnimations: true,
      showNotifications: true,
      sortBy: 'priority',
      hideCompleted: false
    }
  }

  // Filter items based on current mode
  const filterByMode = (items, itemType = 'task') => {
    if (currentMode.id === 'all') {
      return items
    }

    return items.filter(item => {
      // Check if item has mode/category/tags that match current mode
      const itemTags = [
        item.mode,
        item.category,
        item.room,
        ...(item.tags || [])
      ].filter(Boolean).map(tag => tag.toLowerCase())

      const modeTags = currentMode.tags || []
      
      // Match if any item tag matches any mode tag
      return modeTags.some(modeTag => 
        itemTags.some(itemTag => 
          itemTag.includes(modeTag) || modeTag.includes(itemTag)
        )
      )
    })
  }

  // Get mode statistics
  const getModeStats = () => {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const recentSwitches = modeHistory.filter(h => 
      new Date(h.timestamp) > last24Hours
    )

    const modeCounts = recentSwitches.reduce((acc, h) => {
      acc[h.mode] = (acc[h.mode] || 0) + 1
      return acc
    }, {})

    return {
      totalSwitches: recentSwitches.length,
      modeCounts,
      mostUsedMode: Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    }
  }

  const value = {
    currentMode,
    allModes: Object.values(MODES),
    switchMode,
    modePreferences,
    updateModePreferences,
    getModePreferences,
    filterByMode,
    modeHistory,
    getModeStats,
    isMode: (modeId) => currentMode.id === modeId
  }

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  )
}