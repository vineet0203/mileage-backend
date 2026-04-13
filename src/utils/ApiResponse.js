/**
 * Standardized API Response structure.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {any} data - Response payload
   * @param {string} message - Response message
   */
  constructor(statusCode, data, message = "Success") {
    this.status = statusCode;
    this.data = data;
    this.message = message;
    this.error = null;
  }
}

export default ApiResponse;
