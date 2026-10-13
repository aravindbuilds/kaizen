/* Kaizen runtime config — PUBLIC defaults only. Real secrets are injected at
   deploy time into config.gen.js (gitignored) from Vercel env vars. See SETUP.md.
   Load order in index.html: config.gen.js first, then this file fills any gaps. */
window.KAIZEN_CFG = Object.assign({
  firebaseConfig: null,
  room: "",
  name: ""
}, window.KAIZEN_CFG || {});
