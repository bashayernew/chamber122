// public/js/owner.js
// REQUIREMENT: Use the existing singleton Supabase client (no duplicates).
// We try common globals/exports safely:
console.log('[owner.js] Loading version 8 - Enhanced debugging');
const sb =
  window.supabase ||
  window.supabaseClient ||
  (typeof supabase !== "undefined" ? supabase : null);

if (!sb) {
  console.error(
    "[owner.js] Supabase client not found. Ensure your global singleton is loaded before this script."
  );
}

// Prevent accidental /null or empty src loads
function safeSetImg(el, url, { onShow, onHide } = {}) {
  if (!el) return;
  // Remove any existing handlers to avoid loops
  el.onload = null;
  el.onerror = null;

  // If url is falsy or the literal string "null"/"undefined", show placeholder and bail
  if (!url || url === "null" || url === "undefined") {
    el.removeAttribute("src");
    el.style.display = "none";
    onHide?.();
    return;
  }

  // Set handlers then set src
  el.onload = () => {
    el.style.display = "block";
    onShow?.();
  };
  el.onerror = () => {
    // If load fails, clear src so browser doesn't keep requesting it
    el.removeAttribute("src");
    el.style.display = "none";
    onHide?.();
  };
  el.src = url;
}

const COMMON_LOGO_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

function bust(url){ return url ? `${url}${url.includes("?")?"&":"?"}v=${Date.now()}` : url; }

function tryLoad(url) {
  return new Promise((resolve, reject) => {
    if (!url || url === "null" || url === "undefined") return reject(new Error("bad-url"));
    const img = new Image();
    img.onload = () => resolve(bust(url));
    img.onerror = () => reject(new Error("load-failed"));
    img.src = bust(url);
  });
}

async function signIfNeededFromPath(path) {
  try {
    const { data, error } = await sb.storage.from("business-assets").createSignedUrl(path, 3600);
    if (error) return null;
    return data?.signedUrl || null;
  } catch { return null; }
}

async function publicUrlFromPath(path) {
  const { data } = sb.storage.from("business-assets").getPublicUrl(path);
  return data?.publicUrl || null;
}

async function resolveLogo(biz) {
  // 1) Use stored logo_url if present
  if (biz.logo_url) {
    try { return await tryLoad(bust(biz.logo_url)); }
    catch {
      // If it's a public-URL to a private bucket, try signing it
      const m = biz.logo_url.match(/\/object\/public\/business-assets\/(.+)$/);
      if (m && m[1]) {
        const signed = await signIfNeededFromPath(m[1]);
        if (signed) {
          try { return await tryLoad(signed); } catch {}
        }
      }
    }
  }
  // 2) Probe common extensions without listing
  for (const ext of COMMON_LOGO_EXTS) {
    const path = `${biz.id}/logo.${ext}`;
    const pub = await publicUrlFromPath(path);
    if (pub) { try { return await tryLoad(pub); } catch {} }
    const signed = await signIfNeededFromPath(path);
    if (signed) { try { return await tryLoad(signed); } catch {} }
  }
  return null;
}

// Call inside your load() after fetching biz
async function applyLogo(biz) {
  const img = document.getElementById("biz-logo");
  const showPH = () => { /* optional: toggle a placeholder badge */ };
  const hidePH = () => { /* optional: hide placeholder */ };

  // Start with no src to avoid accidental /null fetch
  if (img) { img.removeAttribute("src"); img.style.display = "none"; }

  const url = await resolveLogo(biz);
  if (!url) {
    safeSetImg(img, null, { onHide: showPH });
    console.warn("[owner.js] logo not found for biz", biz.id);
    return;
  }
  safeSetImg(img, url, { onShow: hidePH, onHide: showPH });
}

const el = (id) => document.getElementById(id);
const text = (node, v) => (node && (node.textContent = v ?? "—"), v);
const safeUrl = (v) => (v && /^https?:\/\//i.test(v) ? v : v ? `https://${v}` : "");

const setLink = (node, v, { tel = false } = {}) => {
  if (!node) return;
  if (!v) {
    node.textContent = "—";
    node.removeAttribute("href");
    return;
  }
  if (tel) {
    const digits = v.replace(/[^\d+]/g, "");
    node.href = `tel:${digits}`;
    node.textContent = v;
  } else {
    node.href = safeUrl(v);
    node.textContent = v.replace(/^https?:\/\//i, "");
  }
};

const setWhatsApp = (node, v) => {
  if (!node) return;
  if (!v) {
    node.textContent = "—";
    node.removeAttribute("href");
    return;
  }
  const digits = v.replace(/[^\d]/g, "");
  node.href = `https://wa.me/${digits}`;
  node.textContent = `+${digits}`;
};

const setBadge = (node, label) => {
  if (!node) return;
  node.textContent = label || "—";
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    // DD/MM/YYYY, HH:mm:ss
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "";
  }
};

async function urlWithSignedFallback(publicUrl, filePath) {
  // Try public url
  const tryImg = (u) => new Promise((res, rej) => { const i=new Image(); i.onload=()=>res(u); i.onerror=rej; i.src=u; });
  if (publicUrl && publicUrl !== 'null' && publicUrl !== 'undefined') {
    try { return await tryImg(publicUrl); } catch {}
  }
  // Fall back to signed URL from storage path (private bucket friendly)
  if (filePath) {
    const { data, error } = await sb.storage.from('business-assets').createSignedUrl(filePath, 3600);
    if (!error && data?.signedUrl) {
      try { return await tryImg(data.signedUrl); } catch {}
    }
  }
  return null;
}

async function loadGallery(bizId){
  console.log('[owner.js] Loading gallery for business:', bizId);
  console.log('[owner.js] Supabase client available:', !!sb);
  
  const wrap = document.getElementById('gallery');
  if (!wrap) {
    console.error('[owner.js] Gallery container not found');
    return; 
  }
  wrap.innerHTML='';
  
  console.log('[owner.js] Making database query...');
  // Fetch gallery data using the proper business_media table structure
  let { data: rows, error } = await sb
    .from('business_media')
    // Select all columns to see what's available
    .select('*')
    .eq('business_id', bizId)
    .order('created_at', { ascending: false });
  
  if (error) { 
    console.error("[owner.js] Error loading gallery:", error);
    wrap.textContent='Could not load images'; 
    return; 
  }
  
  console.log('[owner.js] Gallery data from database:', rows);
  console.log('[owner.js] Number of rows returned:', rows?.length || 0);
  console.log('[owner.js] Raw database response:', { data: rows, error });
  
  if (!rows?.length) { 
    console.log('[owner.js] No gallery images found');
    wrap.textContent='No images yet'; 
    return; 
  }

  // Use the url field directly, with fallback to other possible column names
  const normalized = (rows || []).map(r => {
    const url = r.url || r.public_url || r.image_url || r.media_url || '';
    console.log('[owner.js] Processing row:', { id: r.id, url, allFields: r });
    return { id: r.id, url };
  }).filter(r => !!r.url);

  // Clean up broken URLs (images that don't exist)
  const validImages = [];
  let processedCount = 0;
  
  if (normalized.length === 0) {
    renderValidImages([]);
    return;
  }
  
  for (const img of normalized) {
    try {
      // Test if the image URL is accessible
      const testImg = new Image();
      testImg.onload = () => {
        console.log('[owner.js] Image loaded successfully:', img.url);
        validImages.push(img);
        processedCount++;
        if (processedCount === normalized.length) {
          renderValidImages(validImages);
        }
      };
      testImg.onerror = () => {
        console.log('[owner.js] Image failed to load, will be removed:', img.url);
        // Remove broken record from database
        removeBrokenImage(img.id);
        processedCount++;
        if (processedCount === normalized.length) {
          renderValidImages(validImages);
        }
      };
      testImg.src = img.url;
    } catch (e) {
      console.error('[owner.js] Error testing image:', img.url, e);
      processedCount++;
      if (processedCount === normalized.length) {
        renderValidImages(validImages);
      }
    }
  }
}

async function removeBrokenImage(imageId) {
  try {
    const { error } = await sb
      .from('business_media')
      .delete()
      .eq('id', imageId);
    if (error) {
      console.error('[owner.js] Failed to remove broken image:', error);
    } else {
      console.log('[owner.js] Removed broken image record:', imageId);
    }
  } catch (e) {
    console.error('[owner.js] Error removing broken image:', e);
  }
}

function renderValidImages(images) {
  console.log('[owner.js] renderValidImages called with:', images);
  const wrap = document.getElementById('gallery');
  if (!wrap) {
    console.error('[owner.js] Gallery container not found in renderValidImages');
    return;
  }
  
  wrap.innerHTML = '';
  
  if (images.length === 0) {
    console.log('[owner.js] No valid images to render, showing placeholder');
    wrap.textContent = 'No images yet';
    return;
  }

  console.log('[owner.js] Rendering', images.length, 'valid images');

  for (const r of images) {
    console.log('[owner.js] Rendering image:', r.url);
    const card = document.createElement('div'); 
    card.className='thumb';
    const img = document.createElement('img'); 
    img.src = r.url; 
    img.alt='Business image';
    img.classList.add('gallery-img');
    img.onload = () => console.log('[owner.js] Image loaded successfully:', r.url);
    img.onerror = () => console.error('[owner.js] Image failed to load:', r.url);
    card.appendChild(img); 
    wrap.appendChild(card);
  }
}

// Render util for events/bulletins lists
function renderList(elId, items, mkLine) {
  const el = document.getElementById(elId); 
  if (!el) return;
  el.innerHTML = '';
  if (!items.length) { 
    el.innerHTML = '<div class="muted">None</div>'; 
    return; 
  }
  for (const it of items) {
    const d = document.createElement('div'); 
    d.className='item';
    d.innerHTML = mkLine(it);
    el.appendChild(d);
  }
}

async function loadEventsAndBulletins(bizId){
  const nowIso = new Date().toISOString();

  // EVENTS: Use created_at ordering to avoid 400 errors
  let { data: events, error: eventsError } = await sb.from('activities_base')
    .select('id, title, location, start_at, end_at, created_at, status, is_published')
    .eq('business_id', bizId)
    .eq('type', 'event')
    .order('created_at', { ascending: false }); // Safe ordering

  if (eventsError) {
    console.error('Error loading events:', eventsError);
    events = [];
  }

  events = events || [];
  const evCurrent = events.filter(e => (e.end_at || e.start_at || e.created_at) >= nowIso);
  const evPast    = events.filter(e => (e.end_at || e.start_at || e.created_at) < nowIso).reverse();

  renderList('eventsCurrent', evCurrent, e =>
    `<div><strong>${e.title||'Untitled'}</strong></div>
     <div class="muted">${e.start_at ? new Date(e.start_at).toLocaleString() : new Date(e.created_at).toLocaleString()}${e.end_at? ' – '+new Date(e.end_at).toLocaleString():''}${e.location? ' · '+e.location:''}</div>`
  );
  renderList('eventsPast', evPast, e =>
    `<div><strong>${e.title||'Untitled'}</strong></div>
     <div class="muted">${e.start_at ? new Date(e.start_at).toLocaleString() : new Date(e.created_at).toLocaleString()}${e.end_at? ' – '+new Date(e.end_at).toLocaleString():''}${e.location? ' · '+e.location:''}</div>`
  );

  // BULLETINS: Use created_at ordering to avoid 400 errors
  let { data: bulls, error: bulletinsError } = await sb.from('activities_base')
    .select('id, title, description, start_at, end_at, created_at, status, is_published')
    .eq('business_id', bizId)
    .eq('type', 'bulletin')
    .order('created_at', { ascending: false }); // Safe ordering

  if (bulletinsError) {
    console.error('Error loading bulletins:', bulletinsError);
    bulls = [];
  }

  bulls = bulls || [];
  const bCurrent = bulls.filter(b => (!b.end_at || b.end_at >= nowIso) && (b.start_at ? b.start_at <= nowIso : true));
  const bPast    = bulls.filter(b => (b.end_at && b.end_at < nowIso) || (b.start_at && b.start_at > nowIso) === false && false);

  renderList('bulletinsCurrent', bCurrent, b =>
    `<div><strong>${b.title||'Bulletin'}</strong></div>
     <div class="muted">${b.start_at ? new Date(b.start_at).toLocaleString() : new Date(b.created_at).toLocaleString()}</div>
     ${b.description ? `<div>${b.description}</div>` : ''}`
  );
  renderList('bulletinsPast', bPast, b =>
    `<div><strong>${b.title||'Bulletin'}</strong></div>
     <div class="muted">${b.start_at ? new Date(b.start_at).toLocaleString() : new Date(b.created_at).toLocaleString()}</div>`
  );
}

async function load() {
  try {
    // 1) Session
    const { data: { user }, error: sErr } = await sb.auth.getUser();
    if (sErr) throw sErr;
    if (!user) {
      // Not logged in → send to login
      window.location.href = "/auth.html";
      return;
    }

    // 2) Fetch business (unique owner_id)
    const { data: biz, error: bErr } = await sb
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (bErr) throw bErr;

    // 3) Render top panel
    console.log("[owner.js] Business data:", biz);
    el("biz-name").textContent = biz.name || "Business Profile";

    // after you have `biz` from Supabase:
    await applyLogo(biz);

    // status/visibility
    const status = (biz.status || "").toString().toLowerCase(); // 'draft' | 'pending' | 'published' | etc.
    const isPublic = biz.is_published === true || status === "published";
    setBadge(el("status-badge"), status || "pending");
    setBadge(el("visibility-badge"), isPublic ? "Yes (published)" : "No (draft)");

    // Last updated
    const updated = fmtDateTime(biz.updated_at || biz.inserted_at || biz.created_at);
    text(el("last-updated"), updated ? `Last Updated ${updated}` : "");

    // 4) Details grid
    setLink(el("phone"), biz.phone, { tel: true });
    setWhatsApp(el("whatsapp"), biz.whatsapp);
    setLink(el("website"), biz.website);
    setLink(el("instagram"), biz.instagram);

    text(el("country"), biz.country || "—");
    text(el("city"), biz.city || "—");
    text(el("area"), biz.area || "—");
    text(el("block"), biz.block || "—");
    text(el("street"), biz.street || "—");
    text(el("floor"), biz.floor || "—");
    text(el("office_no"), biz.office_no || "—");
    text(el("industry"), biz.industry || "—");

    // 5) Description and Story
    text(el("description"), biz.description || "");
    text(el("story"), biz.story || "");

    // ----- Gallery (ALL images) -----
    console.log('[owner.js] About to load gallery for business ID:', biz.id);
    await loadGallery(biz.id);
    
    // ----- Events and Bulletins -----
    await loadEventsAndBulletins(biz.id);

    // 6) Edit link (keep simple; owner can always edit own profile)
    const edit = el("edit-link");
    if (edit) {
      edit.href = "/owner-form.html";
    }
  } catch (e) {
    console.error("[owner.js] Failed to load profile:", e);
    // Optional: show a friendly toast or message
  }
}

document.addEventListener("DOMContentLoaded", load);
