import jwt from 'jsonwebtoken';
import { User } from '../../../database/models/user.model.js';
import { Message } from '../../../database/models/message.model.js';
import { Bid } from '../../../database/models/bid.model.js';

export const initSocket = (io) => {
    io.use(async (socket, next) => {
        let token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
            const user = await User.findById(decoded.userId);
            if (!user) {
                return next(new Error('User not found'));
            }
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

        // Update user status to online
        await User.findByIdAndUpdate(socket.user._id, { isOnline: true, socketId: socket.id });

        socket.on('disconnect', async () => {
            console.log('User disconnected');
            await User.findByIdAndUpdate(socket.user._id, { isOnline: false });
        });

        // Tracking Event
        socket.on('updateLocation', async (data) => {
            if (socket.user.role === 'driver') {
                const { lat, lng } = data;
                await User.findByIdAndUpdate(socket.user._id, { location: { lat, lng } });

                // Broadcast to all users (simple version) or specific users tracking this driver
                socket.broadcast.emit('driverLocationUpdate', {
                    driverId: socket.user._id,
                    location: { lat, lng }
                });
            }
        });

        // Trip Events
        socket.on('requestTrip', (data) => {
            // data contains tripId, pickup, carType
            // Broadcast to drivers of specific carType
            // For simplicity, broadcasting to all drivers for now, client side filtering can be done or room based
            socket.broadcast.emit('newTripRequest', data);
        });

        socket.on('tripAccepted', (data) => {
            const { tripId, driverId, userId } = data;
            io.to(userId).emit('tripAccepted', { tripId, driverId });
        });

        socket.on('tripStatusUpdate', (data) => {
            const { tripId, status, userId } = data;
            io.to(userId).emit('tripStatusUpdate', { tripId, status });
        });

        // Bidding Events
        socket.on('submitBid', async (data) => {
            const { tripId, userId } = data;
            // Emit to the user who requested the trip
            // Include driver details for the user to review
            const driver = await User.findById(socket.user._id).select('name averageRating ratingCount carType location');

            io.to(userId).emit('newDriverBid', {
                tripId,
                bid: data.bid,
                driver: {
                    id: socket.user._id,
                    name: driver.name,
                    rating: driver.averageRating,
                    ratingCount: driver.ratingCount,
                    carType: driver.carType,
                    location: driver.location
                }
            });
        });

        // Chat Events
        socket.on('joinChat', (room) => {
            socket.join(room);
            console.log(`User joined room: ${room}`);
        });

        socket.on('sendMessage', async (data) => {
            const { receiverId, content } = data;

            // Save message to DB
            const message = await Message.create({
                senderId: socket.user._id,
                receiverId,
                content
            });

            // Emit to receiver (if in same room or direct emit)
            // Assuming room is a unique combination of IDs or just emitting to receiver's socketId if known, 
            // but here we can use a room convention like `chat_${minId}_${maxId}` or just emit to specific user room if they joined their own ID room.
            // For simplicity, let's assume users join their own ID room.

            io.to(receiverId).emit('newMessage', {
                message,
                sender: { id: socket.user._id, name: socket.user.name }
            });
        });

        // Join own room for private messages
        socket.join(socket.user._id.toString());
    });
};
