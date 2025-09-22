import { supabase } from './supabase-client.js'

const $ = (id) => document.getElementById(id)
const stateEl = $('owner-state')
const contentEl = $('owner-content')
const ctaEl = $('owner-cta')

function showState(text) { stateEl.textContent = text }
function showCTA() { ctaEl.classList.remove('hidden') }
function showContent(html) {
  contentEl.innerHTML = html
  contentEl.classList.remove('hidden')
}

async function getUser() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.user ?? null
}

async function getBusiness(uid) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', uid)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

function renderBusinessCard(b) {
  const loc = [b.country, b.city, b.area, b.address_line].filter(Boolean).join(', ') || '—'
  const updated = b.updated_at ? new Date(b.updated_at).toLocaleString() : '—'
  const badge = b.is_published
    ? '<span class="badge badge--ok">Published</span>'
    : `<span class="badge badge--pending">${(b.status || 'pending')}</span>`

  return `
    <div class="owner-grid">
      <div class="owner-logo">
        ${b.logo_url
          ? `<img src="${b.logo_url}" alt="${b.name || 'Logo'}" style="width:100%;height:100%;object-fit:cover">`
          : `No logo`}
      </div>

      <div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <h2 class="owner-title" style="font-size:28px">${b.name || 'Untitled Business'}</h2>
          ${badge}
        </div>
        <div class="owner-sub" style="margin-top:4px">${b.industry || '—'}</div>

        <div class="owner-rows">
          <dl class="row">
            <dt>Phone</dt><dd>${b.phone || '—'}</dd>
          </dl>
          <dl class="row">
            <dt>WhatsApp</dt><dd>${b.whatsapp || '—'}</dd>
          </dl>
          <dl class="row">
            <dt>Website</dt>
            <dd>${b.website ? `<a href="${b.website}" target="_blank" rel="noopener" style="text-decoration:underline">${b.website}</a>` : '—'}</dd>
          </dl>
          <dl class="row">
            <dt>Instagram</dt><dd>${b.instagram || '—'}</dd>
          </dl>
          <dl class="row">
            <dt>Location</dt><dd>${loc}</dd>
          </dl>
          <dl class="row">
            <dt>Updated</dt><dd class="owner-sub">${updated}</dd>
          </dl>
        </div>

        <a href="/owner-form.html" class="edit-btn">Edit Profile</a>
      </div>
    </div>
  `
}

async function main() {
  showState('Checking session…')
  const user = await getUser()
  if (!user) { showState('Signed out'); showCTA(); return }

  showState('Loading business…')
  const biz = await getBusiness(user.id)
  if (!biz) { showState('No business yet'); showCTA(); return }

  showState('')
  showContent(renderBusinessCard(biz))
  await loadActivity(biz.id)
}

const el = (id) => document.getElementById(id)
function liItem(title, sub) {
  return `
    <li style="padding:10px 12px;border:1px solid #2f3036;border-radius:12px;margin-bottom:8px;background:#141518">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline">
        <div style="font-weight:600;color:#e5e7eb">${title}</div>
        ${sub ? `<div class="owner-sub" style="white-space:nowrap">${sub}</div>` : ''}
      </div>
    </li>
  `
}
async function loadActivity(businessId) {
  try {
    // EVENTS
    const { data: events, error: evErr } = await supabase
      .from('events')
      .select('id,title,start_at,end_at,is_published,status')
      .eq('business_id', businessId)
      .order('start_at', { ascending: false })
    if (evErr) throw evErr

    const now = new Date(), running=[], previous=[]
    for (const e of (events || [])) {
      const s = e.start_at ? new Date(e.start_at) : null
      const d = e.end_at ? new Date(e.end_at) : null
      const isRunning = (s && s <= now && (!d || d >= now)) || (s && s > now)
      const label = [e.is_published ? 'Published' : (e.status || 'draft'), s ? s.toLocaleString() : null].filter(Boolean).join(' · ')
      ;(isRunning ? running : previous).push(liItem(e.title, label))
    }
    el('events-running').innerHTML = running.join('') || `<li class="owner-sub">None</li>`
    el('events-previous').innerHTML = previous.join('') || `<li class="owner-sub">None</li>`

    // BULLETINS
    const { data: bulletins, error: buErr } = await supabase
      .from('bulletins')
      .select('id,title,is_published,status,created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    if (buErr) throw buErr

    const pubs=[], drafts=[]
    for (const b of (bulletins || [])) {
      const label = [b.is_published ? 'Published' : (b.status || 'draft'), b.created_at ? new Date(b.created_at).toLocaleString() : null].filter(Boolean).join(' · ')
      ;(b.is_published ? pubs : drafts).push(liItem(b.title, label))
    }
    el('bulletins-published').innerHTML = pubs.join('') || `<li class="owner-sub">None</li>`
    el('bulletins-draft').innerHTML = drafts.join('') || `<li class="owner-sub">None</li>`

    el('owner-activity')?.classList.remove('hidden')
  } catch (e) {
    console.error('[owner activity] error', e)
  }
}

main()