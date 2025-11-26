import { Trip } from "../../../database/models/trip.model.js";
import { User } from "../../../database/models/user.model.js";
import { Bid } from "../../../database/models/bid.model.js";
import { AppError } from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";

// Helper to calculate distance (Haversine Formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

// Pricing rates
const RATES = {
    scooter: { base: 5, perKm: 2, perMin: 0.5 },
    car: { base: 10, perKm: 4, perMin: 1 },
    high_class: { base: 20, perKm: 8, perMin: 2 }
};

export const getEstimate = catchAsync(async (req, res, next) => {
    const { pickup, dropoff, carType } = req.body;

    if (!pickup || !dropoff || !carType) {
        return next(new AppError('Please provide pickup, dropoff, and carType', 400));
    }

    const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const duration = distance * 2; // Rough estimate: 30km/h average speed (2 mins per km)

    const rate = RATES[carType];
    const price = Math.ceil(rate.base + (rate.perKm * distance) + (rate.perMin * duration));

    res.status(200).json({
        message: "success",
        estimate: {
            distance: distance.toFixed(2),
            duration: Math.ceil(duration),
            price,
            carType
        }
    });
});

export const requestTrip = catchAsync(async (req, res, next) => {
    const { pickup, dropoff, carType, price, distance, duration, paymentMethod } = req.body;

    const trip = await Trip.create({
        userId: req.user._id,
        pickup,
        dropoff,
        carType,
        price,
        distance,
        duration,
        paymentMethod,
        status: 'pending'
    });

    // Emit event to find drivers (handled in socket.js usually, but we can trigger it here if we had access to io)
    // For now, we'll rely on the client to emit 'requestTrip' via socket after getting this ID, 
    // OR we can use a global event emitter if we architected it that way.
    // Let's assume the client emits the socket event with the tripId.

    res.status(201).json({
        message: "success",
        trip
    });
});

export const acceptTrip = catchAsync(async (req, res, next) => {
    const { tripId } = req.params;
    const driverId = req.user._id;

    const trip = await Trip.findById(tripId);
    if (!trip) return next(new AppError('Trip not found', 404));
    if (trip.status !== 'pending') return next(new AppError('Trip already accepted', 400));

    trip.driverId = driverId;
    trip.status = 'accepted';
    await trip.save();

    res.status(200).json({ message: "success", trip });
});

export const updateTripStatus = catchAsync(async (req, res, next) => {
    const { tripId } = req.params;
    const { status } = req.body; // started, completed, cancelled

    const trip = await Trip.findByIdAndUpdate(tripId, { status }, { new: true });

    if (status === 'completed') {
        trip.isPaid = true;
        await trip.save();
    }

    res.status(200).json({ message: "success", trip });
});

import { paymobService } from "../../services/paymob.service.js";

export const payTrip = catchAsync(async (req, res, next) => {
    const { tripId } = req.params;
    const { paymentDetails } = req.body; // { senderPhone } for Vodafone Cash

    const trip = await Trip.findById(tripId).populate('userId');
    if (!trip) return next(new AppError('Trip not found', 404));

    if (trip.paymentMethod === 'vodafone_cash') {
        if (!paymentDetails || !paymentDetails.senderPhone) {
            return next(new AppError('Please provide sender phone number for Vodafone Cash', 400));
        }

        // 1. Authenticate
        const token = await paymobService.authenticate();

        // 2. Register Order
        const amountCents = trip.price * 100;
        const orderId = await paymobService.registerOrder(token, amountCents);

        // 3. Get Payment Key
        const billingData = {
            "apartment": "NA",
            "email": trip.userId.email,
            "floor": "NA",
            "first_name": trip.userId.name.split(' ')[0],
            "street": "NA",
            "building": "NA",
            "phone_number": paymentDetails.senderPhone,
            "shipping_method": "NA",
            "postal_code": "NA",
            "city": "NA",
            "country": "NA",
            "last_name": trip.userId.name.split(' ')[1] || "User",
            "state": "NA"
        };
        const paymentKey = await paymobService.getPaymentKey(token, orderId, amountCents, billingData);

        // 4. Pay with Wallet
        const paymentResult = await paymobService.payWithMobileWallet(paymentKey, paymentDetails.senderPhone);

        trip.paymentDetails = {
            senderPhone: paymentDetails.senderPhone,
            paymobOrderId: orderId,
            paymobTransactionId: paymentResult.id // Assuming Paymob returns an ID
        };
    }

    trip.isPaid = true;
    await trip.save();

    res.status(200).json({ message: "success", trip });
});


export const rateDriver = catchAsync(async (req, res, next) => {
    const { tripId } = req.params;
    const { rating, review } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) return next(new AppError('Trip not found', 404));

    trip.rating = rating;
    trip.review = review;
    await trip.save();

    // Update driver average rating
    const driver = await User.findById(trip.driverId);
    const totalRating = (driver.averageRating * driver.ratingCount) + rating;
    driver.ratingCount += 1;
    driver.averageRating = totalRating / driver.ratingCount;
    await driver.save();

    res.status(200).json({ message: "success" });
});

// Bidding System

export const submitBid = catchAsync(async (req, res, next) => {
    const { tripId } = req.params;
    const { bidAmount, estimatedArrival, message } = req.body;
    const driverId = req.user._id;

    // Validate driver role
    if (req.user.role !== 'driver') {
        return next(new AppError('Only drivers can submit bids', 403));
    }

    // Check if trip exists and is still pending
    const trip = await Trip.findById(tripId);
    if (!trip) return next(new AppError('Trip not found', 404));
    if (trip.status !== 'pending') {
        return next(new AppError('Trip is no longer accepting bids', 400));
    }

    // Check if driver already bid on this trip
    const existingBid = await Bid.findOne({ tripId, driverId });
    if (existingBid) {
        return next(new AppError('You have already submitted a bid for this trip', 400));
    }

    // Validate bid amount
    if (!bidAmount || bidAmount <= 0) {
        return next(new AppError('Please provide a valid bid amount', 400));
    }

    // Create bid
    const bid = await Bid.create({
        tripId,
        driverId,
        bidAmount,
        estimatedArrival: estimatedArrival || null,
        message: message || ''
    });

    // Populate driver details for response
    const populatedBid = await Bid.findById(bid._id).populate('driverId', 'name averageRating carType');

    res.status(201).json({
        message: "success",
        bid: populatedBid
    });
});

export const getTripBids = catchAsync(async (req, res, next) => {
    const { tripId } = req.params;

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) return next(new AppError('Trip not found', 404));

    // Verify user owns this trip
    if (trip.userId.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only view bids for your own trips', 403));
    }

    // Get all pending bids for this trip
    const bids = await Bid.find({ tripId, status: 'pending' })
        .populate('driverId', 'name email averageRating ratingCount carType location')
        .sort({ bidAmount: 1 }); // Sort by price, lowest first

    res.status(200).json({
        message: "success",
        count: bids.length,
        bids
    });
});

export const acceptBid = catchAsync(async (req, res, next) => {
    const { tripId, bidId } = req.params;

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) return next(new AppError('Trip not found', 404));

    // Verify user owns this trip
    if (trip.userId.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only accept bids for your own trips', 403));
    }

    // Check trip status
    if (trip.status !== 'pending') {
        return next(new AppError('Trip is no longer accepting bids', 400));
    }

    // Get the bid
    const bid = await Bid.findById(bidId);
    if (!bid) return next(new AppError('Bid not found', 404));
    if (bid.tripId.toString() !== tripId) {
        return next(new AppError('Bid does not belong to this trip', 400));
    }

    // Update trip with driver and bid price
    trip.driverId = bid.driverId;
    trip.price = bid.bidAmount;
    trip.status = 'accepted';
    await trip.save();

    // Update bid status
    bid.status = 'accepted';
    await bid.save();

    // Reject all other bids for this trip
    await Bid.updateMany(
        { tripId, _id: { $ne: bidId }, status: 'pending' },
        { status: 'rejected' }
    );

    res.status(200).json({
        message: "success",
        trip
    });
});

