import { isBefore, isValid, parseISO, startOfToday } from 'date-fns'
import { supabase, isSupabaseEnabled } from '../config/supabase'

// Mock data storage for testing
const MOCK_STORAGE_KEY = 'adhd_lifeos_tasks'

// Helper to get current user ID from localStorage
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('adhd_lifeos_current_user'))
    return user?.id || null
  } catch {
    return null
  }
}

// Helper to get mock tasks from localStorage
const getMockTasks = () => {
  try {
    const stored = localStorage.getItem(MOCK_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Helper to set mock tasks in localStorage
const setMockTasks = (tasks) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(tasks))
}

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return isSupabaseEnabled
}

const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeDateString = (dateValue) => {
  if (!dateValue) return null

  if (dateValue instanceof Date) {
    return toLocalDateString(dateValue)
  }

  return String(dateValue).split('T')[0]
}

const normalizeTaskFilter = (filters = {}) => {
  if (typeof filters === 'string') {
    return {
      status: filters === 'completed' ? 'completed' : 'active',
      timeframe: filters
    }
  }

  return {
    status: filters.status || 'active',
    timeframe: filters.timeframe || 'all',
    mode: filters.mode || null,
    project_id: filters.project_id || null
  }
}

const isTaskCompleted = (task) => task.completed || task.status === 'completed'

const isTaskOverdue = (task) => {
  if (!task.due_date || isTaskCompleted(task)) return false

  const dueDate = parseISO(normalizeDateString(task.due_date))
  return isValid(dueDate) && isBefore(dueDate, startOfToday())
}

const filterMockTasks = (tasks, filters) => {
  const today = toLocalDateString()

  return tasks.filter((task) => {
    const dueDate = normalizeDateString(task.due_date)
    const completed = isTaskCompleted(task)

    if (filters.status === 'active' && completed) return false
    if (filters.status === 'completed' && !completed) return false
    if (filters.mode && task.mode !== filters.mode) return false
    if (filters.project_id && task.project_id !== filters.project_id) return false

    switch (filters.timeframe) {
      case 'today':
        return dueDate === today
      case 'upcoming':
        return dueDate > today
      case 'completed':
        return completed
      case 'overdue':
        return isTaskOverdue(task)
      case 'all':
      default:
        return true
    }
  })
}

const applyTaskFilterQuery = (query, filters) => {
  const today = toLocalDateString()
  let filteredQuery = query

  if (filters.status === 'active') {
    filteredQuery = filteredQuery.eq('completed', false)
  } else if (filters.status === 'completed') {
    filteredQuery = filteredQuery.eq('completed', true)
  }

  if (filters.mode) {
    filteredQuery = filteredQuery.eq('mode', filters.mode)
  }

  if (filters.project_id) {
    filteredQuery = filteredQuery.eq('project_id', filters.project_id)
  }

  switch (filters.timeframe) {
    case 'today':
      return filteredQuery.eq('due_date', today)
    case 'upcoming':
      return filteredQuery.gt('due_date', today)
    case 'completed':
      return filteredQuery
    case 'overdue':
      return filteredQuery.lt('due_date', today)
    case 'all':
    default:
      return filteredQuery
  }
}

export const taskService = {
  async getTasks(filter = {}) {
    const userId = getCurrentUserId()
    if (!userId) return []

    const normalizedFilter = normalizeTaskFilter(filter)

    if (!isSupabaseConfigured()) {
      // Use mock data
      const allTasks = getMockTasks().filter((task) => task.user_id === userId)
      return filterMockTasks(allTasks, normalizedFilter)
    }

    // Use Supabase
    const query = applyTaskFilterQuery(
      supabase.from('tasks').select('*').eq('user_id', userId),
      normalizedFilter
    )

    const { data, error } = await query.order('due_date', { ascending: true })

    if (error) throw error
    return data || []
  },

  async createTask(taskData) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    const newTask = {
      id: Date.now().toString(),
      user_id: userId,
      title: taskData.title,
      description: taskData.description || '',
      due_date: taskData.due_date,
      estimated_duration: taskData.estimated_duration || 30,
      is_essential: taskData.is_essential || false,
      completed: false,
      mode: taskData.mode || null,
      project_id: taskData.project_id || null,
      category: taskData.category || null,
      tags: taskData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured()) {
      // Use mock data
      const tasks = getMockTasks()
      tasks.push(newTask)
      setMockTasks(tasks)
      return newTask
    }

    // Use Supabase
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateTask(taskId, updates) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      // Use mock data
      const tasks = getMockTasks()
      const index = tasks.findIndex(
        (t) => t.id === taskId && t.user_id === userId
      )
      if (index === -1) throw new Error('Task not found')

      tasks[index] = {
        ...tasks[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      setMockTasks(tasks)
      return tasks[index]
    }

    // Use Supabase
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteTask(taskId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      // Use mock data
      const tasks = getMockTasks()
      const filtered = tasks.filter(
        (t) => !(t.id === taskId && t.user_id === userId)
      )
      setMockTasks(filtered)
      return true
    }

    // Use Supabase
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },

  async completeTask(taskId) {
    return this.updateTask(taskId, { completed: true })
  }
}