/**
 * Standardized API Error structure.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {any} error - Specific error details
   * @param {string} stack - Error stack trace
   */
  constructor(statusCode, message = "Something went wrong", error = null, stack = "") {
    super(message);
    this.status = statusCode;
    this.data = null;
    this.message = message;
    this.error = error;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
