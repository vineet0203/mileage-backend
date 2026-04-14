export const AUTH_QUERIES = {
  FIND_BY_EMAIL: `
    SELECT id, email, fullname, password, role, is_verified, otp, otp_expires_at,
           reset_token, reset_token_expires_at, invite_token, refresh_token
    FROM users
    WHERE email = ?
    LIMIT 1;
  `,

  FIND_BY_ID: `
    SELECT id, email, fullname, role, is_verified
    FROM users
    WHERE id = ?
    LIMIT 1;
  `,

  INSERT_USER: `
    INSERT INTO users (email, fullname, password, role, otp, otp_expires_at)
    VALUES (?, ?, ?, ?, ?, ?);
  `,

  INSERT_INVITED_USER: `
    INSERT INTO users (email, role, invite_token, is_verified)
    VALUES (?, ?, ?, 0);
  `,

  SET_OTP: `
    UPDATE users
    SET otp = ?, otp_expires_at = ?
    WHERE email = ?;
  `,

  VERIFY_USER: `
    UPDATE users
    SET is_verified = 1, otp = NULL, otp_expires_at = NULL
    WHERE email = ? AND otp = ? AND otp_expires_at > NOW();
  `,

  SET_RESET_TOKEN: `
    UPDATE users
    SET reset_token = ?, reset_token_expires_at = ?
    WHERE email = ?;
  `,

  RESET_PASSWORD: `
    UPDATE users
    SET password = ?, reset_token = NULL, reset_token_expires_at = NULL
    WHERE reset_token = ? AND reset_token_expires_at > NOW();
  `,

  CHANGE_PASSWORD: `
    UPDATE users
    SET password = ?
    WHERE id = ?;
  `,

  SET_REFRESH_TOKEN: `
    UPDATE users
    SET refresh_token = ?
    WHERE id = ?;
  `,

  REVOKE_ALL_SESSIONS: `
    UPDATE users
    SET refresh_token = NULL
    WHERE id = ?;
  `,

  ACCEPT_INVITE: `
    UPDATE users
    SET password = ?, invite_token = NULL, is_verified = 1
    WHERE invite_token = ?;
  `,

  LIST_PENDING_INVITATIONS: `
    SELECT id, email, role, created_at
    FROM users
    WHERE invite_token IS NOT NULL AND is_verified = 0;
  `,
};
