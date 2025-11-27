// netlify/functions/community-messages-create.js - Send a message to a community
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const MESSAGES_FILE = path.join(DATA_DIR, 'community-messages.json');
const MEMBERS_FILE = path.join(DATA_DIR, 'community-members.json');
const COMMUNITIES_FILE = path.join(DATA_DIR, 'communities.json');

// Helper to read JSON file safely
function readJSONFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content.trim() ? JSON.parse(content) : [];
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    return [];
  }
}

// Helper to write JSON file safely
function writeJSONFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
    return false;
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { community_id, msme_id, body: messageBody, msme_name, msme_email } = body;

    // Validation
    if (!community_id || !msme_id || !messageBody || !messageBody.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community ID, MSME ID, and message body are required' })
      };
    }

    // Check if community exists and is active
    const communities = readJSONFile(COMMUNITIES_FILE);
    const community = communities.find(c => c.id === community_id);
    if (!community) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community not found' })
      };
    }

    if (community.status !== 'active') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ ok: false, error: 'This community has been suspended. You cannot send messages.' })
      };
    }

    // Check if user is a member
    const members = readJSONFile(MEMBERS_FILE);
    const membership = members.find(
      m => m.community_id === community_id && m.msme_id === msme_id && m.status === 'active'
    );

    if (!membership) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ ok: false, error: 'You must be a member of this community to send messages' })
      };
    }

    // Create new message
    const newMessage = {
      id: generateId(),
      community_id: community_id,
      msme_id: msme_id,
      msme_name: msme_name || 'Unknown',
      msme_email: msme_email || '',
      body: messageBody.trim(),
      created_at: new Date().toISOString()
    };

    // Read existing messages
    const messages = readJSONFile(MESSAGES_FILE);
    messages.push(newMessage);

    // Save to file
    if (!writeJSONFile(MESSAGES_FILE, messages)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to send message' })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        ok: true,
        message: newMessage
      })
    };
  } catch (error) {
    console.error('Error in community-messages-create:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    };
  }
};

