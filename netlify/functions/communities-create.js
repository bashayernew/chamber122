// netlify/functions/communities-create.js - Create a new community
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
    // Ensure directory exists
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
    const { name, category, description, creator_msme_id, is_public } = body;

    // Validation
    if (!name || !name.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community name is required' })
      };
    }

    if (!category) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Category is required' })
      };
    }

    if (!creator_msme_id) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'You must be logged in to create a community' })
      };
    }

    // Read existing communities
    const communities = readJSONFile(COMMUNITIES_FILE);

    // Create new community
    const newCommunity = {
      id: generateId(),
      name: name.trim(),
      category: category,
      description: description || '',
      creator_msme_id: creator_msme_id,
      is_public: is_public !== false, // Default to true
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    communities.push(newCommunity);

    // Save to file
    if (!writeJSONFile(COMMUNITIES_FILE, communities)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to save community' })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        ok: true,
        community: newCommunity
      })
    };
  } catch (error) {
    console.error('Error in communities-create:', error);
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

