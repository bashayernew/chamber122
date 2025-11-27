// netlify/functions/community-members-leave.js - Leave a community
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const MEMBERS_FILE = path.join(DATA_DIR, 'community-members.json');

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
    const { community_id, msme_id } = body;

    // Validation
    if (!community_id || !msme_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community ID and MSME ID are required' })
      };
    }

    // Read existing members
    const members = readJSONFile(MEMBERS_FILE);

    // Find membership
    const index = members.findIndex(
      m => m.community_id === community_id && m.msme_id === msme_id
    );

    if (index === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'You are not a member of this community' })
      };
    }

    // Update status to 'left' (soft delete)
    members[index].status = 'left';
    members[index].left_at = new Date().toISOString();

    // Save to file
    if (!writeJSONFile(MEMBERS_FILE, members)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to leave community' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Successfully left community'
      })
    };
  } catch (error) {
    console.error('Error in community-members-leave:', error);
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

