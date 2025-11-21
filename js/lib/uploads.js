// /js/lib/uploads.js
export async function uploadBusinessImage({ supabase, businessId, file, kind }) {
  if (!businessId) throw new Error('Missing businessId');
  if (!file) throw new Error('No file selected');

  const ext = file.name.split('.').pop().toLowerCase();
  const ts = Date.now();
  const key = `${businessId}/${kind}s/${kind}-${ts}.${ext}`;

  console.debug('[upload] will write to:', key);

  const { data, error } = await supabase
    .storage
    .from('business-media')
    .upload(key, file, {
      upsert: false,
      contentType: file.type || `image/${ext}`
    });

  if (error) {
    console.error('[upload] storage error:', error);
    // Bubble the actual message (important for RLS debugging)
    throw new Error(error.message || 'Storage upload failed');
  }

  const { data: pub } = supabase
    .storage.from('business-media')
    .getPublicUrl(key);

  return { key, publicUrl: pub.publicUrl };
}
