import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const authContext = await readFile('src/contexts/AuthContext.jsx', 'utf8');
const app = await readFile('src/App.jsx', 'utf8');

test('AuthProvider starts one guarded initial session verification', () => {
  assert.equal((authContext.match(/authService\.getCurrentUser\(\)/g) ?? []).length, 1);
  assert.match(authContext, /if \(verificationStarted\.current\) return;/);
  assert.match(authContext, /verificationStarted\.current = true;\s*verifySession\(\);/);
});

test('route changes consume auth status without requesting another session verification', () => {
  assert.doesNotMatch(app, /refreshSession|checkSession|authService\.getCurrentUser/);
  assert.match(app, /const \{ status, error, retrySessionVerification \} = useAuth\(\)/);
  assert.match(app, /status === AUTH_STATUS\.AUTHENTICATED/);
  assert.match(app, /status === AUTH_STATUS\.ERROR/);
  assert.match(app, /retrySessionVerification/);
  assert.doesNotMatch(app, /useEffect\([\s\S]*?location[\s\S]*?verifySession/);
});
