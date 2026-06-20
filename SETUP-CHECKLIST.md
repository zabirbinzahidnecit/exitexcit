# ✅ Setup Checklist — Exit Excit Admin Panel

প্রতিটি ধাপ শেষ করার পর বাক্সে টিক দিন। সব টিক হলে আপনার সাইট প্রস্তুত!

## Firebase Setup

- [ ] ১. Firebase প্রজেক্ট তৈরি (https://console.firebase.google.com)
- [ ] ২. Firestore Database চালু (Production mode, asia-south1)
- [ ] ৩. Authentication → Email/Password enable
- [ ] ৪. **Storage** — কার্ড থাকলে চালু করুন (Blaze plan), না থাকলে স্কিপ করুন (Imgur URL ব্যবহার করবেন)
- [ ] ৫. Authentication → Users → অ্যাডমিন ইউজার তৈরি
- [ ] ৬. অ্যাডমিন ইউজারের **UID** কপি করে রাখা
- [ ] ৭. Web App (</>) যোগ করা
- [ ] ৮. Firebase config ভ্যালুগুলো কপি করা

## Config বসানো

- [ ] ৯. `js/firebase-config.js` খুলে সব `YOUR_*` ভ্যালু পাল্টানো
- [ ] ১০. ফাইল সেভ করা

## Rules ডিপ্লয়

- [ ] ১১. Firestore → Rules ট্যাব → `firestore.rules` কন্টেন্ট পেস্ট → Publish
- [ ] ১২. **(ঐচ্ছিক, শুধু Storage চালু থাকলে)** Storage → Rules ট্যাব → `storage.rules` কন্টেন্ট পেস্ট → Publish

## Admin রেকর্ড যোগ

- [ ] ১৩. Firestore → Data → "Start collection" → `admins`
- [ ] ১৪. Document ID = আপনার UID
- [ ] ১৫. ফিল্ড: `isAdmin: true` (boolean), `email: <your-email>` (string)
- [ ] ১৬. Save

## GitHub Pages

- [ ] ১৭. GitHub এ নতুন রিপোজিটরি তৈরি
- [ ] ১৮. পুরো `exitexcit_admin/` ফোল্ডার আপলোড
- [ ] ১৯. Settings → Pages → Branch: main → Save
- [ ] ২০. ১-২ মিনিট অপেক্ষা → সাইট লাইভ হবে

## টেস্ট

- [ ] ২১. `https://<username>.github.io/<repo>/` খুলুন → সাইট দেখুন
- [ ] ২২. `https://<username>.github.io/<repo>/admin.html` খুলুন → লগইন করুন
- [ ] ২৩. একটি App যোগ করে দেখুন সাইটে আসছে কিনা
- [ ] ২৪. একটি Slide যোগ করে দেখুন
- [ ] ২৫. Hero section এডিট করে দেখুন
- [ ] ২৬. Contact form পূরণ করে দেখুন → admin এ message আসছে কিনা

---

সব টিক হয়ে গেলে 🎉 আপনার সাইট সম্পূর্ণ প্রস্তুত!
