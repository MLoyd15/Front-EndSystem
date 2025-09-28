// src/utils/uploadToCloudinary.js
import cloudinary from "../lib/cloudinary.js";
import stream from "stream";

export function uploadBufferToCloudinary(buffer, opts = {}) {
  return new Promise((resolve, reject) => {
    const passthrough = new stream.PassThrough();
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_ROOT_FOLDER
          ? `${process.env.CLOUDINARY_ROOT_FOLDER}/products`
          : "products",
        resource_type: "image",
        transformation: [{ fetch_format: "auto", quality: "auto" }],
        ...opts,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    passthrough.end(buffer);
    passthrough.pipe(upload);
  });
}
