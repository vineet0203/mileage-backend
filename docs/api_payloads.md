# Mileage Tracking System — API Reference

All responses follow the standard structure:

```json
{
  "status": 200,
  "data": { },
  "message": "...",
  "error": null
}
```

Base URL: `http://localhost:5000`

---

## Auth Module — `/auth`

### Public Routes

---

#### 1. Signup
**`POST /auth/signup`**

Register a new user. An OTP is sent to the email (logged to console in dev).

```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "fullname": "John Doe",
    "password": "Password123",
    "role": "EMPLOYEE"
  }'
```

> **Roles:** `ADMIN` | `EMPLOYER` | `EMPLOYEE`

---

#### 2. Login
**`POST /auth/login`**

Authenticate and receive `accessToken` (15 min) + `refreshToken` (7 days).

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

**Response `data`:**
```json
{
  "user": { "id": 1, "email": "user@example.com", "fullname": "John Doe", "role": "EMPLOYEE" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### 3. Verify Email
**`POST /auth/verify-email`**

Activate account using the 6-digit OTP from the (dummy) email.

```bash
curl -X POST http://localhost:5000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "482910"
  }'
```

---

#### 4. Resend Verification OTP
**`POST /auth/resend-verification`**

```bash
curl -X POST http://localhost:5000/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

---

#### 5. Forgot Password
**`POST /auth/forgot-password`**

Sends a reset OTP to the email. Always returns `200` to prevent email enumeration.

```bash
curl -X POST http://localhost:5000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

---

#### 6. Reset Password
**`POST /auth/reset-password`**

Reset password using the OTP received via forgot-password.

```bash
curl -X POST http://localhost:5000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "391047",
    "newPassword": "NewPassword456"
  }'
```

---

#### 7. Refresh Token
**`POST /auth/refresh-token`**

Rotate the token pair. Old refresh token is invalidated on use.

```bash
curl -X POST http://localhost:5000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJ..."
  }'
```

**Response `data`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### 8. Accept Invite
**`POST /auth/accept-invite`**

Accept an employee invitation, set a password and activate the account.

```bash
curl -X POST http://localhost:5000/auth/accept-invite \
  -H "Content-Type: application/json" \
  -d '{
    "inviteToken": "a3f9c2...",
    "password": "MyPassword123"
  }'
```

---

### Protected Routes
> Requires `Authorization: Bearer <accessToken>` header.

---

#### 9. Logout
**`POST /auth/logout`**

Invalidates the current session refresh token.

```bash
curl -X POST http://localhost:5000/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

---

#### 10. Change Password
**`POST /auth/change-password`**

Change password when the user knows their current password.

```bash
curl -X POST http://localhost:5000/auth/change-password \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "Password123",
    "newPassword": "NewPassword456"
  }'
```

---

#### 11. Get Current User
**`GET /auth/me`**

Return the logged-in user's profile.

```bash
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

**Response `data`:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "fullname": "John Doe",
  "role": "EMPLOYEE",
  "is_verified": 1
}
```

---

#### 12. Revoke All Sessions
**`POST /auth/revoke-sessions`**

Logs the user out of all devices by clearing the stored refresh token.

```bash
curl -X POST http://localhost:5000/auth/revoke-sessions \
  -H "Authorization: Bearer <accessToken>"
```

---

### Role-Based Routes
> Requires JWT + role `ADMIN` or `EMPLOYER`.

---

#### 13. Invite Employee
**`POST /auth/invite-employee`**

Create an inactive account for an employee and send them an invite token.

```bash
curl -X POST http://localhost:5000/auth/invite-employee \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@company.com",
    "role": "EMPLOYEE"
  }'
```

**Response `data`:**
```json
{
  "inviteToken": "a3f9c2..."
}
```

---

#### 14. List Invitations
**`GET /auth/invitations`**

List all pending employee invitations (not yet accepted).

```bash
curl -X GET http://localhost:5000/auth/invitations \
  -H "Authorization: Bearer <accessToken>"
```

**Response `data`:**
```json
[
  { "id": 5, "email": "employee@company.com", "role": "EMPLOYEE", "created_at": "..." }
]
```

---

#### 15. List All Users
**`GET /users`**

List all users and their active (verified) status.

```bash
curl -X GET http://localhost:5000/users \
  -H "Authorization: Bearer <accessToken>"
```

**Response `data`:**
```json
[
  { "id": 1, "email": "employee@company.com", "fullname": "John Doe", "role": "EMPLOYEE", "is_verified": 1, "created_at": "..." }
]
```

---

#### 16. Get User Details
**`GET /users/:id`**

Get details of a specific user by ID.

```bash
curl -X GET http://localhost:5000/users/1 \
  -H "Authorization: Bearer <accessToken>"
```

**Response `data`:**
```json
{
  "id": 1,
  "email": "employee@company.com",
  "fullname": "John Doe",
  "role": "EMPLOYEE",
  "is_verified": 1,
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Travel Routes Module — `/routes`

### Protected Routes (JWT required)

---

#### 17. Create Route
**`POST /routes`**

Creation of a new predefined travel route. (Requires ADMIN or EMPLOYER role)

```bash
curl -X POST http://localhost:5000/routes \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sector 35 - Sector 43 Chd",
    "rate": 10,
    "startDestination": "Sector 35",
    "endDestination": "Sector 43"
  }'
```

---

#### 18. Update Route
**`PUT /routes/:id`**

Update an existing route. (Requires ADMIN or EMPLOYER role)

```bash
curl -X PUT http://localhost:5000/routes/1 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sector 35 - Sector 43 Chd Updated",
    "rate": 12,
    "startDestination": "Sector 35",
    "endDestination": "Sector 43"
  }'
```

---

#### 19. Delete Route
**`DELETE /routes/:id`**

Remove a route from the system. (Requires ADMIN or EMPLOYER role)

```bash
curl -X DELETE http://localhost:5000/routes/1 \
  -H "Authorization: Bearer <accessToken>"
```

---

#### 20. List/Search Routes
**`GET /routes`**

List all routes or filter by `name`, `startDestination`, or `endDestination`.

```bash
curl -X GET "http://localhost:5000/routes?name=Sector" \
  -H "Authorization: Bearer <accessToken>"
```

**Response `data`:**
```json
[
  {
    "id": 1,
    "name": "Sector 35 - Sector 43 Chd",
    "rate": 10,
    "start_destination": "Sector 35",
    "end_destination": "Sector 43",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

---

## Health Check

#### Health
**`GET /health`**

```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "status": 200,
  "data": { "status": "UP" },
  "message": "Mileage Tracking API is running",
  "error": null
}
```
