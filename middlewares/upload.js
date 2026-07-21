import multer from "multer";

const storage = multer.memoryStorage();

// فلتر للتأكد إن الملف صورة
const fileFilter = (req, file, cb) => {
  console.log(
    "Processing file:",
    file.originalname,
    "MIME type:",
    file.mimetype,
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
 * @param {string|Array} fieldOrFields - اسم الحقل كـ string أو مصفوفة من الحقول (مثل: [{ name: 'logo', maxCount: 1 }])
 * @param {number|null} maxCount - لو null → single, لو رقم → array (في حالة تمرير string)
 */
const uploadMiddleware = (fieldOrFields, maxCount = null) => {
  return (req, res, next) => {
    let handler;
    if (Array.isArray(fieldOrFields)) {
      handler = upload.fields(fieldOrFields);
    } else {
      handler = maxCount
        ? upload.array(fieldOrFields, maxCount) // لعدة صور
        : upload.single(fieldOrFields); // لصورة واحدة
    }

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
        if (Array.isArray(req.files)) {
          console.log(
            `✅ ${req.files.length} files uploaded:`,
            req.files.map((f) => ({
              originalname: f.originalname,
              mimetype: f.mimetype,
              size: f.size,
            })),
          );
        } else {
          // Object from upload.fields
          const filesInfo = [];
          for (const key in req.files) {
            req.files[key].forEach((f) => {
              filesInfo.push({
                fieldname: f.fieldname,
                originalname: f.originalname,
                mimetype: f.mimetype,
                size: f.size,
              });
            });
          }
          console.log(`✅ ${filesInfo.length} files uploaded:`, filesInfo);
        }
      }

      next();
    });
  };
};

export default uploadMiddleware;
