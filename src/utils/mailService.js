/**
 * Dummy Email Service for OTP logging
 */

/**
 * Logs the OTP to the console instead of sending an actual email.
 * @param {string} email - Recipient email
 * @param {string} otp - Generated One-Time Password
 */
export const sendOtpMail = async (email, otp) => {
  console.log('-----------------------------------------');
  console.log(`[DUMMY MAIL] Sending OTP to: ${email}`);
  console.log(`[DUMMY MAIL] OTP: ${otp}`);
  console.log('-----------------------------------------');
  
  // Simulate network delay
  return new Promise((resolve) => setTimeout(resolve, 500));
};
