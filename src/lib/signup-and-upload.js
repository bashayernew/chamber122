import { supabase } from './supabase-client';
import { validateBusinessFile } from './file-validate';

export async function signupAndUploadDocs({ email, password, fields, files }) {
  // 1) Sign up user
  const { error: signErr } = await supabase.auth.signUp({ email, password });
  if (signErr) throw signErr;

  // 2) Get user session
  const { data: ures, error: uerr } = await supabase.auth.getUser();
  if (uerr || !ures?.user) throw uerr || new Error('No user session');
  const uid = ures.user.id;

  // 3) Upload documents
  const uploaded = {};
  for (const [docType, file] of Object.entries(files || {})) {
    if (!file) continue;
    const msg = validateBusinessFile(file);
    if (msg) throw new Error(`${docType}: ${msg}`);

    const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
    const path = `${uid}/${docType}_${Date.now()}.${ext}`;

    const { data, error } = await supabase
      .storage.from('business-files')
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream'
      });

    if (error) throw error;
    uploaded[docType] = data.path;
  }

  // 4) Save profile in DB
  const { error: dbErr } = await supabase
    .from('business_profiles')
    .upsert({
      user_id: uid,
      ...fields,
      docs: uploaded
    }, { onConflict: 'user_id' });

  if (dbErr) throw dbErr;

  return { user: ures.user, uploaded };
}

