import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configure the transporter using Gmail SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // NOTE: Use an App Password for Gmail
  },
});

/**
 * Generates a modern HTML email template
 */
const getHtmlTemplate = (context, token) => {
  let title = "Authentication Code";
  let message = "Please use the following authentication code to proceed:";
  let mainContent = `<div class="token-box"><p class="token">${token}</p></div>`;
  let warning =
    "This code will expire soon and can only be used once. If you did not request this, please ignore this email.";

  if (context === "INVITE") {
    title = "You're Invited!";
    message =
      "You have been invited to join the Mileage Tracker system. Please click the button below to accept your invitation and set up your account:";
    // Assuming frontend runs on localhost:3000 for now. User can configure this later.
    const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/accept-invite?token=${token}`;
    mainContent = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #0046c0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
      </div>
      <p style="text-align: center; font-size: 14px; color: #666;">Or copy this link: <br><a href="${inviteLink}">${inviteLink}</a></p>
    `;
    warning =
      "If you were not expecting this invitation, please ignore this email.";
  } else if (context === "RESET_PASSWORD") {
    title = "Password Reset Request";
    message =
      "We received a request to reset your password. Please use the following OTP to proceed:";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .header { background-color: #0046c0; padding: 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 500; }
    .content { padding: 30px; color: #333333; line-height: 1.6; }
    .content p { margin: 0 0 15px; }
    .token-box { background-color: #f8f9fa; border: 1px dashed #cccccc; padding: 15px; text-align: center; margin: 25px 0; border-radius: 4px; }
    .token { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0046c0; margin: 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #777777; background-color: #f9f9f9; border-top: 1px solid #eeeeee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mileage Tracker</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>${message}</p>
      ${mainContent}
      <p>${warning}</p>
      <p>Best regards,<br>The Mileage Tracker Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Mileage Tracker. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Sends a context-aware email.
 * @param {string} email - Recipient email
 * @param {string} token - The OTP or Token string
 * @param {string} context - The context: 'VERIFY', 'RESET_PASSWORD', 'INVITE'
 */
export const sendMail = async (email, token, context = "VERIFY") => {
  if (
    process.env.NODE_ENV === "development" &&
    (!process.env.SMTP_USER || !process.env.SMTP_PASS)
  ) {
    console.log("-----------------------------------------");
    console.log(`[DUMMY MAIL - ${context}] To: ${email}`);
    console.log(`[DUMMY MAIL] Token/Link payload: ${token}`);
    console.log("-----------------------------------------");
    return;
  }

  try {
    const subject =
      context === "INVITE"
        ? "You're Invited to Mileage Tracker!"
        : context === "RESET_PASSWORD"
          ? "Password Reset Code"
          : "Your Authentication Code";

    const textContent =
      context === "INVITE"
        ? `You've been invited to Mileage Tracker. Use this token: ${token} at the /accept-invite page.`
        : `Your code is: ${token}\n\nDo not share it.`;

    const info = await transporter.sendMail({
      from: `"Mileage Tracker" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      text: textContent,
      html: getHtmlTemplate(context, token),
    });

    console.log(`[MAIL] Message sent: ${info.messageId}`);
  } catch (error) {
    console.error(`[MAIL ERROR] Failed to send email to ${email}:`, error);
    throw new Error("Failed to send email");
  }
};
