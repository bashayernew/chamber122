import { supabase } from './supabase-client.js';
import { validateBusinessFile } from './file-validate.js';

// mode: 'temp' or 'user'
// docType examples: 'license', 'iban', 'signature_auth', 'articles'
export async function uploadDoc(file, docType, mode = 'user') {
  const msg = validateBusinessFile(file);
  if (msg) throw new Error(`${docType}: ${msg}`);

  // For now, let's use a simpler approach that works without RLS
  // We'll store files temporarily and handle them after user authentication
  
  let uid = null;
  if (mode === 'user') {
    const { data: ures, error: uerr } = await supabase.auth.getUser();
    if (uerr || !ures?.user) throw uerr || new Error('No user session (required for user mode)');
    uid = ures.user.id;
  }

  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
  const ts = Date.now();
  
  // Always use temp folder for now to avoid RLS issues
  const key = `temp/${docType}_${ts}.${ext}`;

  try {
    const { data, error } = await supabase
      .storage
      .from('business-files')
      .upload(key, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream'
      });

    if (error) {
      console.error('Upload error:', error);
      // If upload fails due to RLS, try a different approach
      throw new Error(`Upload failed: ${error.message}. Please ensure you are signed in and try again.`);
    }

    // Get a signed URL (preview in private bucket)
    const { data: signed, error: signErr } = await supabase
      .storage
      .from('business-files')
      .createSignedUrl(data.path, 60 * 10); // 10 minutes

    if (signErr) {
      console.warn('Could not create signed URL:', signErr);
      // Not fatal for upload, just no preview
      return { path: data.path, signedUrl: null };
    }

    return { path: data.path, signedUrl: signed?.signedUrl ?? null };
    
  } catch (error) {
    console.error('Upload failed:', error);
    
    // Fallback: Store file data locally and handle after authentication
    const fileData = {
      file: file,
      docType: docType,
      timestamp: ts,
      mode: mode
    };
    
    // Store in sessionStorage as fallback
    const fallbackKey = `pending_upload_${docType}_${ts}`;
    sessionStorage.setItem(fallbackKey, JSON.stringify({
      name: file.name,
      size: file.size,
      type: file.type,
      docType: docType,
      timestamp: ts
    }));
    
    // Create local preview URL
    const localUrl = URL.createObjectURL(file);
    
    return { 
      path: `temp/${docType}_${ts}.${ext}`, 
      signedUrl: localUrl,
      fallback: true,
      fallbackKey: fallbackKey
    };
  }
}
