import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import ApiResponse from "./utils/ApiResponse.js";
import ApiError from "./utils/ApiError.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import routeRoutes from "./modules/routes/route.routes.js";
import orgRoutes from "./modules/organizations/org.routes.js";

dotenv.config();

const app = express();

// Disable ETag — prevents Android OkHttp from sending If-None-Match which
// causes Express to return 304 (empty body). Axios rejects 304 → logout loop.
app.set("etag", false);

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "*" }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/routes", routeRoutes);
app.use("/organizations", orgRoutes);

// Health check
app.get("/health", (_, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(200, { status: "UP" }, "Mileage Tracking API is running"),
    );
});

// Error handling middleware
// Express requires 4 params exactly to treat this as an error handler
app.use((err, _req, res, _next) => {
  let { status = 500, message = "Internal Server Error", error = null } = err;

  // Handle generic errors that aren't instances of ApiError
  if (!(err instanceof ApiError)) {
    status = 500;
    message = err.message || "Internal Server Error";
    error = err.name || "Error";
  }

  console.error(err.stack);

  res.status(status).json({
    status,
    data: null,
    message,
    error,
  });
});

export default app;
