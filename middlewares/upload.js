import multer from "multer";

const storage = multer.memoryStorage();

// فلتر للتأكد إن الملف صورة
const fileFilter = (req, file, cb) => {
  console.log(
    "Processing file:",
    file.originalname,
    "MIME type:",
    file.mimetype
  );

  if (file.mimetype.startsWith("image/")) {
    console.log("✅ File type accepted:", file.mimetype);
    cb(null, true);
  } else {
    console.log("❌ File type rejected:", file.mimetype);
    cb(new Error("يجب أن يكون الملف صورة"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * uploadMiddleware
 * @param {string} fieldName - اسم الحقل في form-data
 * @param {number|null} maxCount - لو null → single, لو رقم → array
 */
const uploadMiddleware = (fieldName, maxCount = null) => {
  return (req, res, next) => {
    const handler = maxCount
      ? upload.array(fieldName, maxCount) // لعدة صور
      : upload.single(fieldName); // لصورة واحدة

    handler(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res
              .status(400)
              .json({ message: "حجم الملف كبير جداً. الحد الأقصى 5MB" });
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ message: "تم إرسال ملف غير متوقع" });
          }
          return res.status(400).json({ message: "خطأ في رفع الملف" });
        }

        if (err.message === "يجب أن يكون الملف صورة") {
          return res
            .status(400)
            .json({ message: "يجب أن يكون الملف صورة (PNG, JPG, GIF)" });
        }

        return res.status(500).json({ message: "خطأ في معالجة الملف" });
      }

      // ✅ Debug logs
      if (req.file) {
        console.log("✅ Single file uploaded:", {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        });
      }

      if (req.files) {
        console.log(
          `✅ ${req.files.length} files uploaded:`,
          req.files.map((f) => ({
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
          }))
        );
      }

      next();
    });
  };
};

export default uploadMiddleware;
