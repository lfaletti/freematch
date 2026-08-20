import { Router, Request, Response } from 'express';
import * as messageService from '../services/messageService';
import * as matchService from '../services/matchService';
import { getUserId, respondAuthError } from '../utils/session';
import { query } from '../database/connection';

const router = Router();

router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const match = await matchService.getMatchById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (match.user1_id !== userId && match.user2_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const messages = await messageService.getMessages(req.params.matchId);
    res.json(messages);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add like to a message
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const messageId = req.params.id;
    
    // Get the message to check if it belongs to a match the user is part of
    const messageResult = await query(
      'SELECT m.*, matches.user1_id, matches.user2_id FROM messages m JOIN matches ON m.match_id = matches.id WHERE m.id = $1',
      [messageId]
    );
    
    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const message = messageResult.rows[0];
    if (message.user1_id !== userId && message.user2_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updated = await messageService.addLike(messageId, userId);

    // Push realtime update to both chat participants so the heart appears
    // without a refresh, even for the user who didn't tap.
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`user:${message.user1_id}`).emit('message_liked', updated);
      io.to(`user:${message.user2_id}`).emit('message_liked', updated);
    }

    res.json(updated);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    console.error('Error adding like:', err);
    res.status(500).json({ error: 'Failed to add like' });
  }
});

// Remove like from a message
router.delete('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const messageId = req.params.id;
    
    // Get the message to check if it belongs to a match the user is part of
    const messageResult = await query(
      'SELECT m.*, matches.user1_id, matches.user2_id FROM messages m JOIN matches ON m.match_id = matches.id WHERE m.id = $1',
      [messageId]
    );
    
    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const message = messageResult.rows[0];
    if (message.user1_id !== userId && message.user2_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updated = await messageService.removeLike(messageId, userId);

    // Push realtime update to both chat participants so the heart disappears
    // for the user who didn't tap too.
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`user:${message.user1_id}`).emit('message_unliked', updated);
      io.to(`user:${message.user2_id}`).emit('message_unliked', updated);
    }

    res.json(updated);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    console.error('Error removing like:', err);
    res.status(500).json({ error: 'Failed to remove like' });
  }
});

export default router;
