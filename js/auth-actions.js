// /public/js/auth-actions.js
import { supabase } from './supabase-client.js';

export async function loginWithEmailPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Keep this exported; other files import it.
export async function onCompleteSignup({ business, account, docs }) {
  // 2) Create auth user
  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { full_name: account.fullname, phone: account.phone || '' } }
  });
  if (signUpErr) throw signUpErr;

  const user = signUp.user || (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Signup created sessionless user, please confirm email.');

  // 3) profile + account
  await supabase.from('profiles').upsert({
    user_id: user.id,
    full_name: account.fullname,
    phone: account.phone || '',
    avatar_url: user?.user_metadata?.avatar_url || null
  });

  await supabase.from('accounts').insert({
    user_id: user.id,
    role: 'msme',
    plan: 'free'
  });

  // 4) business
  const { data: bizRes, error: bizErr } = await supabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      legal_name: business.legal_name,
      display_name: business.display_name,
      industry: business.industry,
      country: business.country,
      city: business.city,
      address: business.address
    })
    .select()
    .single();
  if (bizErr) throw bizErr;

  // 5) docs upload
  const toUpload = [
    { file: docs.civil_front, kind: 'civil_id_front' },
    { file: docs.civil_back,  kind: 'civil_id_back'  },
    { file: docs.owner_proof, kind: 'owner_proof'    },
  ];

  for (const item of toUpload) {
    if (!item.file) throw new Error(`Missing file for ${item.kind}`);
    const ext = item.file.name.split('.').pop();
    const path = `${user.id}/${bizRes.id}/${item.kind}.${ext}`;

    const { error: upErr } = await supabase.storage.from('docs').upload(path, item.file, { upsert: true });
    if (upErr) throw upErr;

    const { data: pubUrl } = supabase.storage.from('docs').getPublicUrl(path);
    const { error: rowErr } = await supabase.from('documents').insert({
      user_id: user.id,
      business_id: bizRes.id,
      kind: item.kind,
      file_url: pubUrl.publicUrl
    });
    if (rowErr) throw rowErr;
  }

  return { user_id: user.id, business_id: bizRes.id };
}

