export const globalError = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error to console for debugging
    console.error('❌ Global Error Handler:', {
        statusCode: err.statusCode,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    if (process.env.MODE === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }
}
