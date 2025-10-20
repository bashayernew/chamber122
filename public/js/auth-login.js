// v=2
import { supabase } from './supabase-client.global.js'

console.log('[auth-login] script loaded; client available:', !!supabase)

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form')
  const email = document.getElementById('email')
  const password = document.getElementById('password')
  const btn = document.getElementById('login-btn')
  const status = document.getElementById('login-status')

  const url = new URL(location.href)
  const redirect = url.searchParams.get('redirect') || '/owner.html'

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (status) status.textContent = 'Signing in…'
    if (btn) btn.disabled = true

    const { error } = await supabase.auth.signInWithPassword({
      email: (email.value || '').trim(),
      password: password.value || ''
    })

    if (error) {
      if (status) status.textContent = error.message
      if (btn) btn.disabled = false
      return
    }

    if (status) status.textContent = 'Success. Redirecting…'
    location.replace(redirect)
  })
})
