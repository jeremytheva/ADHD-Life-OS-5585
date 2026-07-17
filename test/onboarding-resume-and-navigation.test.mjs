import assert from 'node:assert/strict'
import test from 'node:test'
import { getVisibleNavigationItems } from '../src/config/navigation.js'
import { normalizeOnboardingData, ONBOARDING_TOTAL_STEPS } from '../src/config/onboarding.js'

test('resumed onboarding clamps its saved step, deduplicates completed steps, and uses the six-step flow', () => {
  const resumed = normalizeOnboardingData({
    enabledModules: ['tasks', 'routines'],
    progress: { currentStep: 99, totalSteps: 1, completedSteps: ['welcome', 'welcome', 'roles', 'unknown'], isComplete: false }
  })

  assert.equal(ONBOARDING_TOTAL_STEPS, 6)
  assert.equal(resumed.progress.currentStep, 5)
  assert.equal(resumed.progress.totalSteps, 6)
  assert.deepEqual(resumed.progress.completedSteps, ['welcome', 'roles'])
})

test('navigation retains core routes and hides optional modules that are not enabled', () => {
  const labels = getVisibleNavigationItems(['tasks', 'routines'], 'all').map(({ label }) => label)

  assert.deepEqual(labels, ['Today', 'Tasks', 'Routines', 'Projects', 'Settings'])
  assert.ok(!labels.includes('Housework'))
  assert.ok(!labels.includes('Brain Inbox'))
})
