// /js/i18n.js  — robust paths + fallbacks + observer
const LS_KEY = "lang";
const SUPPORTED = ["en","ar"];
const DEFAULT_LANG = "en";
const I18N_DEBUG = false;

// resolve /i18n/* relative to current folder so it works in subfolders
function baseDir() {
  let p = location.pathname;
  return p.endsWith("/") ? p : p.replace(/[^/]+$/, "");
}
function i18nUrl(file) { return `${baseDir()}i18n/${file}`; }

function pageKey() {
  const name = (location.pathname.split("/").pop() || "index.html").split(".")[0];
  return name || "index";
}

function setHtmlLangDir(lang){
  const html = document.documentElement;
  html.lang = lang;
  html.dir = (lang === "ar") ? "rtl" : "ltr";
  if (lang === "ar" && !document.getElementById("ar-font")) {
    const link = document.createElement("link");
    link.id = "ar-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;600;700&display=swap";
    document.head.appendChild(link);
    document.documentElement.style.setProperty("--app-font-ar", "'Noto Sans Arabic', system-ui, sans-serif");
  }
}

// Export current language for other modules
export function getCurrentLanguage() {
  return getLang();
}

// Set language programmatically
export async function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) {
    console.warn(`[i18n] Unsupported language: ${lang}`);
    return;
  }
  
  try {
    localStorage.setItem(LS_KEY, lang);
    setHtmlLangDir(lang);
    await loadAndApply(lang);
  } catch (error) {
    console.error('[i18n] Error setting language:', error);
  }
}

async function loadJSON(url){
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) { if (I18N_DEBUG) console.warn("[i18n] HTTP", res.status, url); return {}; }
    return await res.json();
  } catch (e) {
    console.warn("[i18n] Failed to load", url, e.message);
    return {};
  }
}

function get(dict, path){
  if (!dict || typeof dict !== 'object') {
    return undefined;
  }
  return path.split(".").reduce((o,k)=> (o && typeof o === 'object' && k in o) ? o[k] : undefined, dict);
}

function translateNode(el, dict){
  const key = el.getAttribute("data-i18n");
  if (!key) return;
  const attrList = (el.getAttribute("data-i18n-attr") || "").split("|").filter(Boolean);
  const val = get(dict, key);
  if (val == null) { if (I18N_DEBUG) console.warn("[i18n] missing:", key); return; }
  if (attrList.length){
    attrList.forEach(a => el.setAttribute(a, val));
  } else if (el.hasAttribute("placeholder-i18n")) {
    el.setAttribute("placeholder", val);
  } else {
    el.textContent = val;
  }
}

function applyAll(dict){
  document.querySelectorAll("[data-i18n]").forEach(el => translateNode(el, dict));
}

// observe late-added nodes (menus/modals)
let i18nObserver;
function observeI18N(dict){
  if (i18nObserver) i18nObserver.disconnect();
  i18nObserver = new MutationObserver(muts=>{
    for (const m of muts){
      m.addedNodes?.forEach(n=>{
        if (n.nodeType === 1){
          if (n.hasAttribute?.("data-i18n")) translateNode(n, dict);
          n.querySelectorAll?.("[data-i18n]")?.forEach(el=> translateNode(el, dict));
        }
      });
    }
  });
  i18nObserver.observe(document.body, { childList:true, subtree:true });
}

async function setLang(lang){
  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
  localStorage.setItem(LS_KEY, lang);
  setHtmlLangDir(lang);

  const pk = pageKey();
  const [gL, pL, gE, pE] = await Promise.all([
    loadJSON(i18nUrl(`global.${lang}.json`)),
    loadJSON(i18nUrl(`${pk}.${lang}.json`)),
    loadJSON(i18nUrl(`global.en.json`)),
    loadJSON(i18nUrl(`${pk}.en.json`)),
  ]);

  // fallback: EN → overlay chosen lang
  const dict = Object.assign({}, gE, pE, gL, pL);
  applyAll(dict);
  observeI18N(dict);

  // toggle UI bold
  document.querySelectorAll("#lang-toggle .lang-btn").forEach(btn=>{
    btn.style.fontWeight = (btn.dataset.lang === lang) ? "700" : "400";
  });
}

function init(){
  const saved = localStorage.getItem(LS_KEY) || DEFAULT_LANG;
  setLang(saved);
  document.getElementById("lang-toggle")?.addEventListener("click", (e)=>{
    const btn = e.target.closest(".lang-btn");
    if (!btn) return;
    setLang(btn.dataset.lang);
  });
}
init();
export {};