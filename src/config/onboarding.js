import { onboardingDataSchema } from '../domains/schemas.js'

export const ONBOARDING_STEPS = Object.freeze(['welcome', 'roles', 'modules', 'style', 'preferences', 'completion'])
export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length

export const createDefaultOnboardingData = () => ({
  selectedRoles: [], customRoles: [], enabledModules: ['tasks', 'routines'], uiStyle: 'visual',
  preferences: { showEncouragement: true, enableSoundEffects: false, useTimers: true, breakReminders: true, celebrateSmallWins: true },
  progress: { currentStep: 0, totalSteps: ONBOARDING_TOTAL_STEPS, completedSteps: [], isComplete: false }
})

const clampStep = (step) => Math.min(Math.max(Number.isInteger(step) ? step : 0, 0), ONBOARDING_TOTAL_STEPS - 1)
const uniqueCompletedSteps = (steps) => [...new Set((Array.isArray(steps) ? steps : []).filter((step) => ONBOARDING_STEPS.includes(step)))]

export const normalizeOnboardingData = (data = {}) => {
  const defaults = createDefaultOnboardingData()
  return onboardingDataSchema.parse({
    ...defaults,
    ...data,
    preferences: { ...defaults.preferences, ...data.preferences },
    progress: {
      ...defaults.progress,
      ...data.progress,
      currentStep: clampStep(data.progress?.currentStep),
      totalSteps: ONBOARDING_TOTAL_STEPS,
      completedSteps: uniqueCompletedSteps(data.progress?.completedSteps)
    }
  })
}
