import { z } from 'zod'
import { userPreferencesSchema } from '../../domains/schemas'
import { requestDataEndpoint } from '../../infrastructure/nocodebackend/dataClient'
import { NoCodeBackendError } from '../../infrastructure/nocodebackend/errors'

const USER_PREFERENCES_COLLECTION = 'user-preferences'

export const defaultUserPreferences = Object.freeze({
  wake_time: '07:00',
  sleep_time: '22:00',
  work_start_time: null,
  work_end_time: null,
  theme: 'low-stim',
  notifications_enabled: true
})

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a time in HH:MM format.')
const nullableTimeSchema = z.union([timeSchema, z.null()])
const preferenceFieldsSchema = z.object({
  wake_time: timeSchema,
  sleep_time: timeSchema,
  work_start_time: nullableTimeSchema,
  work_end_time: nullableTimeSchema,
  theme: z.enum(['light', 'dark', 'low-stim']),
  notifications_enabled: z.boolean()
})

export const updateUserPreferencesRequestSchema = preferenceFieldsSchema.partial().strict().refine((updates) => Object.keys(updates).length > 0, {
  message: 'At least one preference must be provided.'
})

const userPreferencesWriteSchema = preferenceFieldsSchema.extend({
  user_id: z.union([z.string(), z.number()]),
  updated_at: z.string()
})

const userPreferencesResponseSchema = userPreferencesSchema

const userContextSchema = z.object({
  id: z.union([z.string().min(1), z.number()])
}).passthrough()

export class PreferencesRepositoryError extends NoCodeBackendError {
  constructor(message, { code = 'PREFERENCES_REPOSITORY_ERROR', status = null, details = null, cause } = {}) {
    super(message, { code, status, details, cause })
    this.name = 'PreferencesRepositoryError'
  }
}

const parseOrThrow = (schema, value, message, code) => {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new PreferencesRepositoryError(message, {
      code,
      details: result.error.flatten()
    })
  }
  return result.data
}

const getUserId = (user) => parseOrThrow(
  userContextSchema,
  user,
  'An authenticated user context is required to manage preferences.',
  'PREFERENCES_AUTH_REQUIRED'
).id

const toQuery = (userId) => `?${new URLSearchParams({ user_id: String(userId) }).toString()}`

const parsePreferenceResponse = (record) => parseOrThrow(
  userPreferencesResponseSchema,
  record,
  'NoCodeBackend returned an invalid user preferences record.',
  'PREFERENCES_INVALID_RESPONSE'
)

const listUserPreferenceRecords = async (userId) => {
  const response = await requestDataEndpoint(`${USER_PREFERENCES_COLLECTION}${toQuery(userId)}`)
  const records = parseOrThrow(
    z.array(z.unknown()),
    response,
    'NoCodeBackend returned an invalid user preferences list.',
    'PREFERENCES_INVALID_RESPONSE'
  )
  return records.map(parsePreferenceResponse)
}

/** Retrieves one user's preferences, returning defaults before the first save. */
export const getUserPreferences = async (user) => {
  const userId = getUserId(user)
  const [preferences] = await listUserPreferenceRecords(userId)
  return preferences ?? { ...defaultUserPreferences, user_id: userId }
}

/** Validates and persists a partial preferences update for the authenticated user. */
export const updateUserPreferences = async (user, updates) => {
  const userId = getUserId(user)
  const validUpdates = parseOrThrow(
    updateUserPreferencesRequestSchema,
    updates,
    'Invalid user preferences update.',
    'PREFERENCES_INVALID_REQUEST'
  )
  const [existing] = await listUserPreferenceRecords(userId)
  const record = parseOrThrow(userPreferencesWriteSchema, {
    ...defaultUserPreferences,
    ...(existing ? {
      wake_time: existing.wake_time,
      sleep_time: existing.sleep_time,
      work_start_time: existing.work_start_time,
      work_end_time: existing.work_end_time,
      theme: existing.theme,
      notifications_enabled: existing.notifications_enabled
    } : {}),
    ...validUpdates,
    user_id: userId,
    updated_at: new Date().toISOString()
  }, 'Invalid user preferences request.', 'PREFERENCES_INVALID_REQUEST')

  const response = existing?.id !== undefined
    ? await requestDataEndpoint(`${USER_PREFERENCES_COLLECTION}/${encodeURIComponent(existing.id)}${toQuery(userId)}`, { method: 'PATCH', body: record })
    : await requestDataEndpoint(USER_PREFERENCES_COLLECTION, { method: 'POST', body: record })

  return parsePreferenceResponse(response)
}
