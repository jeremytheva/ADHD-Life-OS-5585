import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AccessibilityPreferencesProvider } from './contexts/AccessibilityPreferencesContext.jsx';
import { initializeAccessibilityPreferences } from './services/accessibilityPreferences';
import './index.css';

const initialAccessibilityPreferences = initializeAccessibilityPreferences()

createRoot(document.getElementById('root')).render(
<StrictMode>
    <AccessibilityPreferencesProvider initialPreferences={initialAccessibilityPreferences}>
        <App />
    </AccessibilityPreferencesProvider>
</StrictMode>
);
