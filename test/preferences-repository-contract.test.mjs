import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const repository = await readFile('src/domain/preferences/repository.js', 'utf8')
const settings = await readFile('src/components/settings/Settings.jsx', 'utf8')
const onboardingService = await readFile('src/services/onboardingService.js', 'utf8')

test('preferences domain repository exposes canonical validated methods', () => {
  assert.match(repository, /export const getUserPreferences = async \(user\)/)
  assert.match(repository, /export const updateUserPreferences = async \(user, updates\)/)
  assert.match(repository, /updateUserPreferencesRequestSchema/)
  assert.match(repository, /userPreferencesResponseSchema/)
  assert.match(repository, /PreferencesRepositoryError/)
  assert.match(repository, /requestDataEndpoint/)
})

test('Settings supplies authenticated user context and gives retry actions for preference errors', () => {
  assert.match(settings, /getUserPreferences\(user\)/)
  assert.match(settings, /updateUserPreferences\(user, updates\)/)
  assert.match(settings, /Retry loading/)
  assert.match(settings, /Retry saving/)
})

test('onboarding persists through the canonical preferences repository rather than local storage', () => {
  assert.match(onboardingService, /getUserPreferences/)
  assert.match(onboardingService, /updateUserPreferences/)
  assert.doesNotMatch(onboardingService, /safeRead|safeWrite|localStorage/)
})
