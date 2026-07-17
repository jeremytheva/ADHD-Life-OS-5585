// Onboarding progress and module configuration are persisted in the canonical
// per-user preferences record so they follow the authenticated user.
import { getCurrentUser } from './authStorage'
import { getUserPreferences, updateUserPreferences } from '../domain/preferences/repository'

export { ONBOARDING_STEPS, ONBOARDING_TOTAL_STEPS, normalizeOnboardingData } from '../config/onboarding'
import { createDefaultOnboardingData, normalizeOnboardingData } from '../config/onboarding'

const requireCurrentUser = () => {
  const user = getCurrentUser()
  if (!user) throw new Error('No user logged in')
  return user
}

export const onboardingService = {
  getDefaultOnboardingData: createDefaultOnboardingData,

  async hasCompletedOnboarding() {
    const data = await this.getOnboardingData()
    return data?.progress.isComplete ?? false
  },

  async getOnboardingData() {
    const user = getCurrentUser()
    if (!user) return null
    const preferences = await getUserPreferences(user)
    return normalizeOnboardingData(preferences.onboarding ?? createDefaultOnboardingData())
  },

  async saveProgress(data) {
    const user = requireCurrentUser()
    const normalized = normalizeOnboardingData(data)
    await updateUserPreferences(user, { onboarding: normalized })
    return normalized
  },

  async completeOnboarding(finalData) {
    const completedAt = new Date().toISOString()
    const completed = normalizeOnboardingData({
      ...finalData,
      progress: { ...finalData.progress, isComplete: true },
      completedAt
    })
    await this.saveProgress(completed)
    return completed
  },

  async applyPreferences(onboardingData) {
    return this.saveProgress(onboardingData)
  },

  async getAppliedOnboardingPreferences() {
    const data = await this.getOnboardingData()
    return data ? { enabledModules: data.enabledModules, uiStyle: data.uiStyle, roles: data.selectedRoles, customRoles: data.customRoles, adhdPreferences: data.preferences } : null
  },

  async getEnabledModules() {
    const data = await this.getOnboardingData()
    return data?.enabledModules ?? createDefaultOnboardingData().enabledModules
  },

  async resetOnboarding() {
    const user = requireCurrentUser()
    await updateUserPreferences(user, { onboarding: null })
  },

  async skipOnboarding() {
    return this.completeOnboarding({ ...createDefaultOnboardingData(), skippedSteps: ['all'] })
  }
}
