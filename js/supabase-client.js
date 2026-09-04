(() => {
  'use strict';
  const config = window.APP_CONFIG || {};
  const valid = typeof window.supabase !== 'undefined' && typeof config.supabaseUrl === 'string' && config.supabaseUrl.startsWith('https://') && !config.supabaseUrl.includes('YOUR_PROJECT') && typeof config.supabaseAnonKey === 'string' && config.supabaseAnonKey.length > 20 && !config.supabaseAnonKey.includes('YOUR_PUBLIC');
  window.BrainSupabase = {
    configured: valid,
    client: valid ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null,
    message: valid ? '' : 'Add your Supabase URL and public anon key to js/config.js to enable owner access and cloud storage.'
  };
})();
