import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ModeProvider } from './contexts/ModeContext'
import Layout from './components/Layout'
import NCBAuth from './components/auth/NCBAuth'
import ProfileSelector from './components/auth/ProfileSelector'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import { onboardingService } from './services/onboardingService'

// Pages
import TodayView from './components/today/TodayView'
import TaskList from './components/tasks/TaskList'
import RoutineList from './components/routines/RoutineList'
import Settings from './components/settings/Settings'
import Housework from './pages/Housework'
import Inbox from './pages/Inbox'
import Projects from './pages/Projects'

const AppRoutes = () => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user) {
      const completed = onboardingService.hasCompletedOnboarding()
      setShowOnboarding(!completed)
    }
    setCheckingOnboarding(false)
  }, [user])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-slate-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<NCBAuth mode="login" />} />
        <Route path="/register" element={<NCBAuth mode="register" />} />
        {import.meta.env.DEV && (
          <Route path="/dev-profiles" element={<ProfileSelector />} />
        )}
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    )
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
      />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        {import.meta.env.DEV && (
          <Route path="/dev-profiles" element={<ProfileSelector />} />
        )}
        <Route path="/" element={<TodayView />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/routines" element={<RoutineList />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/housework" element={<Housework />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <ModeProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ModeProvider>
    </AuthProvider>
  )
}

export default App