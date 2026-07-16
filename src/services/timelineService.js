import { SchedulingEngine } from './schedulingEngine'
import { taskPriorityModel } from './taskPriorityModel'
import { taskRecommender } from './taskRecommender'
import { getUserPreferences } from '../domain/preferences/repository'
import { getCurrentUser } from './authStorage'
import { activityService } from './activityService'

const DEFAULT_USER_STATE = {
  current_energy: 'medium',
  mood: 'neutral'
}

const DEFAULT_DAY_SKELETON = {
  wake_time: '07:00',
  sleep_time: '22:00',
  work_start_time: null,
  work_end_time: null
}

const VALID_ENERGY_LEVELS = new Set(['low', 'medium', 'high'])
const VALID_MOODS = new Set(['motivated', 'neutral', 'struggling'])

const normalizeEnergyLevel = (energy) => (
  VALID_ENERGY_LEVELS.has(energy) ? energy : DEFAULT_USER_STATE.current_energy
)

const normalizeMood = (mood) => (
  VALID_MOODS.has(mood) ? mood : DEFAULT_USER_STATE.mood
)

const normalizeItems = (items) => {
  if (Array.isArray(items)) return items.filter(Boolean)
  if (typeof items === 'string') {
    return items
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return undefined
}

const getAvailableTimeFromBlocks = (availableTimeBlocks = []) => {
  if (!Array.isArray(availableTimeBlocks) || availableTimeBlocks.length === 0) return undefined
  return Math.max(...availableTimeBlocks.map(block => block.duration || 0)) || undefined
}

const mapPreferencesToUserState = (preferences = {}) => ({
  current_energy: normalizeEnergyLevel(preferences.current_energy || preferences.energy_level),
  available_time: preferences.available_time || getAvailableTimeFromBlocks(preferences.availableTimeBlocks),
  current_location: preferences.current_location || preferences.location,
  available_items: normalizeItems(preferences.available_items || preferences.availableItems),
  mood: normalizeMood(preferences.mood)
})

const withSchedulingPriorityFields = (task, userState, recommendationByTaskId) => {
  const priorityScore = taskPriorityModel.calculatePriorityScore(task, userState)
  const urgencyScore = taskPriorityModel.calculateUrgencyScore(task)
  const energyMatchScore = taskPriorityModel.calculateEnergyMatchScore(task, userState)
  const interestScore = taskPriorityModel.calculateInterestScore(task)
  const contextMatchScore = taskPriorityModel.calculateContextMatchScore(task, userState)
  const recommendation = recommendationByTaskId.get(task.id)
  const estimatedDuration = task.estimated_duration || task.priority_metadata?.time_required || 60

  return {
    ...task,
    estimated_duration: estimatedDuration,
    priority_score: priorityScore,
    urgency_score: urgencyScore,
    energy_match_score: energyMatchScore,
    interest_score: interestScore,
    context_match_score: contextMatchScore,
    recommendation_reason: recommendation?.reason,
    dopamine_path: recommendation?.path,
    recommendationConfidence: recommendation?.confidence,
    priorityScore
  }
}

const prioritizeTasksForTimeline = (tasks = [], userState = {}) => {
  const recommendations = taskRecommender.getRecommendations(tasks, userState)
  const recommendationByTaskId = new Map(
    recommendations.map(recommendation => [recommendation.task.id, recommendation])
  )

  return tasks
    .map(task => withSchedulingPriorityFields(task, userState, recommendationByTaskId))
    .sort((a, b) => {
      const priorityDiff = (b.priority_score || 0) - (a.priority_score || 0)
      if (priorityDiff !== 0) return priorityDiff

      if (a.due_date && b.due_date) {
        const dueDiff = new Date(a.due_date) - new Date(b.due_date)
        if (dueDiff !== 0) return dueDiff
      }

      if (a.due_date) return -1
      if (b.due_date) return 1

      return (a.estimated_duration || 60) - (b.estimated_duration || 60)
    })
}

export const timelineService = {
  async getTimeline(date, user = getCurrentUser()) {
    try {
      // Get user preferences
      const preferences = {
        ...DEFAULT_DAY_SKELETON,
        ...(await getUserPreferences(user))
      }
      const userState = mapPreferencesToUserState(preferences)
      
      // Get canonical Activities for the Decision Engine while legacy UI services continue migrating.
      const activities = await activityService.getActivities()
      const prioritizedTasks = prioritizeTasksForTimeline(activities, userState)
      
      // Extract routine-step Activities for the scheduler's routine input.
      const routineSteps = activities.filter(activity => activity.type === 'routine_step')
      
      // Create scheduling engine
      const scheduler = new SchedulingEngine(
        preferences,
        prioritizedTasks.filter(activity => !activity.completed && activity.type !== 'routine_step'),
        routineSteps,
        [] // events
      )
      
      // Generate schedule
      const schedule = scheduler.generateSchedule(date)
      
      return schedule
    } catch (error) {
      console.error('Error generating timeline:', error)
      return { blocks: [], unscheduledTasks: [] }
    }
  }
}
