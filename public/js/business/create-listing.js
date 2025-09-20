import { supabase } from '/js/supabase-client.js';

const $ = (id) => document.getElementById(id);
const steps = () => [...document.querySelectorAll('.step')];
const dots  = () => [...document.querySelectorAll('#listing-steps-nav .dot')];
const toast = (msg) => { const t=$('listing-toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none', 2800); };

let current = 1;
let draftBusinessId = null;
let uploading = false;

function show(step){
  steps().forEach(s => s.classList.toggle('hidden', s.dataset.step !== String(step)));
  dots().forEach((d,i)=> d.classList.toggle('active', i === step-1));
  $('listing-back').classList.toggle('hidden', step===1);
  $('listing-next').classList.toggle('hidden', step===4);
  $('listing-submit').classList.toggle('hidden', step!==4);
}

function atLeastOneContact(){
  return !!($('biz-email').value || $('biz-phone').value || $('biz-website').value || $('biz-instagram').value);
}

function fileTooBig(file){ return file && file.size > 2 * 1024 * 1024; } // 2MB

async function ensureSignedIn(){
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user){
    location.href = '/auth.html#login';
    return null;
  }
  return data.session.user;
}

async function uploadFile(bucket, path, file){
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert:true });
  if (error) throw error;
  const { data:pub } = await supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}

async function insertDraft(ownerId){
  const payload = {
    owner_user_id: ownerId,
    name: $('biz-name').value.trim(),
    slug: $('biz-name').value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''),
    tagline: $('biz-tagline').value.trim() || null,
    category_id: $('biz-category').value || null,
    city: $('biz-city').value || null,
    country: 'Kuwait',
    description: $('biz-description').value.trim(),
    contact_email_public: $('biz-email').value.trim() || null,
    contact_phone_public: $('biz-phone').value.trim() || null,
    website_url: $('biz-website').value.trim() || null,
    instagram: $('biz-instagram').value.trim() || null,
    story: $('biz-story').value.trim() || null,
    status: 'draft'
  };
  const { data, error } = await supabase.from('businesses').insert(payload).select('id').maybeSingle();
  if (error) throw error;
  return data.id;
}

async function updateMedia(bizId, logoUrl, galleryUrls){
  const { error } = await supabase.from('businesses')
    .update({ logo_url: logoUrl, gallery_urls: galleryUrls?.length ? galleryUrls : null })
    .eq('id', bizId);
  if (error) throw error;
}

async function populateCategories(){
  const sel = $('biz-category');
  try {
    const { data, error } = await supabase.from('categories').select('id,name').order('name',{ascending:true});
    if (error || !data?.length){ throw error || new Error('no categories'); }
    data.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name; sel.appendChild(o);
    });
  } catch {
    // fallback
    ['Food & Beverage','Retail','Services','Manufacturing','Education','Health & Beauty']
      .forEach(name => { const o=document.createElement('option'); o.value=name; o.textContent=name; sel.appendChild(o); });
  }
}

function validateStep(step){
  const err = $('listing-error');
  err.classList.add('hidden'); err.textContent='';

  if (step===1){
    if (!$('biz-name').value.trim())      return 'Business name is required.';
    if (!$('biz-category').value)         return 'Please select a category.';
    if (!$('biz-city').value)             return 'Please select your city.';
    const d = $('biz-description').value.trim();
    if (d.length < 30)                    return 'Please add a short description (at least 30 characters).';
  }
  if (step===2){
    if (!atLeastOneContact())             return 'Provide at least one contact method (Email, Phone, Website, or Instagram).';
  }
  if (step===3){
    const logo = $('biz-logo').files?.[0];
    if (!logo)                            return 'Logo is required.';
    if (fileTooBig(logo))                 return 'Logo must be ≤ 2MB.';
    const gallery = [...($('biz-gallery').files || [])];
    if (gallery.some(fileTooBig))         return 'Each gallery image must be ≤ 2MB.';
    if (gallery.length > 5)               return 'Please select at most 5 gallery photos.';
  }
  if (step===4){
    if (!$('biz-consent').checked)        return 'You must agree to publish this information.';
  }
  return null;
}

$('listing-back')?.addEventListener('click', ()=>{ if (current>1){ current--; show(current);} });
$('listing-next')?.addEventListener('click', async ()=>{
  const msg = validateStep(current);
  if (msg){ const e=$('listing-error'); e.textContent=msg; e.classList.remove('hidden'); return; }
  // Lazy-create draft at step 1 completion
  if (current===1 && !draftBusinessId){
    const user = await ensureSignedIn(); if (!user) return;
    try{
      draftBusinessId = await insertDraft(user.id);
      toast('Draft saved');
    }catch(e){ console.warn(e); toast('Could not save draft'); return; }
  }
  current++; show(current);
});

$('listing-form')?.addEventListener('submit', async (evt)=>{
  evt.preventDefault();
  if (uploading) return;
  const msg = validateStep(4);
  if (msg){ const e=$('listing-error'); e.textContent=msg; e.classList.remove('hidden'); return; }

  const user = await ensureSignedIn(); if (!user) return;
  if (!draftBusinessId){ // if user jumped here somehow
    try{ draftBusinessId = await insertDraft(user.id); }catch(e){ console.warn(e); toast('Could not save draft'); return; }
  }

  try{
    uploading = true;
    const logo = $('biz-logo').files[0];
    const gallery = [...($('biz-gallery').files || [])].slice(0,5);

    const ext = (logo?.name.split('.').pop()||'png').toLowerCase();
    const logoPath = `businesses/${draftBusinessId}/logo-${Date.now()}.${ext}`;
    const logoUrl = await uploadFile('business-media', logoPath, logo);

    const galleryUrls = [];
    for (let i=0;i<gallery.length;i++){
      const g = gallery[i];
      const gext = (g.name.split('.').pop()||'jpg').toLowerCase();
      const gpath = `businesses/${draftBusinessId}/gallery-${i+1}-${Date.now()}.${gext}`;
      galleryUrls.push(await uploadFile('business-media', gpath, g));
    }

    await updateMedia(draftBusinessId, logoUrl, galleryUrls);
    toast('Listing submitted!');

    // Option: send to dashboard
    setTimeout(()=> location.href='/dashboard.html', 800);
  }catch(e){
    console.warn('[listing submit] error', e);
    const er = $('listing-error'); er.textContent = e.message || 'Upload failed'; er.classList.remove('hidden');
  }finally{ uploading = false; }
});

document.addEventListener('DOMContentLoaded', async ()=>{
  show(1);
  await populateCategories();
});
