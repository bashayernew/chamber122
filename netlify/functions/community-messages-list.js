// netlify/functions/community-messages-list.js - Get messages for a community
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

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const community_id = params.community_id;
    const limit = parseInt(params.limit || '50', 10);

    if (!community_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community ID is required' })
      };
    }

    // Check if community exists
    const communities = readJSONFile(COMMUNITIES_FILE);
    const community = communities.find(c => c.id === community_id);
    if (!community) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Community not found' })
      };
    }

    // Get all messages for this community
    const allMessages = readJSONFile(MESSAGES_FILE);
    const communityMessages = allMessages
      .filter(m => m.community_id === community_id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // Oldest first
      .slice(-limit); // Get last N messages

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        messages: communityMessages
      })
    };
  } catch (error) {
    console.error('Error in community-messages-list:', error);
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

