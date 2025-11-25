import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pickup: {
        lat: Number,
        lng: Number,
        address: String
    },
    dropoff: {
        lat: Number,
        lng: Number,
        address: String
    },
    carType: {
        type: String,
        enum: ['scooter', 'car', 'high_class'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'started', 'completed', 'cancelled'],
        default: 'pending'
    },
    price: {
        type: Number
    },
    distance: {
        type: Number // in km
    },
    duration: {
        type: Number // in minutes
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'vodafone_cash'],
        default: 'cash'
    },
    paymentDetails: {
        transactionId: String,
        senderPhone: String
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: {
        type: String
    }
}, { timestamps: true });

export const Trip = mongoose.model('Trip', tripSchema);
