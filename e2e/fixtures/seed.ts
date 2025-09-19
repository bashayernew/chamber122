// Database seeding and cleanup for E2E tests
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE!;
const testMarker = process.env.TEST_DATA_MARKER || 'ch122_e2e_test';

// Create service role client (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log('🌱 Seeding E2E test data...');
  
  try {
    // Clean existing test data first
    await clean();
    
    // Create test users via auth
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: process.env.ADMIN_EMAIL!,
      password: process.env.ADMIN_PASSWORD!,
      email_confirm: true,
    });
    
    if (adminError) throw adminError;
    
    const { data: pendingUser, error: pendingError } = await supabase.auth.admin.createUser({
      email: process.env.MSME_PENDING_EMAIL!,
      password: process.env.MSME_PENDING_PASSWORD!,
      email_confirm: true,
    });
    
    if (pendingError) throw pendingError;
    
    const { data: approvedUser, error: approvedError } = await supabase.auth.admin.createUser({
      email: process.env.MSME_APPROVED_EMAIL!,
      password: process.env.MSME_APPROVED_PASSWORD!,
      email_confirm: true,
    });
    
    if (approvedError) throw approvedError;
    
    // Create test accounts
    const { error: pendingAccountError } = await supabase
      .from('accounts')
      .insert({
        owner_user_id: pendingUser.user.id,
        name: 'Test Pending MSME',
        category: 'Technology',
        type: 'Company',
        about_short: 'A test pending MSME for E2E testing',
        phone: '+96512345678',
        email: process.env.MSME_PENDING_EMAIL!,
        country: 'Kuwait',
        city: 'Kuwait City',
        status: 'pending',
        profile_completeness: 45, // Incomplete
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    if (pendingAccountError) throw pendingAccountError;
    
    const { error: approvedAccountError } = await supabase
      .from('accounts')
      .insert({
        owner_user_id: approvedUser.user.id,
        name: 'Test Approved MSME',
        category: 'Food & Beverage',
        type: 'Company',
        about_short: 'A test approved MSME for E2E testing',
        about_full: 'This is a comprehensive description of our test approved MSME business.',
        phone: '+96587654321',
        email: process.env.MSME_APPROVED_EMAIL!,
        country: 'Kuwait',
        city: 'Kuwait City',
        website: 'https://testapproved.com',
        whatsapp: '+96587654321',
        status: 'approved',
        profile_completeness: 95, // Complete
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    if (approvedAccountError) throw approvedAccountError;
    
    // Create some public content
    const { data: approvedAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('owner_user_id', approvedUser.user.id)
      .single();
    
    if (approvedAccount) {
      // Create a published event
      await supabase.from('events').insert({
        account_id: approvedAccount.id,
        title: 'Test Public Event',
        description: 'A test event for E2E testing',
        location: 'Kuwait City',
        starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'published',
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      // Create a published bulletin
      await supabase.from('bulletins').insert({
        account_id: approvedAccount.id,
        title: 'Test Public Bulletin',
        content: 'A test bulletin post for E2E testing',
        status: 'published',
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    console.log('✅ E2E test data seeded successfully');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

async function clean() {
  console.log('🧹 Cleaning E2E test data...');
  
  try {
    // Get test user emails
    const testEmails = [
      process.env.ADMIN_EMAIL!,
      process.env.MSME_PENDING_EMAIL!,
      process.env.MSME_APPROVED_EMAIL!,
    ];
    
    // Delete accounts first (due to foreign key constraints)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, owner_user_id')
      .in('email', testEmails);
    
    if (accounts && accounts.length > 0) {
      const accountIds = accounts.map(a => a.id);
      const userIds = accounts.map(a => a.owner_user_id);
      
      // Delete related content
      await supabase.from('events').delete().in('account_id', accountIds);
      await supabase.from('bulletins').delete().in('account_id', accountIds);
      await supabase.from('content_views').delete().in('account_id', accountIds);
      
      // Delete accounts
      await supabase.from('accounts').delete().in('id', accountIds);
      
      // Delete auth users
      for (const userId of userIds) {
        await supabase.auth.admin.deleteUser(userId);
      }
    }
    
    // Clean up guest submissions
    await supabase
      .from('event_suggestions')
      .delete()
      .eq('submitter_email', process.env.GUEST_EMAIL!);
    
    await supabase
      .from('bulletin_submissions')
      .delete()
      .eq('submitter_email', process.env.GUEST_EMAIL!);
    
    console.log('✅ E2E test data cleaned successfully');
    
  } catch (error) {
    console.error('❌ Error cleaning test data:', error);
    throw error;
  }
}

// Main execution
const command = process.argv[2];

if (command === 'seed') {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
} else if (command === 'clean') {
  clean().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
} else {
  console.log('Usage: tsx seed.ts [seed|clean]');
  process.exit(1);
}
