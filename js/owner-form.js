import { supabase } from './supabase-client.js'

const form = document.getElementById('business-form')
const msg = document.getElementById('form-msg')

function setMsg(t){ if(msg) msg.textContent = t ?? '' }

async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Not signed in')
  return data.user
}

async function preload() {
  try {
    const user = await getUser()
    const { data: biz } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!biz) return
    const F = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? '' }
    F('name', biz.name)
    F('industry', biz.industry)
    F('phone', biz.phone)
    F('whatsapp', biz.whatsapp)
    F('website', biz.website)
    F('instagram', biz.instagram)
    F('country', biz.country)
    F('city', biz.city)
    F('area', biz.area)
    F('address_line', biz.address_line)
    F('logo_url', biz.logo_url)
    const pub = document.getElementById('is_published'); if (pub) pub.value = String(!!biz.is_published)
  } catch(e){ console.error('[owner-form preload]', e); setMsg('Failed to load.') }
}
preload()

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  setMsg('Saving…')
  try {
    const user = await getUser()
    const payload = {
      owner_id: user.id,
      name: document.getElementById('name')?.value?.trim() || null,
      industry: document.getElementById('industry')?.value?.trim() || null,
      phone: document.getElementById('phone')?.value?.trim() || null,
      whatsapp: document.getElementById('whatsapp')?.value?.trim() || null,
      website: document.getElementById('website')?.value?.trim() || null,
      instagram: document.getElementById('instagram')?.value?.trim() || null,
      country: document.getElementById('country')?.value?.trim() || null,
      city: document.getElementById('city')?.value?.trim() || null,
      area: document.getElementById('area')?.value?.trim() || null,
      address_line: document.getElementById('address_line')?.value?.trim() || null,
      logo_url: document.getElementById('logo_url')?.value?.trim() || null,
      is_published: document.getElementById('is_published')?.value === 'true',
      status: (document.getElementById('is_published')?.value === 'true') ? 'published' : 'pending'
    }

    const { error } = await supabase
      .from('businesses')
      .upsert(payload, { onConflict: 'owner_id' })

    if (error) throw error
    // ✅ Redirect back to profile
    window.location.href = '/owner.html'
  } catch (e) {
    console.error('[owner-form submit]', e)
    setMsg('Error saving profile.')
    alert('Error saving profile')
  }
})
