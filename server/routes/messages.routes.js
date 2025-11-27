// server/routes/messages.routes.js - Messaging routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');
const crypto = require('crypto');

// GET /api/messages/conversations - Get all conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all conversations where user is a participant
    const conversations = await db.all(`
      SELECT 
        c.*,
        CASE 
          WHEN c.participant1_id = ? THEN c.participant2_id
          ELSE c.participant1_id
        END as other_participant_id,
        CASE 
          WHEN c.participant1_id = ? THEN c.participant2_type
          ELSE c.participant1_type
        END as other_participant_type,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) as unread_count
      FROM conversations c
      WHERE c.participant1_id = ? OR c.participant2_id = ?
      ORDER BY c.last_message_at DESC, c.created_at DESC
    `, [userId, userId, userId, userId, userId]);

    // Enrich with business/user info for each conversation
    const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
      const otherUserId = conv.other_participant_id;
      
      // Get business info for the other participant
      const business = await db.get(`
        SELECT 
          id,
          name,
          business_name,
          logo_url,
          owner_id
        FROM businesses
        WHERE owner_id = ?
      `, [otherUserId]);

      if (business) {
        return {
          ...conv,
          other_participant: {
            id: otherUserId,
            name: business.name || business.business_name || 'Business',
            logo_url: business.logo_url,
            business_id: business.id,
            type: 'business'
          }
        };
      }

      // If no business, get user info
      const user = await db.get(`
        SELECT id, email, name
        FROM users
        WHERE id = ?
      `, [otherUserId]);

      return {
        ...conv,
        other_participant: {
          id: otherUserId,
          name: user?.name || user?.email || 'User',
          logo_url: null,
          type: 'user'
        }
      };
    }));

    res.json({ ok: true, conversations: enrichedConversations });
  } catch (error) {
    console.error('[messages GET /conversations] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/messages/conversations/:conversationId - Get single conversation with messages
router.get('/conversations/:conversationId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Verify user is a participant
    const conversation = await db.get(`
      SELECT * FROM conversations
      WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)
    `, [conversationId, userId, userId]);

    if (!conversation) {
      return res.status(404).json({ ok: false, error: 'Conversation not found' });
    }

    // Get other participant info
    const otherUserId = conversation.participant1_id === userId 
      ? conversation.participant2_id 
      : conversation.participant1_id;

    const business = await db.get(`
      SELECT 
        id,
        name,
        business_name,
        logo_url,
        owner_id
      FROM businesses
      WHERE owner_id = ?
    `, [otherUserId]);

    let otherParticipant = null;
    if (business) {
      otherParticipant = {
        id: otherUserId,
        name: business.name || business.business_name || 'Business',
        logo_url: business.logo_url,
        business_id: business.id,
        type: 'business'
      };
    } else {
      const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [otherUserId]);
      otherParticipant = {
        id: otherUserId,
        name: user?.name || user?.email || 'User',
        logo_url: null,
        type: 'user'
      };
    }

    // Get all messages
    const messages = await db.all(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `, [conversationId]);

    // Mark messages as read
    await db.run(`
      UPDATE messages
      SET is_read = 1
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `, [conversationId, userId]);

    res.json({
      ok: true,
      conversation: {
        ...conversation,
        other_participant: otherParticipant
      },
      messages
    });
  } catch (error) {
    console.error('[messages GET /conversations/:id] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// POST /api/messages/conversations - Create or get existing conversation
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { other_user_id } = req.body;

    if (!other_user_id) {
      return res.status(400).json({ ok: false, error: 'other_user_id is required' });
    }

    if (userId === other_user_id) {
      return res.status(400).json({ ok: false, error: 'Cannot create conversation with yourself' });
    }

    // Check if conversation already exists
    let conversation = await db.get(`
      SELECT * FROM conversations
      WHERE (participant1_id = ? AND participant2_id = ?)
         OR (participant1_id = ? AND participant2_id = ?)
    `, [userId, other_user_id, other_user_id, userId]);

    if (conversation) {
      // Get other participant info
      const otherUserId = conversation.participant1_id === userId 
        ? conversation.participant2_id 
        : conversation.participant1_id;

      const business = await db.get(`
        SELECT id, name, business_name, logo_url, owner_id
        FROM businesses
        WHERE owner_id = ?
      `, [otherUserId]);

      let otherParticipant = null;
      if (business) {
        otherParticipant = {
          id: otherUserId,
          name: business.name || business.business_name || 'Business',
          logo_url: business.logo_url,
          business_id: business.id,
          type: 'business'
        };
      } else {
        const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [otherUserId]);
        otherParticipant = {
          id: otherUserId,
          name: user?.name || user?.email || 'User',
          logo_url: null,
          type: 'user'
        };
      }

      return res.json({
        ok: true,
        conversation: {
          ...conversation,
          other_participant: otherParticipant
        }
      });
    }

    // Create new conversation
    const conversationId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO conversations (id, participant1_id, participant2_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [conversationId, userId, other_user_id, now, now]);

    // Get other participant info
    const business = await db.get(`
      SELECT id, name, business_name, logo_url, owner_id
      FROM businesses
      WHERE owner_id = ?
    `, [other_user_id]);

    let otherParticipant = null;
    if (business) {
      otherParticipant = {
        id: other_user_id,
        name: business.name || business.business_name || 'Business',
        logo_url: business.logo_url,
        business_id: business.id,
        type: 'business'
      };
    } else {
      const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [other_user_id]);
      otherParticipant = {
        id: other_user_id,
        name: user?.name || user?.email || 'User',
        logo_url: null,
        type: 'user'
      };
    }

    res.json({
      ok: true,
      conversation: {
        id: conversationId,
        participant1_id: userId,
        participant2_id: other_user_id,
        created_at: now,
        updated_at: now,
        other_participant: otherParticipant
      }
    });
  } catch (error) {
    console.error('[messages POST /conversations] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// POST /api/messages - Send a message
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversation_id, content } = req.body;

    if (!conversation_id || !content) {
      return res.status(400).json({ ok: false, error: 'conversation_id and content are required' });
    }

    // Verify user is a participant
    const conversation = await db.get(`
      SELECT * FROM conversations
      WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)
    `, [conversation_id, userId, userId]);

    if (!conversation) {
      return res.status(404).json({ ok: false, error: 'Conversation not found' });
    }

    // Create message
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [messageId, conversation_id, userId, content, now]);

    // Update conversation last_message_at
    await db.run(`
      UPDATE conversations
      SET last_message_at = ?, updated_at = ?
      WHERE id = ?
    `, [now, now, conversation_id]);

    const message = await db.get('SELECT * FROM messages WHERE id = ?', [messageId]);

    res.json({ ok: true, message });
  } catch (error) {
    console.error('[messages POST /] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;

