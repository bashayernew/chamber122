// public/js/business-form.js
import { supabase } from '/js/supabase-client.js';
import { getMyBusiness } from '/js/businesses.api.js';
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


async function onSubmit(e) {
  e.preventDefault()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    alert('Not signed in')
    return
  }

  const payload = {
    owner_id: userData.user.id,
    name: getVal(SEL.name),
    owner_full_name: getVal(SEL.owner_full_name),
    email: getVal(SEL.email),
    phone: getVal(SEL.phone),
    category: getVal(SEL.category),
    city: getVal(SEL.city),
    country: getVal(SEL.country) || 'Kuwait',
    description: getVal(SEL.description),
    story: getVal(SEL.story),
    website: getVal(SEL.website),
    instagram: getVal(SEL.instagram),
    status: 'draft',
    is_published: false,
  }

  const { error } = await supabase
    .from('businesses')
    .upsert(payload, { onConflict: 'owner_id' })

  if (error) {
    console.error('Save failed', error)
    alert('Error saving profile')
    return
  }

  // ✅ Redirect to profile page
  window.location.href = '/owner.html'
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#biz-form, #biz_form, form[data-biz-form]');
  if (!form) return;
  await hydrateForm();
  form.addEventListener('submit', onSubmit);
});