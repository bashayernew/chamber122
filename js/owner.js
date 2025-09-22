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
}

main()