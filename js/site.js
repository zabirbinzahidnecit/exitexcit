/**
 * site.js — Public Website Logic
 * -----------------------------------------------------------
 * Ei file ti index.html er jonno. Firestore theke shob data load kore
 * page e render kore. Kono hardcoded content ekhane thakbe na.
 *
 * Firestore Data Structure (collections):
 *
 * 1) apps (collection)
 *    - id: auto
 *    - name: string (App name, jemon "মেস মিল ট্র্যাকার")
 *    - tagline: string (short type, jemon "PWA · Web App")
 *    - icon: string (emoji, jemon "🍽️")
 *    - iconColor: 'green' | 'gold' | 'navy'  (decides icon bg)
 *    - type: 'web' | 'mobile' | 'saas'  (decides app-type badge color)
 *    - description: string (long description)
 *    - features: array of strings (chips)
 *    - status: 'live' | 'dev' | 'soon'
 *    - statusText: string (jemon "Live · বিনামূল্যে")
 *    - link: string (primary URL — empty hole "Coming Soon" dekhabe)
 *    - linkText: string (jemon "অ্যাপ দেখুন →")
 *    - previewImage: string (URL — empty hole coming-soon placeholder)
 *    - screenshots: array of strings (URLs — detail modal e dekhabe)
 *    - userGuide: string (rich text, line breaks preserved)
 *    - extraLinks: array of {label, url} (Play Store, App Store, etc.)
 *    - order: number (choto age, default 100)
 *    - visible: boolean (false hole hide)
 *    - createdAt: timestamp
 *
 * 2) slides (collection) — Biggapon / Presentation
 *    - id: auto
 *    - caption: string (title)
 *    - description: string
 *    - mediaUrl: string (image or video URL)
 *    - mediaType: 'image' | 'video'
 *    - link: string (optional — click korle koi jabe)
 *    - order: number
 *    - visible: boolean
 *    - createdAt: timestamp
 *
 * 3) content (collection) — single documents
 *    - content/hero:
 *        badge, titleGold, titleGreen, titleSub, tagline,
 *        stats: [{num, lbl}], primaryBtnText, secondaryBtnText
 *    - content/about:
 *        title, sub, values: [{icon, title, desc}], techPills: [string]
 *    - content/contact:
 *        email, phone, phoneLink, address, github, githubLink,
 *        title, sub, responseTimeNote
 *
 * 4) messages (collection) — contact form submissions
 *    - name, email, phone, subject, message, createdAt, read
 * -----------------------------------------------------------
 */

(function () {
  'use strict';

  // ----- Element refs (filled later) -----
  let els = {};

  // ----- Default fallback content (jodi Firestore offline thake ba rule miss) -----
  const DEFAULT_HERO = {
    badge: '🚀 Digital Solutions Company · Bangladesh',
    titleGold: 'EXIT',
    titleGreen: 'EXCIT',
    titleSub: 'DIGITAL SOLUTIONS',
    tagline: 'আধুনিক প্রযুক্তি দিয়ে জীবনকে সহজ করে তুলি।\nআমাদের প্রতিটি app তৈরি হয় মানুষের বাস্তব সমস্যার সমাধান দিতে।',
    stats: [
      { num: '১+', lbl: 'Live Apps' },
      { num: '১০০%', lbl: 'Free to Use' },
      { num: 'PWA', lbl: 'Mobile Ready' },
      { num: 'BD', lbl: 'Made in Bangladesh' }
    ],
    primaryBtnText: '📱 আমাদের Apps দেখুন',
    secondaryBtnText: '✉️ যোগাযোগ করুন'
  };

  const DEFAULT_ABOUT = {
    label: 'আমাদের সম্পর্কে',
    title: 'আমরা কে?',
    sub: 'Exit Excit হলো একটি বাংলাদেশী Digital Solutions কোম্পানি। আমরা বিশ্বাস করি প্রযুক্তি দিয়ে সাধারণ মানুষের জীবন সহজ করা সম্ভব। আমাদের প্রতিটি পণ্য তৈরি হয় বাস্তব সমস্যার কথা মাথায় রেখে।',
    values: [
      { icon: '💡', title: 'উদ্ভাবন', desc: 'সমস্যার নতুন সমাধান খুঁজি প্রতিনিয়ত' },
      { icon: '🎯', title: 'সরলতা', desc: 'জটিল জিনিস সহজ করে তোলাই আমাদের লক্ষ্য' },
      { icon: '🔒', title: 'নিরাপত্তা', desc: 'আপনার ডেটা সম্পূর্ণ নিরাপদ আমাদের কাছে' },
      { icon: '🆓', title: 'বিনামূল্যে', desc: 'মানসম্পন্ন সেবা সবার কাছে পৌঁছে দিতে চাই' }
    ],
    techPills: ['React.js', 'Firebase', 'PWA', 'Node.js', 'Google Auth', 'Firestore']
  };

  const DEFAULT_CONTACT = {
    title: 'আমাদের সাথে কথা বলুন',
    sub: 'কোনো প্রশ্ন, পরামর্শ বা সহযোগিতার জন্য যোগাযোগ করুন। আমরা সাড়া দিতে সদা প্রস্তুত।',
    email: 'contact@exitexcit.com',
    phone: '+880 1X-XXXX-XXXX',
    phoneLink: '+8801XXXXXXXXX',
    address: 'Dhaka, Bangladesh',
    github: 'github.com/zabirbinzahidnecit',
    githubLink: 'https://github.com/zabirbinzahidnecit',
    noteTitle: '⚡ দ্রুত সাড়া পান!',
    noteBody: 'সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দেওয়া হয়। জরুরি বিষয়ে WhatsApp-এ যোগাযোগ করুন।'
  };

  // ============================================================
  //  PUBLIC API
  // ============================================================
  window.SiteApp = {
    init: initSite,
    renderHero,
    renderAbout,
    renderContact,
    renderApps,
    renderSlides,
    bindContactForm
  };

  // ============================================================
  //  INIT
  // ============================================================
  function initSite() {
    els = {
      heroBadge:      document.querySelector('[data-hero-badge]'),
      heroTitle:      document.querySelector('[data-hero-title]'),
      heroTagline:    document.querySelector('[data-hero-tagline]'),
      heroStats:      document.querySelector('[data-hero-stats]'),
      heroBtns:       document.querySelector('[data-hero-btns]'),
      appsGrid:       document.querySelector('[data-apps-grid]'),
      slidesContainer:document.querySelector('[data-slides]'),
      slidesDots:     document.querySelector('[data-slides-dots]'),
      slidesPrev:     document.querySelector('[data-slides-prev]'),
      slidesNext:     document.querySelector('[data-slides-next]'),
      aboutWrap:      document.querySelector('[data-about-wrap]'),
      contactWrap:    document.querySelector('[data-contact-wrap]')
    };

    if (!isFirebaseConfigured()) {
      console.warn('[Exit Excit] Firebase config not set — using defaults.');
      useDefaultContent();
      return;
    }

    document.addEventListener('firebase-ready', () => {
      loadAllContent();
    });

    document.addEventListener('firebase-load-error', () => {
      useDefaultContent();
    });

    // If firebase-init already finished before this script ran:
    if (window.db) {
      loadAllContent();
    }

    // Bind contact form regardless
    bindContactForm();
    bindSmoothScroll();
    bindScrollAnimations();

    // Debug: log what's happening
    console.log('[Exit Excit] Site init. Firebase configured:', isFirebaseConfigured(), '| DB ready:', !!window.db);
  }

  // ============================================================
  //  LOAD ALL CONTENT FROM FIRESTORE
  // ============================================================
  function loadAllContent() {
    loadHero();
    loadAbout();
    loadContact();
    loadApps();
    loadSlides();
  }

  // ---------- HERO ----------
  function loadHero() {
    window.db.collection('content').doc('hero').get().then(doc => {
      if (doc.exists) {
        renderHero({ ...DEFAULT_HERO, ...doc.data() });
      } else {
        renderHero(DEFAULT_HERO);
      }
    }).catch(err => {
      console.warn('Hero load failed:', err);
      renderHero(DEFAULT_HERO);
    });
  }

  function renderHero(data) {
    if (!els.heroBadge) return;
    els.heroBadge.textContent = data.badge || DEFAULT_HERO.badge;

    if (els.heroTitle) {
      els.heroTitle.innerHTML = `
        <span class="gold">${escapeHtml(data.titleGold || 'EXIT')}</span>
        <span class="green">${escapeHtml(data.titleGreen || 'EXCIT')}</span><br>
        <span style="font-size:0.55em;color:rgba(255,255,255,0.75);font-weight:600;letter-spacing:1px;">
          ${escapeHtml(data.titleSub || 'DIGITAL SOLUTIONS')}
        </span>
      `;
    }

    if (els.heroTagline) {
      // Preserve newlines as <br>
      const safe = escapeHtml(data.tagline || '').replace(/\n/g, '<br>');
      els.heroTagline.innerHTML = safe;
    }

    if (els.heroStats) {
      const stats = data.stats || DEFAULT_HERO.stats;
      els.heroStats.innerHTML = stats.map(s => `
        <div class="hero-stat">
          <span class="num">${escapeHtml(s.num || '')}</span>
          <span class="lbl">${escapeHtml(s.lbl || '')}</span>
        </div>
      `).join('');
    }

    if (els.heroBtns) {
      els.heroBtns.innerHTML = `
        <a href="#apps" class="btn-primary">${escapeHtml(data.primaryBtnText || '📱 আমাদের Apps দেখুন')}</a>
        <a href="#contact" class="btn-secondary">${escapeHtml(data.secondaryBtnText || '✉️ যোগাযোগ করুন')}</a>
      `;
      bindSmoothScroll();
    }
  }

  // ---------- ABOUT ----------
  function loadAbout() {
    window.db.collection('content').doc('about').get().then(doc => {
      if (doc.exists) {
        renderAbout({ ...DEFAULT_ABOUT, ...doc.data() });
      } else {
        renderAbout(DEFAULT_ABOUT);
      }
    }).catch(err => {
      console.warn('About load failed:', err);
      renderAbout(DEFAULT_ABOUT);
    });
  }

  function renderAbout(data) {
    if (!els.aboutWrap) return;
    const values = data.values || DEFAULT_ABOUT.values;
    const pills = data.techPills || DEFAULT_ABOUT.techPills;

    els.aboutWrap.innerHTML = `
      <div class="fade-in">
        <span class="section-label" style="background:rgba(232,168,0,0.12);color:var(--gold-light);border-color:rgba(232,168,0,0.2);">
          ${escapeHtml(data.label || 'আমাদের সম্পর্কে')}
        </span>
        <h2 class="section-title">${escapeHtml(data.title || 'আমরা কে?')}</h2>
        <p class="section-sub">${escapeHtml(data.sub || '')}</p>
        <div class="about-values">
          ${values.map(v => `
            <div class="value-card">
              <div class="value-icon">${escapeHtml(v.icon || '')}</div>
              <h4>${escapeHtml(v.title || '')}</h4>
              <p>${escapeHtml(v.desc || '')}</p>
            </div>
          `).join('')}
        </div>
        <div class="tech-pills">
          ${pills.map(p => `<span class="tech-pill">${escapeHtml(p)}</span>`).join('')}
        </div>
      </div>
      <div class="about-visual fade-in">
        <div class="about-glow"></div>
        <div class="about-logo-wrap">
          <img src="assets/logo.png" alt="Exit Excit Logo">
        </div>
      </div>
    `;
    bindScrollAnimations();
  }

  // ---------- CONTACT ----------
  function loadContact() {
    window.db.collection('content').doc('contact').get().then(doc => {
      if (doc.exists) {
        renderContact({ ...DEFAULT_CONTACT, ...doc.data() });
      } else {
        renderContact(DEFAULT_CONTACT);
      }
    }).catch(err => {
      console.warn('Contact load failed:', err);
      renderContact(DEFAULT_CONTACT);
    });
  }

  function renderContact(data) {
    if (!els.contactWrap) return;
    els.contactWrap.innerHTML = `
      <div class="fade-in">
        <h3>যোগাযোগের তথ্য</h3>

        <div class="contact-item">
          <div class="contact-item-icon">📧</div>
          <div>
            <h4>ইমেইল</h4>
            <p><a href="mailto:${escapeHtml(data.email || '')}">${escapeHtml(data.email || '')}</a></p>
          </div>
        </div>

        <div class="contact-item">
          <div class="contact-item-icon">📱</div>
          <div>
            <h4>ফোন / WhatsApp</h4>
            <p><a href="tel:${escapeHtml(data.phoneLink || '')}">${escapeHtml(data.phone || '')}</a></p>
          </div>
        </div>

        <div class="contact-item">
          <div class="contact-item-icon">📍</div>
          <div>
            <h4>ঠিকানা</h4>
            <p>${escapeHtml(data.address || '')}</p>
          </div>
        </div>

        <div class="contact-item">
          <div class="contact-item-icon">🌐</div>
          <div>
            <h4>GitHub</h4>
            <p><a href="${escapeAttr(data.githubLink || '#')}" target="_blank">${escapeHtml(data.github || '')}</a></p>
          </div>
        </div>

        <div style="margin-top:32px;padding:22px;background:linear-gradient(135deg,var(--navy-dark),var(--navy));border-radius:16px;color:rgba(255,255,255,0.7);font-size:0.88rem;line-height:1.7;">
          <strong style="color:var(--gold);">${escapeHtml(data.noteTitle || '⚡ দ্রুত সাড়া পান!')}</strong><br>
          ${escapeHtml(data.noteBody || '')}
        </div>
      </div>

      <div class="contact-form-wrap fade-in">
        <h3>💬 মেসেজ পাঠান</h3>
        <div id="contactForm">
          <div class="form-row">
            <div>
              <label>আপনার নাম *</label>
              <input type="text" id="fname" placeholder="নাম লিখুন" required>
            </div>
            <div>
              <label>ইমেইল *</label>
              <input type="email" id="femail" placeholder="email@example.com" required>
            </div>
          </div>
          <div class="form-group">
            <label>ফোন নম্বর</label>
            <input type="tel" id="fphone" placeholder="+880 1X-XXXX-XXXX">
          </div>
          <div class="form-group">
            <label>বিষয় *</label>
            <select id="fsubject">
              <option value="">বিষয় বেছে নিন</option>
              <option>App সম্পর্কে প্রশ্ন</option>
              <option>Bug Report</option>
              <option>Feature Request</option>
              <option>Business Inquiry</option>
              <option>Partnership</option>
              <option>অন্যান্য</option>
            </select>
          </div>
          <div class="form-group">
            <label>আপনার বার্তা *</label>
            <textarea id="fmessage" placeholder="আপনার বার্তা এখানে লিখুন..."></textarea>
          </div>
          <button type="button" class="submit-btn" id="submitFormBtn">
            <span>✉️</span> বার্তা পাঠান
          </button>
        </div>
        <div class="form-success" id="formSuccess">
          <span>✅</span>
          আপনার বার্তা পাঠানো হয়েছে!<br>
          <span style="font-size:0.9rem;font-weight:400;color:var(--gray);">শীঘ্রই আমরা যোগাযোগ করব।</span>
        </div>
      </div>
    `;
    bindScrollAnimations();
    bindContactForm();
  }

  // ---------- APPS ----------
  function loadApps() {
    if (!els.appsGrid) return;
    els.appsGrid.innerHTML = `
      <div class="loading-state" style="grid-column:1/-1;">
        <div class="spinner"></div>
        Apps লোড হচ্ছে...
      </div>
    `;

    window.db.collection('apps')
      .where('visible', '==', true)
      .get()
      .then(snap => {
        if (snap.empty) {
          els.appsGrid.innerHTML = `
            <div class="loading-state" style="grid-column:1/-1;">
              এখনও কোনো app যোগ করা হয়নি। অাগে অাসছে।
            </div>
          `;
          return;
        }
        // Sort client-side (Firestore composite index not required this way)
        const apps = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
        renderApps(apps);
      })
      .catch(err => {
        console.warn('Apps load failed:', err);
        els.appsGrid.innerHTML = `
          <div class="loading-state" style="grid-column:1/-1;">
            Apps লোড করা যায়নি। পরে চেষ্টা করুন।<br>
            <small style="color:#94A3B8;">${escapeHtml(err.message || '')}</small>
          </div>
        `;
      });
  }

  function renderApps(apps) {
    if (!els.appsGrid) return;
    els.appsGrid.innerHTML = apps.map(app => renderAppCard(app)).join('');
    bindScrollAnimations();

    // Bind click → open detail modal
    els.appsGrid.querySelectorAll('[data-app-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't open if clicking the primary action link
        if (e.target.closest('a.app-link')) return;
        const id = card.getAttribute('data-app-id');
        openAppDetail(apps.find(a => a.id === id));
      });
    });
  }

  function renderAppCard(app) {
    const hasImage = !!app.previewImage;
    const hasLink = !!app.link;
    const statusClass = app.status || 'soon';
    const statusDotClass = statusClass === 'live' ? 'live' : (statusClass === 'dev' ? 'dev' : 'soon');
    const statusColor = statusClass === 'live' ? '#22C55E' : (statusClass === 'dev' ? 'var(--gold)' : 'var(--gray)');
    const iconColorClass = `app-icon ${app.iconColor || 'navy'}-icon`;

    // Icon rendering: if it's a URL, show <img>, else emoji
    const iconStr = app.icon || '📦';
    const isIconUrl = /^https?:\/\//.test(iconStr);
    const iconHtml = isIconUrl
      ? `<img src="${escapeAttr(iconStr)}" alt="icon" style="width:60%;height:60%;object-fit:contain;">`
      : escapeHtml(iconStr);

    let previewHtml;
    if (hasImage) {
      previewHtml = `<img src="${escapeAttr(app.previewImage)}" alt="${escapeAttr(app.name || 'App')}">`;
    } else {
      previewHtml = `
        <div class="coming-soon">
          <span>${iconHtml}</span>
          <p>শীঘ্রই আসছে</p>
          <p style="font-size:0.75rem;color:#94A3B8;">${escapeHtml(app.tagline || '')}</p>
        </div>
      `;
    }

    let linkHtml;
    if (hasLink) {
      linkHtml = `<a href="${escapeAttr(app.link)}" target="_blank" class="app-link primary">${escapeHtml(app.linkText || 'অ্যাপ দেখুন →')}</a>`;
    } else {
      linkHtml = `<span class="app-link disabled">${escapeHtml(app.linkText || 'শীঘ্রই আসছে')}</span>`;
    }

    const featuresHtml = (app.features || []).map(f => `<span class="feat-chip">${escapeHtml(f)}</span>`).join('');

    return `
      <div class="app-card fade-in" data-app-id="${escapeAttr(app.id)}">
        <div class="app-card-header">
          <div class="${iconColorClass}">${iconHtml}</div>
          <div class="app-meta">
            <h3>${escapeHtml(app.name || 'Untitled App')}</h3>
            <span class="app-type ${escapeAttr(app.type || 'web')}">${escapeHtml(app.tagline || '')}</span>
          </div>
        </div>
        <div class="app-preview">${previewHtml}</div>
        <p class="app-desc">${escapeHtml(app.description || '')}</p>
        <div class="app-features">${featuresHtml}</div>
        <div class="app-footer">
          <div class="app-status">
            <span class="status-dot ${statusDotClass}"></span>
            <span style="color:${statusColor};font-size:0.82rem;">${escapeHtml(app.statusText || '')}</span>
          </div>
          ${linkHtml}
        </div>
      </div>
    `;
  }

  // ---------- APP DETAIL MODAL ----------
  function openAppDetail(app) {
    if (!app) return;
    let modal = document.getElementById('appDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'appDetailModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="app-detail-modal">
          <button class="modal-close" id="modalCloseBtn" aria-label="Close">×</button>
          <div class="app-detail-modal-body" id="modalBody"></div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('#modalCloseBtn').addEventListener('click', () => modal.classList.remove('open'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.remove('open');
      });
    }

    const iconColorClass = `app-icon ${app.iconColor || 'navy'}-icon`;
    const screenshots = (app.screenshots || []).filter(Boolean);
    const extraLinks = (app.extraLinks || []).filter(l => l && l.url);
    const features = app.features || [];

    // Icon: URL → image, else emoji
    const iconStrModal = app.icon || '📦';
    const isIconUrlModal = /^https?:\/\//.test(iconStrModal);
    const iconHtmlModal = isIconUrlModal
      ? `<img src="${escapeAttr(iconStrModal)}" alt="icon" style="width:60%;height:60%;object-fit:contain;">`
      : escapeHtml(iconStrModal);

    // Build promo video HTML (supports MP4 direct URL or YouTube)
    let promoVideoHtml = '';
    if (app.promoVideo) {
      const ytMatch = app.promoVideo.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        // YouTube embed
        promoVideoHtml = `
          <div class="app-detail-section">
            <h4>🎬 প্রোমো ভিডিও</h4>
            <div class="app-detail-video-wrap">
              <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          </div>
        `;
      } else if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(app.promoVideo)) {
        // Direct video URL
        promoVideoHtml = `
          <div class="app-detail-section">
            <h4>🎬 প্রোমো ভিডিও</h4>
            <div class="app-detail-video-wrap">
              <video src="${escapeAttr(app.promoVideo)}" controls playsinline preload="metadata"></video>
            </div>
          </div>
        `;
      }
    }

    document.getElementById('modalBody').innerHTML = `
      <div class="app-detail-hero">
        <div class="${iconColorClass}">${iconHtmlModal}</div>
        <div>
          <h2>${escapeHtml(app.name || '')}</h2>
          <span class="app-type ${escapeAttr(app.type || 'web')}">${escapeHtml(app.tagline || '')}</span>
        </div>
      </div>
      <div class="app-detail-content">
        ${app.description ? `
          <div class="app-detail-section">
            <h4>এই অ্যাপ সম্পর্কে</h4>
            <p>${escapeHtml(app.description)}</p>
          </div>
        ` : ''}

        ${promoVideoHtml}

        ${features.length ? `
          <div class="app-detail-section">
            <h4>ফিচারসমূহ</h4>
            <div class="app-features" style="padding:0;">
              ${features.map(f => `<span class="feat-chip">${escapeHtml(f)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${screenshots.length ? `
          <div class="app-detail-section">
            <h4>স্ক্রিনশট</h4>
            <div class="app-detail-screenshots">
              ${screenshots.map(s => `<img src="${escapeAttr(s)}" alt="screenshot">`).join('')}
            </div>
          </div>
        ` : ''}

        ${app.userGuide ? `
          <div class="app-detail-section">
            <h4>ব্যবহার গাইড</h4>
            <div class="app-detail-userguide">${escapeHtml(app.userGuide)}</div>
          </div>
        ` : ''}

        ${(app.link || extraLinks.length) ? `
          <div class="app-detail-section">
            <h4>লিংক</h4>
            <div class="app-detail-links">
              ${app.link ? `<a href="${escapeAttr(app.link)}" target="_blank" class="app-detail-link-btn">🔗 ${escapeHtml(app.linkText || 'অ্যাপ দেখুন')}</a>` : ''}
              ${extraLinks.map(l => `<a href="${escapeAttr(l.url)}" target="_blank" class="app-detail-link-btn">${escapeHtml(l.label || 'Link')}</a>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ---------- SLIDES ----------
  let slidesState = { list: [], current: 0, timer: null };

  function loadSlides() {
    if (!els.slidesContainer) return;
    els.slidesContainer.innerHTML = `
      <div class="loading-state" style="background:#000;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);">
        <div class="spinner"></div>
      </div>
    `;

    window.db.collection('slides')
      .where('visible', '==', true)
      .get()
      .then(snap => {
        if (snap.empty) {
          hideSlidesSection();
          return;
        }
        // Sort client-side
        slidesState.list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
        renderSlides(slidesState.list);
      })
      .catch(err => {
        console.warn('Slides load failed:', err);
        hideSlidesSection();
      });
  }

  function hideSlidesSection() {
    const sec = document.querySelector('.slides-section');
    if (sec) sec.style.display = 'none';
  }

  function renderSlides(slides) {
    if (!slides.length) { hideSlidesSection(); return; }
    if (!els.slidesContainer) return;

    els.slidesContainer.innerHTML = slides.map((s, i) => `
      <div class="slide ${i === 0 ? 'active' : ''}" data-slide-index="${i}" data-link="${escapeAttr(s.link || '')}">
        ${s.mediaType === 'video'
          ? `<video src="${escapeAttr(s.mediaUrl)}" muted loop ${i === 0 ? 'autoplay' : ''} playsinline></video>`
          : (s.mediaType === 'audio'
            ? `<div class="slide-audio-bg"><span class="slide-audio-icon">🎵</span><audio src="${escapeAttr(s.mediaUrl)}" loop ${i === 0 ? 'autoplay' : ''} controls style="position:relative;z-index:3;width:80%;max-width:300px;"></audio></div>`
            : `<img src="${escapeAttr(s.mediaUrl)}" alt="${escapeAttr(s.caption || '')}">`
          )
        }
        <div class="slide-overlay">
          ${s.caption ? `<div class="slide-caption">${escapeHtml(s.caption)}</div>` : ''}
          ${s.description ? `<div class="slide-desc">${escapeHtml(s.description)}</div>` : ''}
        </div>
      </div>
    `).join('');

    // Dots
    if (els.slidesDots) {
      els.slidesDots.innerHTML = slides.map((_, i) =>
        `<button data-dot="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i+1}"></button>`
      ).join('');
      els.slidesDots.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => goToSlide(parseInt(btn.dataset.dot, 10)));
      });
    }

    // Arrows
    if (els.slidesPrev) els.slidesPrev.onclick = () => goToSlide(slidesState.current - 1);
    if (els.slidesNext) els.slidesNext.onclick = () => goToSlide(slidesState.current + 1);

    // Click on slide → open link OR modal detail
    els.slidesContainer.querySelectorAll('.slide').forEach((slide, i) => {
      slide.addEventListener('click', () => {
        const link = slide.dataset.link;
        if (link) {
          window.open(link, '_blank');
        }
      });
    });

    startAutoRotate();
  }

  function goToSlide(idx) {
    const len = slidesState.list.length;
    if (!len) return;
    idx = (idx + len) % len;
    slidesState.current = idx;
    const slidesEls = els.slidesContainer.querySelectorAll('.slide');
    slidesEls.forEach((el, i) => el.classList.toggle('active', i === idx));
    // Restart video/audio of current; pause others
    slidesEls.forEach((el, i) => {
      const v = el.querySelector('video');
      if (v) {
        if (i === idx) { v.currentTime = 0; v.play().catch(()=>{}); }
        else v.pause();
      }
      const a = el.querySelector('audio');
      if (a) {
        if (i === idx) { a.currentTime = 0; a.play().catch(()=>{}); }
        else a.pause();
      }
    });
    if (els.slidesDots) {
      els.slidesDots.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === idx));
    }
    restartAutoRotate();
  }

  function startAutoRotate() {
    if (slidesState.timer) clearInterval(slidesState.timer);
    slidesState.timer = setInterval(() => goToSlide(slidesState.current + 1), 5000);
  }
  function restartAutoRotate() { startAutoRotate(); }

  // ---------- CONTACT FORM ----------
  function bindContactForm() {
    const btn = document.getElementById('submitFormBtn');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', submitContactForm);
  }

  function submitContactForm() {
    const name = (document.getElementById('fname') || {}).value;
    const email = (document.getElementById('femail') || {}).value;
    const phone = (document.getElementById('fphone') || {}).value;
    const subject = (document.getElementById('fsubject') || {}).value;
    const message = (document.getElementById('fmessage') || {}).value;

    if (!name || !email || !subject || !message) {
      alert('অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন।');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('সঠিক ইমেইল ঠিকানা দিন।');
      return;
    }

    const btn = document.getElementById('submitFormBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span> পাঠানো হচ্ছে...'; }

    if (!window.db) {
      // Fallback: just show success
      showContactSuccess();
      return;
    }

    window.db.collection('messages').add({
      name: name.trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      subject,
      message: message.trim(),
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      showContactSuccess();
    }).catch(err => {
      console.error('Message save failed:', err);
      alert('মেসেজ পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন বা সরাসরি ইমেইল করুন।');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>✉️</span> বার্তা পাঠান'; }
    });
  }

  function showContactSuccess() {
    const form = document.getElementById('contactForm');
    const success = document.getElementById('formSuccess');
    if (form) form.style.display = 'none';
    if (success) success.style.display = 'block';
  }

  // ---------- HELPERS ----------
  function bindSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      if (a.dataset.smoothBound === '1') return;
      a.dataset.smoothBound = '1';
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const t = document.querySelector(href);
        if (t) {
          e.preventDefault();
          t.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  function bindScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in:not(.bound)').forEach(el => {
      el.classList.add('bound');
      observer.observe(el);
    });
    // Also observe app cards for stagger
    document.querySelectorAll('.app-card:not(.bound)').forEach((el, i) => {
      el.classList.add('bound');
      el.style.transitionDelay = (i % 3) * 80 + 'ms';
      observer.observe(el);
    });
  }

  function useDefaultContent() {
    renderHero(DEFAULT_HERO);
    renderAbout(DEFAULT_ABOUT);
    renderContact(DEFAULT_CONTACT);
    // Apps & slides: just show empty
    if (els.appsGrid) {
      els.appsGrid.innerHTML = `
        <div class="loading-state" style="grid-column:1/-1;">
          এখনও কোনো app যোগ করা হয়নি।
        </div>
      `;
    }
    hideSlidesSection();
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
  function escapeAttr(s) { return escapeHtml(s); }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSite);
  } else {
    initSite();
  }

})();
