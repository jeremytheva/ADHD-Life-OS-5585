import { accessibilityPreferencesSchema } from '../domains/schemas.js'

export const ACCESSIBILITY_PREFERENCES_KEY = 'adhd_lifeos_accessibility'

export const DEFAULT_ACCESSIBILITY_PREFERENCES = Object.freeze({
  fontSize: 'medium',
  contrast: 'normal',
  reduceMotion: false,
  focusMode: false,
  dyslexicFont: false,
  lineSpacing: 'normal'
})

const fontSizes = { small: '14px', medium: '16px', large: '18px', xlarge: '20px' }
const lineSpacings = { normal: '1.5', relaxed: '1.75', loose: '2' }

export const validateAccessibilityPreferences = (preferences) =>
  accessibilityPreferencesSchema.safeParse(preferences)

export const loadAccessibilityPreferences = (storage = globalThis.localStorage) => {
  try {
    const saved = storage?.getItem(ACCESSIBILITY_PREFERENCES_KEY)
    if (!saved) return { ...DEFAULT_ACCESSIBILITY_PREFERENCES }

    const parsed = validateAccessibilityPreferences(JSON.parse(saved))
    return parsed.success ? parsed.data : { ...DEFAULT_ACCESSIBILITY_PREFERENCES }
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES }
  }
}

export const applyAccessibilityPreferences = (preferences, documentRef = globalThis.document) => {
  const parsed = validateAccessibilityPreferences(preferences)
  if (!parsed.success || !documentRef?.documentElement) return false

  const root = documentRef.documentElement
  const settings = parsed.data
  root.style.fontSize = fontSizes[settings.fontSize]
  root.style.lineHeight = lineSpacings[settings.lineSpacing]

  root.classList.toggle('high-contrast', settings.contrast === 'high')
  root.classList.toggle('dyslexic-font', settings.dyslexicFont)
  root.classList.toggle('focus-mode', settings.focusMode)

  if (settings.reduceMotion) root.style.setProperty('--animation-duration', '0.01ms')
  else root.style.removeProperty('--animation-duration')

  return true
}

export const saveAccessibilityPreferences = (preferences, storage = globalThis.localStorage) => {
  const parsed = validateAccessibilityPreferences(preferences)
  if (!parsed.success) return false

  try {
    storage?.setItem(ACCESSIBILITY_PREFERENCES_KEY, JSON.stringify(parsed.data))
    return true
  } catch {
    return false
  }
}

export const initializeAccessibilityPreferences = ({ storage, documentRef } = {}) => {
  const preferences = loadAccessibilityPreferences(storage)
  applyAccessibilityPreferences(preferences, documentRef)
  return preferences
}
