/**
 * firebase-init.js
 * Firebase SDK load kore, initialize kore, shob jayga theke access er jonno
 * global `db`, `auth`, `storage` object ready kore.
 *
 * Eikhane kono change korte hobe na. Shob config firebase-config.js theke ashbe.
 */

// Load Firebase SDK (compat version — easy to use without bundler)
(function loadFirebase() {
  const scripts = [
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
  ];

  let loaded = 0;
  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // serial load
    s.onload = () => {
      loaded++;
      if (loaded === scripts.length) {
        initFirebase();
      }
    };
    s.onerror = () => {
      console.error('Failed to load:', src);
      document.dispatchEvent(new CustomEvent('firebase-load-error'));
    };
    document.head.appendChild(s);
  });
})();

function initFirebase() {
  if (!window.firebaseConfig) {
    console.error('firebase-config.js load hoi nai ba config set kora nai.');
    document.dispatchEvent(new CustomEvent('firebase-load-error'));
    return;
  }

  try {
    firebase.initializeApp(window.firebaseConfig);
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    // Storage is OPTIONAL — wrap in try/catch so the rest still works
    // if the user is on the free Spark plan (no Storage enabled).
    try {
      window.storage = firebase.storage();
    } catch (storageErr) {
      console.warn('[Exit Excit] Firebase Storage not enabled — image upload will be disabled. Use Imgur/GitHub URLs instead. See README.');
      window.storage = null;
    }

    // Signal: ready
    document.dispatchEvent(new CustomEvent('firebase-ready'));
    console.log('[Exit Excit] Firebase ready. Storage:', window.storage ? 'ON' : 'OFF');
  } catch (err) {
    console.error('[Exit Excit] Firebase init failed:', err);
    document.dispatchEvent(new CustomEvent('firebase-load-error'));
  }
}

/**
 * Helper: check if Firebase is configured properly
 */
function isFirebaseConfigured() {
  const c = window.firebaseConfig;
  if (!c) return false;
  if (!c.apiKey || c.apiKey.includes('YOUR_API_KEY')) return false;
  if (!c.projectId || c.projectId === 'YOUR_PROJECT_ID') return false;
  return true;
}
window.isFirebaseConfigured = isFirebaseConfigured;
