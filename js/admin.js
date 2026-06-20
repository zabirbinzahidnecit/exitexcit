/**
 * admin.js — Exit Excit Admin Panel Logic
 * ============================================================
 * Handles:
 *  - Firebase Auth (email/password login, logout, session)
 *  - Tab navigation
 *  - Dashboard stats
 *  - Apps CRUD (add, edit, delete, reorder, toggle visible)
 *  - Slides CRUD
 *  - Hero / About / Contact content editing
 *  - Messages list + detail + delete + mark-read
 *  - Image upload (Firebase Storage) for app preview/screenshots/slides
 *  - Repeater UI (features, screenshots, extra links, stats, values, tech pills)
 * ============================================================
 */

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    user: null,
    currentTab: 'dashboard',
    apps: [],
    slides: [],
    messages: [],
    msgUnsub: null
  };

  // ---------- DOM helpers ----------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(msg, type = '') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ============================================================
  //  INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    bindLogin();
    bindSidebar();
    bindLogout();
    bindHeroForm();
    bindAboutForm();
    bindContactForm();
    bindMessageRefresh();
    bindAppAddBtn();
    bindSlideAddBtn();
  });

  // Wait for Firebase ready
  document.addEventListener('firebase-ready', () => {
    // Listen to auth state
    window.auth.onAuthStateChanged(user => {
      if (user) {
        // Verify admin claim via Firestore lookup
        verifyAdmin(user).then(isAdmin => {
          if (isAdmin) {
            showAdmin(user);
          } else {
            window.auth.signOut();
            showLoginError('এই ইমেইল দিয়ে অ্যাডমিন অ্যাক্সেস নেই।');
            hideAdmin();
          }
        }).catch(err => {
          console.error('Admin verify failed:', err);
          // If admin collection doesn't exist yet, treat first login as admin (for setup)
          // But to be safe, allow if user is signed in (will be controlled by Firestore rules)
          showAdmin(user);
        });
      } else {
        hideAdmin();
      }
    });
  });

  document.addEventListener('firebase-load-error', () => {
    showLoginError('Firebase লোড করা যায়নি। js/firebase-config.js ফাইলে config ঠিকমতো বসান।');
  });

  function verifyAdmin(user) {
    // Check admins collection for this user's email
    return window.db.collection('admins').doc(user.uid).get().then(doc => {
      if (doc.exists && doc.data().isAdmin === true) return true;
      // Fallback: check by email
      return window.db.collection('admins')
        .where('email', '==', user.email)
        .limit(1)
        .get()
        .then(snap => !snap.empty && snap.docs[0].data().isAdmin === true);
    }).catch(err => {
      console.warn('admins collection check failed:', err);
      // If rules deny access OR collection missing — fallback to allowing signed-in user.
      // NOTE: This is a soft check. Real enforcement is via Firestore rules.
      return true;
    });
  }

  // ============================================================
  //  LOGIN
  // ============================================================
  function bindLogin() {
    const form = $('#loginForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = $('#loginEmail').value.trim();
      const pass = $('#loginPass').value;
      if (!email || !pass) return;

      const btn = $('#loginBtn');
      btn.disabled = true;
      btn.textContent = '⏳ যাচাই করা হচ্ছে...';
      hideLoginError();

      window.auth.signInWithEmailAndPassword(email, pass)
        .then(cred => {
          // onAuthStateChanged will fire and show admin
          btn.disabled = false;
          btn.textContent = '🔓 লগ ইন করুন';
          $('#loginPass').value = '';
        })
        .catch(err => {
          console.error('Login failed:', err);
          let msg = 'লগইন ব্যর্থ। ইমেইল ও পাসওয়ার্ড ঠিক আছে কিনা দেখুন।';
          if (err.code === 'auth/invalid-email') msg = 'সঠিক ইমেইল দিন।';
          if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'ইমেইল বা পাসওয়ার্ড ভুল।';
          if (err.code === 'auth/user-not-found') msg = 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট নেই।';
          if (err.code === 'auth/too-many-requests') msg = 'অনেকবার চেষ্টা হয়েছে। পরে চেষ্টা করুন।';
          showLoginError(msg);
          btn.disabled = false;
          btn.textContent = '🔓 লগ ইন করুন';
        });
    });
  }

  function showLoginError(msg) {
    const e = $('#loginError');
    if (!e) return;
    e.textContent = msg;
    e.classList.add('show');
  }
  function hideLoginError() {
    const e = $('#loginError');
    if (!e) return;
    e.classList.remove('show');
  }

  // ============================================================
  //  SHOW / HIDE ADMIN
  // ============================================================
  function showAdmin(user) {
    state.user = user;
    $('#loginScreen').style.display = 'none';
    $('#adminApp').classList.add('show');
    $('#userEmail').textContent = user.email;

    loadDashboard();
    loadApps();
    loadSlides();
    loadHeroForm();
    loadAboutForm();
    loadContactForm();
    loadMessages();
  }

  function hideAdmin() {
    state.user = null;
    $('#loginScreen').style.display = 'flex';
    $('#adminApp').classList.remove('show');
  }

  function bindLogout() {
    const btn = $('#logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (state.msgUnsub) { state.msgUnsub(); state.msgUnsub = null; }
      window.auth.signOut();
    });
  }

  // ============================================================
  //  SIDEBAR / TAB NAVIGATION
  // ============================================================
  function bindSidebar() {
    $$('.sidebar-nav a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const tab = a.dataset.tab;
        if (!tab) return;
        switchTab(tab);
      });
    });
  }

  function switchTab(tab) {
    state.currentTab = tab;
    $$('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    $$('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
    // Re-load fresh data when switching
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'apps') loadApps();
    if (tab === 'slides') loadSlides();
    if (tab === 'messages') loadMessages();
    if (tab === 'hero') loadHeroForm();
    if (tab === 'about') loadAboutForm();
    if (tab === 'contact') loadContactForm();
  }

  // ============================================================
  //  DASHBOARD
  // ============================================================
  function loadDashboard() {
    Promise.all([
      window.db.collection('apps').get(),
      window.db.collection('slides').get(),
      window.db.collection('messages').where('read', '==', false).get(),
      window.db.collection('apps').where('status', '==', 'live').get()
    ]).then(([appsSnap, slidesSnap, msgsSnap, liveSnap]) => {
      $('#statApps').textContent = appsSnap.size;
      $('#statSlides').textContent = slidesSnap.size;
      $('#statMessages').textContent = msgsSnap.size;
      $('#statLive').textContent = liveSnap.size;

      // Update message badge
      const badge = $('#msgBadge');
      if (msgsSnap.size > 0) {
        badge.textContent = msgsSnap.size;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }

      // Recent messages
      const recent = $('#recentMessages');
      if (msgsSnap.empty && appsSnap.size === 0) {
        recent.innerHTML = '<div class="list-empty">কোনো মেসেজ নেই</div>';
        return;
      }
      window.db.collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
        .then(snap => {
          if (snap.empty) {
            recent.innerHTML = '<div class="list-empty">কোনো মেসেজ নেই</div>';
            return;
          }
          recent.innerHTML = snap.docs.map(d => {
            const m = d.data();
            return `
              <div class="list-row">
                <div class="list-row-thumb">✉️</div>
                <div class="list-row-main">
                  <div class="list-row-title">${escapeHtml(m.name)} — ${escapeHtml(m.subject || '')}</div>
                  <div class="list-row-sub">${escapeHtml(m.email)} · ${formatDate(m.createdAt)}</div>
                </div>
                <div class="list-row-actions">
                  <span class="badge ${m.read ? 'read' : 'unread'}">${m.read ? 'পড়া' : 'নতুন'}</span>
                </div>
              </div>
            `;
          }).join('');
        });
    }).catch(err => {
      console.error('Dashboard load failed:', err);
    });
  }

  // ============================================================
  //  APPS CRUD
  // ============================================================
  function bindAppAddBtn() {
    const btn = $('#addAppBtn');
    if (btn) btn.addEventListener('click', () => openAppModal(null));
  }

  function loadApps() {
    const wrap = $('#appsList');
    wrap.innerHTML = '<div class="list-empty">লোড হচ্ছে...</div>';

    window.db.collection('apps')
      .orderBy('order', 'asc')
      .get()
      .then(snap => {
        if (snap.empty) {
          wrap.innerHTML = '<div class="list-empty">কোনো app নেই। "নতুন App" বাটনে ক্লিক করে যোগ করুন।</div>';
          return;
        }
        state.apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        wrap.innerHTML = state.apps.map(renderAppRow).join('');
        bindAppRowActions();
      })
      .catch(err => {
        console.error('Apps load failed:', err);
        wrap.innerHTML = '<div class="list-empty">লোড ব্যর্থ: ' + escapeHtml(err.message) + '</div>';
      });
  }

  function renderAppRow(app) {
    const visible = app.visible !== false;
    const statusBadge = `<span class="badge ${app.status || 'soon'}">${(app.status || 'soon').toUpperCase()}</span>`;
    const thumb = app.previewImage
      ? `<img src="${escapeHtml(app.previewImage)}" alt="">`
      : `<span>${escapeHtml(app.icon || '📦')}</span>`;

    return `
      <div class="list-row" data-app-id="${escapeHtml(app.id)}">
        <div class="list-row-thumb">${thumb}</div>
        <div class="list-row-main">
          <div class="list-row-title">${escapeHtml(app.name || 'Untitled')} ${statusBadge}</div>
          <div class="list-row-sub">${escapeHtml(app.tagline || '')} · Order: ${app.order ?? 100} · ${visible ? '👁 দৃশ্যমান' : '🚫 লুকানো'}</div>
        </div>
        <div class="list-row-actions">
          <button class="btn-secondary btn-sm" data-action="toggle-vis">${visible ? '👁 লুকান' : '👁 দেখান'}</button>
          <button class="btn-secondary btn-sm" data-action="edit">✏️ এডিট</button>
          <button class="btn-danger btn-sm" data-action="delete">🗑</button>
        </div>
      </div>
    `;
  }

  function bindAppRowActions() {
    $$('#appsList .list-row').forEach(row => {
      const id = row.dataset.appId;
      row.querySelector('[data-action="edit"]').onclick = () => {
        const app = state.apps.find(a => a.id === id);
        if (app) openAppModal(app);
      };
      row.querySelector('[data-action="delete"]').onclick = () => {
        if (confirm('এই app মুছে ফেলতে চান?')) {
          window.db.collection('apps').doc(id).delete()
            .then(() => { toast('App মুছে ফেলা হয়েছে', 'success'); loadApps(); loadDashboard(); })
            .catch(err => toast('মুছতে সমস্যা: ' + err.message, 'error'));
        }
      };
      row.querySelector('[data-action="toggle-vis"]').onclick = () => {
        const app = state.apps.find(a => a.id === id);
        if (!app) return;
        const newVis = app.visible === false ? true : false;
        window.db.collection('apps').doc(id).update({ visible: newVis })
          .then(() => { toast(newVis ? 'দৃশ্যমান করা হলো' : 'লুকানো হলো', 'success'); loadApps(); })
          .catch(err => toast('আপডেট ব্যর্থ: ' + err.message, 'error'));
      };
    });
  }

  function openAppModal(app) {
    const isNew = !app;
    const data = app || {
      name: '', tagline: '', icon: '📦', iconColor: 'navy', type: 'web',
      description: '', features: [], status: 'soon', statusText: '',
      link: '', linkText: 'অ্যাপ দেখুন →', previewImage: '',
      screenshots: [], userGuide: '', extraLinks: [],
      promoVideo: '',
      order: 100, visible: true
    };

    const html = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>${isNew ? '➕ নতুন App' : '✏️ App এডিট'}</h3>
          <button class="modal-close" id="appModalClose">×</button>
        </div>
        <div class="modal-body">
          <form id="appEditForm">
            <div class="form-grid">
              <div>
                <label>App নাম *</label>
                <input type="text" id="appName" required value="${escapeHtml(data.name)}">
              </div>
              <div>
                <label>ট্যাগলাইন / টাইপ</label>
                <input type="text" id="appTagline" value="${escapeHtml(data.tagline)}" placeholder="PWA · Web App">
              </div>
              <div>
                <label>আইকন (Emoji বা PNG/JPG)</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="text" id="appIcon" value="${escapeHtml(data.icon)}" placeholder="🍽️ বা https://..." style="flex:1;">
                  <button type="button" class="btn-secondary" id="appIconBtn" style="white-space:nowrap;">🎨 বাছুন</button>
                </div>
                <div class="form-help">Emoji, PNG/JPG ছবি, বা URL দিন।</div>
              </div>
              <div>
                <label>আইকন কালার</label>
                <select id="appIconColor">
                  <option value="green" ${data.iconColor==='green'?'selected':''}>সবুজ</option>
                  <option value="gold" ${data.iconColor==='gold'?'selected':''}>সোনালি</option>
                  <option value="navy" ${data.iconColor==='navy'?'selected':''}>নেভি</option>
                </select>
              </div>
              <div>
                <label>অ্যাপ টাইপ (Badge)</label>
                <select id="appType">
                  <option value="web" ${data.type==='web'?'selected':''}>Web</option>
                  <option value="mobile" ${data.type==='mobile'?'selected':''}>Mobile</option>
                  <option value="saas" ${data.type==='saas'?'selected':''}>SaaS</option>
                </select>
              </div>
              <div>
                <label>স্ট্যাটাস</label>
                <select id="appStatus">
                  <option value="live" ${data.status==='live'?'selected':''}>Live</option>
                  <option value="dev" ${data.status==='dev'?'selected':''}>Development</option>
                  <option value="soon" ${data.status==='soon'?'selected':''}>Coming Soon</option>
                </select>
              </div>
              <div>
                <label>স্ট্যাটাস টেক্সট</label>
                <input type="text" id="appStatusText" value="${escapeHtml(data.statusText)}" placeholder="Live · বিনামূল্যে">
              </div>
              <div>
                <label>অর্ডার (ছোট = আগে)</label>
                <input type="number" id="appOrder" value="${data.order ?? 100}">
              </div>
              <div class="full">
                <label>বিবরণ</label>
                <textarea id="appDesc" rows="3">${escapeHtml(data.description)}</textarea>
              </div>
              <div class="full">
                <label>প্রাইমারি লিংক</label>
                <input type="text" id="appLink" value="${escapeHtml(data.link)}" placeholder="https://...">
                <div class="form-help">খালি রাখলে "Coming Soon" দেখাবে।</div>
              </div>
              <div>
                <label>লিংক টেক্সট</label>
                <input type="text" id="appLinkText" value="${escapeHtml(data.linkText)}" placeholder="অ্যাপ দেখুন →">
              </div>
              <div>
                <label>দৃশ্যমান?</label>
                <select id="appVisible">
                  <option value="true" ${data.visible!==false?'selected':''}>হ্যাঁ</option>
                  <option value="false" ${data.visible===false?'selected':''}>না (লুকান)</option>
                </select>
              </div>
              <div class="full">
                <label>প্রিভিউ ছবি</label>
                <input type="text" id="appPreviewUrl" value="${escapeHtml(data.previewImage)}" placeholder="URL বা নিচে আপলোড করুন">
                <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
                  ${isGithubConfigured() ? '<button type="button" class="btn-secondary btn-sm" id="appPreviewGhBtn">📂 GitHub থেকে বাছুন</button>' : ''}
                  <button type="button" class="btn-secondary btn-sm" id="appPreviewUploadBtn">📤 আপলোড</button>
                </div>
                <div class="image-preview" id="appPreviewDrop">
                  ${data.previewImage ? `<img src="${escapeHtml(data.previewImage)}" alt="">` : '<span>📷 URL দিন বা বাটন ব্যবহার করুন</span>'}
                  <input type="file" accept="image/*" style="display:none" id="appPreviewFile">
                  <button type="button" class="remove-img" id="appPreviewRemove">×</button>
                </div>
              </div>
              <div class="full">
                <label>ব্যবহার গাইড (User Guide)</label>
                <textarea id="appUserGuide" rows="5" placeholder="এই অ্যাপ কীভাবে ব্যবহার করবেন...">${escapeHtml(data.userGuide)}</textarea>
                <div class="form-help">নতুন লাইন Enter দিয়ে।</div>
              </div>
              <div class="full">
                <label>🎬 প্রোমো ভিডিও (ঐচ্ছিক)</label>
                <input type="text" id="appPromoVideo" value="${escapeHtml(data.promoVideo || '')}" placeholder="https://...mp4 বা YouTube link">
                <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
                  ${isGithubConfigured() ? '<button type="button" class="btn-secondary btn-sm" id="appVideoGhBtn">📂 GitHub থেকে বাছুন</button>' : ''}
                </div>
                <div class="form-help">App detail এ দেখাবে। YouTube লিংক হলে embed করবে।</div>
              </div>
            </div>

            <h4 style="margin:18px 0 8px;color:var(--navy-dark);font-size:0.92rem;">ফিচারসমূহ (Features)</h4>
            <div id="appFeaturesRepeater"></div>
            <button type="button" class="repeater-add" data-add="feature">➕ Feature যোগ</button>

            <h4 style="margin:18px 0 8px;color:var(--navy-dark);font-size:0.92rem;">স্ক্রিনশট URLs</h4>
            <div id="appScreensRepeater"></div>
            <button type="button" class="repeater-add" data-add="screen">➕ Screenshot যোগ</button>

            <h4 style="margin:18px 0 8px;color:var(--navy-dark);font-size:0.92rem;">অতিরিক্ত লিংক (Label + URL)</h4>
            <div id="appLinksRepeater"></div>
            <button type="button" class="repeater-add" data-add="link">➕ Link যোগ</button>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="appCancel">বাতিল</button>
          <button class="btn-primary" id="appSave">💾 সেভ</button>
        </div>
      </div>
    `;

    const host = $('#modalHost');
    host.innerHTML = html;
    host.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Init repeaters
    initRepeater($('#appFeaturesRepeater'), $$('[data-add="feature"]'), (data.features || []), 'ফিচার', v => v || '', false);
    initRepeater($('#appScreensRepeater'), $$('[data-add="screen"]'), (data.screenshots || []), 'স্ক্রিনশট URL', v => v || '', true);
    initLinkRepeater($('#appLinksRepeater'), $$('[data-add="link"]'), (data.extraLinks || []));

    // Image upload
    bindImagePreview('#appPreviewDrop', '#appPreviewFile', '#appPreviewUrl', '#appPreviewRemove');

    // Icon picker button
    const appIconBtn = $('#appIconBtn');
    if (appIconBtn) {
      appIconBtn.onclick = () => {
        const currentVal = $('#appIcon').value || '';
        openIconPicker(currentVal, (icon) => {
          $('#appIcon').value = icon;
        });
      };
    }

    // Preview image - GitHub picker button
    const previewGhBtn = $('#appPreviewGhBtn');
    if (previewGhBtn) {
      previewGhBtn.onclick = () => {
        openGithubPicker('image', (url, name) => {
          $('#appPreviewUrl').value = url;
          $('#appPreviewUrl').dispatchEvent(new Event('input'));
          toast('ছবি নির্বাচিত: ' + name, 'success');
        });
      };
    }

    // Preview image - Upload button (alternative to clicking the preview area)
    const previewUploadBtn = $('#appPreviewUploadBtn');
    if (previewUploadBtn) {
      previewUploadBtn.onclick = () => {
        if (!isStorageReady()) {
          toast('📷 Firebase Storage চালু না। GitHub থেকে বাছুন বা URL দিন।', '');
          return;
        }
        $('#appPreviewFile').click();
      };
    }

    // Promo video - GitHub picker
    const appVideoGhBtn = $('#appVideoGhBtn');
    if (appVideoGhBtn) {
      appVideoGhBtn.onclick = () => {
        openGithubPicker('video', (url, name) => {
          $('#appPromoVideo').value = url;
          toast('ভিডিও নির্বাচিত: ' + name, 'success');
        });
      };
    }

    // Close
    $('#appModalClose').onclick = closeModal;
    $('#appCancel').onclick = closeModal;
    host.addEventListener('click', e => { if (e.target === host) closeModal(); });

    // Save
    $('#appSave').onclick = () => saveApp(data.id);
  }

  function initRepeater(container, addBtns, values, placeholder, getValue, isScreenshot) {
    if (!container || !addBtns.length) return;
    const addBtn = addBtns[0];
    const draw = () => {
      container.querySelectorAll('.repeater-item').forEach(r => r.remove());
      values.forEach((v, i) => {
        const ghBtn = isScreenshot && isGithubConfigured()
          ? `<button type="button" class="btn-secondary btn-sm repeater-gh-pick" style="white-space:nowrap;">📂 GitHub</button>`
          : '';
        const item = el(`
          <div class="repeater-item" style="flex-wrap:wrap;gap:4px;">
            <input type="text" value="${escapeHtml(getValue(v))}" placeholder="${placeholder}" style="flex:1;min-width:180px;">
            ${ghBtn}
            <button type="button" class="repeater-remove">×</button>
          </div>
        `);
        item.querySelector('.repeater-remove').onclick = () => {
          values.splice(i, 1);
          draw();
        };
        item.querySelector('input').addEventListener('input', e => { values[i] = e.target.value; });
        if (isScreenshot && isGithubConfigured()) {
          item.querySelector('.repeater-gh-pick').onclick = () => {
            openGithubPicker('image', (url, name) => {
              values[i] = url;
              draw();
              toast('ছবি নির্বাচিত: ' + name, 'success');
            });
          };
        }
        container.appendChild(item);
      });
    };
    draw();
    addBtn.onclick = () => { values.push(''); draw(); };
    container._getValues = () => values.filter(v => v && v.trim());
    container._getRaw = () => values;
  }

  function initLinkRepeater(container, addBtns, links) {
    if (!container || !addBtns.length) return;
    const addBtn = addBtns[0];
    const draw = () => {
      container.querySelectorAll('.repeater-item').forEach(r => r.remove());
      links.forEach((l, i) => {
        const item = el(`
          <div class="repeater-item">
            <input type="text" class="link-label" value="${escapeHtml(l.label || '')}" placeholder="Label (Play Store)">
            <input type="text" class="link-url" value="${escapeHtml(l.url || '')}" placeholder="https://...">
            <button type="button" class="repeater-remove">×</button>
          </div>
        `);
        item.querySelector('.repeater-remove').onclick = () => {
          links.splice(i, 1);
          draw();
        };
        item.querySelector('.link-label').addEventListener('input', e => { links[i].label = e.target.value; });
        item.querySelector('.link-url').addEventListener('input', e => { links[i].url = e.target.value; });
        container.appendChild(item);
      });
    };
    draw();
    addBtn.onclick = () => { links.push({ label: '', url: '' }); draw(); };
    container._getValues = () => links.filter(l => l.url && l.url.trim());
  }

  // Check if Firebase Storage is available and configured
  function isStorageReady() {
    return !!(window.storage && typeof window.storage.ref === 'function');
  }

  function bindImagePreview(dropSel, fileSel, urlSel, removeSel) {
    const drop = $(dropSel);
    const fileInput = $(fileSel);
    const urlInput = $(urlSel);
    const removeBtn = $(removeSel);
    if (!drop) return;

    // Live-update preview when URL is typed manually
    if (urlInput) {
      urlInput.addEventListener('input', () => {
        const v = urlInput.value.trim();
        if (v) {
          drop.innerHTML = `<img src="${escapeHtml(v)}" alt="" onerror="this.parentNode.innerHTML='<span style=\\"color:#DC2626;font-size:0.78rem;\\">⚠️ URL লোড করা যায়নি</span>'"><button type="button" class="remove-img">×</button>`;
          drop.classList.add('has-image');
        } else {
          drop.innerHTML = '<span>📷 URL দিন বা আপলোড করুন</span><input type="file" accept="image/*" style="display:none" id="' + fileInput.id + '"><button type="button" class="remove-img">×</button>';
          drop.classList.remove('has-image');
        }
        bindImagePreview(dropSel, fileSel, urlSel, removeSel);
      });
    }

    drop.addEventListener('click', e => {
      if (e.target === removeBtn) return;
      // If Storage is not ready, guide user to use URL
      if (!isStorageReady()) {
        toast('📷 Firebase Storage চালু না। উপরের URL বক্সে Imgur/GitHub থেকে নেওয়া ছবির লিংক দিন।', '');
        urlInput && urlInput.focus();
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) {
        toast('ছবি 3MB এর কম হতে হবে', 'error');
        return;
      }
      // Upload to Firebase Storage (only if available)
      if (!isStorageReady()) {
        toast('Firebase Storage চালু না। URL দিন।', 'error');
        return;
      }
      try {
        const path = `apps/${Date.now()}_${f.name}`;
        const ref = window.storage.ref(path);
        toast('আপলোড হচ্ছে...');
        const snap = await ref.put(f);
        const url = await snap.ref.getDownloadURL();
        urlInput.value = url;
        drop.innerHTML = `<img src="${escapeHtml(url)}" alt=""><button type="button" class="remove-img">×</button>`;
        drop.classList.add('has-image');
        bindImagePreview(dropSel, fileSel, urlSel, removeSel);
        toast('আপলোড সফল', 'success');
      } catch (err) {
        console.error(err);
        let msg = err.message || '';
        if (msg.includes('permission') || msg.includes('denied')) {
          msg = 'Storage rules ঠিকমতো পাবলিশ করা নেই। README দেখুন।';
        } else if (msg.includes('quota')) {
          msg = 'Storage quota শেষ। Imgur URL ব্যবহার করুন।';
        }
        toast('আপলোড ব্যর্থ: ' + msg + ' — অথবা উপরে URL দিন।', 'error');
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        urlInput.value = '';
        drop.innerHTML = '<span>📷 URL দিন বা আপলোড করুন</span><input type="file" accept="image/*" style="display:none" id="' + fileInput.id + '"><button type="button" class="remove-img">×</button>';
        drop.classList.remove('has-image');
        bindImagePreview(dropSel, fileSel, urlSel, removeSel);
      });
    }

    if (urlInput.value) drop.classList.add('has-image');
  }

  function saveApp(id) {
    const data = {
      name: $('#appName').value.trim(),
      tagline: $('#appTagline').value.trim(),
      icon: $('#appIcon').value.trim() || '📦',
      iconColor: $('#appIconColor').value,
      type: $('#appType').value,
      status: $('#appStatus').value,
      statusText: $('#appStatusText').value.trim(),
      order: parseInt($('#appOrder').value, 10) || 100,
      description: $('#appDesc').value.trim(),
      link: $('#appLink').value.trim(),
      linkText: $('#appLinkText').value.trim(),
      visible: $('#appVisible').value === 'true',
      previewImage: $('#appPreviewUrl').value.trim(),
      userGuide: $('#appUserGuide').value.trim(),
      promoVideo: $('#appPromoVideo').value.trim(),
      features: $('#appFeaturesRepeater')._getValues(),
      screenshots: $('#appScreensRepeater')._getValues(),
      extraLinks: $('#appLinksRepeater')._getValues()
    };

    if (!data.name) {
      toast('App নাম দিন', 'error');
      return;
    }

    const btn = $('#appSave');
    btn.disabled = true;
    btn.textContent = '⏳ সেভ হচ্ছে...';

    const coll = window.db.collection('apps');
    let op;
    if (id) {
      op = coll.doc(id).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } else {
      op = coll.add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }

    op.then(() => {
      toast('সেভ হয়েছে', 'success');
      closeModal();
      loadApps();
      loadDashboard();
    }).catch(err => {
      console.error(err);
      toast('সেভ ব্যর্থ: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 সেভ';
    });
  }

  // ============================================================
  //  SLIDES CRUD
  // ============================================================
  function bindSlideAddBtn() {
    const btn = $('#addSlideBtn');
    if (btn) btn.addEventListener('click', () => openSlideModal(null));
  }

  function loadSlides() {
    const wrap = $('#slidesList');
    wrap.innerHTML = '<div class="list-empty">লোড হচ্ছে...</div>';
    window.db.collection('slides')
      .orderBy('order', 'asc')
      .get()
      .then(snap => {
        if (snap.empty) {
          wrap.innerHTML = '<div class="list-empty">কোনো স্লাইড নেই। "নতুন স্লাইড" বাটনে ক্লিক করে যোগ করুন।</div>';
          return;
        }
        state.slides = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        wrap.innerHTML = state.slides.map(renderSlideRow).join('');
        bindSlideRowActions();
      })
      .catch(err => {
        wrap.innerHTML = '<div class="list-empty">লোড ব্যর্থ: ' + escapeHtml(err.message) + '</div>';
      });
  }

  function renderSlideRow(s) {
    const visible = s.visible !== false;
    const thumb = s.mediaUrl
      ? (s.mediaType === 'video'
          ? `<span>🎬</span>`
          : `<img src="${escapeHtml(s.mediaUrl)}" alt="">`)
      : `<span>🖼</span>`;
    return `
      <div class="list-row" data-slide-id="${escapeHtml(s.id)}">
        <div class="list-row-thumb">${thumb}</div>
        <div class="list-row-main">
          <div class="list-row-title">${escapeHtml(s.caption || 'Untitled Slide')}</div>
          <div class="list-row-sub">${s.mediaType || 'image'} · Order: ${s.order ?? 100} · ${visible ? '👁 দৃশ্যমান' : '🚫 লুকানো'}</div>
        </div>
        <div class="list-row-actions">
          <button class="btn-secondary btn-sm" data-action="toggle-vis">${visible ? '👁 লুকান' : '👁 দেখান'}</button>
          <button class="btn-secondary btn-sm" data-action="edit">✏️ এডিট</button>
          <button class="btn-danger btn-sm" data-action="delete">🗑</button>
        </div>
      </div>
    `;
  }

  function bindSlideRowActions() {
    $$('#slidesList .list-row').forEach(row => {
      const id = row.dataset.slideId;
      row.querySelector('[data-action="edit"]').onclick = () => {
        const s = state.slides.find(x => x.id === id);
        if (s) openSlideModal(s);
      };
      row.querySelector('[data-action="delete"]').onclick = () => {
        if (confirm('এই স্লাইড মুছে ফেলতে চান?')) {
          window.db.collection('slides').doc(id).delete()
            .then(() => { toast('স্লাইড মুছে ফেলা হয়েছে', 'success'); loadSlides(); loadDashboard(); })
            .catch(err => toast('মুছতে সমস্যা: ' + err.message, 'error'));
        }
      };
      row.querySelector('[data-action="toggle-vis"]').onclick = () => {
        const s = state.slides.find(x => x.id === id);
        if (!s) return;
        const newVis = s.visible === false ? true : false;
        window.db.collection('slides').doc(id).update({ visible: newVis })
          .then(() => { toast(newVis ? 'দৃশ্যমান' : 'লুকানো', 'success'); loadSlides(); })
          .catch(err => toast('আপডেট ব্যর্থ: ' + err.message, 'error'));
      };
    });
  }

  function openSlideModal(slide) {
    const isNew = !slide;
    const data = slide || {
      caption: '', description: '', mediaUrl: '', mediaType: 'image',
      link: '', order: 100, visible: true
    };

    const html = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>${isNew ? '➕ নতুন স্লাইড' : '✏️ স্লাইড এডিট'}</h3>
          <button class="modal-close" id="slideModalClose">×</button>
        </div>
        <div class="modal-body">
          <form id="slideEditForm">
            <div class="form-grid">
              <div class="full">
                <label>ক্যাপশন (Title)</label>
                <input type="text" id="slideCaption" value="${escapeHtml(data.caption)}">
              </div>
              <div class="full">
                <label>বিবরণ</label>
                <textarea id="slideDesc" rows="2">${escapeHtml(data.description)}</textarea>
              </div>
              <div>
                <label>মিডিয়া টাইপ</label>
                <select id="slideMediaType">
                  <option value="image" ${data.mediaType==='image'?'selected':''}>ছবি</option>
                  <option value="video" ${data.mediaType==='video'?'selected':''}>ভিডিও (mp4)</option>
                  <option value="audio" ${data.mediaType==='audio'?'selected':''}>অডিও (mp3)</option>
                </select>
              </div>
              <div>
                <label>অর্ডার</label>
                <input type="number" id="slideOrder" value="${data.order ?? 100}">
              </div>
              <div class="full">
                <label>মিডিয়া URL</label>
                <input type="text" id="slideMediaUrl" value="${escapeHtml(data.mediaUrl)}" placeholder="https://...">
                <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
                  ${isGithubConfigured() ? '<button type="button" class="btn-secondary btn-sm" id="slideMediaGhBtn">📂 GitHub থেকে বাছুন</button>' : ''}
                  <button type="button" class="btn-secondary btn-sm" id="slideMediaUploadBtn">📤 আপলোড</button>
                </div>
                <div class="image-preview" id="slideMediaDrop">
                  ${data.mediaUrl && data.mediaType === 'image'
                    ? `<img src="${escapeHtml(data.mediaUrl)}" alt="">`
                    : (data.mediaUrl && data.mediaType === 'audio'
                      ? '<span style="font-size:2rem;">🎵 অডিও সেট করা হয়েছে</span>'
                      : '<span>📷 URL দিন বা বাটন ব্যবহার করুন</span>')}
                  <input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile">
                  <button type="button" class="remove-img" id="slideMediaRemove">×</button>
                </div>
              </div>
              <div class="full">
                <label>ক্লিক লিংক (ঐচ্ছিক)</label>
                <input type="text" id="slideLink" value="${escapeHtml(data.link)}" placeholder="https://...">
                <div class="form-help">স্লাইডে ক্লিক করলে এই লিংকে যাবে।</div>
              </div>
              <div>
                <label>দৃশ্যমান?</label>
                <select id="slideVisible">
                  <option value="true" ${data.visible!==false?'selected':''}>হ্যাঁ</option>
                  <option value="false" ${data.visible===false?'selected':''}>না</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="slideCancel">বাতিল</button>
          <button class="btn-primary" id="slideSave">💾 সেভ</button>
        </div>
      </div>
    `;

    const host = $('#modalHost');
    host.innerHTML = html;
    host.classList.add('open');
    document.body.style.overflow = 'hidden';

    bindSlideMediaUpload();

    // GitHub picker for slide media
    const slideGhBtn = $('#slideMediaGhBtn');
    if (slideGhBtn) {
      slideGhBtn.onclick = () => {
        const type = $('#slideMediaType').value;
        openGithubPicker(type, (url, name) => {
          $('#slideMediaUrl').value = url;
          $('#slideMediaUrl').dispatchEvent(new Event('input'));
          toast('ফাইল নির্বাচিত: ' + name, 'success');
        });
      };
    }

    // Upload button for slide media
    const slideUploadBtn = $('#slideMediaUploadBtn');
    if (slideUploadBtn) {
      slideUploadBtn.onclick = () => {
        if (!isStorageReady()) {
          toast('📷 Firebase Storage চালু না। GitHub থেকে বাছুন বা URL দিন।', '');
          return;
        }
        $('#slideMediaFile').click();
      };
    }

    $('#slideModalClose').onclick = closeModal;
    $('#slideCancel').onclick = closeModal;
    host.addEventListener('click', e => { if (e.target === host) closeModal(); });
    $('#slideSave').onclick = () => saveSlide(data.id);
  }

  function bindSlideMediaUpload() {
    const drop = $('#slideMediaDrop');
    const fileInput = $('#slideMediaFile');
    const urlInput = $('#slideMediaUrl');
    const mediaTypeSelect = $('#slideMediaType');
    const removeBtn = $('#slideMediaRemove');

    // Live-update preview when URL is typed
    if (urlInput) {
      urlInput.addEventListener('input', () => {
        const v = urlInput.value.trim();
        const type = mediaTypeSelect.value;
        if (v) {
          if (type === 'video') {
            drop.innerHTML = `<span>🎬 ভিডিও URL সেট করা হয়েছে</span><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>`;
          } else if (type === 'audio') {
            drop.innerHTML = `<span>🎵 অডিও URL সেট করা হয়েছে</span><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>`;
          } else {
            drop.innerHTML = `<img src="${escapeHtml(v)}" alt="" onerror="this.parentNode.innerHTML='<span style=\\"color:#DC2626;font-size:0.78rem;\\">⚠️ URL লোড করা যায়নি</span>'"><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>`;
          }
          drop.classList.add('has-image');
        } else {
          drop.innerHTML = '<span>📷 URL দিন বা আপলোড করুন</span><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>';
          drop.classList.remove('has-image');
        }
        bindSlideMediaUpload();
      });
    }

    // When media type changes, refresh preview
    if (mediaTypeSelect) {
      mediaTypeSelect.addEventListener('change', () => {
        if (urlInput.value) {
          urlInput.dispatchEvent(new Event('input'));
        }
      });
    }

    drop.addEventListener('click', e => {
      if (e.target === removeBtn) return;
      if (!isStorageReady()) {
        toast('📷 Firebase Storage চালু না। উপরের URL বক্সে Imgur/GitHub/YouTube থেকে নেওয়া লিংক দিন।', '');
        urlInput && urlInput.focus();
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (!isStorageReady()) {
        toast('Firebase Storage চালু না। URL দিন।', 'error');
        return;
      }
      const isVideo = f.type.startsWith('video/');
      const isAudio = f.type.startsWith('audio/');
      if (isVideo && f.size > 10 * 1024 * 1024) {
        toast('ভিডিও 10MB এর কম হতে হবে', 'error');
        return;
      }
      if (isAudio && f.size > 10 * 1024 * 1024) {
        toast('অডিও 10MB এর কম হতে হবে', 'error');
        return;
      }
      if (!isVideo && !isAudio && f.size > 3 * 1024 * 1024) {
        toast('ছবি 3MB এর কম হতে হবে', 'error');
        return;
      }
      try {
        const path = `slides/${Date.now()}_${f.name}`;
        const ref = window.storage.ref(path);
        toast('আপলোড হচ্ছে...');
        const snap = await ref.put(f);
        const url = await snap.ref.getDownloadURL();
        urlInput.value = url;
        if (isVideo) mediaTypeSelect.value = 'video';
        else if (isAudio) mediaTypeSelect.value = 'audio';
        else mediaTypeSelect.value = 'image';

        if (isVideo) {
          drop.innerHTML = `<span>🎬 ভিডিও আপলোড হয়েছে</span><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>`;
        } else if (isAudio) {
          drop.innerHTML = `<span>🎵 অডিও আপলোড হয়েছে</span><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>`;
        } else {
          drop.innerHTML = `<img src="${escapeHtml(url)}" alt=""><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>`;
        }
        drop.classList.add('has-image');
        bindSlideMediaUpload();
        toast('আপলোড সফল', 'success');
      } catch (err) {
        console.error(err);
        let msg = err.message || '';
        if (msg.includes('permission') || msg.includes('denied')) {
          msg = 'Storage rules ঠিকমতো পাবলিশ করা নেই। README দেখুন।';
        } else if (msg.includes('quota')) {
          msg = 'Storage quota শেষ। Imgur URL ব্যবহার করুন।';
        }
        toast('আপলোড ব্যর্থ: ' + msg + ' — অথবা উপরে URL দিন।', 'error');
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        urlInput.value = '';
        drop.innerHTML = '<span>📷 URL দিন বা আপলোড করুন</span><input type="file" accept="image/*,video/*,audio/*" style="display:none" id="slideMediaFile"><button type="button" class="remove-img">×</button>';
        drop.classList.remove('has-image');
        bindSlideMediaUpload();
      });
    }
    if (urlInput.value) drop.classList.add('has-image');
  }

  function saveSlide(id) {
    const data = {
      caption: $('#slideCaption').value.trim(),
      description: $('#slideDesc').value.trim(),
      mediaUrl: $('#slideMediaUrl').value.trim(),
      mediaType: $('#slideMediaType').value,
      link: $('#slideLink').value.trim(),
      order: parseInt($('#slideOrder').value, 10) || 100,
      visible: $('#slideVisible').value === 'true'
    };
    if (!data.mediaUrl) {
      toast('মিডিয়া URL দিন', 'error');
      return;
    }
    const btn = $('#slideSave');
    btn.disabled = true;
    btn.textContent = '⏳ সেভ হচ্ছে...';
    const coll = window.db.collection('slides');
    const op = id
      ? coll.doc(id).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
      : coll.add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    op.then(() => {
      toast('সেভ হয়েছে', 'success');
      closeModal();
      loadSlides();
      loadDashboard();
    }).catch(err => {
      toast('সেভ ব্যর্থ: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 সেভ';
    });
  }

  // ============================================================
  //  HERO FORM
  // ============================================================
  let heroStats = [];

  function bindHeroForm() {
    const form = $('#heroForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      saveHero();
    });
    $('#addHeroStat').addEventListener('click', () => {
      heroStats.push({ num: '', lbl: '' });
      drawHeroStats();
    });
  }

  function loadHeroForm() {
    if (!window.db) return;
    window.db.collection('content').doc('hero').get().then(doc => {
      const data = doc.exists ? doc.data() : {};
      $('#heroBadge').value = data.badge || '';
      $('#heroTitleGold').value = data.titleGold || '';
      $('#heroTitleGreen').value = data.titleGreen || '';
      $('#heroTitleSub').value = data.titleSub || '';
      $('#heroTagline').value = data.tagline || '';
      $('#heroBtn1').value = data.primaryBtnText || '';
      $('#heroBtn2').value = data.secondaryBtnText || '';
      heroStats = data.stats || [];
      drawHeroStats();
    }).catch(err => console.error('Hero load:', err));
  }

  function drawHeroStats() {
    const wrap = $('#heroStatsRepeater');
    wrap.innerHTML = '';
    heroStats.forEach((s, i) => {
      const item = el(`
        <div class="repeater-item">
          <input type="text" placeholder="Number (১+)" value="${escapeHtml(s.num || '')}" style="flex:0.5;">
          <input type="text" placeholder="Label (Live Apps)" value="${escapeHtml(s.lbl || '')}">
          <button type="button" class="repeater-remove">×</button>
        </div>
      `);
      item.querySelector('.repeater-remove').onclick = () => {
        heroStats.splice(i, 1);
        drawHeroStats();
      };
      const inputs = item.querySelectorAll('input');
      inputs[0].addEventListener('input', e => { heroStats[i].num = e.target.value; });
      inputs[1].addEventListener('input', e => { heroStats[i].lbl = e.target.value; });
      wrap.appendChild(item);
    });
  }

  function saveHero() {
    const data = {
      badge: $('#heroBadge').value.trim(),
      titleGold: $('#heroTitleGold').value.trim(),
      titleGreen: $('#heroTitleGreen').value.trim(),
      titleSub: $('#heroTitleSub').value.trim(),
      tagline: $('#heroTagline').value,
      primaryBtnText: $('#heroBtn1').value.trim(),
      secondaryBtnText: $('#heroBtn2').value.trim(),
      stats: heroStats.filter(s => s.num || s.lbl)
    };
    const btn = $('#heroForm button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '⏳ সেভ হচ্ছে...';
    window.db.collection('content').doc('hero').set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      toast('হিরো সেভ হয়েছে', 'success');
      btn.disabled = false;
      btn.textContent = '💾 সেভ করুন';
    }).catch(err => {
      toast('সেভ ব্যর্থ: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 সেভ করুন';
    });
  }

  // ============================================================
  //  ABOUT FORM
  // ============================================================
  let aboutValues = [];
  let techPills = [];

  function bindAboutForm() {
    const form = $('#aboutForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      saveAbout();
    });
    $('#addAboutValue').addEventListener('click', () => {
      aboutValues.push({ icon: '💡', title: '', desc: '' });
      drawAboutValues();
    });
    $('#addTechPill').addEventListener('click', () => {
      techPills.push('');
      drawTechPills();
    });
  }

  function loadAboutForm() {
    if (!window.db) return;
    window.db.collection('content').doc('about').get().then(doc => {
      const data = doc.exists ? doc.data() : {};
      $('#aboutLabel').value = data.label || '';
      $('#aboutTitle').value = data.title || '';
      $('#aboutSub').value = data.sub || '';
      aboutValues = data.values || [];
      techPills = data.techPills || [];
      drawAboutValues();
      drawTechPills();
    }).catch(err => console.error('About load:', err));
  }

  function drawAboutValues() {
    const wrap = $('#aboutValuesRepeater');
    wrap.innerHTML = '';
    aboutValues.forEach((v, i) => {
      const item = el(`
        <div class="repeater-item" style="flex-wrap:wrap;">
          <input type="text" placeholder="💡 Icon" value="${escapeHtml(v.icon || '')}" style="flex:0.2;">
          <input type="text" placeholder="Title" value="${escapeHtml(v.title || '')}" style="flex:1;">
          <input type="text" placeholder="Description" value="${escapeHtml(v.desc || '')}" style="flex:2;">
          <button type="button" class="repeater-remove">×</button>
        </div>
      `);
      item.querySelector('.repeater-remove').onclick = () => {
        aboutValues.splice(i, 1);
        drawAboutValues();
      };
      const inputs = item.querySelectorAll('input');
      inputs[0].addEventListener('input', e => { aboutValues[i].icon = e.target.value; });
      inputs[1].addEventListener('input', e => { aboutValues[i].title = e.target.value; });
      inputs[2].addEventListener('input', e => { aboutValues[i].desc = e.target.value; });
      wrap.appendChild(item);
    });
  }

  function drawTechPills() {
    const wrap = $('#techPillsRepeater');
    wrap.innerHTML = '';
    techPills.forEach((p, i) => {
      const item = el(`
        <div class="repeater-item">
          <input type="text" placeholder="React.js" value="${escapeHtml(p || '')}">
          <button type="button" class="repeater-remove">×</button>
        </div>
      `);
      item.querySelector('.repeater-remove').onclick = () => {
        techPills.splice(i, 1);
        drawTechPills();
      };
      item.querySelector('input').addEventListener('input', e => { techPills[i] = e.target.value; });
      wrap.appendChild(item);
    });
  }

  function saveAbout() {
    const data = {
      label: $('#aboutLabel').value.trim(),
      title: $('#aboutTitle').value.trim(),
      sub: $('#aboutSub').value.trim(),
      values: aboutValues.filter(v => v.title || v.desc),
      techPills: techPills.filter(p => p && p.trim())
    };
    const btn = $('#aboutForm button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '⏳ সেভ হচ্ছে...';
    window.db.collection('content').doc('about').set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      toast('সম্পর্কে সেভ হয়েছে', 'success');
    }).catch(err => {
      toast('সেভ ব্যর্থ: ' + err.message, 'error');
    }).finally(() => {
      btn.disabled = false;
      btn.textContent = '💾 সেভ করুন';
    });
  }

  // ============================================================
  //  CONTACT FORM
  // ============================================================
  function bindContactForm() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      saveContact();
    });
  }

  function loadContactForm() {
    if (!window.db) return;
    window.db.collection('content').doc('contact').get().then(doc => {
      const data = doc.exists ? doc.data() : {};
      $('#contactEmail').value = data.email || '';
      $('#contactPhone').value = data.phone || '';
      $('#contactPhoneLink').value = data.phoneLink || '';
      $('#contactAddress').value = data.address || '';
      $('#contactGithub').value = data.github || '';
      $('#contactGithubLink').value = data.githubLink || '';
      $('#contactNoteTitle').value = data.noteTitle || '';
      $('#contactNoteBody').value = data.noteBody || '';
    }).catch(err => console.error('Contact load:', err));
  }

  function saveContact() {
    const data = {
      email: $('#contactEmail').value.trim(),
      phone: $('#contactPhone').value.trim(),
      phoneLink: $('#contactPhoneLink').value.trim(),
      address: $('#contactAddress').value.trim(),
      github: $('#contactGithub').value.trim(),
      githubLink: $('#contactGithubLink').value.trim(),
      noteTitle: $('#contactNoteTitle').value.trim(),
      noteBody: $('#contactNoteBody').value.trim()
    };
    const btn = $('#contactForm button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '⏳ সেভ হচ্ছে...';
    window.db.collection('content').doc('contact').set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      toast('যোগাযোগ সেভ হয়েছে', 'success');
    }).catch(err => {
      toast('সেভ ব্যর্থ: ' + err.message, 'error');
    }).finally(() => {
      btn.disabled = false;
      btn.textContent = '💾 সেভ করুন';
    });
  }

  // ============================================================
  //  MESSAGES
  // ============================================================
  function bindMessageRefresh() {
    const btn = $('#refreshMessagesBtn');
    if (btn) btn.addEventListener('click', loadMessages);
  }

  function loadMessages() {
    const wrap = $('#messagesList');
    wrap.innerHTML = '<div class="list-empty">লোড হচ্ছে...</div>';

    // Real-time subscription
    if (state.msgUnsub) state.msgUnsub();
    state.msgUnsub = window.db.collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        if (snap.empty) {
          wrap.innerHTML = '<div class="list-empty">কোনো মেসেজ নেই</div>';
          return;
        }
        state.messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        wrap.innerHTML = state.messages.map(renderMessageRow).join('');
        bindMessageRowActions();
        loadDashboard();
      }, err => {
        console.error('Messages load:', err);
        wrap.innerHTML = '<div class="list-empty">লোড ব্যর্থ: ' + escapeHtml(err.message) + '</div>';
      });
  }

  function renderMessageRow(m) {
    return `
      <div class="list-row" data-msg-id="${escapeHtml(m.id)}">
        <div class="list-row-thumb">✉️</div>
        <div class="list-row-main">
          <div class="list-row-title">${escapeHtml(m.name)} — ${escapeHtml(m.subject || '')}</div>
          <div class="list-row-sub">${escapeHtml(m.email)} · ${formatDate(m.createdAt)}</div>
        </div>
        <div class="list-row-actions">
          <span class="badge ${m.read ? 'read' : 'unread'}">${m.read ? 'পড়া' : 'নতুন'}</span>
          <button class="btn-secondary btn-sm" data-action="view">👁 দেখুন</button>
          <button class="btn-secondary btn-sm" data-action="mark-read">${m.read ? '↩️ অপঠিত' : '✓ পঠিত'}</button>
          <button class="btn-danger btn-sm" data-action="delete">🗑</button>
        </div>
      </div>
    `;
  }

  function bindMessageRowActions() {
    $$('#messagesList .list-row').forEach(row => {
      const id = row.dataset.msgId;
      row.querySelector('[data-action="view"]').onclick = () => viewMessage(id);
      row.querySelector('[data-action="delete"]').onclick = () => {
        if (confirm('মেসেজ মুছে ফেলতে চান?')) {
          window.db.collection('messages').doc(id).delete()
            .then(() => toast('মুছে ফেলা হয়েছে', 'success'))
            .catch(err => toast('ব্যর্থ: ' + err.message, 'error'));
        }
      };
      row.querySelector('[data-action="mark-read"]').onclick = () => {
        const m = state.messages.find(x => x.id === id);
        if (!m) return;
        window.db.collection('messages').doc(id).update({ read: !m.read })
          .catch(err => toast('ব্যর্থ: ' + err.message, 'error'));
      };
    });
  }

  function viewMessage(id) {
    const m = state.messages.find(x => x.id === id);
    if (!m) return;
    const html = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>📨 মেসেজ বিস্তারিত</h3>
          <button class="modal-close" id="msgModalClose">×</button>
        </div>
        <div class="modal-body">
          <div class="message-detail">
            <div class="message-detail-row"><strong>নাম</strong><span>${escapeHtml(m.name)}</span></div>
            <div class="message-detail-row"><strong>ইমেইল</strong><span><a href="mailto:${escapeHtml(m.email)}" style="color:var(--navy);">${escapeHtml(m.email)}</a></span></div>
            ${m.phone ? `<div class="message-detail-row"><strong>ফোন</strong><span><a href="tel:${escapeHtml(m.phone)}" style="color:var(--navy);">${escapeHtml(m.phone)}</a></span></div>` : ''}
            <div class="message-detail-row"><strong>বিষয়</strong><span>${escapeHtml(m.subject || '')}</span></div>
            <div class="message-detail-row"><strong>তারিখ</strong><span>${formatDate(m.createdAt)}</span></div>
          </div>
          <div class="message-detail-body">${escapeHtml(m.message)}</div>
        </div>
        <div class="modal-footer">
          <a href="mailto:${escapeHtml(m.email)}?subject=Re: ${encodeURIComponent(m.subject || '')}" class="btn-primary">↩️ রিপ্লাই ইমেইল</a>
          <button class="btn-secondary" id="msgCloseBtn">বন্ধ করুন</button>
        </div>
      </div>
    `;
    const host = $('#modalHost');
    host.innerHTML = html;
    host.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#msgModalClose').onclick = closeModal;
    $('#msgCloseBtn').onclick = closeModal;
    host.addEventListener('click', e => { if (e.target === host) closeModal(); });

    // Mark read automatically
    if (!m.read) {
      window.db.collection('messages').doc(id).update({ read: true }).catch(()=>{});
    }
  }

  // ============================================================
  //  HELPERS
  // ============================================================
  function closeModal() {
    const host = $('#modalHost');
    host.classList.remove('open');
    host.innerHTML = '';
    document.body.style.overflow = '';
  }

  function formatDate(ts) {
    if (!ts) return 'এইমাত্র';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000; // seconds
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return Math.floor(diff / 60) + ' মিনিট আগে';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ঘণ্টা আগে';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' দিন আগে';
    return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ============================================================
  //  GITHUB FILE PICKER
  //  Lists files from a GitHub folder, lets user pick one,
  //  returns the raw URL.
  // ============================================================
  function isGithubConfigured() {
    const c = window.githubConfig || {};
    if (!c.owner || c.owner.includes('YOUR_GITHUB')) return false;
    if (!c.repo || c.repo.includes('YOUR_REPO')) return false;
    return true;
  }

  function getGithubRawUrl(fileName, type) {
    const c = window.githubConfig;
    let folder;
    if (type === 'video') folder = (c.videosPath || 'videos');
    else if (type === 'audio') folder = (c.audioPath || 'media');
    else folder = (c.imagesPath || 'images');
    const branch = c.branch || 'main';
    return `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${branch}/${folder}/${fileName}`;
  }

  /**
   * Open GitHub file picker modal.
   * @param {string} type - 'image' | 'video' | 'audio'
   * @param {function} onPick - callback(url, fileName)
   */
  function openGithubPicker(type, onPick) {
    if (!isGithubConfigured()) {
      toast('❌ js/firebase-config.js এ GitHub config বসান নি।', 'error');
      return;
    }

    const c = window.githubConfig;
    let folder;
    if (type === 'video') folder = (c.videosPath || 'videos');
    else if (type === 'audio') folder = (c.audioPath || 'media');
    else folder = (c.imagesPath || 'images');
    const apiUrl = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${folder}?ref=${c.branch || 'main'}`;

    const titleText = type === 'video' ? 'ভিডিও' : (type === 'audio' ? 'অডিও' : 'ছবি');

    const html = `
      <div class="modal-box" style="max-width:640px;">
        <div class="modal-header">
          <h3>📂 GitHub থেকে ${titleText} বাছুন</h3>
          <button class="modal-close" id="ghPickerClose">×</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:12px;padding:10px 14px;background:var(--off-white);border-radius:8px;font-size:0.82rem;color:var(--gray);">
            📁 <strong>${c.owner}/${c.repo}</strong> → <code>${folder}/</code>
          </div>
          <div id="ghFileList" style="min-height:200px;">
            <div class="admin-loading">
              <div class="spinner"></div>
              ফাইল লিস্ট লোড হচ্ছে...
            </div>
          </div>
          <div id="ghPickerError" style="display:none;color:var(--red);font-size:0.88rem;margin-top:10px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="ghPickerCancel">বাতিল</button>
        </div>
      </div>
    `;

    const host = $('#modalHost');
    host.innerHTML = html;
    host.classList.add('open');
    document.body.style.overflow = 'hidden';

    $('#ghPickerClose').onclick = closeModal;
    $('#ghPickerCancel').onclick = closeModal;

    // Fetch file list from GitHub API
    fetch(apiUrl)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(files => {
        const list = $('#ghFileList');
        if (!Array.isArray(files) || files.length === 0) {
          list.innerHTML = `
            <div class="list-empty">
              এই ফোল্ডারে কোনো ফাইল নেই।<br>
              <small>GitHub-এ <code>${folder}/</code> ফোল্ডারে ফাইল আপলোড করুন।</small>
            </div>
          `;
          return;
        }

        // Filter by type
        let validExts;
        if (type === 'video') {
          validExts = ['.mp4', '.webm', '.mov', '.ogg'];
        } else if (type === 'audio') {
          validExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
        } else {
          validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        }
        const filtered = files.filter(f => {
          if (f.type !== 'file') return false;
          const name = (f.name || '').toLowerCase();
          return validExts.some(ext => name.endsWith(ext));
        });

        if (filtered.length === 0) {
          list.innerHTML = `
            <div class="list-empty">
              কোনো ${titleText} ফাইল পাওয়া যায়নি।<br>
              <small>সাপোর্টেড ফরম্যাট: ${validExts.join(', ')}</small>
            </div>
          `;
          return;
        }

        list.innerHTML = `
          <div class="gh-file-grid">
            ${filtered.map(f => {
              const rawUrl = getGithubRawUrl(f.name, type);
              let thumb;
              if (type === 'video') {
                thumb = `<div class="gh-file-thumb"><span style="font-size:2.5rem;">🎬</span></div>`;
              } else if (type === 'audio') {
                thumb = `<div class="gh-file-thumb"><span style="font-size:2.5rem;">🎵</span></div>`;
              } else {
                thumb = `<div class="gh-file-thumb"><img src="${escapeHtml(rawUrl)}" alt="" onerror="this.parentNode.innerHTML='<span>📄</span>'"></div>`;
              }
              return `
                <div class="gh-file-item" data-url="${escapeHtml(rawUrl)}" data-name="${escapeHtml(f.name)}">
                  ${thumb}
                  <div class="gh-file-name">${escapeHtml(f.name)}</div>
                  <div class="gh-file-size">${formatFileSize(f.size)}</div>
                  <button type="button" class="gh-select-btn" data-url="${escapeHtml(rawUrl)}" data-name="${escapeHtml(f.name)}">✅ সিলেক্ট করুন</button>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Bind select buttons directly
        list.querySelectorAll('.gh-select-btn').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const url = this.getAttribute('data-url');
            const name = this.getAttribute('data-name');
            closeModal();
            if (onPick) onPick(url, name);
          });
        });
      })
      .catch(err => {
        const errEl = $('#ghPickerError');
        let msg = err.message;
        if (msg.includes('404')) {
          msg = `ফোল্ডার "${folder}" খুঁজে পাওয়া যায়নি। GitHub রিপোতে এই নামে ফোল্ডার আছে কিনা দেখুন।`;
        } else if (msg.includes('403')) {
          msg = 'GitHub API rate limit এ চলে গেছে। কিছুক্ষণ পর চেষ্টা করুন।';
        }
        $('#ghFileList').innerHTML = '<div class="list-empty">❌ লোড ব্যর্থ</div>';
        errEl.textContent = msg;
        errEl.style.display = 'block';
        toast('লোড ব্যর্থ: ' + msg, 'error');
      });
  }

  function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ============================================================
  //  ICON UPLOADER (PNG/JPG real icons)
  //  Uploads to Firebase Storage if available, else uses GitHub picker.
  // ============================================================
  function openIconPicker(currentIcon, onPick) {
    const html = `
      <div class="modal-box" style="max-width:520px;">
        <div class="modal-header">
          <h3>🎨 আইকন নির্বাচন করুন</h3>
          <button class="modal-close" id="iconPickerClose">×</button>
        </div>
        <div class="modal-body">
          <div style="text-align:center;margin-bottom:18px;">
            <div style="width:90px;height:90px;border-radius:18px;background:var(--off-white);border:2px dashed var(--gray-light);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:var(--gray);" id="iconPreview">
              ${currentIcon && currentIcon.startsWith('http')
                ? `<img src="${escapeHtml(currentIcon)}" style="width:100%;height:100%;object-fit:contain;border-radius:16px;" alt="">`
                : (currentIcon || '📦')}
            </div>
          </div>

          <div class="form-group">
            <label>অপশন ১: Emoji দিন</label>
            <input type="text" id="iconEmoji" placeholder="🍽️" maxlength="4" value="${currentIcon && !currentIcon.startsWith('http') ? escapeHtml(currentIcon) : ''}">
            <div class="form-help">যেকোনো emoji পেস্ট করুন।</div>
          </div>

          ${isGithubConfigured() ? `
            <div class="form-group">
              <label>অপশন ২: GitHub থেকে ছবি বাছুন (PNG/JPG)</label>
              <button type="button" class="btn-secondary" style="width:100%;" id="iconGithubBtn">📂 GitHub images ফোল্ডার খুলুন</button>
            </div>
          ` : ''}

          ${isStorageReady() ? `
            <div class="form-group">
              <label>অপশন ৩: কম্পিউটার থেকে আপলোড ${isStorageReady() ? '' : '(Firebase Storage দরকার)'}</label>
              <input type="file" accept="image/*" id="iconFile" style="display:none;">
              <button type="button" class="btn-secondary" style="width:100%;" id="iconUploadBtn">📤 কম্পিউটার থেকে আপলোড</button>
            </div>
          ` : ''}

          <div class="form-group">
            <label>অপশন ৪: URL দিন</label>
            <input type="text" id="iconUrl" placeholder="https://..." value="${currentIcon && currentIcon.startsWith('http') ? escapeHtml(currentIcon) : ''}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="iconPickerCancel">বাতিল</button>
          <button class="btn-primary" id="iconPickerSave">✓ নিশ্চিত করুন</button>
        </div>
      </div>
    `;

    const host = $('#modalHost');
    host.innerHTML = html;
    host.classList.add('open');
    document.body.style.overflow = 'hidden';

    let chosenIcon = currentIcon || '📦';

    // Live preview
    function updatePreview(val) {
      const prev = $('#iconPreview');
      if (!prev) return;
      if (val && val.startsWith('http')) {
        prev.innerHTML = `<img src="${escapeHtml(val)}" style="width:100%;height:100%;object-fit:contain;border-radius:16px;" alt="" onerror="this.parentNode.innerHTML='⚠️'">`;
      } else if (val) {
        prev.innerHTML = escapeHtml(val);
      } else {
        prev.innerHTML = '📦';
      }
    }

    $('#iconEmoji') && $('#iconEmoji').addEventListener('input', e => {
      chosenIcon = e.target.value || '📦';
      updatePreview(chosenIcon);
      $('#iconUrl').value = '';
    });

    $('#iconUrl') && $('#iconUrl').addEventListener('input', e => {
      chosenIcon = e.target.value;
      updatePreview(chosenIcon);
      $('#iconEmoji').value = '';
    });

    // GitHub picker
    const ghBtn = $('#iconGithubBtn');
    if (ghBtn) {
      ghBtn.onclick = () => {
        openGithubPicker('image', (url, name) => {
          chosenIcon = url;
          $('#iconUrl').value = url;
          $('#iconEmoji').value = '';
          updatePreview(url);
          toast('আইকন নির্বাচিত: ' + name, 'success');
        });
      };
    }

    // Upload from computer
    const uploadBtn = $('#iconUploadBtn');
    const fileInput = $('#iconFile');
    if (uploadBtn && fileInput) {
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = async e => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 500 * 1024) {
          toast('আইকন 500KB এর কম হতে হবে', 'error');
          return;
        }
        try {
          toast('আপলোড হচ্ছে...');
          const path = `icons/${Date.now()}_${f.name}`;
          const ref = window.storage.ref(path);
          const snap = await ref.put(f);
          const url = await snap.ref.getDownloadURL();
          chosenIcon = url;
          $('#iconUrl').value = url;
          updatePreview(url);
          toast('আইকন আপলোড হয়েছে', 'success');
        } catch (err) {
          toast('আপলোড ব্যর্থ: ' + err.message, 'error');
        }
      };
    }

    $('#iconPickerClose').onclick = closeModal;
    $('#iconPickerCancel').onclick = closeModal;

    $('#iconPickerSave').onclick = () => {
      const emoji = $('#iconEmoji').value.trim();
      const url = $('#iconUrl').value.trim();
      let finalIcon;
      if (url) finalIcon = url;
      else if (emoji) finalIcon = emoji;
      else finalIcon = chosenIcon || '📦';
      if (onPick) onPick(finalIcon);
      closeModal();
    };
  }

})();
