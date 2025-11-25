import express from "express";
import { auth } from "../../middleware/auth.js";
import { getEstimate, requestTrip, acceptTrip, updateTripStatus, rateDriver, payTrip, submitBid, getTripBids, acceptBid } from "./trip.controller.js";

const tripRouter = express.Router();

tripRouter.use(auth); // Protect all trip routes

tripRouter.post('/estimate', getEstimate);
tripRouter.post('/request', requestTrip);
tripRouter.patch('/:tripId/accept', acceptTrip);
tripRouter.patch('/:tripId/status', updateTripStatus);
tripRouter.post('/:tripId/pay', payTrip);
tripRouter.post('/:tripId/rate', rateDriver);

// Bidding routes
tripRouter.post('/:tripId/bid', submitBid);
tripRouter.get('/:tripId/bids', getTripBids);
tripRouter.patch('/:tripId/bid/:bidId/accept', acceptBid);

export default tripRouter;
