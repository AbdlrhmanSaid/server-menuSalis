import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

/**
 * @desc    تسجيل الدخول
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
  }

  try {
    // ✅ البحث عن المستخدم
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ message: "اسم المستخدم أو كلمة المرور غير صحيح" });
    }

    // ✅ التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "اسم المستخدم أو كلمة المرور غير صحيح" });
    }

    // ✅ إنشاء التوكن
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // ✅ الرد على العميل بالتوكن والبيانات
    res.status(200).json({
      message: "تم تسجيل الدخول بنجاح",
      token, // تقدر تخزنه في LocalStorage أو Zustand
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الدخول",
      error: error.message,
    });
  }
};

/**
 * @desc    الحصول على بيانات المستخدم الحالي
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    res.status(200).json(req.user); // بيانات المستخدم جايه من protect middleware
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات المستخدم",
      error: error.message,
    });
  }
};

/**
 * @desc    إنشاء مستخدم مسؤول لأول مرة فقط (صلاحيات كاملة)
 * @route   POST /api/auth/setup-admin
 * @access  Public
 */
export const setupAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
  }

  try {
    // التحقق من وجود مستخدم مسؤول (supervisor) مسبقاً في النظام
    const existingSupervisor = await User.findOne({ role: "supervisor" });
    if (existingSupervisor) {
      return res
        .status(400)
        .json({
          message:
            "لقد تم إنشاء مستخدم مسؤول بالفعل في هذا النظام. لا يمكن استخدام هذا المسار مجدداً.",
        });
    }

    // التحقق من أن اسم المستخدم غير محجوز
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "اسم المستخدم موجود بالفعل" });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء المستخدم بصلاحيات Supervisor كاملة
    const newSupervisor = await User.create({
      username,
      password: hashedPassword,
      role: "Supervisor",
    });

    res.status(201).json({
      message: "تم إنشاء المستخدم المسؤول الأول بنجاح",
      user: {
        id: newSupervisor._id,
        username: newSupervisor.username,
        role: newSupervisor.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء إعداد المستخدم المسؤول",
      error: error.message,
    });
  }
};
