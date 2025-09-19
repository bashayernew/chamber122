import { supabase } from './supabase-client';
import { validateBusinessFile } from './file-validate';

export async function uploadTempDoc(file, docType) {
  const msg = validateBusinessFile(file);
  if (msg) throw new Error(`${docType}: ${msg}`);
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
  const key = `temp/${docType}_${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from('business-files').upload(key, file, {
    upsert: true, cacheControl: '3600', contentType: file.type || 'application/octet-stream'
  });
  if (error) throw error;
  const { data: signed } = await supabase.storage.from('business-files').createSignedUrl(data.path, 600);
  return { path: data.path, signedUrl: signed?.signedUrl ?? null };
}