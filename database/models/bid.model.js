import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bidAmount: {
        type: Number,
        required: true,
        min: 0
    },
    estimatedArrival: {
        type: Number,
        min: 0
    },
    message: {
        type: String,
        trim: true,
        maxlength: 200
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

// Index for faster queries
bidSchema.index({ tripId: 1, driverId: 1 });
bidSchema.index({ tripId: 1, status: 1 });

export const Bid = mongoose.model('Bid', bidSchema);
