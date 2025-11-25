import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';
import { User } from '../../database/models/user.model.js';

export const auth = async (req, res, next) => {
    // 1) Check if token exists
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
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
        next();
    } catch (err) {
        return next(new AppError('Invalid token. Please log in again!', 401));
    }
};
