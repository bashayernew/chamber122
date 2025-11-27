// Database seeding and cleanup for E2E tests - Updated for new backend API
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../../db.json');
const API_BASE = process.env.BASE_URL || 'http://localhost:4000';

// Helper to read database
async function readDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty structure
    return {
      users: [],
      businesses: [],
      events: [],
      bulletins: []
    };
  }
}

// Helper to write database
async function writeDB(data: any) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper to create user via API
async function createUserViaAPI(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  
  return res.json();
}

// Helper to find user by email
async function findUserByEmail(email: string) {
  const db = await readDB();
  return db.users.find((u: any) => u.email === email);
}

// Helper to find business by owner email
async function findBusinessByOwnerEmail(email: string) {
  const db = await readDB();
  const user = await findUserByEmail(email);
  if (!user) return null;
  return db.businesses.find((b: any) => b.owner_id === user.id);
}

async function seed() {
  console.log('🌱 Seeding E2E test data...');
  
  try {
    // Clean existing test data first
    await clean();
    
    const db = await readDB();
    
    // Create test users via API
    console.log('Creating admin user...');
    const adminResult = await createUserViaAPI(
      process.env.ADMIN_EMAIL!,
      process.env.ADMIN_PASSWORD!
    );
    const adminUser = adminResult.user;
    
    // Update admin user role in database directly
    const adminDbUser = await findUserByEmail(process.env.ADMIN_EMAIL!);
    if (adminDbUser) {
      adminDbUser.role = 'admin';
      await writeDB(db);
    }
    
    console.log('Creating pending MSME user...');
    const pendingResult = await createUserViaAPI(
      process.env.MSME_PENDING_EMAIL!,
      process.env.MSME_PENDING_PASSWORD!
    );
    const pendingUser = pendingResult.user;
    
    console.log('Creating approved MSME user...');
    const approvedResult = await createUserViaAPI(
      process.env.MSME_APPROVED_EMAIL!,
      process.env.MSME_APPROVED_PASSWORD!
    );
    const approvedUser = approvedResult.user;
    
    // Create test businesses directly in database
    const updatedDb = await readDB();
    
    // Create pending business
    const pendingBusiness = {
      id: `business_${Date.now()}_pending`,
      owner_id: pendingUser.id,
      business_name: 'Test Pending MSME',
      industry: 'Technology',
      description: 'A test pending MSME for E2E testing',
      phone: '+96512345678',
      email: process.env.MSME_PENDING_EMAIL!,
      country: 'Kuwait',
      city: 'Kuwait City',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    updatedDb.businesses.push(pendingBusiness);
    
    // Create approved business
    const approvedBusiness = {
      id: `business_${Date.now()}_approved`,
      owner_id: approvedUser.id,
      business_name: 'Test Approved MSME',
      industry: 'Food & Beverage',
      description: 'A test approved MSME for E2E testing',
      story: 'This is a comprehensive description of our test approved MSME business.',
      phone: '+96587654321',
      email: process.env.MSME_APPROVED_EMAIL!,
      country: 'Kuwait',
      city: 'Kuwait City',
      website: 'https://testapproved.com',
      whatsapp: '+96587654321',
      status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    updatedDb.businesses.push(approvedBusiness);
    
    await writeDB(updatedDb);
    
    // Create some public content
    const finalDb = await readDB();
    const approvedBiz = finalDb.businesses.find((b: any) => b.owner_id === approvedUser.id);
    
    if (approvedBiz) {
      // Create a published event
      const testEvent = {
        id: `event_${Date.now()}_test`,
        owner_id: approvedUser.id,
        business_id: approvedBiz.id,
        title: 'Test Public Event',
        description: 'A test event for E2E testing',
        location: 'Kuwait City',
        start_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'published',
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      finalDb.events.push(testEvent);
      
      // Create a published bulletin
      const testBulletin = {
        id: `bulletin_${Date.now()}_test`,
        owner_id: approvedUser.id,
        business_id: approvedBiz.id,
        title: 'Test Public Bulletin',
        content: 'A test bulletin post for E2E testing',
        body: 'A test bulletin post for E2E testing',
        status: 'published',
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      finalDb.bulletins.push(testBulletin);
      
      await writeDB(finalDb);
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
    const db = await readDB();
    
    // Get test user emails
    const testEmails = [
      process.env.ADMIN_EMAIL!,
      process.env.MSME_PENDING_EMAIL!,
      process.env.MSME_APPROVED_EMAIL!,
    ];
    
    // Find and remove test users and their businesses
    const testUserIds: string[] = [];
    const testBusinessIds: string[] = [];
    
    // Remove users and collect their IDs
    db.users = db.users.filter((user: any) => {
      if (testEmails.includes(user.email)) {
        testUserIds.push(user.id);
        return false; // Remove user
      }
      return true; // Keep user
    });
    
    // Remove businesses owned by test users
    db.businesses = db.businesses.filter((business: any) => {
      if (testUserIds.includes(business.owner_id)) {
        testBusinessIds.push(business.id);
        return false; // Remove business
      }
      return true; // Keep business
    });
    
    // Remove events owned by test users
    db.events = db.events.filter((event: any) => {
      return !testUserIds.includes(event.owner_id);
    });
    
    // Remove bulletins owned by test users
    db.bulletins = db.bulletins.filter((bulletin: any) => {
      return !testUserIds.includes(bulletin.owner_id);
    });
    
    await writeDB(db);
    
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
