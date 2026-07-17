import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../../common/SafeIcon'
import { onboardingService } from '../../services/onboardingService'
import WelcomeStep from './steps/WelcomeStep'
import LifeRolesStep from './steps/LifeRolesStep'
import ModulesStep from './steps/ModulesStep'
import UIStyleStep from './steps/UIStyleStep'
import PreferencesStep from './steps/PreferencesStep'
import CompletionStep from './steps/CompletionStep'

const { FiX, FiChevronLeft, FiChevronRight } = FiIcons

// Keep the rendered flow as the source of truth for the number of screens a
// person sees. Persisted data is normalized by onboardingService before it is
// used here, so an older record cannot select a screen outside this flow.
const ONBOARDING_FLOW = [
  { id: 'welcome', component: WelcomeStep, title: 'Welcome!' },
  { id: 'roles', component: LifeRolesStep, title: 'Your Life Roles' },
  { id: 'modules', component: ModulesStep, title: 'Choose Your Tools' },
  { id: 'style', component: UIStyleStep, title: 'Pick Your Style' },
  { id: 'preferences', component: PreferencesStep, title: 'Fine-Tune Experience' },
  { id: 'completion', component: CompletionStep, title: 'You\'re All Set!' }
]

const OnboardingFlow = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [onboardingData, setOnboardingData] = useState(onboardingService.getDefaultOnboardingData())
  const totalSteps = ONBOARDING_FLOW.length

  useEffect(() => {
    let active = true
    onboardingService.getOnboardingData().then((savedData) => {
      if (!active || !savedData) return
      setOnboardingData(savedData)
      setCurrentStep(savedData.progress.currentStep)
    }).catch((error) => {
      console.error('Error loading onboarding progress:', error)
    })
    return () => { active = false }
  }, [])

  const CurrentStepComponent = ONBOARDING_FLOW[currentStep].component

  const handleNext = (stepData) => {
    const updatedData = {
      ...onboardingData,
      ...stepData,
      progress: {
        ...onboardingData.progress,
        currentStep: Math.min(currentStep + 1, totalSteps - 1),
        totalSteps,
        completedSteps: [...new Set([...onboardingData.progress.completedSteps, ONBOARDING_FLOW[currentStep].id])]
      }
    }

    setOnboardingData(updatedData)
    if (currentStep === totalSteps - 1) {
      onboardingService.completeOnboarding(updatedData).then((completedData) => {
        if (onComplete) onComplete(completedData)
      }).catch((error) => console.error('Error completing onboarding:', error))
    } else {
      onboardingService.saveProgress(updatedData).catch((error) => console.error('Error saving onboarding progress:', error))
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipAll = () => {
    onboardingService.skipOnboarding().then((skippedData) => {
      if (onSkip) onSkip(skippedData)
    }).catch((error) => console.error('Error skipping onboarding:', error))
  }

  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header with Progress */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {ONBOARDING_FLOW[currentStep].title}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
            {currentStep === 0 && (
              <button
                onClick={handleSkipAll}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm transition-colors"
              >
                Skip Setup
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent
                onNext={handleNext}
                onBack={handleBack}
                onSkip={currentStep === 0 ? handleSkipAll : undefined}
                currentData={onboardingData}
                stepNumber={currentStep + 1}
                totalSteps={totalSteps}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default OnboardingFlow
