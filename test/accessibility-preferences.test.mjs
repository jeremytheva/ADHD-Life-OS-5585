import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCESSIBILITY_PREFERENCES_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferences,
  initializeAccessibilityPreferences,
  saveAccessibilityPreferences
} from '../src/services/accessibilityPreferences.js'

const createStorage = (initialValues = {}) => {
  const values = new Map(Object.entries(initialValues))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  }
}

const createDocument = () => {
  const classes = new Set()
  const properties = new Map()
  return {
    documentElement: {
      style: {
        setProperty: (key, value) => properties.set(key, value),
        removeProperty: (key) => properties.delete(key)
      },
      classList: {
        contains: (name) => classes.has(name),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
      }
    },
    classes,
    properties
  }
}

test('startup loads and applies saved accessibility preferences', () => {
  const savedPreferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, fontSize: 'large', contrast: 'high', reduceMotion: true, focusMode: true }
  const storage = createStorage({ [ACCESSIBILITY_PREFERENCES_KEY]: JSON.stringify(savedPreferences) })
  const documentRef = createDocument()

  assert.deepEqual(initializeAccessibilityPreferences({ storage, documentRef }), savedPreferences)
  assert.equal(documentRef.documentElement.style.fontSize, '18px')
  assert.equal(documentRef.documentElement.style.lineHeight, '1.5')
  assert.equal(documentRef.classes.has('high-contrast'), true)
  assert.equal(documentRef.classes.has('focus-mode'), true)
  assert.equal(documentRef.properties.get('--animation-duration'), '0.01ms')
})

test('save persists only valid accessibility preferences', () => {
  const storage = createStorage()
  const preferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, lineSpacing: 'loose' }

  assert.equal(saveAccessibilityPreferences(preferences, storage), true)
  assert.deepEqual(JSON.parse(storage.getItem(ACCESSIBILITY_PREFERENCES_KEY)), preferences)
  assert.equal(saveAccessibilityPreferences({ ...preferences, fontSize: 'huge' }, storage), false)
  assert.deepEqual(JSON.parse(storage.getItem(ACCESSIBILITY_PREFERENCES_KEY)), preferences)
})

test('cancel restoration reapplies the pre-edit settings without persisting a preview', () => {
  const storage = createStorage()
  const documentRef = createDocument()
  const preEditPreferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, fontSize: 'small' }
  const previewPreferences = { ...preEditPreferences, fontSize: 'xlarge', contrast: 'high', dyslexicFont: true }

  applyAccessibilityPreferences(preEditPreferences, documentRef)
  applyAccessibilityPreferences(previewPreferences, documentRef)
  applyAccessibilityPreferences(preEditPreferences, documentRef)

  assert.equal(documentRef.documentElement.style.fontSize, '14px')
  assert.equal(documentRef.classes.has('high-contrast'), false)
  assert.equal(documentRef.classes.has('dyslexic-font'), false)
  assert.equal(storage.getItem(ACCESSIBILITY_PREFERENCES_KEY), null)
})
