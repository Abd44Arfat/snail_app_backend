import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';
import { User } from '../../database/models/user.model.js';

export const auth = async (req, res, next) => {
    // Debug: Log all headers
    console.log('🔍 Auth Middleware - Request headers:', {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        allHeaders: Object.keys(req.headers),
    });

    // 1) Check if token exists
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('✅ Token extracted from Authorization header');
    } else if (req.headers.Authorization && req.headers.Authorization.startsWith('Bearer')) {
        // Try capitalized version
        token = req.headers.Authorization.split(' ')[1];
        console.log('✅ Token extracted from capitalized Authorization header');
    }

    if (!token) {
        console.log('❌ No token found in request headers');
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return next(new AppError('The user belonging to this token does no longer exist.', 401));
        }

        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = currentUser;
        console.log(`✅ Authentication successful for user: ${currentUser.name} (${currentUser.role})`);
        next();
    } catch (err) {
        console.log(`❌ Token verification failed: ${err.message}`);
        return next(new AppError('Invalid token. Please log in again!', 401));
    }
};
