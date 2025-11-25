import { globalError } from "../middleware/globalError.js";
import { AppError } from "../utils/appError.js";

import authRouter from "./auth/auth.routes.js";
import tripRouter from "./trip/trip.routes.js";

export const bootstrap = (app) => {
    app.get('/', (req, res) => res.send('Hello World!'))

    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/trips', tripRouter);

    app.all('*', (req, res, next) => {
        next(new AppError(`Route not found: ${req.originalUrl}`, 404));
    });

    app.use(globalError);
}
