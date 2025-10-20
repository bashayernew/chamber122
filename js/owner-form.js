const BUCKET = 'business-assets';
const MAX_GALLERY = 5;
const REDIRECT_AFTER_SAVE = '/owner.html';

const $ = (id) => document.getElementById(id);
const filesOf = (id) => Array.from($(id)?.files || []).filter(f => f && f.size > 0);
const setMsg = (t) => { const m = $('form-msg'); if (m) m.textContent = t || ''; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error('Auth: not signed in');
  return data.user;
}

async function getOrCreateBusiness(ownerId) {
  const found = await supabase.from('businesses')
    .select('id').eq('owner_id', ownerId).maybeSingle();
  if (found.error) throw new Error('DB select businesses: ' + found.error.message);
  if (found.data?.id) return found.data.id;

  const created = await supabase.from('businesses')
    .insert({ owner_id: ownerId, name: 'Untitled Business' })
    .select('id').single();
  if (created.error) throw new Error('DB insert businesses: ' + created.error.message);
  return created.data.id;
}

async function uploadFile(path, file) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });
  if (error) throw new Error(`Upload ${path}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function insertMedia(rows) {
  if (!rows.length) return;
  const { error } = await supabase.from('business_media').insert(rows);
  if (error) throw new Error('DB insert business_media: ' + error.message);
}

function collectPayload(ownerId) {
  return {
    owner_id: ownerId,
    name: $('name')?.value?.trim() || null,
    industry: $('industry')?.value?.trim() || null,
    phone: $('phone')?.value?.trim() || null,
    whatsapp: $('whatsapp')?.value?.trim() || null,
    website: $('website')?.value?.trim() || null,
    instagram: $('instagram')?.value?.trim() || null,
    country: $('country')?.value?.trim() || null,
    city: $('city')?.value?.trim() || null,
    area: $('area')?.value?.trim() || null,
    block: $('block')?.value?.trim() || null,
    street: $('street')?.value?.trim() || null,
    office_no: $('office_no')?.value?.trim() || null,
    floor: $('floor')?.value?.trim() || null,
    address_line: $('address_line')?.value?.trim() || null,
    is_published: false, // Default to draft
    status: 'pending', // Default to pending
    updated_at: new Date().toISOString(),
  };
}

async function handleSave(e) {
  e.preventDefault();
  const btn = e.submitter || $('save_btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  setMsg('Saving…');

  try {
    if (!window.supabase) throw new Error('Supabase client not found on window.');
    const user = await currentUser();
    const ownerId = user.id;
    const businessId = await getOrCreateBusiness(ownerId);

    // Gather payload
    const payload = collectPayload(ownerId);

    // Upload logo if selected
    const logo = filesOf('logo_file')[0];
    const mediaRows = [];
    if (logo) {
      const path = `${businessId}/logo/${Date.now()}_${logo.name}`;
      const { publicUrl } = await uploadFile(path, logo);
      payload.logo_url = publicUrl;
      mediaRows.push({ business_id: businessId, type: 'logo', file_path: path });
    }

    // Upload gallery (sequential to avoid stalled UI)
    let gallery = filesOf('gallery_files');
    if (gallery.length > MAX_GALLERY) gallery = gallery.slice(0, MAX_GALLERY);
    for (let i = 0; i < gallery.length; i++) {
      const f = gallery[i];
      const gPath = `${businessId}/gallery/${Date.now()}_${i}_${Math.random().toString(36).slice(2)}_${f.name}`;
      await uploadFile(gPath, f);
      mediaRows.push({ business_id: businessId, type: 'gallery', file_path: gPath });
    }

    await insertMedia(mediaRows);

    // Upsert business by owner_id
    const { error: upErr } = await supabase.from('businesses')
      .upsert(payload, { onConflict: 'owner_id' });
    if (upErr) throw new Error('DB upsert businesses: ' + upErr.message);

    setMsg('Saved. Redirecting…');
    await sleep(200);
    window.location.href = REDIRECT_AFTER_SAVE;
  } catch (err) {
    console.error('[owner-form] save error:', err);
    setMsg(err.message || 'Error saving profile');
    alert(err.message || 'Error saving profile');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  }
}

// Wire up form submit
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('business-form');
  if (form) form.addEventListener('submit', handleSave);
});