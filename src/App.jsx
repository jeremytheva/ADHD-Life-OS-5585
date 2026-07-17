import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AUTH_STATUS, AuthProvider, useAuth } from './contexts/AuthContext'
import { ModeProvider } from './contexts/ModeContext'
import Layout from './components/Layout'
import NCBAuth from './components/auth/NCBAuth'
import ProfileSelector from './components/auth/ProfileSelector'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import { onboardingService } from './services/onboardingService'
import AppErrorBoundary from './components/common/AppErrorBoundary'

// Pages
import TodayView from './components/today/TodayView'
import TaskList from './components/tasks/TaskList'
import RoutineList from './components/routines/RoutineList'
import Settings from './components/settings/Settings'
import Housework from './pages/Housework'
import Inbox from './pages/Inbox'
import Projects from './pages/Projects'

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-slate-600">Loading...</div>
    </div>
  </div>
)

const ProtectedAppShell = ({ showOnboarding, onOnboardingComplete }) => {
  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={onOnboardingComplete}
        onSkip={onOnboardingComplete}
      />
    )
  }

  return (
    <AppErrorBoundary>
      <Layout>
        <Outlet />
      </Layout>
    </AppErrorBoundary>
  )
}

const AuthErrorScreen = ({ error, onRetry }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-md rounded-lg bg-white p-6 text-center shadow">
      <h1 className="text-xl font-semibold text-slate-900">We couldn't verify your session</h1>
      <p className="mt-2 text-slate-600">{error?.message || 'Please check your connection and try again.'}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded bg-blue-600 px-4 py-2 text-white">Try again</button>
    </div>
  </div>
)

const AppRoutes = () => {
  const { status, error, retrySessionVerification } = useAuth()
  const location = useLocation()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (status === AUTH_STATUS.INITIALIZING) return
    if (status !== AUTH_STATUS.AUTHENTICATED) {
      setShowOnboarding(false)
      setCheckingOnboarding(false)
      return
    }

    let active = true
    onboardingService.hasCompletedOnboarding()
      .then((isComplete) => active && setShowOnboarding(!isComplete))
      .catch((error) => {
        console.error('Error checking onboarding status:', error)
        if (active) setShowOnboarding(true)
      })
      .finally(() => active && setCheckingOnboarding(false))
    return () => { active = false }
  }, [status])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  if (status === AUTH_STATUS.INITIALIZING || checkingOnboarding) {
    return <LoadingScreen />
  }

  if (status === AUTH_STATUS.ERROR) {
    return <AuthErrorScreen error={error} onRetry={retrySessionVerification} />
  }

  const isAuthenticated = status === AUTH_STATUS.AUTHENTICATED
  const isAnonymous = status === AUTH_STATUS.ANONYMOUS

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <NCBAuth mode="login" />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <NCBAuth mode="register" />} />
      {import.meta.env.DEV && (
        <Route path="/dev-profiles" element={<ProfileSelector />} />
      )}
      <Route
        element={
          isAuthenticated ? (
            <ProtectedAppShell
              showOnboarding={showOnboarding}
              onOnboardingComplete={handleOnboardingComplete}
            />
          ) : isAnonymous ? (
            <Navigate to="/login" replace state={{ from: location }} />
          ) : (
            <LoadingScreen />
          )
        }
      >
        <Route path="/" element={<TodayView />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/routines" element={<RoutineList />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/housework" element={<Housework />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route
        path="*"
        element={
          isAuthenticated ? <Navigate to="/" replace />
            : isAnonymous ? <Navigate to="/login" replace state={{ from: location }} />
              : <LoadingScreen />
        }
      />
    </Routes>
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
