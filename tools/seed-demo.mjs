#!/usr/bin/env node

/**
 * Demo Data Seeding Script for Chamber122
 * Creates demo users, accounts, and content for testing
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config({ path: '.env.e2e' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Demo data
const demoUsers = [
  {
    email: 'admin@demo.com',
    password: 'AdminPass123!',
    role: 'admin',
    metadata: {
      full_name: 'Demo Admin',
      avatar_url: '/assets/demo/avatar-admin.jpg'
    }
  },
  {
    email: 'pending@demo.com',
    password: 'Pending123!',
    role: 'msme',
    metadata: {
      full_name: 'Pending MSME',
      avatar_url: '/assets/demo/avatar-msme.jpg'
    }
  },
  {
    email: 'approved@demo.com',
    password: 'Approved123!',
    role: 'msme',
    metadata: {
      full_name: 'Approved MSME',
      avatar_url: '/assets/demo/avatar-msme.jpg'
    }
  }
];

const demoAccounts = [
  {
    email: 'pending@demo.com',
    name: 'Kuwait Tech Solutions',
    category: 'Technology',
    type: 'Company',
    status: 'pending',
    profile_completeness: 60,
    short_description: 'Innovative technology solutions for small businesses',
    phone: '+965-12345678',
    country: 'Kuwait',
    city: 'Kuwait City',
    logo_url: '/assets/demo/logo-tech.png',
    cover_url: '/assets/demo/cover-tech.jpg'
  },
  {
    email: 'approved@demo.com',
    name: 'Golden Restaurant',
    category: 'Food & Beverage',
    type: 'Company',
    status: 'approved',
    profile_completeness: 90,
    short_description: 'Authentic Kuwaiti cuisine with modern twist',
    full_description: 'We serve traditional Kuwaiti dishes with a contemporary approach, using fresh local ingredients and time-honored recipes passed down through generations.',
    phone: '+965-87654321',
    country: 'Kuwait',
    city: 'Hawalli',
    address: '123 Main Street, Hawalli, Kuwait',
    logo_url: '/assets/demo/logo-restaurant.png',
    cover_url: '/assets/demo/cover-restaurant.jpg',
    business_hours: {
      monday: '9:00 AM - 10:00 PM',
      tuesday: '9:00 AM - 10:00 PM',
      wednesday: '9:00 AM - 10:00 PM',
      thursday: '9:00 AM - 10:00 PM',
      friday: '2:00 PM - 11:00 PM',
      saturday: '9:00 AM - 10:00 PM',
      sunday: '9:00 AM - 10:00 PM'
    },
    social: {
      instagram: '@goldenrestaurant_kw',
      tiktok: '@goldenrestaurant_kw'
    },
    whatsapp: '+965-87654321',
    website: 'https://goldenrestaurant.kw'
  }
];

const demoEvents = [
  {
    title: 'Tech Innovation Workshop',
    description: 'Learn about the latest technology trends and how to implement them in your business.',
    location: 'Kuwait City, Kuwait',
    starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
    image_url: '/assets/demo/event-tech.jpg',
    status: 'published'
  },
  {
    title: 'Food & Beverage Networking Event',
    description: 'Connect with other F&B businesses and share best practices.',
    location: 'Hawalli, Kuwait',
    starts_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
    image_url: '/assets/demo/event-fnb.jpg',
    status: 'published'
  }
];

const demoBulletins = [
  {
    title: 'New Partnership Opportunity',
    content: 'We are looking for technology partners to collaborate on innovative projects. Contact us for more details.',
    image_url: '/assets/demo/bulletin-partnership.jpg',
    status: 'published'
  },
  {
    title: 'Hiring: Marketing Specialist',
    content: 'We are seeking a creative marketing specialist to join our team. Must have 3+ years experience in digital marketing.',
    image_url: '/assets/demo/bulletin-hiring.jpg',
    status: 'published'
  }
];

const demoGuestSubmissions = [
  {
    title: 'Community Cleanup Event',
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 21 days from now
    location: 'Salmiya Beach, Kuwait',
    description: 'Join us for a community cleanup event to keep our beaches clean and beautiful.',
    submitter_email: 'community@example.com',
    status: 'pending'
  },
  {
    title: 'Small Business Funding Available',
    content: 'The Kuwait Development Bank is offering special funding programs for small businesses. Apply now!',
    submitter_email: 'funding@example.com',
    status: 'pending'
  }
];

// Helper functions
async function createUser(userData) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: userData.metadata,
    app_metadata: { role: userData.role }
  });
  
  if (error) {
    console.error(`❌ Error creating user ${userData.email}:`, error.message);
    return null;
  }
  
  console.log(`✅ Created user: ${userData.email} (${userData.role})`);
  return data.user;
}

async function createAccount(userId, accountData) {
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      owner_user_id: userId,
      ...accountData
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error creating account for ${accountData.email}:`, error.message);
    return null;
  }
  
  console.log(`✅ Created account: ${accountData.name}`);
  return data;
}

async function createEvent(accountId, eventData) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      account_id: accountId,
      ...eventData
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error creating event:`, error.message);
    return null;
  }
  
  console.log(`✅ Created event: ${eventData.title}`);
  return data;
}

async function createBulletin(accountId, bulletinData) {
  const { data, error } = await supabase
    .from('bulletins')
    .insert({
      account_id: accountId,
      ...bulletinData
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error creating bulletin:`, error.message);
    return null;
  }
  
  console.log(`✅ Created bulletin: ${bulletinData.title}`);
  return data;
}

async function createGuestSubmission(submissionData) {
  const table = submissionData.content ? 'bulletin_submissions' : 'event_suggestions';
  const { data, error } = await supabase
    .from(table)
    .insert(submissionData)
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error creating guest submission:`, error.message);
    return null;
  }
  
  console.log(`✅ Created guest submission: ${submissionData.title}`);
  return data;
}

async function seed() {
  console.log('🌱 Starting demo data seeding...\n');
  
  const createdUsers = {};
  const createdAccounts = {};
  
  // Create users
  console.log('👥 Creating demo users...');
  for (const userData of demoUsers) {
    const user = await createUser(userData);
    if (user) {
      createdUsers[userData.email] = user;
    }
  }
  
  // Create accounts
  console.log('\n🏢 Creating demo accounts...');
  for (const accountData of demoAccounts) {
    const user = createdUsers[accountData.email];
    if (user) {
      const account = await createAccount(user.id, accountData);
      if (account) {
        createdAccounts[accountData.email] = account;
      }
    }
  }
  
  // Create events
  console.log('\n📅 Creating demo events...');
  const approvedAccount = createdAccounts['approved@demo.com'];
  if (approvedAccount) {
    for (const eventData of demoEvents) {
      await createEvent(approvedAccount.id, eventData);
    }
  }
  
  // Create bulletins
  console.log('\n📢 Creating demo bulletins...');
  if (approvedAccount) {
    for (const bulletinData of demoBulletins) {
      await createBulletin(approvedAccount.id, bulletinData);
    }
  }
  
  // Create guest submissions
  console.log('\n👤 Creating guest submissions...');
  for (const submissionData of demoGuestSubmissions) {
    await createGuestSubmission(submissionData);
  }
  
  console.log('\n🎉 Demo data seeding completed!');
  console.log('\n📋 Demo Accounts:');
  console.log('   Admin: admin@demo.com / AdminPass123!');
  console.log('   Pending MSME: pending@demo.com / Pending123!');
  console.log('   Approved MSME: approved@demo.com / Approved123!');
}

async function clean() {
  console.log('🧹 Cleaning demo data...\n');
  
  // Delete guest submissions
  console.log('🗑️  Deleting guest submissions...');
  await supabase.from('bulletin_submissions').delete().like('submitter_email', '%@example.com');
  await supabase.from('event_suggestions').delete().like('submitter_email', '%@example.com');
  
  // Delete events and bulletins
  console.log('🗑️  Deleting events and bulletins...');
  await supabase.from('events').delete().in('title', demoEvents.map(e => e.title));
  await supabase.from('bulletins').delete().in('title', demoBulletins.map(b => b.title));
  
  // Delete accounts
  console.log('🗑️  Deleting accounts...');
  await supabase.from('accounts').delete().in('name', demoAccounts.map(a => a.name));
  
  // Delete users
  console.log('🗑️  Deleting users...');
  for (const email of demoUsers.map(u => u.email)) {
    const { data: user } = await supabase.auth.admin.listUsers();
    const demoUser = user.users.find(u => u.email === email);
    if (demoUser) {
      await supabase.auth.admin.deleteUser(demoUser.id);
      console.log(`✅ Deleted user: ${email}`);
    }
  }
  
  console.log('\n✨ Demo data cleanup completed!');
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'seed':
    await seed();
    break;
  case 'clean':
    await clean();
    break;
  default:
    console.log('Usage: node tools/seed-demo.mjs [seed|clean]');
    console.log('  seed  - Create demo data');
    console.log('  clean - Remove demo data');
    process.exit(1);
}