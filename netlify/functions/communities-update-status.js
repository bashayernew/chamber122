// netlify/functions/communities-update-status.js - Update community status (suspend/activate)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
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
    const { community_id, status, admin_user_id } = body;

    // Validation
    if (!community_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community ID is required' })
      };
    }

    if (!status || !['active', 'suspended'].includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Status must be "active" or "suspended"' })
      };
    }

    // Note: In a real app, you'd verify admin_user_id is actually an admin
    // For now, we'll trust the frontend (since this is a demo)

    // Read existing communities
    const communities = readJSONFile(COMMUNITIES_FILE);

    // Find and update community
    const index = communities.findIndex(c => c.id === community_id);
    if (index === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community not found' })
      };
    }

    communities[index].status = status;
    communities[index].updated_at = new Date().toISOString();
    if (admin_user_id) {
      communities[index].suspended_by = admin_user_id;
      communities[index].suspended_at = status === 'suspended' ? new Date().toISOString() : null;
    }

    // Save to file
    if (!writeJSONFile(COMMUNITIES_FILE, communities)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to update community' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        community: communities[index]
      })
    };
  } catch (error) {
    console.error('Error in communities-update-status:', error);
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

