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

export const taskService = {
  async getTasks(filter = 'all') {
    const userId = getCurrentUserId()
    if (!userId) return []

    if (!isSupabaseConfigured()) {
      // Use mock data
      const allTasks = getMockTasks().filter((task) => task.user_id === userId)

      if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        return allTasks.filter(
          (task) =>
            task.due_date &&
            task.due_date.startsWith(today) &&
            !task.completed
        )
      } else if (filter === 'upcoming') {
        const today = new Date().toISOString().split('T')[0]
        return allTasks.filter(
          (task) =>
            task.due_date && task.due_date > today && !task.completed
        )
      }

      return allTasks.filter((task) => !task.completed)
    }

    // Use Supabase
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)

    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      query = query.gte('due_date', today).lt('due_date', `${today}T23:59:59`)
    } else if (filter === 'upcoming') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      query = query.gte('due_date', tomorrow.toISOString())
    }

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