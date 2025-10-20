// Storage self-test module for business-media bucket verification
import { supabase } from './supabase-client.global.js';

function uuid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);
    });
}

// 1x1 PNG (transparent)
function tinyPngBlob() {
  // A minimal transparent PNG data URL decoded to Blob
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i=0;i<bstr.length;i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: 'image/png' });
}

async function testStorage(businessId) {
  if (!businessId) {
    console.error('[selftest] missing businessId');
    return;
  }
  const key = `${businessId}/events/selftest-${uuid()}.png`;
  const file = tinyPngBlob();

  console.log('[selftest] businessId:', businessId);
  console.log('[selftest] key:', key, 'type:', file.type, 'size:', file.size);
  
  try {
    const { error: upErr } = await supabase
      .storage
      .from('business-media')
      .upload(key, file, { 
        upsert: false, 
        cacheControl: '3600',
        contentType: file.type
      });

    if (upErr) {
      console.error('[selftest] storage upload error:', upErr);
      console.info('Hint: check Storage » business-media » Policies. Insert/Update must allow auth.uid() owner and key must start with {business_id}/');
      return;
    }

    const { data: pub } = supabase.storage.from('business-media').getPublicUrl(key);
    console.log('[selftest] upload success. public URL:', pub?.publicUrl || '(none)');
  } catch (e) {
    console.error('[selftest] upload failed with exception:', e);
    console.info('Hint: check Storage » business-media » Policies. Insert/Update must allow auth.uid() owner and key must start with {business_id}/');
  }
}

window.__testStorage = testStorage;
console.log('[selftest] ready — call __testStorage(<business_id>) in console');
