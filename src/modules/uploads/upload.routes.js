import express from "express";
import { upload } from "../../middlewares/upload.middleware.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * POST /uploads/image
 * Upload a single image and return its public URL.
 */
router.post("/image", authMiddleware, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json(new ApiResponse(400, null, "No file uploaded"));
  }

  // Construct public URL
  // In production, you might use a cloud storage URL
  const protocol = req.protocol;
  const host = req.get("host");
  const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  res.status(200).json(
    new ApiResponse(200, { url: imageUrl }, "Image uploaded successfully")
  );
});

export default router;
