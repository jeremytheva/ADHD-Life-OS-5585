import React, { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../../common/SafeIcon'
import { useAuth } from '../../contexts/AuthContext'

const { FiAlertCircle, FiLock, FiLogIn, FiMail, FiUserPlus } = FiIcons

const authCopy = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to continue to ADHD Life-OS.',
    submitLabel: 'Sign In',
    loadingLabel: 'Signing in...',
    alternatePrompt: "Don't have an account?",
    alternateLabel: 'Create one',
    alternateTo: '/register'
  },
  register: {
    title: 'Create your account',
    subtitle: 'Register to start building your ADHD Life-OS.',
    submitLabel: 'Create Account',
    loadingLabel: 'Creating account...',
    alternatePrompt: 'Already have an account?',
    alternateLabel: 'Sign in',
    alternateTo: '/login'
  }
}

const getRedirectPath = (location) => {
  const redirectTo = location.state?.from?.pathname
  return redirectTo && !['/login', '/register'].includes(redirectTo) ? redirectTo : '/'
}

const NCBAuth = ({ mode = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const copy = authCopy[mode] ?? authCopy.login
  const isRegister = mode === 'register'
  const redirectPath = getRedirectPath(location)

  if (user) {
    return <Navigate to={redirectPath} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      navigate(redirectPath, { replace: true })
    } catch (err) {
      setError(err.message || `Failed to ${isRegister ? 'register' : 'sign in'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ADHD Life-OS</h1>
          <p className="text-xl font-semibold text-gray-800">{copy.title}</p>
          <p className="text-gray-600 mt-1">{copy.subtitle}</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
          >
            <SafeIcon icon={FiAlertCircle} className="flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <SafeIcon icon={FiMail} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <SafeIcon icon={FiLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {copy.loadingLabel}
              </>
            ) : (
              <>
                <SafeIcon icon={isRegister ? FiUserPlus : FiLogIn} />
                {copy.submitLabel}
              </>
            )}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          {copy.alternatePrompt}{' '}
          <Link to={copy.alternateTo} className="font-medium text-blue-600 hover:text-blue-700">
            {copy.alternateLabel}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default NCBAuth
