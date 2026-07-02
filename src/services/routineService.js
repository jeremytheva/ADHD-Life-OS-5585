import { supabase, isSupabaseEnabled } from '../config/supabase'

// Mock data storage for testing
const MOCK_ROUTINES_KEY = 'adhd_lifeos_routines'
const MOCK_STEPS_KEY = 'adhd_lifeos_routine_steps'

// Helper to get current user ID from localStorage
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('adhd_lifeos_current_user'))
    return user?.id || null
  } catch {
    return null
  }
}

// Helper functions for mock data
const getMockRoutines = () => {
  try {
    const stored = localStorage.getItem(MOCK_ROUTINES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockRoutines = (routines) => {
  localStorage.setItem(MOCK_ROUTINES_KEY, JSON.stringify(routines))
}

const getMockSteps = () => {
  try {
    const stored = localStorage.getItem(MOCK_STEPS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setMockSteps = (steps) => {
  localStorage.setItem(MOCK_STEPS_KEY, JSON.stringify(steps))
}

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return isSupabaseEnabled
}

export const routineService = {
  async getRoutines() {
    const userId = getCurrentUserId()
    if (!userId) return []

    if (!isSupabaseConfigured()) {
      // Use mock data
      const routines = getMockRoutines().filter((r) => r.user_id === userId)
      const steps = getMockSteps()

      return routines.map((routine) => ({
        ...routine,
        routine_steps: steps
          .filter((s) => s.routine_id === routine.id)
          .sort((a, b) => a.order_index - b.order_index)
      }))
    }

    // Use Supabase
    const { data, error } = await supabase
      .from('routines')
      .select(
        `
        *,
        routine_steps(*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createRoutine(routineData) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    const newRoutine = {
      id: Date.now().toString(),
      user_id: userId,
      name: routineData.name,
      description: routineData.description || '',
      repeat_pattern: routineData.repeat_pattern || 'daily',
      is_active: routineData.is_active !== false,
      mode: routineData.mode || null,
      category: routineData.category || null,
      tags: routineData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured()) {
      // Use mock data
      const routines = getMockRoutines()
      routines.push(newRoutine)
      setMockRoutines(routines)

      // Add steps
      if (routineData.steps && routineData.steps.length > 0) {
        const steps = getMockSteps()
        const newSteps = routineData.steps.map((step, index) => ({
          id: `${Date.now()}-${index}`,
          routine_id: newRoutine.id,
          name: step.name,
          description: step.description || '',
          duration_minutes: step.duration_minutes,
          order_index: index,
          is_essential: step.is_essential || false,
          preferred_time: step.preferred_time || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
        steps.push(...newSteps)
        setMockSteps(steps)
        newRoutine.routine_steps = newSteps
      }

      return newRoutine
    }

    // Use Supabase
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .insert([newRoutine])
      .select()
      .single()

    if (routineError) throw routineError

    // Add steps
    if (routineData.steps && routineData.steps.length > 0) {
      const stepsToInsert = routineData.steps.map((step, index) => ({
        routine_id: routine.id,
        name: step.name,
        description: step.description || '',
        duration_minutes: step.duration_minutes,
        order_index: index,
        is_essential: step.is_essential || false,
        preferred_time: step.preferred_time || null
      }))

      const { data: steps, error: stepsError } = await supabase
        .from('routine_steps')
        .insert(stepsToInsert)
        .select()

      if (stepsError) throw stepsError
      routine.routine_steps = steps
    }

    return routine
  },

  async updateRoutine(routineId, updates) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      // Use mock data
      const routines = getMockRoutines()
      const index = routines.findIndex(
        (r) => r.id === routineId && r.user_id === userId
      )
      if (index === -1) throw new Error('Routine not found')

      routines[index] = {
        ...routines[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      setMockRoutines(routines)

      // Update steps if provided
      if (updates.steps) {
        const allSteps = getMockSteps()
        const filteredSteps = allSteps.filter((s) => s.routine_id !== routineId)
        const newSteps = updates.steps.map((step, index) => ({
          id: step.id || `${Date.now()}-${index}`,
          routine_id: routineId,
          name: step.name,
          description: step.description || '',
          duration_minutes: step.duration_minutes,
          order_index: index,
          is_essential: step.is_essential || false,
          preferred_time: step.preferred_time || null,
          created_at: step.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
        setMockSteps([...filteredSteps, ...newSteps])
        routines[index].routine_steps = newSteps
      }

      return routines[index]
    }

    // Use Supabase
    const { data, error } = await supabase
      .from('routines')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', routineId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    // Update steps if provided
    if (updates.steps) {
      await supabase.from('routine_steps').delete().eq('routine_id', routineId)

      const stepsToInsert = updates.steps.map((step, index) => ({
        routine_id: routineId,
        name: step.name,
        description: step.description || '',
        duration_minutes: step.duration_minutes,
        order_index: index,
        is_essential: step.is_essential || false,
        preferred_time: step.preferred_time || null
      }))

      const { data: steps } = await supabase
        .from('routine_steps')
        .insert(stepsToInsert)
        .select()

      data.routine_steps = steps
    }

    return data
  },

  async deleteRoutine(routineId) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')

    if (!isSupabaseConfigured()) {
      // Use mock data
      const routines = getMockRoutines()
      const filtered = routines.filter(
        (r) => !(r.id === routineId && r.user_id === userId)
      )
      setMockRoutines(filtered)

      const steps = getMockSteps()
      const filteredSteps = steps.filter((s) => s.routine_id !== routineId)
      setMockSteps(filteredSteps)

      return true
    }

    // Use Supabase (cascade delete will handle steps)
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  }
}