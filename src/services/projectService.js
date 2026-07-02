import { supabase, isSupabaseEnabled } from '../config/supabase'
import { taskService } from './taskService'

// Mock data storage keys
const MOCK_PROJECTS_KEY = 'adhd_lifeos_projects'
const MOCK_SUBTASKS_KEY = 'adhd_lifeos_subtasks'

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
const getMockProjects = () => {
  try {
    const stored = localStorage.getItem(MOCK_PROJECTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockProjects = (projects) => {
  localStorage.setItem(MOCK_PROJECTS_KEY, JSON.stringify(projects))
}

const getMockSubtasks = () => {
  try {
    const stored = localStorage.getItem(MOCK_SUBTASKS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockSubtasks = (subtasks) => {
  localStorage.setItem(MOCK_SUBTASKS_KEY, JSON.stringify(subtasks))
}

const isSupabaseConfigured = () => {
  return isSupabaseEnabled
}

export const projectService = {
  async getProjects() {
    const userId = getCurrentUserId()
    if (!userId) return []

    if (!isSupabaseConfigured()) {
      const projects = getMockProjects().filter(p => p.user_id === userId)
      const subtasks = getMockSubtasks()
      
      return Promise.all(projects.map(async project => {
        const projectTasks = await taskService.getTasks({
          project_id: project.id,
          status: 'all'
        })
        // Enrich tasks with subtasks
        const tasksWithSubtasks = projectTasks.map(task => ({
          ...task,
          subtasks: subtasks.filter(s => s.task_id === task.id)
        }))
        
        return {
          ...project,
          tasks: tasksWithSubtasks
        }
      }))
    }

    // Supabase implementation
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        tasks:tasks(*)
      `)
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) {
      // If projects table doesn't exist yet, return empty array gracefully
      if (error.code === '42P01') return [] 
      throw error
    }
    
    // Note: Fetching subtasks via deep join might be limited, 
    // often better to fetch subtasks separately or rely on a view.
    // For MVP, we'll assume basic task fetching.
    return data || []
  },

  async getProject(projectId) {
    const projects = await this.getProjects()
    return projects.find(p => p.id === projectId) || null
  },

  async createProject(projectData) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    const newProject = {
      id: Date.now().toString(),
      user_id: userId,
      title: projectData.title,
      description: projectData.description || '',
      color: projectData.color || 'blue',
      icon: projectData.icon || '📁',
      status: projectData.status || 'active',
      goal: projectData.goal || '',
      target_date: projectData.target_date || null,
      mode: projectData.mode || null,
      category: projectData.category || null,
      tags: projectData.tags || [],
      order_index: 0, // Should calculate max + 1
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured()) {
      const projects = getMockProjects()
      // Calculate order
      const userProjects = projects.filter(p => p.user_id === userId)
      const maxOrder = userProjects.length > 0 ? Math.max(...userProjects.map(p => p.order_index || 0)) : -1
      newProject.order_index = maxOrder + 1

      projects.push(newProject)
      setMockProjects(projects)
      return newProject
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([newProject])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateProject(projectId, updates) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const projects = getMockProjects()
      const index = projects.findIndex(p => p.id === projectId && p.user_id === userId)
      if (index === -1) throw new Error('Project not found')

      projects[index] = {
        ...projects[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      setMockProjects(projects)
      return projects[index]
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteProject(projectId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      const projects = getMockProjects()
      const filtered = projects.filter(p => !(p.id === projectId && p.user_id === userId))
      setMockProjects(filtered)
      
      // Also delete associated tasks (mock only logic here)
      // In real app, cascading deletes handle this
      return true
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },

  async getProjectStats(projectId) {
    const project = await this.getProject(projectId)
    if (!project) return null

    const tasks = project.tasks || []
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.completed || t.status === 'completed').length
    
    // Calculate subtasks stats
    let totalSubtasks = 0
    let completedSubtasks = 0
    
    tasks.forEach(task => {
      if (task.subtasks) {
        totalSubtasks += task.subtasks.length
        completedSubtasks += task.subtasks.filter(s => s.is_completed).length
      }
    })

    const totalItems = totalTasks + totalSubtasks
    const completedItems = completedTasks + completedSubtasks
    
    // Estimate remaining time
    const remainingTasks = tasks.filter(t => !t.completed && t.status !== 'completed')
    const estimatedTimeRemaining = remainingTasks.reduce((sum, t) => sum + (t.estimated_duration || 30), 0)

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_tasks: totalTasks - completedTasks,
      total_subtasks: totalSubtasks,
      completed_subtasks: completedSubtasks,
      completion_percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      estimated_time_remaining: estimatedTimeRemaining
    }
  },

  // Task Wrappers
  async createTask(projectId, taskData) {
    return taskService.createTask({
      ...taskData,
      project_id: projectId
    })
  },

  async updateTask(taskId, updates) {
    return taskService.updateTask(taskId, updates)
  },

  async deleteTask(taskId) {
    return taskService.deleteTask(taskId)
  },

  async completeTask(taskId) {
    return taskService.completeTask(taskId)
  },

  // Subtask Management
  async createSubtask(taskId, subtaskData) {
    const userId = getCurrentUserId()
    const newSubtask = {
      id: Date.now().toString(),
      task_id: taskId,
      title: subtaskData.title,
      description: subtaskData.description || '',
      estimated_duration: subtaskData.estimated_duration || null,
      is_completed: false,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured()) {
      const subtasks = getMockSubtasks()
      subtasks.push(newSubtask)
      setMockSubtasks(subtasks)
      return newSubtask
    }

    // Assume a 'subtasks' table exists or JSONB update on tasks
    // For MVP robustness with Supabase, we'll try to insert into 'subtasks'
    // If that table is missing, this might fail, so we'd need a migration.
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .insert([newSubtask])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (err) {
      console.warn('Subtask creation failed (table might be missing):', err)
      return newSubtask // Return mock to not crash UI
    }
  },

  async completeSubtask(subtaskId) {
    return this.updateSubtask(subtaskId, { is_completed: true, completed_at: new Date().toISOString() })
  },

  async uncompleteSubtask(subtaskId) {
    return this.updateSubtask(subtaskId, { is_completed: false, completed_at: null })
  },

  async updateSubtask(subtaskId, updates) {
    if (!isSupabaseConfigured()) {
      const subtasks = getMockSubtasks()
      const index = subtasks.findIndex(s => s.id === subtaskId)
      if (index !== -1) {
        subtasks[index] = { ...subtasks[index], ...updates, updated_at: new Date().toISOString() }
        setMockSubtasks(subtasks)
        return subtasks[index]
      }
      return null
    }

    const { data, error } = await supabase
      .from('subtasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', subtaskId)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async deleteSubtask(subtaskId) {
    if (!isSupabaseConfigured()) {
      const subtasks = getMockSubtasks()
      const filtered = subtasks.filter(s => s.id !== subtaskId)
      setMockSubtasks(filtered)
      return true
    }

    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) throw error
    return true
  }
}