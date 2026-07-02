import { supabase, isSupabaseEnabled } from '../config/supabase'
import { addDays, addWeeks, addMonths, startOfDay, parseISO } from 'date-fns'

// Mock storage keys
const MOCK_HOUSEWORK_KEY = 'adhd_lifeos_housework_tasks'
const MOCK_COMPLETIONS_KEY = 'adhd_lifeos_housework_completions'

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
const getMockHousework = () => {
  try {
    const stored = localStorage.getItem(MOCK_HOUSEWORK_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockHousework = (tasks) => {
  localStorage.setItem(MOCK_HOUSEWORK_KEY, JSON.stringify(tasks))
}

const getMockCompletions = () => {
  try {
    const stored = localStorage.getItem(MOCK_COMPLETIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockCompletions = (completions) => {
  localStorage.setItem(MOCK_COMPLETIONS_KEY, JSON.stringify(completions))
}

const isSupabaseConfigured = () => {
  return isSupabaseEnabled
}

// Frequency calculation helpers
const calculateNextDueDate = (lastCompleted, frequency) => {
  const baseDate = lastCompleted ? parseISO(lastCompleted) : new Date()
  
  switch (frequency) {
    case 'daily':
      return addDays(baseDate, 1).toISOString()
    case 'every_2_days':
      return addDays(baseDate, 2).toISOString()
    case 'twice_weekly':
      return addDays(baseDate, 3).toISOString()
    case 'weekly':
      return addWeeks(baseDate, 1).toISOString()
    case 'biweekly':
      return addWeeks(baseDate, 2).toISOString()
    case 'monthly':
      return addMonths(baseDate, 1).toISOString()
    case 'quarterly':
      return addMonths(baseDate, 3).toISOString()
    case 'seasonal':
      return addMonths(baseDate, 6).toISOString()
    default:
      return addWeeks(baseDate, 1).toISOString()
  }
}

// Task load balancing
const getTaskLoadForDay = (tasks, date) => {
  const dateStr = startOfDay(parseISO(date)).toISOString()
  return tasks.filter(t => {
    const taskDate = startOfDay(parseISO(t.next_due_date)).toISOString()
    return taskDate === dateStr
  }).reduce((sum, t) => sum + (t.estimated_duration || 30), 0)
}

const balanceWeekLoad = (tasks, maxDailyMinutes = 90) => {
  const balanced = [...tasks]
  const today = new Date()
  
  for (let i = 0; i < 7; i++) {
    const checkDate = addDays(today, i)
    const load = getTaskLoadForDay(balanced, checkDate.toISOString())
    
    if (load > maxDailyMinutes) {
      // Find tasks that can be shifted
      const dayTasks = balanced.filter(t => {
        const taskDate = startOfDay(parseISO(t.next_due_date)).toISOString()
        const checkDateStr = startOfDay(checkDate).toISOString()
        return taskDate === checkDateStr && !t.is_essential
      })
      
      // Shift some tasks to next available day
      const excess = load - maxDailyMinutes
      let shifted = 0
      
      for (const task of dayTasks) {
        if (shifted >= excess) break
        task.next_due_date = addDays(checkDate, 1).toISOString()
        shifted += task.estimated_duration || 30
      }
    }
  }
  
  return balanced
}

export const houseworkService = {
  // Get all housework tasks for user
  async getHouseworkTasks(filters = {}) {
    const userId = getCurrentUserId()
    if (!userId) return []

    if (!isSupabaseConfigured()) {
      let tasks = getMockHousework().filter(t => t.user_id === userId)
      
      // Apply filters
      if (filters.room) {
        tasks = tasks.filter(t => t.room === filters.room)
      }
      if (filters.frequency) {
        tasks = tasks.filter(t => t.frequency === filters.frequency)
      }
      if (filters.dueToday) {
        const today = startOfDay(new Date()).toISOString()
        tasks = tasks.filter(t => {
          const dueDate = startOfDay(parseISO(t.next_due_date)).toISOString()
          return dueDate <= today
        })
      }
      
      return tasks.sort((a, b) => 
        new Date(a.next_due_date) - new Date(b.next_due_date)
      )
    }

    // TODO: Supabase implementation
    return []
  },

  // Create housework task from template
  async createHouseworkTask(taskData) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    const newTask = {
      id: Date.now().toString(),
      user_id: userId,
      task_type: 'housework',
      title: taskData.title,
      description: taskData.description || '',
      room: taskData.room,
      frequency: taskData.frequency,
      estimated_duration: taskData.estimated_duration || 30,
      prep_time: taskData.prep_time || 0,
      cleanup_time: taskData.cleanup_time || 0,
      checklist: taskData.checklist || [],
      required_items: taskData.required_items || [],
      is_essential: taskData.is_essential || false,
      is_active: true,
      mode: 'home',
      next_due_date: taskData.next_due_date || new Date().toISOString(),
      last_completed: null,
      completion_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured()) {
      const tasks = getMockHousework()
      tasks.push(newTask)
      setMockHousework(tasks)
      return newTask
    }

    // TODO: Supabase implementation
    return newTask
  },

  // Complete a housework task
  async completeHouseworkTask(taskId, completedChecklist = []) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const tasks = getMockHousework()
      const taskIndex = tasks.findIndex(
        t => t.id === taskId && t.user_id === userId
      )

      if (taskIndex === -1) throw new Error('Task not found')

      const task = tasks[taskIndex]
      const completedAt = new Date().toISOString()

      // Record completion
      const completions = getMockCompletions()
      completions.push({
        id: Date.now().toString(),
        task_id: taskId,
        user_id: userId,
        completed_at: completedAt,
        checklist_completed: completedChecklist,
        duration_actual: null // Can be tracked if needed
      })
      setMockCompletions(completions)

      // Update task
      task.last_completed = completedAt
      task.completion_count = (task.completion_count || 0) + 1
      task.next_due_date = calculateNextDueDate(completedAt, task.frequency)
      task.updated_at = completedAt

      setMockHousework(tasks)
      return task
    }

    // TODO: Supabase implementation
    return null
  },

  // Snooze task to next day
  async snoozeTask(taskId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const tasks = getMockHousework()
      const task = tasks.find(t => t.id === taskId && t.user_id === userId)

      if (!task) throw new Error('Task not found')

      task.next_due_date = addDays(parseISO(task.next_due_date), 1).toISOString()
      task.updated_at = new Date().toISOString()

      setMockHousework(tasks)
      return task
    }

    // TODO: Supabase implementation
    return null
  },

  // Update task active status
  async updateTaskStatus(taskId, isActive) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const tasks = getMockHousework()
      const task = tasks.find(t => t.id === taskId && t.user_id === userId)

      if (!task) throw new Error('Task not found')

      task.is_active = isActive
      task.updated_at = new Date().toISOString()

      setMockHousework(tasks)
      return task
    }

    // TODO: Supabase implementation
    return null
  },

  // Get completion history
  async getCompletionHistory(taskId, limit = 30) {
    const userId = getCurrentUserId()
    if (!userId) return []

    if (!isSupabaseConfigured()) {
      const completions = getMockCompletions()
      return completions
        .filter(c => c.user_id === userId && c.task_id === taskId)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .slice(0, limit)
    }

    // TODO: Supabase implementation
    return []
  },

  // Get statistics
  async getHouseworkStats(days = 30) {
    const userId = getCurrentUserId()
    if (!userId) return null

    if (!isSupabaseConfigured()) {
      const completions = getMockCompletions()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const recentCompletions = completions.filter(
        c => c.user_id === userId && new Date(c.completed_at) >= cutoffDate
      )

      const tasks = getMockHousework().filter(t => t.user_id === userId)

      return {
        total_tasks: tasks.length,
        active_tasks: tasks.filter(t => t.is_active).length,
        total_completions: recentCompletions.length,
        completion_rate: tasks.length > 0 
          ? ((recentCompletions.length / (tasks.length * (days / 7))) * 100).toFixed(1)
          : 0,
        most_completed: this.getMostCompletedTask(tasks, recentCompletions),
        upcoming_today: tasks.filter(t => {
          const today = startOfDay(new Date()).toISOString()
          const dueDate = startOfDay(parseISO(t.next_due_date)).toISOString()
          return dueDate <= today && t.is_active
        }).length
      }
    }

    // TODO: Supabase implementation
    return null
  },

  getMostCompletedTask(tasks, completions) {
    const counts = {}
    completions.forEach(c => {
      counts[c.task_id] = (counts[c.task_id] || 0) + 1
    })

    const maxTaskId = Object.keys(counts).reduce((a, b) => 
      counts[a] > counts[b] ? a : b, null
    )

    if (!maxTaskId) return null

    const task = tasks.find(t => t.id === maxTaskId)
    return task ? { title: task.title, count: counts[maxTaskId] } : null
  },

  // Balance weekly task load
  async balanceWeeklyTasks() {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const tasks = getMockHousework().filter(
        t => t.user_id === userId && t.is_active
      )
      
      const balanced = balanceWeekLoad(tasks)
      setMockHousework([
        ...getMockHousework().filter(t => t.user_id !== userId),
        ...balanced
      ])
      
      return balanced
    }

    // TODO: Supabase implementation
    return []
  },

  // Helper: Calculate next due date
  calculateNextDueDate
}