/**
 * Canonical Activity model used by the Decision Engine.
 *
 * Phase 2 keeps source services intact while normalizing tasks, routine steps,
 * project tasks, and chores into this migration-safe shape.
 */

export type ActivityType = 'task' | 'routine_step' | 'project_task' | 'chore'

export type ActivityStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'snoozed'
  | 'archived'

export type ActivityMode = 'home' | 'work' | 'errands' | 'self_care' | 'social' | string | null

export type ActivityEnergyLevel = 'low' | 'medium' | 'high'

export type ActivityRecurrence =
  | string
  | {
      frequency?: string
      interval?: number
      days_of_week?: string[]
      source?: string
    }
  | null

export interface ActivityTimestamps {
  created_at: string
  updated_at: string
}

export interface Activity extends ActivityTimestamps {
  id: string
  user_id: string | null
  type: ActivityType
  title: string
  status: ActivityStatus
  mode: ActivityMode
  due_date: string | null
  scheduled_start: string | null
  estimated_duration_minutes: number | null
  energy_required: ActivityEnergyLevel | null
  focus_required: number | null
  emotional_load: number | null
  aversiveness: number | null
  interest_level: number | null
  dopamine_reward: number | null
  urgency: number | null
  importance: number | null
  dependencies: string[]
  recurrence: ActivityRecurrence
  buffer_minutes: number
  completed_at: string | null

  /** Source metadata for migration/debugging without replacing existing services. */
  source_id?: string
  source_type?: ActivityType
  source_parent_id?: string | null

  /** Compatibility aliases for the existing priority/scheduling services. */
  description?: string
  completed?: boolean
  is_essential?: boolean
  estimated_duration?: number | null
  priority_metadata?: {
    energy_required?: ActivityEnergyLevel
    time_required?: number
    interest_level?: number
    aversiveness?: number
    location?: string
    available_items?: string[]
  }
}
