import express from "express";
import * as tripController from "./trip.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// All trip routes require authentication
router.use(authMiddleware);

// Employee actions
router.post("/start", tripController.startTrip);
router.put("/:id/end", tripController.endTrip);

// Listing and details
router.get("/stats", tripController.getStats);
router.get("/", tripController.getTrips);
router.get("/:id", tripController.getTripDetails);

// Admin/Manager actions
router.patch("/:id/status", tripController.updateTripStatus);
router.patch("/:id/metrics", tripController.updateTripMetrics);

export default router;
