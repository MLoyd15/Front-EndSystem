import multer from "multer";

const storage = multer.memoryStorage();

export const uploadMemory = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 }, // 8MB each, up to 6
  fileFilter: (_req, file, cb) => {
    if (/image\/(png|jpe?g|webp|gif|avif)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});