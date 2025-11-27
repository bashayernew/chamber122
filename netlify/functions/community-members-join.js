// netlify/functions/community-members-join.js - Join a community
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
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
    const { community_id, msme_id } = body;

    // Validation
    if (!community_id || !msme_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community ID and MSME ID are required' })
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
        body: JSON.stringify({ ok: false, error: 'This community has been suspended' })
      };
    }

    // Read existing members
    const members = readJSONFile(MEMBERS_FILE);

    // Check if already a member
    const existing = members.find(
      m => m.community_id === community_id && m.msme_id === msme_id
    );

    if (existing) {
      if (existing.status === 'active') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'You are already a member of this community' })
        };
      } else {
        // Re-join if previously left
        existing.status = 'active';
        existing.joined_at = new Date().toISOString();
      }
    } else {
      // Create new membership
      const newMember = {
        id: generateId(),
        community_id: community_id,
        msme_id: msme_id,
        role: community.creator_msme_id === msme_id ? 'owner' : 'member',
        status: 'active',
        joined_at: new Date().toISOString()
      };
      members.push(newMember);
    }

    // Save to file
    if (!writeJSONFile(MEMBERS_FILE, members)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to join community' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Successfully joined community'
      })
    };
  } catch (error) {
    console.error('Error in community-members-join:', error);
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

