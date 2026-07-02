import { differenceInDays, parseISO, isToday, isTomorrow, isPast } from 'date-fns'

/**
 * Dynamic Task Prioritization Engine
 * Calculates priority scores based on multiple factors:
 * - Due date urgency
 * - Task duration vs available time
 * - Essential flag
 * - Time of day optimal for task type
 * - User energy levels (based on preferences)
 * - Task dependencies
 */

export class PrioritizationEngine {
  constructor(preferences = {}) {
    this.preferences = preferences
    this.currentTime = new Date()
  }

  /**
   * Calculate priority score for a task (0-100)
   * Higher score = higher priority
   */
  calculatePriority(task, context = {}) {
    let score = 0
    const weights = {
      urgency: 0.35,
      essential: 0.25,
      duration: 0.15,
      timeOfDay: 0.15,
      completion: 0.10
    }

    // 1. Urgency Score (0-35 points)
    score += this.calculateUrgencyScore(task) * weights.urgency

    // 2. Essential Flag (0-25 points)
    score += this.calculateEssentialScore(task) * weights.essential

    // 3. Duration Fit (0-15 points)
    score += this.calculateDurationScore(task, context) * weights.duration

    // 4. Time of Day Optimization (0-15 points)
    score += this.calculateTimeOfDayScore(task) * weights.timeOfDay

    // 5. Completion Likelihood (0-10 points)
    score += this.calculateCompletionScore(task) * weights.completion

    return Math.round(score)
  }

  /**
   * Urgency based on due date
   */
  calculateUrgencyScore(task) {
    if (!task.due_date) return 30 // No due date = medium urgency

    const dueDate = parseISO(task.due_date)
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return 100 // Overdue = maximum urgency
    }

    if (isToday(dueDate)) {
      return 95 // Due today = very high urgency
    }

    if (isTomorrow(dueDate)) {
      return 80 // Due tomorrow = high urgency
    }

    const daysUntilDue = differenceInDays(dueDate, this.currentTime)

    if (daysUntilDue <= 3) return 70 // Due within 3 days
    if (daysUntilDue <= 7) return 50 // Due within a week
    if (daysUntilDue <= 14) return 30 // Due within 2 weeks
    
    return 15 // Due later
  }

  /**
   * Essential task scoring
   */
  calculateEssentialScore(task) {
    return task.is_essential ? 100 : 40
  }

  /**
   * Duration fit based on available time blocks
   */
  calculateDurationScore(task, context) {
    const duration = task.estimated_duration || 60
    const { availableTimeBlocks = [] } = context

    if (availableTimeBlocks.length === 0) return 50

    // Check if task can fit in any available block
    const canFit = availableTimeBlocks.some(block => block.duration >= duration)
    
    if (!canFit) return 20 // Low score if can't fit

    // Prefer tasks that fit well in smaller blocks
    if (duration <= 30) return 100 // Quick tasks
    if (duration <= 60) return 80 // Standard tasks
    if (duration <= 120) return 60 // Longer tasks
    
    return 40 // Very long tasks
  }

  /**
   * Time of day optimization based on task type and user energy
   */
  calculateTimeOfDayScore(task) {
    const currentHour = this.currentTime.getHours()
    const wakeHour = this.parseTimeToHour(this.preferences.wake_time || '07:00')
    const sleepHour = this.parseTimeToHour(this.preferences.sleep_time || '22:00')
    
    // Calculate hours since waking
    const hoursSinceWaking = currentHour - wakeHour

    // Energy curve: Peak in morning (2-4 hours after waking), dip after lunch, slight recovery evening
    let energyLevel
    if (hoursSinceWaking >= 2 && hoursSinceWaking <= 4) {
      energyLevel = 100 // Peak morning energy
    } else if (hoursSinceWaking > 4 && hoursSinceWaking <= 7) {
      energyLevel = 80 // Good mid-morning to noon
    } else if (hoursSinceWaking > 7 && hoursSinceWaking <= 9) {
      energyLevel = 50 // Post-lunch dip
    } else if (hoursSinceWaking > 9 && hoursSinceWaking <= 12) {
      energyLevel = 70 // Evening recovery
    } else {
      energyLevel = 40 // Early morning or late evening
    }

    // Match task duration to energy level
    const duration = task.estimated_duration || 60
    
    if (duration > 90 && energyLevel >= 80) {
      return 100 // Long tasks during high energy
    } else if (duration <= 30) {
      return 90 // Quick tasks anytime
    } else if (duration <= 60 && energyLevel >= 50) {
      return 85 // Medium tasks with decent energy
    }

    return energyLevel // Default to current energy level
  }

  /**
   * Completion likelihood based on task characteristics
   */
  calculateCompletionScore(task) {
    const duration = task.estimated_duration || 60
    let score = 100

    // Penalize very long tasks (harder to complete)
    if (duration > 180) score -= 40
    else if (duration > 120) score -= 20
    else if (duration > 60) score -= 10

    // Bonus for tasks with clear descriptions (more actionable)
    if (task.description && task.description.length > 20) {
      score += 10
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Sort tasks by priority
   */
  prioritizeTasks(tasks, context = {}) {
    return tasks
      .map(task => ({
        ...task,
        priorityScore: this.calculatePriority(task, context),
        priorityLevel: this.getPriorityLevel(this.calculatePriority(task, context)),
        urgencyReason: this.getUrgencyReason(task)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore)
  }

  /**
   * Get priority level label
   */
  getPriorityLevel(score) {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  /**
   * Get human-readable urgency reason
   */
  getUrgencyReason(task) {
    if (!task.due_date) return 'No deadline'

    const dueDate = parseISO(task.due_date)
    
    if (isPast(dueDate) && !isToday(dueDate)) return 'Overdue'
    if (isToday(dueDate)) return 'Due today'
    if (isTomorrow(dueDate)) return 'Due tomorrow'

    const daysUntilDue = differenceInDays(dueDate, this.currentTime)
    
    if (daysUntilDue <= 3) return `Due in ${daysUntilDue} days`
    if (daysUntilDue <= 7) return 'Due this week'
    if (daysUntilDue <= 14) return 'Due in 2 weeks'
    
    return `Due in ${daysUntilDue} days`
  }

  /**
   * Helper: Parse time string to hour
   */
  parseTimeToHour(timeString) {
    const [hours] = timeString.split(':')
    return parseInt(hours, 10)
  }

  /**
   * Get recommended tasks for current time
   */
  getRecommendedTasks(tasks, limit = 3) {
    const prioritized = this.prioritizeTasks(tasks)
    const currentHour = this.currentTime.getHours()
    
    // Filter tasks that are good for current time
    return prioritized
      .filter(task => {
        const timeScore = this.calculateTimeOfDayScore(task)
        return timeScore >= 60 // Only recommend if time is reasonably good
      })
      .slice(0, limit)
  }

  /**
   * Analyze task distribution
   */
  analyzeTaskLoad(tasks) {
    const prioritized = this.prioritizeTasks(tasks)
    
    return {
      total: tasks.length,
      critical: prioritized.filter(t => t.priorityLevel === 'critical').length,
      high: prioritized.filter(t => t.priorityLevel === 'high').length,
      medium: prioritized.filter(t => t.priorityLevel === 'medium').length,
      low: prioritized.filter(t => t.priorityLevel === 'low').length,
      overdue: prioritized.filter(t => 
        !t.completed &&
        t.due_date &&
        isPast(parseISO(t.due_date)) &&
        !isToday(parseISO(t.due_date))
      ).length,
      dueToday: prioritized.filter(t => 
        t.due_date && isToday(parseISO(t.due_date))
      ).length,
      estimatedTime: tasks.reduce((sum, t) => sum + (t.estimated_duration || 60), 0)
    }
  }
}

export const prioritizationEngine = new PrioritizationEngine()