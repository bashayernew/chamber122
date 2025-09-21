// public/js/business-form.js
import { supabase } from '/js/supabase-client.js';
import { getMyBusiness, upsertMyBusiness } from '/js/businesses.api.js';
import { go } from '/js/nav.js';

const SEL = {
  name:            ['#biz_name', '#business_name', '#name', 'input[name="biz_name"]', 'input[name="business_name"]'],
  owner_full_name: ['#owner_full_name', '#owner_name', 'input[name="owner_full_name"]', 'input[name="owner_name"]'],
  email:           ['#biz_email', '#email', 'input[type="email"][name]', 'input[name="biz_email"]'],
  phone:           ['#biz_phone', '#phone', 'input[type="tel"][name]', 'input[name="biz_phone"]'],
  category:        ['#biz_category', '[name="biz_category"]', '#category', '[name="category"]'],
  city:            ['#biz_city', '[name="biz_city"]', '#city', '[name="city"]'],
  country:         ['#biz_country', '[name="biz_country"]', '#country', '[name="country"]'],
  description:     ['#biz_description', '#description', 'textarea[name="biz_description"]', 'textarea[name="description"]'],
  story:           ['#biz_story', '#story', 'textarea[name="biz_story"]', 'textarea[name="story"]'],
  website:         ['#biz_website', '#website', 'input[type="url"][name]', 'input[name="biz_website"]'],
  instagram:       ['#biz_instagram', '#instagram', 'input[name="biz_instagram"]', 'input[name="instagram"]'],
};

const $1 = (sel) => document.querySelector(sel);
const getVal = (keys) => {
  for (const s of keys) { const el = $1(s); if (el) return el.value?.trim() || ''; }
  return '';
};
const setVal = (keys, v) => {
  for (const s of keys) { const el = $1(s); if (el) { el.value = v ?? ''; return; } }
};

function requireField(label, value, keys) {
  if (value) return true;
  // flag first matching element
  for (const s of keys) {
    const el = $1(s);
    if (el) {
      el.style.outline = '2px solid #f33';
      el.focus();
      alert(`${label} is required`);
      return false;
    }
  }
  alert(`${label} is required`);
  return false;
}

async function hydrateForm() {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess?.session?.user) { go('/auth.html#login'); return; }

  try {
    const biz = await getMyBusiness();
    if (!biz) return;

    setVal(SEL.name,            biz.name);
    setVal(SEL.owner_full_name, biz.owner_full_name);
    setVal(SEL.email,           biz.email);
    setVal(SEL.phone,           biz.phone);
    setVal(SEL.category,        biz.category);
    setVal(SEL.city,            biz.city);
    setVal(SEL.country,         biz.country ?? 'Kuwait');
    setVal(SEL.description,     biz.description);
    setVal(SEL.story,           biz.story);
    setVal(SEL.website,         biz.website);
    setVal(SEL.instagram,       biz.instagram);
  } catch (error) {
    console.warn('[business-form] Error loading existing business data:', error);
    // Continue with empty form - this is not a critical error
  }
}

function buildPayload() {
  const payload = {
    name:            getVal(SEL.name),
    owner_full_name: getVal(SEL.owner_full_name),
    email:           getVal(SEL.email),
    phone:           getVal(SEL.phone),
    category:        getVal(SEL.category),
    city:            getVal(SEL.city),
    country:         getVal(SEL.country) || 'Kuwait',
    description:     getVal(SEL.description),
    story:           getVal(SEL.story),
    website:         getVal(SEL.website),
    instagram:       getVal(SEL.instagram),
    status: 'draft',
    is_published: false,
  };
  // strip empty strings so we don't send NULL/empty columns
  return Object.fromEntries(Object.entries(payload).filter(([,v]) => v !== ''));
}

async function onSubmit(e) {
  e.preventDefault();
  const btn = e.submitter || document.getElementById('biz_submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  const payload = buildPayload();

  // hard-required fields
  if (!requireField('Business Name', payload.name, SEL.name))               { if (btn){btn.disabled=false;btn.textContent='Complete Profile & Submit Listing';} return; }
  if (!requireField('Owner Name',    payload.owner_full_name, SEL.owner_full_name)) { if (btn){btn.disabled=false;btn.textContent='Complete Profile & Submit Listing';} return; }
  if (!requireField('Email',         payload.email, SEL.email))             { if (btn){btn.disabled=false;btn.textContent='Complete Profile & Submit Listing';} return; }
  if (!requireField('Phone',         payload.phone, SEL.phone))             { if (btn){btn.disabled=false;btn.textContent='Complete Profile & Submit Listing';} return; }
  if (!requireField('Category',      payload.category, SEL.category))       { if (btn){btn.disabled=false;btn.textContent='Complete Profile & Submit Listing';} return; }
  if (!requireField('City',          payload.city, SEL.city))               { if (btn){btn.disabled=false;btn.textContent='Complete Profile & Submit Listing';} return; }
  if (!requireField('Description',   payload.description, SEL.description)) { if (btn){btn.disabled=false;btn.textContent='Complete Profile & Submit Listing';} return; }

  const { error } = await upsertMyBusiness(payload);
  if (btn) { btn.disabled = false; btn.textContent = 'Complete Profile & Submit Listing'; }

  if (error) {
    console.warn('[business-form] save error', error);
    alert(`Save failed: ${error.message || 'Unknown error'}`);
    return;
  }

  // success → send them somewhere sensible
  const next = new URL('/owner.html?saved=1', location.origin);
  location.href = next.href;
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#biz-form, #biz_form, form[data-biz-form]');
  if (!form) return;
  await hydrateForm();
  form.addEventListener('submit', onSubmit);
});