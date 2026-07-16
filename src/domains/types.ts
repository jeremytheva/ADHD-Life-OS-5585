import type { z } from 'zod'
import type * as schemas from './schemas.js'

export type User = z.infer<typeof schemas.userSchema>
export type UserProfile = z.infer<typeof schemas.userProfileSchema>
export type Task = z.infer<typeof schemas.taskSchema>
export type Project = z.infer<typeof schemas.projectSchema>
export type Subtask = z.infer<typeof schemas.subtaskSchema>
export type Routine = z.infer<typeof schemas.routineSchema>
export type RoutineStep = z.infer<typeof schemas.routineStepSchema>
export type HouseworkTask = z.infer<typeof schemas.houseworkTaskSchema>
export type InboxItem = z.infer<typeof schemas.inboxItemSchema>
export type UserPreferences = z.infer<typeof schemas.userPreferencesSchema>
export type ModulePreferences = z.infer<typeof schemas.modulePreferencesSchema>
