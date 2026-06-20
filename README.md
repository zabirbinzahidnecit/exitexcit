# Exit Excit — Website + Admin Panel Setup Guide

আপনার ওয়েবসাইটের ডিজাইন অপরিবর্তিত রেখে একটি **Admin Panel** যোগ করা হয়েছে। এখন আপনি ব্যাকএন্ড কোড স্পর্শ না করেই admin panel থেকে সব কন্টেন্ট পরিচালনা করতে পারবেন।

এই গাইডটি **ধাপে ধাপে** দেখাবে কীভাবে সবকিছু সেটআপ করতে হয়।

---

## 📁 ফাইল স্ট্রাকচার

```
exitexcit_admin/
├── index.html              ← পাবলিক ওয়েবসাইট (আপনার আসল সাইট, ডিজাইন অপরিবর্তিত)
├── admin.html              ← অ্যাডমিন প্যানেল লগইন + ড্যাশবোর্ড
├── css/
│   ├── style.css           ← পাবলিক সাইটের স্টাইল (আসল থেকে এক্সট্রাক্ট করা)
│   └── admin.css           ← অ্যাডমিন প্যানেলের স্টাইল
├── js/
│   ├── firebase-config.js  ← ⚠️ আপনাকে এখানে Firebase config বসাতে হবে
│   ├── firebase-init.js    ← Firebase SDK লোডার (পরিবর্তন করবেন না)
│   ├── site.js             ← পাবলিক সাইটের লজিক (Firestore থেকে ডেটা লোড)
│   └── admin.js            ← অ্যাডমিন প্যানেলের লজিক (CRUD)
├── assets/
│   ├── logo.png            ← কোম্পানি লোগো
│   └── mess_tracker_preview.jpg
├── firestore.rules         ← Firebase Firestore নিরাপত্তা নিয়ম
├── storage.rules           ← Firebase Storage নিরাপত্তা নিয়ম
└── README.md               ← এই ফাইল
```

---

## 🚀 যে যে কাজ আপনাকে করতে হবে (সংক্ষেপে)

1. Firebase প্রজেক্ট তৈরি করুন
2. **Firestore** ও **Authentication** চালু করুন (ফ্রি, কার্ড লাগে না)
3. **Storage** — কার্ড থাকলে চালু করুন, না থাকলে স্কিপ করুন (Imgur URL ব্যবহার করবেন)
4. অ্যাডমিন ইমেইল+পাসওয়ার্ড অ্যাকাউন্ট তৈরি করুন
5. `js/firebase-config.js` ফাইলে config বসান
6. Firestore (ও চাইলে Storage) নিয়ম ডিপ্লয় করুন
7. GitHub Pages এ আপলোড করুন
8. `admins` কালেকশনে অ্যাডমিন হিসেবে নিজেকে যোগ করুন
9. `admin.html` এ লগইন করুন ও কন্টেন্ট এডিট করুন

---

## 📺 ধাপ ১ — Firebase প্রজেক্ট তৈরি

1. ব্রাউজারে যান: **https://console.firebase.google.com**
2. Google অ্যাকাউন্ট দিয়ে সাইন ইন করুন
3. **"Add project"** বাটনে ক্লিক করুন
4. প্রজেক্টের নাম দিন (যেমন: `exitexcit-website`)
5. Google Analytics অফার করলে **"Continue"** বা disable করে **"Create project"**
6. প্রজেক্ট তৈরি হওয়া পর্যন্ত অপেক্ষা করুন, তারপর **"Continue"**

---

## 🗄️ ধাপ ২ — Firestore Database চালু করুন

1. বাম পাশের মেনু থেকে **"Firestore Database"** → ক্লিক করুন
2. **"Create database"** বাটনে ক্লিক করুন
3. **"Start in production mode"** নির্বাচন করুন (নিরাপত্তার জন্য)
4. লোকেশন: **`asia-south1` (Mumbai)** — বাংলাদেশ থেকে সবচেয়ে দ্রুত
5. **"Enable"** ক্লিক করুন

এখন Firestore প্রস্তুত।

---

## 👤 ধাপ ৩ — Authentication চালু করুন

1. বাম মেনু থেকে **"Authentication"** → ক্লিক করুন
2. **"Get started"** বাটন
3. **"Sign-in method"** ট্যাবে যান
4. **"Email/Password"** খুঁজে বের করুন → ক্লিক করুন
5. **"Enable"** করে দিন → **"Save"**

---

## 📦 ধাপ ৪ — Storage (ঐচ্ছিক, কার্ড না থাকলে স্কিপ করুন)

> 💡 **কার্ড না থাকলে এই ধাপ স্কিপ করুন।**
> Firebase Storage চালু করতে Blaze (pay-as-you-go) প্ল্যান লাগে।
> আপনি চাইলে ছবিগুলো Imgur/GitHub-এ আপলোড করে URL দিয়ে বসাতে পারেন — সম্পূর্ণ ফ্রি।
> নিচের "📷 ছবি কীভাবে যোগ করবেন (কার্ড ছাড়া)" সেকশনটি দেখুন।

**যদি কার্ড থাকে এবং Storage চালু করতে চান:**

1. বাম মেনু থেকে **"Storage"** → ক্লিক করুন
2. **"Get started"**
3. **"Start in production mode"** নির্বাচন করুন
4. লোকেশন একই রাখুন (asia-south1)
5. **"Done"**

---

## 📁 ফাইল পাথ গাইড (সবকিছু এক জায়গায়)

আপনার GitHub রিপোতে এই ৩টি ফোল্ডার রাখুন (root level এ):

```
your-repo/
├── images/      ← শুধু ছবি
│   ├── (PNG, JPG, GIF, WebP, SVG)
│   ├── app-icons/         ← (ঐচ্ছিক সাব-ফোল্ডার) আইকন রাখতে পারেন
│   └── screenshots/       ← (ঐচ্ছিক সাব-ফোল্ডার) স্ক্রিনশট
├── videos/      ← শুধু ভিডিও
│   └── (MP4, WebM, MOV, OGG)
├── media/       ← অডিও + মিক্সড মিডিয়া
│   └── (MP3, WAV, OGG, M4A, AAC, FLAC)
├── index.html
├── admin.html
├── css/
├── js/
└── assets/
```

### 📋 কোন ফোল্ডারে কী রাখবেন

| ফোল্ডার | কী রাখবেন | ফরম্যাট | কোথায় ব্যবহৃত হবে |
|--------|----------|--------|------------------|
| `images/` | App আইকন, প্রিভিউ ছবি, স্ক্রিনশট, স্লাইড ছবি | PNG, JPG, GIF, WebP, SVG | App icon, Preview, Screenshots, Slides (image type) |
| `videos/` | প্রোডাক্ট ভিডিও, টিউটোরিয়াল, ডেমো | MP4, WebM, MOV, OGG | Slides (video type) |
| `media/` | অডিও — ব্যাকগ্রাউন্ড মিউজিক, পডকাস্ট, ভয়েসওভার | MP3, WAV, OGG, M4A, AAC, FLAC | Slides (audio type) |

### ⚙️ `js/firebase-config.js` এ কনফিগ বসান

```javascript
const githubConfig = {
  owner: "zabirbinzahidnecit",      // আপনার GitHub username
  repo: "exitexcit-website",        // রিপোর নাম
  branch: "main",                   // ব্রাঞ্চ (সাধারণত main)
  imagesPath: "images",             // ছবির ফোল্ডার
  videosPath: "videos",             // ভিডিওর ফোল্ডার
  audioPath: "media"                // অডিওর ফোল্ডার
};
```

### 🎯 কীভাবে কাজ করবে

Admin panel এ যেকোনো ফাইল বাছাই করার সময় **"📂 GitHub থেকে বাছুন"** বাটনে ক্লিক করলে:

- **App আইকন** → `images/` ফোল্ডার খুলবে (PNG/JPG)
- **প্রিভিউ ছবি** → `images/` ফোল্ডার খুলবে
- **স্ক্রিনশট** → `images/` ফোল্ডার খুলবে
- **Slide (image type)** → `images/` ফোল্ডার খুলবে
- **Slide (video type)** → `videos/` ফোল্ডার খুলবে
- **Slide (audio type)** → `media/` ফোল্ডার খুলবে

---

## 📷 ছবি কীভাবে যোগ করবেন (কার্ড ছাড়া — সম্পূর্ণ ফ্রি)

Firebase Storage চালু না থাকলেও admin panel থেকে ছবি যোগ করতে পারবেন।
৪টি অপশন আছে:

### 🅰️ অপশন A — GitHub ফাইল পিকার (সবচেয়ে সুবিধাজনক)

আপনার GitHub রিপোতে ছবি/ভিডিও/অডিও রাখলে admin panel থেকে সরাসরি বাছাই করতে পারবেন।

**Setup:** উপরের "ফাইল পাথ গাইড" দেখুন।

**ব্যবহার:**

- Admin panel → App যোগ করুন → "প্রিভিউ ছবি" ফিল্ডে **"📂 GitHub থেকে বাছুন"** বাটন দেখবেন
- ক্লিক করলে আপনার `images/` ফোল্ডারের সব ছবি গ্রিড আকারে দেখাবে
- যেটা চান সেটা ক্লিক করুন → অটো URL বসে যাবে
- একইভাবে Slides এর জন্য "📂 GitHub থেকে বাছুন" — টাইপ অনুযায়ী images/videos/media ফোল্ডার দেখাবে

### 🅱️ অপশন B — Imgur (আনলিমিটেড ফ্রি)

1. https://imgur.com/upload এ যান
2. ছবি ড্র্যাগ-ড্রপ করে আপলোড করুন
3. আপলোড হওয়া ছবিতে ক্লিক করুন → ডান পাশে **"Copy direct link"** বাটন
4. URL দেখতে এরকম হবে: `https://i.imgur.com/abc123.jpg`
5. এই URL admin panel এ "ছবি URL" বক্সে পেস্ট করুন

### 🅲 অপশন C — Postimages (খুব সহজ)

1. https://postimages.org এ যান
2. ছবি আপলোড করুন
3. **"Direct Link"** কপি করুন
4. admin panel এ বসান

### 🎬 ভিডিও স্লাইড কীভাবে যোগ করবেন

ভিডিও হোস্ট করতে:
- **GitHub** (`videos/` ফোল্ডার): admin panel এ "📂 GitHub থেকে বাছুন" → videos ফোল্ডার খুলবে
- **Imgur** (mp4 সাপোর্ট করে): https://imgur.com/upload → ভিডিও আপলোড → Direct link
- **Cloudinary** (ফ্রি ২৫ GB): https://cloudinary.com → ভিডিও আপলোড → direct mp4 URL

তারপর admin panel → Slides → মিডিয়া টাইপ "ভিডিও" বাছুন → "মিডিয়া URL" বক্সে direct mp4 URL দিন।

### 🎵 অডিও স্লাইড কীভাবে যোগ করবেন

অডিও হোস্ট করতে:
- **GitHub** (`media/` ফোল্ডার): admin panel এ "📂 GitHub থেকে বাছুন" → media ফোল্ডার খুলবে
- **Imgur**: mp3 আপলোড → direct link
- **Internet Archive**: https://archive.org → অডিও আপলোড → direct mp3 URL

তারপর admin panel → Slides → মিডিয়া টাইপ **"অডিও (mp3)"** বাছুন → "মিডিয়া URL" বক্সে direct mp3 URL দিন।

স্লাইডে অডিও দেখানোর সময় একটি সুন্দর ব্যাকগ্রাউন্ড ও প্লেয়ার দেখাবে।

### 🎨 আইকন যোগ করা (PNG/JPG বা Emoji)

App যোগ করার সময় আইকন ফিল্ডে **"🎨 বাছুন"** বাটনে ক্লিক করলে ৪টি অপশন:

1. **Emoji** — সরাসরি টাইপ করুন (যেমন `🍽️`)
2. **GitHub থেকে ছবি** — `images/` ফোল্ডার খুলবে (PNG/JPG)
3. **কম্পিউটার থেকে আপলোড** — Firebase Storage চালু থাকলে
4. **URL** — যেকোনো direct image URL

PNG/JPG আইকন ব্যবহার করলে সাইটে সুন্দরভাবে দেখাবে।

---

## 📱 মোবাইল ভিউ অপটিমাইজেশন

আপনার ওয়েবসাইট এখন সম্পূর্ণ মোবাইল-রেসপন্সিভ:

- **হ্যামবার্গার মেনু** — মোবাইলে নেভিগেশন মেনু আইকনে ক্লিক করে খুলবে
- **অ্যাপস গ্রিড** — ফোনে ১ কলাম, ট্যাবলেটে ২ কলাম, ডেস্কটপে অটো-ফিট
- **হিরো সেকশন** — মোবাইলে বাটনগুলো ভার্টিক্যালি সাজবে
- **স্লাইড কন্টেইনার** — মোবাইলে ছোট হাইট, টাচ-ফ্রেন্ডলি অ্যারো
- **মডাল পপআপ** — মোবাইলে স্ক্রিনের ৯৫% জায়গা নেবে
- **ছোট ফোন (<380px)** — এক্সট্রা কম্প্যাক্ট লেআউট

মোবাইলে টেস্ট করুন: Chrome DevTools (F12) → Toggle device toolbar (Ctrl+Shift+M) → যেকোনো ফোন সিমুলেট করুন

---

## 🔑 ধাপ ৫ — অ্যাডমিন অ্যাকাউন্ট তৈরি করুন

1. Firebase Console → **Authentication → Users** ট্যাবে যান
2. **"Add user"** বাটন ক্লিক করুন
3. আপনার অ্যাডমিন ইমেইল ও শক্তিশালী পাসওয়ার্ড দিন
   (যেমন: `zabir@exitexcit.com` + ১২ অক্ষরের পাসওয়ার্ড)
4. **"Add user"** ক্লিক করুন
5. তৈরি হওয়া ইউজারের **User UID** কপি করে রাখুন (পরের ধাপে লাগবে)

---

## ⚙️ ধাপ ৬ — Web App যোগ করুন ও Config নিন

1. Firebase Console → **Project Overview** (উপরে বাম পাশে)
2. নিচের দিকে স্ক্রল করুন, **"</>"** ওয়েব আইকন দেখবেন — ক্লিক করুন
   (যদি না দেখেন: **"Add app" → Web** ক্লিক করুন)
3. অ্যাপের নাম দিন: `Exit Excit Website`
4. **"Register app"** ক্লিক করুন
5. পরের পেজে একটি কোড ব্লক দেখবেন এরকম:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA...........",
  authDomain: "exitexcit-xxxxx.firebaseapp.com",
  projectId: "exitexcit-xxxxx",
  storageBucket: "exitexcit-xxxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234:web:abc123def456"
};
```

6. এই পুরো ভ্যালুগুলো কপি করুন

---

## 🔧 ধাপ ৭ — Config বসান

1. ফাইলটি খুলুন: **`js/firebase-config.js`** (যেকোনো টেক্সট এডিটরে — VS Code, Notepad++)
2. নিচের অংশে আপনার ভ্যালুগুলো বসান:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA...........",                    ← এখানে
  authDomain: "exitexcit-xxxxx.firebaseapp.com",    ← এখানে
  projectId: "exitexcit-xxxxx",                     ← এখানে
  storageBucket: "exitexcit-xxxxx.appspot.com",     ← এখানে
  messagingSenderId: "1234567890",                  ← এখানে
  appId: "1:1234:web:abc123def456"                  ← এখানে
};
```

3. ফাইলটি সেভ করুন।

> ⚠️ গুরুত্বপূর্ণ: `YOUR_API_KEY_HERE` এর জায়গায় আপনার আসল কী বসান। অন্যথায় কিছুই কাজ করবে না।

---

## 🛡️ ধাপ ৮ — Security Rules ডিপ্লয় করুন

### A) Firestore Rules:

1. Firebase Console → **Firestore Database → Rules** ট্যাবে যান
2. `firestore.rules` ফাইলটি টেক্সট এডিটরে খুলুন → পুরো কন্টেন্ট কপি করুন
3. Console এ পেস্ট করুন
4. **"Publish"** বাটন ক্লিক করুন

### B) Storage Rules:

1. Firebase Console → **Storage → Rules** ট্যাবে যান
2. `storage.rules` ফাইলটি খুলে পুরো কন্টেন্ট কপি করুন
3. Console এ পেস্ট করুন
4. **"Publish"** ক্লিক করুন

---

## 👑 ধাপ ৯ — নিজেকে Admin হিসেবে যোগ করুন

Firestore-এ `admins` কালেকশনে আপনার ইউজার UID যোগ করতে হবে।

1. Firebase Console → **Firestore Database → Data** ট্যাবে যান
2. **"Start collection"** ক্লিক করুন
3. Collection ID: `admins` → **"Next"**
4. **Document ID**: ধাপ ৫ এ কপি করা **User UID** বসান
5. ফিল্ড যোগ করুন:
   - Field: `isAdmin` | Type: `boolean` | Value: `true`
   - Field: `email` | Type: `string` | Value: আপনার অ্যাডমিন ইমেইল
6. **"Save"** ক্লিক করুন

এখন শুধুমাত্র আপনি অ্যাডমিন প্যানেল এক্সেস করতে পারবেন।

---

## 🌐 ধাপ ১০ — GitHub Pages এ আপলোড করুন

1. GitHub-এ একটি নতুন রিপোজিটরি তৈরি করুন (যেমন: `exitexcit-website`)
2. রিপোজিটরিতে পুরো `exitexcit_admin/` ফোল্ডারের সব ফাইল আপলোড করুন
   - GitHub ওয়েব ইন্টারফেসে "Add file → Upload files" দিয়ে
   - অথবা Git কমান্ড দিয়ে: `git push origin main`
3. রিপোজিটরি **Settings → Pages** এ যান
4. **"Source"**: `Deploy from a branch` নির্বাচন করুন
5. **Branch**: `main` / `(root)` নির্বাচন করুন → **"Save"**
6. ১-২ মিনিট অপেক্ষা করুন, আপনার সাইট লাইভ হবে:
   `https://<username>.github.io/<repo>/`

> 💡 যদি রিপোজিটরির নাম `<username>.github.io` হয়, তাহলে URL হবে সরাসরি `https://<username>.github.io/`

---

## 🎯 ধাপ ১১ — Admin Panel এ লগইন করুন

1. ব্রাউজারে যান: `https://<username>.github.io/<repo>/admin.html`
2. আপনার অ্যাডমিন ইমেইল ও পাসওয়ার্ড দিন
3. **"লগ ইন করুন"** ক্লিক করুন
4. সফল হলে ড্যাশবোর্ড দেখতে পাবেন

---

## 📝 Admin Panel এ যা যা করতে পারবেন

### 📊 ড্যাশবোর্ড
- মোট Apps, Slides, নতুন মেসেজ, Live Apps সংখ্যা
- সাম্প্রতিক মেসেজ দেখুন

### 📱 Apps ব্যবস্থাপনা
- **নতুন App যোগ**: নাম, আইকন (emoji), ট্যাগলাইন, বিবরণ, ফিচার লিস্ট, স্ট্যাটাস, লিংক, প্রিভিউ ছবি, স্ক্রিনশট, ইউজার গাইড, অতিরিক্ত লিংক
- **এডিট/ডিলিট**: যেকোনো app পরিবর্তন বা মুছে ফেলুন
- **দৃশ্যমানতা**: চাইলে app লুকিয়ে রাখুন (visible: false)
- **অর্ডারিং**: কোন app আগে দেখাবে তা নির্ধারণ করুন

### 🎬 স্লাইডস (Biggapon / Presentation)
- নতুন স্লাইড যোগ করুন (ছবি অথবা ভিডিও)
- ক্যাপশন ও বিবরণ লিখুন
- ক্লিক করলে কোন লিংকে যাবে তা নির্ধারণ করুন
- অটো-রোটেট + ম্যানুয়াল নেভিগেশন (ডট ও তীর)
- সাইটে homepage এ "প্রোডাক্ট প্রেজেন্টেশন" সেকশন দেখাবে

### 🏠 হোম / হিরো সেকশন
- ব্যাজ টেক্সট পরিবর্তন
- টাইটেল (সোনালি + সবুজ অংশ)
- সাব-টাইটেল, ট্যাগলাইন
- পরিসংখ্যান (Live Apps, Free to Use ইত্যাদি)
- বাটন টেক্সট

### ℹ️ আমাদের সম্পর্কে
- সেকশন লেবেল, টাইটেল, বিবরণ
- ৪টি মূল্যবোধ কার্ড (উদ্ভাবন, সরলতা, নিরাপত্তা, বিনামূল্যে)
- টেক পিলস (React.js, Firebase, ইত্যাদি)

### ✉️ যোগাযোগ তথ্য
- ইমেইল, ফোন, ঠিকানা, GitHub লিংক
- "দ্রুত সাড়া পান!" নোট

### 💬 মেসেজ
- ব্যবহারকারীরা কন্টাক্ট ফর্ম পূরণ করলে মেসেজ এখানে আসবে
- নতুন মেসেজ ব্যাজ দেখাবে
- মেসেজ পড়ুন, পঠিত/অপঠিত চিহ্নিত করুন, সরাসরি রিপ্লাই ইমেইল করুন, ডিলিট করুন

---

## 🔄 কন্টেন্ট যোগ করার পর

পাবলিক সাইট (`index.html`) স্বয়ংক্রিয়ভাবে Firestore থেকে ডেটা লোড করে।
তাই অ্যাডমিন প্যানেলে কিছু পরিবর্তন করলে সাথে সাথেই সাইটে দেখা যাবে —
পেজ রিফ্রেশ করলেই যথেষ্ট। কোনো কোড পরিবর্তন করতে হবে না।

---

## ❓ সমস্যা সমাধান (Troubleshooting)

| সমস্যা | সমাধান |
|--------|--------|
| "Firebase লোড করা যায়নি" | `js/firebase-config.js` এ config ঠিকমতো বসান |
| লগইন হচ্ছে না | Authentication এ Email/Password enable আছে কিনা দেখুন |
| "এই ইমেইল দিয়ে অ্যাডমিন অ্যাক্সেস নেই" | `admins` কালেকশনে আপনার UID ও `isAdmin: true` যোগ করুন |
| সাইটে কন্টেন্ট দেখাচ্ছে না | Firestore rules ঠিকমতো পাবলিশ করেছেন কিনা দেখুন |
| ছবি আপলোড হচ্ছে না (কার্ড নেই) | Firebase Storage চালু না — উপরের URL বক্সে Imgur direct link দিন |
| "Storage not enabled" / "storage is undefined" | স্বাভাবিক — কার্ড ছাড়া চালানোর সময় দেখাবে। Imgur URL ব্যবহার করুন |
| ছবি সাইটে দেখাচ্ছে না কিন্তু URL ঠিক | URL টা "direct link" কিনা দেখুন — Imgur এ ক্লিক করে "Copy direct link" দিন |
| "Missing or insufficient permissions" | Firestore rules ঠিকমতো পাবলিশ করা নেই — আবার কপি করে পেস্ট করুন |
| GitHub Pages এ কনসোলে CORS error | Firebase Console → Authentication → Settings → Authorized domains এ GitHub Pages URL যোগ করুন |

---

## 🔒 নিরাপত্তা নোট

- **Firestore rules** নিশ্চিত করে যে শুধু অ্যাডমিনই লিখতে পারে
- **Storage rules** নিশ্চিত করে যে শুধু অ্যাডমিনই ছবি আপলোড করতে পারে
- পাবলিক সাইট শুধু পড়তে পারে (read), লিখতে পারে না (শুধু contact form messages ছাড়া)
- অ্যাডমিন প্যানেল ঢুকতে সঠিক ইমেইল+পাসওয়ার্ড লাগবে
- আপনার Firebase API key পাবলিক হলেও নিরাপদ — কারণ rules শুধু অনুমোদিত ইউজারকেই write করতে দেয়

---

## 📞 যদি সাহায্য লাগে

- Firebase অফিসিয়াল ডকস: https://firebase.google.com/docs
- Firestore rules ডকস: https://firebase.google.com/docs/firestore/security/get-started

---

শুভকামনা! 🚀 এখন আপনার সাইট পুরোপুরি কন্টেন্ট-ম্যানেজড। আর কখনো ব্যাকএন্ড কোড এডিট করতে হবে না।
