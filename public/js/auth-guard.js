import { supabase } from './supabase-client.global.js'

export async function requireAuthOrPrompt() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  const dlg = document.getElementById('login-required-modal')
  if (!dlg) {
    console.error('[auth-guard] login-required-modal not found in DOM')
    throw new Error('AUTH_REQUIRED')
  }

  const doLogin = () => {
    const redirect = encodeURIComponent(location.pathname + location.search)
    location.href = `/auth.html?redirect=${redirect}`
  }
  const doCancel = () => dlg.close()

  document.getElementById('login-now')?.addEventListener('click', doLogin, { once:true })
  document.getElementById('login-cancel')?.addEventListener('click', doCancel, { once:true })

  dlg.showModal()
  throw new Error('AUTH_REQUIRED')
}

