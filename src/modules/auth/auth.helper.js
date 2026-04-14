import jwt from "jsonwebtoken";

/** Generate a 6-digit OTP and an expiry Date (10 minutes from now) */
export const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  return { otp, expiresAt };
};

/** Sign Access + Refresh tokens for a given user */
export const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "jwt_secret",
    { expiresIn: "15m" },
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
    { expiresIn: "7d" },
  );
  return { accessToken, refreshToken };
};
