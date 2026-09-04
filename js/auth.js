(() => {
  'use strict';

  const config = window.APP_CONFIG || {};
  const accountsKey = config.localAccountsKey || 'hakes-brain.local-accounts';
  const sessionKey = config.localSessionKey || 'hakes-brain.local-session';
  let session = null;
  let listener = null;

  const readAccounts = () => {
    try {
      const value = JSON.parse(localStorage.getItem(accountsKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  };
  const saveAccounts = accounts => localStorage.setItem(accountsKey, JSON.stringify(accounts));
  const publicUser = account => ({ id: account.id, username: account.username, description: account.description, role: account.role });
  const emit = (event, error) => { if (listener) listener(session, event, error); };
  const randomSalt = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  };
  async function hashPassword(password, salt) {
    const input = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', input);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  const validateUsername = username => {
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) throw new Error('Use 3–32 letters, numbers, dots, dashes, or underscores for the username.');
    return username.toLowerCase();
  };
  const validatePassword = password => {
    if (String(password || '').length < 6) throw new Error('Use a password with at least 6 characters.');
    if (String(password).length > 128) throw new Error('That password is too long.');
    return String(password);
  };
  const validateDescription = description => {
    const value = String(description || '').trim();
    if (value.length < 2) throw new Error('Add a short description for this account.');
    return value.slice(0, 160);
  };
  const findAccount = username => readAccounts().find(account => account.username === String(username || '').trim().toLowerCase());
  const setSession = account => {
    session = account ? { user: publicUser(account) } : null;
    if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
    else localStorage.removeItem(sessionKey);
  };

  const api = {
    get session() { return session; },
    get isConfigured() { return true; },
    get isSignedIn() { return Boolean(session); },
    async init(onChange) {
      listener = onChange;
      try {
        const saved = JSON.parse(localStorage.getItem(sessionKey) || 'null');
        const account = saved?.user?.id ? readAccounts().find(item => item.id === saved.user.id) : null;
        setSession(account || null);
      } catch (error) {
        setSession(null);
      }
      emit('initial');
      return session;
    },
    async signIn(username, password) {
      const account = findAccount(username);
      if (!account) throw new Error('That username or password is not correct.');
      const hash = await hashPassword(validatePassword(password), account.salt);
      if (hash !== account.passwordHash) throw new Error('That username or password is not correct.');
      setSession(account);
      emit('SIGNED_IN');
      return session;
    },
    async signUp(username, password, description) {
      const cleanUsername = validateUsername(username);
      const cleanPassword = validatePassword(password);
      const cleanDescription = validateDescription(description);
      const accounts = readAccounts();
      if (accounts.some(account => account.username === cleanUsername)) throw new Error('That username is already taken on this browser.');
      const salt = randomSalt();
      const account = { id: crypto.randomUUID(), username: cleanUsername, description: cleanDescription, role: accounts.length ? 'viewer' : 'owner', salt, passwordHash: await hashPassword(cleanPassword, salt), createdAt: new Date().toISOString() };
      accounts.push(account);
      saveAccounts(accounts);
      setSession(account);
      emit('SIGNED_IN');
      return { session, account: publicUser(account) };
    },
    async signOut() { setSession(null); emit('SIGNED_OUT'); },
    async resetPassword() { throw new Error('Password recovery is unavailable for temporary local accounts.'); },
    async updatePassword(password) {
      const account = session && readAccounts().find(item => item.id === session.user.id);
      if (!account) throw new Error('Sign in again before changing the password.');
      const cleanPassword = validatePassword(password);
      account.salt = randomSalt();
      account.passwordHash = await hashPassword(cleanPassword, account.salt);
      const accounts = readAccounts().map(item => item.id === account.id ? account : item);
      saveAccounts(accounts);
      setSession(account);
      emit('USER_UPDATED');
    }
  };
  window.BrainAuth = api;
})();
