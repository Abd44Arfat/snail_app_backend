import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'driver'],
        default: 'user'
    },
    carType: {
        type: String,
        enum: ['scooter', 'car', 'high_class'],
        // required: function() { return this.role === 'driver'; } // Optional validation
    },
    location: {
        lat: Number,
        lng: Number
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    socketId: {
        type: String
    },
    averageRating: {
        type: Number,
        default: 5.0
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    walletBalance: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
