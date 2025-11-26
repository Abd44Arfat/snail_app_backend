import { Message } from '../../../database/models/message.model.js';

// Get messages between two users (for a trip)
export const getMessages = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const currentUserId = req.user._id;

        console.log(`📥 Fetching messages between ${currentUserId} and ${otherUserId}`);

        // Get all messages between these two users
        const messages = await Message.find({
            $or: [
                { senderId: currentUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: currentUserId }
            ]
        })
        .sort({ createdAt: 1 }) // Oldest first
        .lean(); // Convert to plain JavaScript objects

        console.log(`✅ Found ${messages.length} messages`);

        // Convert ObjectIds to strings for easier parsing in frontend
        const formattedMessages = messages.map(msg => ({
            ...msg,
            _id: msg._id.toString(),
            senderId: msg.senderId.toString(),
            receiverId: msg.receiverId.toString(),
            timestamp: msg.createdAt || msg.timestamp
        }));

        res.status(200).json({
            success: true,
            messages: formattedMessages
        });
    } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const currentUserId = req.user._id;

        // Mark all messages from otherUser to currentUser as read
        await Message.updateMany(
            {
                senderId: otherUserId,
                receiverId: currentUserId,
                read: false
            },
            { read: true }
        );

        res.status(200).json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read'
        });
    }
};
