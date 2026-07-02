import { taskService } from './taskService'
import { routineService } from './routineService'
import { projectService } from './projectService'
import { houseworkService } from './houseworkService'
import { getCurrentUserId } from './authStorage'
import {
  getUserScopedCollection,
  setUserScopedCollection
} from './storageService'

const ACTIVITY_STORAGE_KEY = 'adhd_lifeos_activities'

const nowIso = () => new Date().toISOString()

const numberOrNull = (value) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const clampScore = (value) => {
  const numberValue = numberOrNull(value)
  if (numberValue === null) return null
  return Math.min(100, Math.max(0, numberValue))
}

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

const normalizeStatus = (item = {}) => {
  if (item.completed || item.is_completed || item.status === 'completed') return 'completed'
  if (item.status) return item.status
  if (item.is_active === false) return 'archived'
  return 'pending'
}

const normalizeCompletedAt = (item = {}) => (
  item.completed_at || item.last_completed || null
)

const estimatedMinutes = (item = {}) => (
  numberOrNull(
    item.estimated_duration_minutes ??
    item.estimated_duration ??
    item.duration_minutes ??
    item.priority_metadata?.time_required
  )
)

const buildPriorityMetadata = (activity, source = {}) => ({
  energy_required: activity.energy_required || source.priority_metadata?.energy_required,
  time_required: activity.estimated_duration_minutes || undefined,
  interest_level: activity.interest_level ?? source.priority_metadata?.interest_level,
  aversiveness: activity.aversiveness ?? source.priority_metadata?.aversiveness,
  location: source.priority_metadata?.location || source.location || source.room,
  available_items: source.priority_metadata?.available_items || source.required_items
})

const createActivity = (source, overrides = {}) => {
  const timestamp = nowIso()
  const activity = {
    id: overrides.id || `${overrides.type || source.task_type || 'activity'}:${source.id}`,
    user_id: overrides.user_id ?? source.user_id ?? getCurrentUserId() ?? null,
    type: overrides.type || source.task_type || 'task',
    title: overrides.title || source.title || source.name || 'Untitled activity',
    status: overrides.status || normalizeStatus(source),
    mode: overrides.mode ?? source.mode ?? null,
    due_date: overrides.due_date ?? source.due_date ?? source.next_due_date ?? source.target_date ?? null,
    scheduled_start: overrides.scheduled_start ?? source.scheduled_start ?? source.preferred_time ?? null,
    estimated_duration_minutes: overrides.estimated_duration_minutes ?? estimatedMinutes(source),
    energy_required: overrides.energy_required ?? source.energy_required ?? source.priority_metadata?.energy_required ?? null,
    focus_required: clampScore(overrides.focus_required ?? source.focus_required),
    emotional_load: clampScore(overrides.emotional_load ?? source.emotional_load),
    aversiveness: clampScore(overrides.aversiveness ?? source.aversiveness ?? source.priority_metadata?.aversiveness),
    interest_level: clampScore(overrides.interest_level ?? source.interest_level ?? source.priority_metadata?.interest_level),
    dopamine_reward: clampScore(overrides.dopamine_reward ?? source.dopamine_reward),
    urgency: clampScore(overrides.urgency ?? source.urgency),
    importance: clampScore(overrides.importance ?? source.importance ?? (source.is_essential ? 100 : null)),
    dependencies: normalizeList(overrides.dependencies ?? source.dependencies),
    recurrence: overrides.recurrence ?? source.recurrence ?? source.repeat_pattern ?? source.frequency ?? null,
    buffer_minutes: numberOrNull(overrides.buffer_minutes ?? source.buffer_minutes) ?? 0,
    completed_at: overrides.completed_at ?? normalizeCompletedAt(source),
    created_at: source.created_at || timestamp,
    updated_at: source.updated_at || timestamp,
    source_id: source.id,
    source_type: overrides.type || source.task_type || 'task',
    source_parent_id: overrides.source_parent_id ?? source.project_id ?? source.routine_id ?? null,
    description: source.description || overrides.description || '',
    completed: overrides.status === 'completed' || normalizeStatus(source) === 'completed',
    is_essential: source.is_essential || overrides.is_essential || false,
    estimated_duration: overrides.estimated_duration_minutes ?? estimatedMinutes(source),
    name: source.name || overrides.title || source.title,
    duration_minutes: source.duration_minutes || overrides.estimated_duration_minutes || estimatedMinutes(source),
    preferred_time: source.preferred_time || overrides.scheduled_start || null,
    repeat_pattern: overrides.recurrence || source.repeat_pattern || null
  }

  activity.priority_metadata = buildPriorityMetadata(activity, source)
  return activity
}

export const taskToActivity = (task) => createActivity(task, {
  id: `task:${task.id}`,
  type: 'task'
})

export const routineStepToActivity = (step, routine = {}) => createActivity(step, {
  id: `routine_step:${routine.id || step.routine_id}:${step.id}`,
  user_id: routine.user_id ?? step.user_id ?? null,
  type: 'routine_step',
  mode: routine.mode ?? step.mode ?? null,
  due_date: null,
  recurrence: routine.repeat_pattern || step.repeat_pattern || null,
  source_parent_id: routine.id || step.routine_id || null
})

export const projectTaskToActivity = (task, project = {}) => createActivity(task, {
  id: `project_task:${project.id || task.project_id}:${task.id}`,
  user_id: project.user_id ?? task.user_id ?? null,
  type: 'project_task',
  mode: task.mode ?? project.mode ?? null,
  source_parent_id: project.id || task.project_id || null
})

export const choreToActivity = (chore) => createActivity(chore, {
  id: `chore:${chore.id}`,
  type: 'chore',
  mode: chore.mode || 'home',
  due_date: chore.next_due_date || chore.due_date || null,
  estimated_duration_minutes: estimatedMinutes(chore) + (numberOrNull(chore.prep_time) || 0) + (numberOrNull(chore.cleanup_time) || 0),
  recurrence: chore.frequency || null,
  completed_at: chore.last_completed || chore.completed_at || null
})

const uniqueActivities = (activities) => {
  const byId = new Map()
  activities.filter(Boolean).forEach(activity => byId.set(activity.id, activity))
  return [...byId.values()]
}

export const activityService = {
  getStoredActivities() {
    const userId = getCurrentUserId()
    if (!userId) return []
    return getUserScopedCollection(ACTIVITY_STORAGE_KEY, userId)
  },

  saveActivities(activities) {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('No user logged in')
    setUserScopedCollection(ACTIVITY_STORAGE_KEY, userId, activities)
    return activities
  },

  async getActivities() {
    const [tasks, routines, projects, chores] = await Promise.all([
      taskService.getTasks({ status: 'all' }),
      routineService.getRoutines(),
      projectService.getProjects(),
      houseworkService.getHouseworkTasks()
    ])

    const activities = [
      ...tasks.map(taskToActivity),
      ...routines.flatMap(routine => (routine.routine_steps || []).map(step => routineStepToActivity(step, routine))),
      ...projects.flatMap(project => (project.tasks || []).map(task => projectTaskToActivity(task, project))),
      ...chores.map(choreToActivity),
      ...this.getStoredActivities()
    ]

    return uniqueActivities(activities)
  },

  async upsertActivity(activity) {
    const storedActivities = this.getStoredActivities()
    const nextActivity = {
      ...activity,
      updated_at: nowIso()
    }
    const existingIndex = storedActivities.findIndex(item => item.id === nextActivity.id)

    if (existingIndex >= 0) {
      storedActivities[existingIndex] = nextActivity
    } else {
      storedActivities.push({
        ...nextActivity,
        created_at: nextActivity.created_at || nowIso()
      })
    }

    this.saveActivities(storedActivities)
    return nextActivity
  }
}
