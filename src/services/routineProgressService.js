import { supabase, isSupabaseEnabled } from '../config/supabase'

// Mock storage keys
const MOCK_PROGRESS_KEY = 'adhd_lifeos_routine_progress'
const MOCK_HISTORY_KEY = 'adhd_lifeos_routine_history'

// Helper to get current user ID
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('adhd_lifeos_current_user'))
    return user?.id || null
  } catch {
    return null
  }
}

// Mock data helpers
const getMockProgress = () => {
  try {
    const stored = localStorage.getItem(MOCK_PROGRESS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockProgress = (progress) => {
  localStorage.setItem(MOCK_PROGRESS_KEY, JSON.stringify(progress))
}

const getMockHistory = () => {
  try {
    const stored = localStorage.getItem(MOCK_HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockHistory = (history) => {
  localStorage.setItem(MOCK_HISTORY_KEY, JSON.stringify(history))
}

const isSupabaseConfigured = () => {
  return isSupabaseEnabled
}

export const routineProgressService = {
  // Start a routine session
  async startRoutine(routineId, routine) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    const session = {
      id: Date.now().toString(),
      user_id: userId,
      routine_id: routineId,
      routine_name: routine.name,
      started_at: new Date().toISOString(),
      current_step_index: 0,
      completed_steps: [],
      status: 'in_progress',
      total_steps: routine.routine_steps?.length || 0
    }

    if (!isSupabaseConfigured()) {
      const progress = getMockProgress()
      progress.push(session)
      setMockProgress(progress)
      return session
    }

    // TODO: Supabase implementation
    return session
  },

  // Get active routine session
  async getActiveSession(routineId) {
    const userId = getCurrentUserId()
    if (!userId) return null

    if (!isSupabaseConfigured()) {
      const progress = getMockProgress()
      return progress.find(
        p => p.user_id === userId && 
             p.routine_id === routineId && 
             p.status === 'in_progress'
      ) || null
    }

    // TODO: Supabase implementation
    return null
  },

  // Complete a step
  async completeStep(sessionId, stepIndex, stepId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const progress = getMockProgress()
      const session = progress.find(
        p => p.id === sessionId && p.user_id === userId
      )

      if (!session) throw new Error('Session not found')

      session.completed_steps.push({
        step_index: stepIndex,
        step_id: stepId,
        completed_at: new Date().toISOString()
      })
      session.current_step_index = stepIndex + 1
      session.updated_at = new Date().toISOString()

      setMockProgress(progress)
      return session
    }

    // TODO: Supabase implementation
    return null
  },

  // Skip a step
  async skipStep(sessionId, stepIndex, stepId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const progress = getMockProgress()
      const session = progress.find(
        p => p.id === sessionId && p.user_id === userId
      )

      if (!session) throw new Error('Session not found')

      session.completed_steps.push({
        step_index: stepIndex,
        step_id: stepId,
        skipped: true,
        completed_at: new Date().toISOString()
      })
      session.current_step_index = stepIndex + 1
      session.updated_at = new Date().toISOString()

      setMockProgress(progress)
      return session
    }

    // TODO: Supabase implementation
    return null
  },

  // Complete entire routine
  async completeRoutine(sessionId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const progress = getMockProgress()
      const sessionIndex = progress.findIndex(
        p => p.id === sessionId && p.user_id === userId
      )

      if (sessionIndex === -1) throw new Error('Session not found')

      const session = progress[sessionIndex]
      session.status = 'completed'
      session.completed_at = new Date().toISOString()

      // Move to history
      const history = getMockHistory()
      history.push(session)
      setMockHistory(history)

      // Remove from active progress
      progress.splice(sessionIndex, 1)
      setMockProgress(progress)

      return session
    }

    // TODO: Supabase implementation
    return null
  },

  // Cancel routine
  async cancelRoutine(sessionId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const progress = getMockProgress()
      const filtered = progress.filter(
        p => !(p.id === sessionId && p.user_id === userId)
      )
      setMockProgress(filtered)
      return true
    }

    // TODO: Supabase implementation
    return true
  },

  // Get routine history
  async getRoutineHistory(routineId, limit = 30) {
    const userId = getCurrentUserId()
    if (!userId) return []

    if (!isSupabaseConfigured()) {
      const history = getMockHistory()
      return history
        .filter(h => h.user_id === userId && h.routine_id === routineId)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .slice(0, limit)
    }

    // TODO: Supabase implementation
    return []
  },

  // Get routine statistics
  async getRoutineStats(routineId, days = 30) {
    const userId = getCurrentUserId()
    if (!userId) return null

    if (!isSupabaseConfigured()) {
      const history = getMockHistory()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const recentSessions = history.filter(
        h => h.user_id === userId && 
             h.routine_id === routineId &&
             new Date(h.completed_at) >= cutoffDate
      )

      const totalSessions = recentSessions.length
      const completedSteps = recentSessions.reduce(
        (sum, session) => sum + session.completed_steps.filter(s => !s.skipped).length,
        0
      )
      const skippedSteps = recentSessions.reduce(
        (sum, session) => sum + session.completed_steps.filter(s => s.skipped).length,
        0
      )

      return {
        total_completions: totalSessions,
        completion_rate: totalSessions > 0 
          ? ((completedSteps / (completedSteps + skippedSteps)) * 100).toFixed(1)
          : 0,
        average_completion_time: this.calculateAverageTime(recentSessions),
        current_streak: this.calculateStreak(recentSessions),
        last_completed: recentSessions.length > 0 
          ? recentSessions[0].completed_at 
          : null
      }
    }

    // TODO: Supabase implementation
    return null
  },

  // Calculate average completion time
  calculateAverageTime(sessions) {
    if (sessions.length === 0) return 0

    const totalMinutes = sessions.reduce((sum, session) => {
      const start = new Date(session.started_at)
      const end = new Date(session.completed_at)
      return sum + (end - start) / 1000 / 60
    }, 0)

    return Math.round(totalMinutes / sessions.length)
  },

  // Calculate completion streak
  calculateStreak(sessions) {
    if (sessions.length === 0) return 0

    // Sort by completion date (newest first)
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
    )

    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (const session of sorted) {
      const sessionDate = new Date(session.completed_at)
      sessionDate.setHours(0, 0, 0, 0)

      const diffDays = Math.floor(
        (currentDate - sessionDate) / (1000 * 60 * 60 * 24)
      )

      if (diffDays === streak) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else if (diffDays > streak) {
        break
      }
    }

    return streak
  }
}