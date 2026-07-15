import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ✅ حماية الراوتس (تأكد من أن المستخدم مسجل الدخول)
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // قراءة التوكن من الهيدر
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "غير مصرح بالدخول - لا يوجد توكن" });
    }

    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // جلب بيانات المستخدم
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "توكن غير صالح أو انتهت صلاحيته" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "غير مصرح لك باستخدام هذا المسار" });
    }
    next();
  };
};
