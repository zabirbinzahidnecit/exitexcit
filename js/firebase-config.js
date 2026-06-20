/**
 * ============================================================
 *  FIREBASE CONFIGURATION — apni ekhane apnar Firebase config bosaben
 * ============================================================
 *
 *  KIVABE CONFIG PAIBEN:
 *  1. https://console.firebase.google.com e jan
 *  2. Apnar project e dhukun (ba notun project banan)
 *  3. Project Overview → "Web app" icon (</>) e click korun
 *     (na thakle "Add app" → Web e click korun)
 *  4. App er nam din (jemon: "Exit Excit Website")
 *  5. "Register app" e click korun
 *  6. Next page e apni ekta code block dekhben jemon:
 *
 *       const firebaseConfig = {
 *         apiKey: "AIza...",
 *         authDomain: "yourproject.firebaseapp.com",
 *         projectId: "yourproject",
 *         storageBucket: "yourproject.appspot.com",
 *         messagingSenderId: "1234567890",
 *         appId: "1:1234:web:abcd"
 *       };
 *
 *  7. Shob value niche bosaben. SHUDHU "" er bhitorer value gulo.
 *
 *  8. SEI SOTHE Firestore, Authentication, Storage shob enable korte hobe.
 *     Details README.md file e ache.
 * ============================================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyBAkxZojc9oJKJMHiHEy874CwZLtXADqmE",
  authDomain: "exit-excit-web.firebaseapp.com",
  projectId: "exit-excit-web",
  storageBucket: "exit-excit-web.firebasestorage.app",
  messagingSenderId: "992298768880",
  appId: "1:992298768880:web:8b84593d85d930086e2535"
};

// Export kore dao global vabe (no module system needed for GitHub Pages)
window.firebaseConfig = firebaseConfig;

// ============================================================
//  GITHUB CONFIGURATION — media files (images, videos, audio)
//  GitHub repository theke media select korte eta fill korun
// ============================================================
//
//  KIVABE SETUP KORBEN:
//  1. GitHub e apnar website repository te jaan
//  2. Notun folders banan: images/, videos/, media/ (audio er jonno)
//  3. Shei folders e apnar image/video/audio file gulo upload korun
//  4. Niche 'YOUR_GITHUB_USERNAME' r 'YOUR_REPO_NAME' change korun
//
//  EXAMPLE:
//   owner: "exitexcit",
//   repo: "exitexcit.github.io",
//
// ============================================================

window.githubConfig = {
  owner: 'YOUR_GITHUB_USERNAME',   // ← apnar GitHub username
  repo: 'YOUR_REPO_NAME',         // ← apnar repo name (e.g. exitexcit.github.io)
  branch: 'main',                  // usually 'main' or 'master'
  imagesPath: 'images',            // images/ folder path repo te
  videosPath: 'videos',            // videos/ folder path repo te
  audioPath: 'media',              // audio/ folder path repo te
};
