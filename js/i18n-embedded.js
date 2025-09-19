// /js/i18n-embedded.js - Embedded translations to avoid CORS issues
const LS_KEY = "lang";
const SUPPORTED = ["en","ar"];
const DEFAULT_LANG = "en";

// Embedded translations
const TRANSLATIONS = {
  en: {
    nav: {
      home: "Home",
      directory: "Directory", 
      events: "Events",
      bulletin: "Bulletin", 
      about: "About", 
      contact: "Contact"
    },
    hero: {
      title: "Unite. Promote. Grow. Together.",
      subtitle: "Empowering Kuwait's MSMEs through community, collaboration, and shared success. Join Chamber 122 and unlock your business potential."
    },
    search: { 
      findLocal: "Find Local MSMEs", 
      namePlaceholder: "Business name...", 
      btn: "Search" 
    },
    cta: { 
      getListed: "Get Listed", 
      login: "Login", 
      signup: "Sign Up & Get Listed",
      joinCommunity: "Join Our Community Today"
    },
    footer: { 
      about: "Connecting Kuwait's MSMEs with opportunities for growth and success. Join our community today." 
    },
    common: {
      search: "Search",
      submit: "Submit",
      cancel: "Cancel",
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      view: "View",
      close: "Close",
      back: "Back",
      next: "Next",
      previous: "Previous",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      account: "Account",
      myBusiness: "My Business",
      myActivities: "My Activities",
      adminPanel: "Admin Panel"
    },
    directory: {
      title: "MSME Directory",
      subtitle: "Discover and connect with Kuwait's growing community of micro, small, and medium enterprises",
      searchLabel: "Search",
      searchPlaceholder: "Search by name or description...",
      category: "Category",
      allCategories: "All Categories"
    },
    events: {
      title: "Events & Activities",
      subtitle: "Discover upcoming events, workshops, and networking opportunities"
    },
    bulletin: {
      title: "MSME Bulletin",
      subtitle: "Stay updated with announcements, job postings, training opportunities, and funding information from the MSME community"
    },
    about: {
      title: "About Chamber122",
      subtitle: "Empowering Kuwait's MSME community through connection, support, and growth opportunities."
    },
    contact: {
      title: "Contact Us",
      subtitle: "We're here to help you succeed. Reach out for support, partnerships, or any questions about Chamber122.",
      formTitle: "Send Us a Message",
      formSubtitle: "Fill out the form below and we'll get back to you within 24 hours."
    },
    getListed: {
      title: "Get Listed",
      subtitle: "Join our community and list your business"
    },
    auth: {
      title: "Authentication",
      subtitle: "Sign in to your account or create a new one"
    },
    owner: {
      title: "My Business",
      subtitle: "Manage your business profile and settings"
    },
    ownerActivities: {
      title: "My Activities",
      subtitle: "Track and manage your business activities"
    },
    admin: {
      title: "Admin Panel",
      subtitle: "Manage the Chamber122 platform"
    }
  },
  ar: {
    nav: {
      home: "الرئيسية",
      directory: "الدليل", 
      events: "الفعاليات",
      bulletin: "النشرة", 
      about: "من نحن", 
      contact: "تواصل"
    },
    hero: {
      title: "نتحد. نروّج. ننمو. معًا.",
      subtitle: "نُمكّن المشاريع الصغيرة والمتوسطة في الكويت عبر المجتمع والتعاون والنجاح المشترك. انضم إلى تشامبر 122 واطلق إمكانات عملك."
    },
    search: { 
      findLocal: "ابحث عن المشاريع المحلية", 
      namePlaceholder: "اسم المشروع...", 
      btn: "بحث" 
    },
    cta: { 
      getListed: "أدرج مشروعك", 
      login: "تسجيل الدخول", 
      signup: "إنشاء حساب وإدراج المشروع",
      joinCommunity: "انضم إلى مجتمعنا اليوم"
    },
    footer: { 
      about: "نصل المشاريع الصغيرة والمتوسطة في الكويت بفرص للنمو والنجاح. انضم إلى مجتمعنا اليوم." 
    },
    common: {
      search: "بحث",
      submit: "إرسال",
      cancel: "إلغاء",
      save: "حفظ",
      edit: "تعديل",
      delete: "حذف",
      view: "عرض",
      close: "إغلاق",
      back: "رجوع",
      next: "التالي",
      previous: "السابق",
      loading: "جاري التحميل...",
      error: "خطأ",
      success: "نجح",
      account: "الحساب",
      myBusiness: "مشروعي",
      myActivities: "أنشطتي",
      adminPanel: "لوحة الإدارة"
    },
    directory: {
      title: "دليل المشاريع الصغيرة والمتوسطة",
      subtitle: "اكتشف وتواصل مع مجتمع المشاريع الصغيرة والمتوسطة المتنامي في الكويت",
      searchLabel: "بحث",
      searchPlaceholder: "ابحث بالاسم أو الوصف...",
      category: "الفئة",
      allCategories: "جميع الفئات"
    },
    events: {
      title: "الفعاليات والأنشطة",
      subtitle: "اكتشف الفعاليات القادمة وورش العمل وفرص التواصل"
    },
    bulletin: {
      title: "نشرة المشاريع الصغيرة والمتوسطة",
      subtitle: "ابق على اطلاع بالإعلانات وعروض العمل وفرص التدريب ومعلومات التمويل من مجتمع المشاريع الصغيرة والمتوسطة"
    },
    about: {
      title: "حول تشامبر 122",
      subtitle: "تمكين مجتمع المشاريع الصغيرة والمتوسطة في الكويت من خلال التواصل والدعم وفرص النمو."
    },
    contact: {
      title: "تواصل معنا",
      subtitle: "نحن هنا لمساعدتك على النجاح. تواصل معنا للحصول على الدعم أو الشراكات أو أي أسئلة حول تشامبر 122.",
      formTitle: "أرسل لنا رسالة",
      formSubtitle: "املأ النموذج أدناه وسنرد عليك خلال 24 ساعة."
    },
    getListed: {
      title: "أدرج مشروعك",
      subtitle: "انضم إلى مجتمعنا وأدرج مشروعك"
    },
    auth: {
      title: "المصادقة",
      subtitle: "سجل دخولك إلى حسابك أو أنشئ حساباً جديداً"
    },
    owner: {
      title: "مشروعي",
      subtitle: "إدارة ملف مشروعك والإعدادات"
    },
    ownerActivities: {
      title: "أنشطتي",
      subtitle: "تتبع وإدارة أنشطة مشروعك"
    },
    admin: {
      title: "لوحة الإدارة",
      subtitle: "إدارة منصة تشامبر 122"
    }
  }
};

function pageKey() {
  const path = location.pathname.split("/").pop() || "index.html";
  const name = path.split(".")[0];
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

function get(dict, path){
  return path.split(".").reduce((o,k)=> (o && k in o) ? o[k] : undefined, dict);
}

function applyDict(dict){
  // Text content
  const textElements = document.querySelectorAll("[data-i18n]");
  console.log('Found text elements to translate:', textElements.length);
  textElements.forEach(el=>{
    const key = el.getAttribute("data-i18n");
    const val = get(dict, key);
    console.log(`Translating ${key}: ${val}`);
    if (val == null) return;
    el.textContent = val;
  });
  // Special helper: placeholder-i18n
  document.querySelectorAll("[placeholder-i18n][data-i18n]").forEach(el=>{
    const val = get(dict, el.getAttribute("data-i18n"));
    if (val != null) el.setAttribute("placeholder", val);
  });
}

function setLang(lang){
  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
  console.log('Setting language to:', lang);
  localStorage.setItem(LS_KEY, lang);
  setHtmlLangDir(lang);
  
  const dict = TRANSLATIONS[lang] || {};
  console.log('Using embedded dict:', dict);
  applyDict(dict);
  
  // Toggle UI bold
  document.querySelectorAll("#lang-toggle .lang-btn").forEach(btn=>{
    btn.style.fontWeight = (btn.dataset.lang === lang) ? "700" : "400";
  });
}

function init(){
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }
  
  console.log('Initializing embedded i18n system...');
  const saved = localStorage.getItem(LS_KEY) || DEFAULT_LANG;
  setLang(saved);
  
  const langToggle = document.getElementById("lang-toggle");
  if (langToggle) {
    console.log('Language toggle found, adding event listener');
    langToggle.addEventListener("click", (e)=>{
      const btn = e.target.closest(".lang-btn");
      if (!btn) return;
      console.log('Language button clicked:', btn.dataset.lang);
      setLang(btn.dataset.lang);
    });
  } else {
    console.error('Language toggle not found!');
  }
}

init();
