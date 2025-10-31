// src/controlers/uploadController.js
import cloudinary from "../lib/cloudinary.js";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary.js";

export async function uploadProductImages(req, res) {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const results = await Promise.all(
      files.map(async (f) => {
        const r = await uploadBufferToCloudinary(f.buffer);
        return {
          url: r.secure_url,      // HTTPS CDN URL (fits your schema)
          publicId: r.public_id,  // keep this if you want deletions later
          width: r.width,
          height: r.height,
          format: r.format,
        };
      })
    );

    // If you want to keep the old response shape, you can also add:
    // const urls = results.map(x => x.url);
    return res.json({ success: true, images: results });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
}

export async function deleteProductImage(req, res) {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ success: false, message: "publicId required" });

    const result = await cloudinary.uploader.destroy(publicId);
    return res.json({ success: true, result });
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
}

export async function uploadDriverLicense(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No license image uploaded" });
    }

    const result = await uploadBufferToCloudinary(file.buffer);
    
    return res.json({ 
      success: true, 
      licenseImage: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      }
    });
  } catch (err) {
    console.error("Driver license upload error:", err);
    return res.status(500).json({ success: false, message: "License upload failed" });
  }
}
