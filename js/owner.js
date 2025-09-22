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

function render(b) {
  return `
    <div>
      <h2 class="text-2xl font-semibold">${b.name ?? 'Untitled Business'}</h2>
      <p class="text-zinc-400">${b.industry ?? '—'}</p>
      <div class="mt-4">
        <a href="/owner-form.html" class="rounded-xl px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white">Edit Profile</a>
        <a href="/business.html?id=${b.id}" class="rounded-xl px-4 py-2 bg-amber-500/90 hover:bg-amber-500 text-black font-semibold">View public page</a>
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
  showContent(render(biz))
}

main()