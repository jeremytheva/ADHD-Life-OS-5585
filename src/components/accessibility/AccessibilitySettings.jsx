import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../../common/SafeIcon'
import { useAccessibilityPreferences } from '../../contexts/AccessibilityPreferencesContext'
import { applyAccessibilityPreferences } from '../../services/accessibilityPreferences'

const { FiX, FiType, FiEye, FiZap, FiSave } = FiIcons

const AccessibilitySettings = ({ onClose }) => {
  const { preferences, savePreferences } = useAccessibilityPreferences()
  const [settings, setSettings] = useState(() => preferences)
  const preEditSettings = useRef(preferences)

  useEffect(() => {
    // Changes are previewed, but only Save persists them.
    applyAccessibilityPreferences(settings)
  }, [settings])

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = () => {
    if (savePreferences(settings)) onClose()
  }

  const handleCancel = () => {
    setSettings(preEditSettings.current)
    applyAccessibilityPreferences(preEditSettings.current)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Accessibility Settings</h2>
              <p className="text-blue-100 text-sm">
                Customize the interface to your needs
              </p>
            </div>
            <button
              onClick={handleCancel}
              aria-label="Close accessibility settings without saving"
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiType} className="w-4 h-4" />
                <span>Text Size</span>
              </div>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
                { value: 'xlarge', label: 'X-Large' }
              ].map(size => (
                <button
                  key={size.value}
                  onClick={() => handleChange('fontSize', size.value)}
                  className={`
                    px-4 py-2 rounded-lg border-2 transition-all
                    ${settings.fontSize === size.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className={`
                    font-medium
                    ${size.value === 'small' ? 'text-xs' : ''}
                    ${size.value === 'medium' ? 'text-sm' : ''}
                    ${size.value === 'large' ? 'text-base' : ''}
                    ${size.value === 'xlarge' ? 'text-lg' : ''}
                  `}>
                    {size.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contrast */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiEye} className="w-4 h-4" />
                <span>Contrast</span>
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'normal', label: 'Normal', desc: 'Standard contrast' },
                { value: 'high', label: 'High', desc: 'Enhanced contrast' }
              ].map(contrast => (
                <button
                  key={contrast.value}
                  onClick={() => handleChange('contrast', contrast.value)}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-left
                    ${settings.contrast === contrast.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className="font-medium text-slate-900 mb-1">
                    {contrast.label}
                  </div>
                  <div className="text-xs text-slate-600">
                    {contrast.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Line Spacing
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'relaxed', label: 'Relaxed' },
                { value: 'loose', label: 'Loose' }
              ].map(spacing => (
                <button
                  key={spacing.value}
                  onClick={() => handleChange('lineSpacing', spacing.value)}
                  className={`
                    px-4 py-2 rounded-lg border-2 transition-all
                    ${settings.lineSpacing === spacing.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  {spacing.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-4">
            {/* Reduce Motion */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiZap} className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Reduce Motion
                  </div>
                  <div className="text-xs text-slate-600">
                    Minimize animations and transitions
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleChange('reduceMotion', !settings.reduceMotion)}
                aria-label="Reduce motion"
                aria-pressed={settings.reduceMotion}
                className={`
                  w-12 h-6 rounded-full transition-colors
                  ${settings.reduceMotion ? 'bg-green-500' : 'bg-slate-300'}
                `}
              >
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow-md transition-transform
                  ${settings.reduceMotion ? 'translate-x-6' : 'translate-x-0.5'}
                `} />
              </button>
            </div>

            {/* Focus Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiEye} className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Focus Mode
                  </div>
                  <div className="text-xs text-slate-600">
                    Dim non-essential elements
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleChange('focusMode', !settings.focusMode)}
                aria-label="Focus mode"
                aria-pressed={settings.focusMode}
                className={`
                  w-12 h-6 rounded-full transition-colors
                  ${settings.focusMode ? 'bg-green-500' : 'bg-slate-300'}
                `}
              >
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow-md transition-transform
                  ${settings.focusMode ? 'translate-x-6' : 'translate-x-0.5'}
                `} />
              </button>
            </div>

            {/* Dyslexic Font */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiType} className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Dyslexia-Friendly Font
                  </div>
                  <div className="text-xs text-slate-600">
                    Use OpenDyslexic font
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleChange('dyslexicFont', !settings.dyslexicFont)}
                aria-label="Dyslexia-friendly font"
                aria-pressed={settings.dyslexicFont}
                className={`
                  w-12 h-6 rounded-full transition-colors
                  ${settings.dyslexicFont ? 'bg-green-500' : 'bg-slate-300'}
                `}
              >
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow-md transition-transform
                  ${settings.dyslexicFont ? 'translate-x-6' : 'translate-x-0.5'}
                `} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <SafeIcon icon={FiSave} className="w-4 h-4" />
              Apply Settings
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AccessibilitySettings
