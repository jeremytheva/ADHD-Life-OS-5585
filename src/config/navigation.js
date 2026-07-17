export const navigationConfig = Object.freeze([
  { path: '/', label: 'Today', modes: ['all'], core: true },
  { path: '/tasks', label: 'Tasks', modes: ['all', 'work', 'home', 'family', 'health', 'creative'], module: 'tasks' },
  { path: '/routines', label: 'Routines', modes: ['all', 'home', 'health'], module: 'routines' },
  { path: '/projects', label: 'Projects', modes: ['all', 'work', 'creative'], core: true },
  { path: '/housework', label: 'Housework', modes: ['all', 'home'], module: 'housework' },
  { path: '/inbox', label: 'Brain Inbox', modes: ['all'], module: 'inbox' },
  { path: '/settings', label: 'Settings', modes: ['all'], core: true }
])

export const getVisibleNavigationItems = (enabledModules, modeId) => navigationConfig.filter((item) =>
  (item.core || enabledModules.includes(item.module)) &&
  (item.modes.includes('all') || item.modes.includes(modeId))
)
