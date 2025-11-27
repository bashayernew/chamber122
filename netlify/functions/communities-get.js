// netlify/functions/communities-get.js - Get all communities (with optional filters)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const COMMUNITIES_FILE = path.join(DATA_DIR, 'communities.json');
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

// Helper to get member count for a community
function getMemberCount(communityId, members) {
  return members.filter(m => m.community_id === communityId && m.status === 'active').length;
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
    const communities = readJSONFile(COMMUNITIES_FILE);
    const members = readJSONFile(MEMBERS_FILE);

    // Get query parameters
    const params = event.queryStringParameters || {};
    const category = params.category;
    const search = params.search ? params.search.toLowerCase() : null;
    const userId = params.user_id; // For "My communities" filter
    const includeSuspended = params.include_suspended === 'true';

    // Filter communities
    let filtered = communities.filter(comm => {
      // Filter by status
      if (!includeSuspended && comm.status !== 'active') {
        return false;
      }

      // Filter by category
      if (category && comm.category !== category) {
        return false;
      }

      // Filter by search term
      if (search) {
        const nameMatch = comm.name.toLowerCase().includes(search);
        const descMatch = (comm.description || '').toLowerCase().includes(search);
        if (!nameMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });

    // If userId provided, filter to communities user is member of
    if (userId) {
      const userMemberIds = members
        .filter(m => m.msme_id === userId && m.status === 'active')
        .map(m => m.community_id);
      filtered = filtered.filter(comm => userMemberIds.includes(comm.id));
    }

    // Add member count to each community
    const enriched = filtered.map(comm => ({
      ...comm,
      member_count: getMemberCount(comm.id, members)
    }));

    // Sort by created_at (newest first)
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        communities: enriched
      })
    };
  } catch (error) {
    console.error('Error in communities-get:', error);
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

