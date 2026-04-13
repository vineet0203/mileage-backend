import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import ApiResponse from './utils/ApiResponse.js';
import ApiError from './utils/ApiError.js';

dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_, res) => {
  res.status(200).json(new ApiResponse(200, { status: 'UP' }, 'Mileage Tracking API is running'));
});

// Error handling middleware
app.use((err, _, res, _) => {
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
