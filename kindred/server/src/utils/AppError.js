// Operational error with an HTTP status. Thrown anywhere, caught by errorHandler.
class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

module.exports = AppError;
