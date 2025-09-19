// Script to apply storage policies to Supabase
// Run this in the browser console on your Supabase project

const SUPABASE_URL = 'https://gidbvemmqffogakcepka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZGJ2ZW1tcWZmb2dha2NlcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjI0MTUsImV4cCI6MjA3MjMzODQxNX0.rFFi4gq5ZUApmJM_FM5nfGpcPCHy9FLedVwmJOEzV1w';

async function applyStoragePolicies() {
  try {
    // Create the business-files bucket
    const bucketResponse = await fetch(`${SUPABASE_URL}/rest/v1/storage/buckets`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: 'business-files',
        name: 'business-files',
        public: false,
        file_size_limit: 26214400, // 25MB
        allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      })
    });

    if (bucketResponse.ok) {
      console.log('✅ Business-files bucket created successfully');
    } else if (bucketResponse.status === 409) {
      console.log('ℹ️ Business-files bucket already exists');
    } else {
      console.error('❌ Failed to create bucket:', await bucketResponse.text());
    }

    // Apply storage policies
    const policies = [
      {
        name: 'Users can upload to their own folder',
        definition: `bucket_id = 'business-files' AND auth.uid()::text = (storage.foldername(name))[1]`,
        check: `bucket_id = 'business-files' AND auth.uid()::text = (storage.foldername(name))[1]`,
        command: 'INSERT'
      },
      {
        name: 'Users can upload to temp folder',
        definition: `bucket_id = 'business-files' AND (storage.foldername(name))[1] = 'temp'`,
        check: `bucket_id = 'business-files' AND (storage.foldername(name))[1] = 'temp'`,
        command: 'INSERT'
      },
      {
        name: 'Users can view their own files',
        definition: `bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')`,
        check: `bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')`,
        command: 'SELECT'
      },
      {
        name: 'Users can update their own files',
        definition: `bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')`,
        check: `bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')`,
        command: 'UPDATE'
      },
      {
        name: 'Users can delete their own files',
        definition: `bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')`,
        check: `bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')`,
        command: 'DELETE'
      }
    ];

    for (const policy of policies) {
      const policyResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_storage_policy`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          policy_name: policy.name,
          policy_definition: policy.definition,
          policy_check: policy.check,
          policy_command: policy.command
        })
      });

      if (policyResponse.ok) {
        console.log(`✅ Policy "${policy.name}" applied successfully`);
      } else {
        console.error(`❌ Failed to apply policy "${policy.name}":`, await policyResponse.text());
      }
    }

  } catch (error) {
    console.error('❌ Error applying storage policies:', error);
  }
}

// Instructions for manual application
console.log(`
📋 MANUAL STORAGE POLICY SETUP REQUIRED

Since we can't apply RLS policies programmatically, please follow these steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gidbvemmqffogakcepka
2. Navigate to Storage → Policies
3. Create the following policies for the 'business-files' bucket:

Policy 1 - INSERT (Upload to own folder):
- Name: "Users can upload to their own folder"
- Target: storage.objects
- Operation: INSERT
- Definition: bucket_id = 'business-files' AND auth.uid()::text = (storage.foldername(name))[1]

Policy 2 - INSERT (Upload to temp folder):
- Name: "Users can upload to temp folder"  
- Target: storage.objects
- Operation: INSERT
- Definition: bucket_id = 'business-files' AND (storage.foldername(name))[1] = 'temp'

Policy 3 - SELECT (View files):
- Name: "Users can view their own files"
- Target: storage.objects
- Operation: SELECT
- Definition: bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')

Policy 4 - UPDATE (Update files):
- Name: "Users can update their own files"
- Target: storage.objects
- Operation: UPDATE
- Definition: bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')

Policy 5 - DELETE (Delete files):
- Name: "Users can delete their own files"
- Target: storage.objects
- Operation: DELETE
- Definition: bucket_id = 'business-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'temp')

4. Make sure the 'business-files' bucket exists and is set to private
5. Set file size limit to 25MB
6. Set allowed MIME types: application/pdf, image/jpeg, image/jpg, image/png, image/gif, image/webp
`);

// Run the function
applyStoragePolicies();

