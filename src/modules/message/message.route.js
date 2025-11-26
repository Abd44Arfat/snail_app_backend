import express from 'express';
import { getMessages, markAsRead } from './message.controller.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

// Get messages with another user
router.get('/:otherUserId', auth, getMessages);

// Mark messages as read
router.put('/:otherUserId/read', auth, markAsRead);

export default router;
