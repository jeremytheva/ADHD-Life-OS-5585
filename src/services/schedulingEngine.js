import { format, addMinutes, parseISO, isAfter, isBefore } from 'date-fns'

export class SchedulingEngine {
  constructor(daySkeleton, tasks, routineSteps, events) {
    this.daySkeleton = daySkeleton
    this.tasks = tasks
    this.routineSteps = routineSteps
    this.events = events
    this.blocks = []
    this.unscheduledTasks = []
  }

  generateSchedule(date) {
    this.blocks = []
    this.unscheduledTasks = []

    // Step 1: Place anchor blocks (sleep, work, events)
    this.placeAnchorBlocks(date)

    // Step 2: Generate routine blocks
    this.placeRoutineBlocks(date)

    // Step 3: Place flexible tasks
    this.placeFlexibleTasks(date)

    return {
      blocks: this.blocks.sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
      unscheduledTasks: this.unscheduledTasks
    }
  }

  placeAnchorBlocks(date) {
    const dateStr = format(date, 'yyyy-MM-dd')

    // Sleep block
    const sleepStart = `${dateStr}T${this.daySkeleton.sleep_time}:00`
    const sleepEnd = this.getNextDayTime(dateStr, this.daySkeleton.wake_time)
    
    this.blocks.push({
      ref_type: 'sleep',
      ref_id: 'sleep',
      start_at: sleepStart,
      end_at: sleepEnd,
      is_anchor: true,
      is_essential: true,
      label: 'Sleep'
    })

    // Work blocks (if configured)
    if (this.daySkeleton.work_start_time && this.daySkeleton.work_end_time) {
      this.blocks.push({
        ref_type: 'work',
        ref_id: 'work',
        start_at: `${dateStr}T${this.daySkeleton.work_start_time}:00`,
        end_at: `${dateStr}T${this.daySkeleton.work_end_time}:00`,
        is_anchor: true,
        is_essential: true,
        label: 'Work'
      })
    }

    // External events
    this.events.forEach(event => {
      this.blocks.push({
        ref_type: 'event',
        ref_id: event.id,
        start_at: event.start_at,
        end_at: event.end_at,
        is_anchor: true,
        is_essential: true,
        label: event.title
      })
    })
  }

  placeRoutineBlocks(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    this.routineSteps.forEach(step => {
      if (this.shouldRunRoutineStep(step, date)) {
        const duration = step.duration_minutes || 30
        const startTime = this.findAvailableSlot(dateStr, duration, step.preferred_time)
        
        if (startTime) {
          const endTime = addMinutes(parseISO(startTime), duration)
          
          this.blocks.push({
            ref_type: 'routine_step',
            ref_id: step.id,
            start_at: startTime,
            end_at: endTime.toISOString(),
            is_anchor: false,
            is_essential: step.is_essential || false,
            label: step.name
          })
        }
      }
    })
  }

  placeFlexibleTasks(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // Sort tasks by priority while preserving due-date and duration fallbacks
    const sortedTasks = [...this.tasks].sort((a, b) => {
      const priorityDiff = (b.priority_score || b.priorityScore || 0) - (a.priority_score || a.priorityScore || 0)
      if (priorityDiff !== 0) return priorityDiff

      if (a.due_date && b.due_date) {
        const dueDiff = new Date(a.due_date) - new Date(b.due_date)
        if (dueDiff !== 0) return dueDiff
      }

      if (a.due_date) return -1
      if (b.due_date) return 1

      return (a.estimated_duration || 60) - (b.estimated_duration || 60)
    })

    sortedTasks.forEach(task => {
      const duration = task.estimated_duration || 60
      const startTime = this.findAvailableSlot(dateStr, duration)
      
      if (startTime) {
        const endTime = addMinutes(parseISO(startTime), duration)
        
        this.blocks.push({
          ref_type: 'task',
          ref_id: task.id,
          start_at: startTime,
          end_at: endTime.toISOString(),
          is_anchor: false,
          is_essential: task.is_essential || false,
          label: task.title
        })
      } else {
        this.unscheduledTasks.push(task)
      }
    })
  }

  findAvailableSlot(dateStr, durationMinutes, preferredTime = null) {
    const wakeTime = parseISO(`${dateStr}T${this.daySkeleton.wake_time}:00`)
    const sleepTime = parseISO(`${dateStr}T${this.daySkeleton.sleep_time}:00`)
    
    let currentTime = wakeTime
    
    // If preferred time is specified, try that first
    if (preferredTime) {
      const preferred = parseISO(`${dateStr}T${preferredTime}:00`)
      if (this.isSlotAvailable(preferred, durationMinutes)) {
        return preferred.toISOString()
      }
    }

    // Find next available slot
    while (isBefore(addMinutes(currentTime, durationMinutes), sleepTime)) {
      if (this.isSlotAvailable(currentTime, durationMinutes)) {
        return currentTime.toISOString()
      }
      currentTime = addMinutes(currentTime, 15) // 15-minute increments
    }

    return null
  }

  isSlotAvailable(startTime, durationMinutes) {
    const endTime = addMinutes(startTime, durationMinutes)
    
    return !this.blocks.some(block => {
      const blockStart = parseISO(block.start_at)
      const blockEnd = parseISO(block.end_at)
      
      return (
        (isAfter(startTime, blockStart) && isBefore(startTime, blockEnd)) ||
        (isAfter(endTime, blockStart) && isBefore(endTime, blockEnd)) ||
        (isBefore(startTime, blockStart) && isAfter(endTime, blockEnd))
      )
    })
  }

  shouldRunRoutineStep(step, date) {
    const dayOfWeek = date.getDay()
    
    switch (step.repeat_pattern) {
      case 'daily':
        return true
      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5
      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6
      default:
        return true
    }
  }

  getNextDayTime(dateStr, time) {
    const tomorrow = new Date(dateStr)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return `${format(tomorrow, 'yyyy-MM-dd')}T${time}:00`
  }
}