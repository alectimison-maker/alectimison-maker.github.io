# OpenCV tutorial source image

Place the user-provided, original 1280×768 arena image here as `armor-field.jpg`.

The image pipeline will generate `public/media/images/opencv/armor-field.w1280.webp`, which is both the deterministic sandbox input and the desktop article image. Do not substitute the compressed chat preview for the original file.

After adding the original, run `npm run lock:opencv-asset`. This verifies the required 1280×768 dimensions and records the generated WebP SHA-256. Aliyun deployment fails if the source, responsive variant, or hash lock is missing or has changed unexpectedly.
