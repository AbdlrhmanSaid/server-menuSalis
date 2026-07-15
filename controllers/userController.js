import bcrypt from "bcryptjs";
import User from "../models/User.js";

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب المستخدمين", error: error.message });
  }
};

// @desc    Add new user
// @route   POST /api/users
// @access  Private (Admin only)
export const addUser = async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "اسم المستخدم موجود بالفعل" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
    });
    res.status(201).json({
      message: "تم إنشاء المستخدم بنجاح",
      user: { ...newUser.toObject(), password: undefined },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء إضافة المستخدم", error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or Self)
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    res.status(200).json({ message: "تم تحديث بيانات المستخدم", user });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء تحديث المستخدم",
      error: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    await user.deleteOne();
    res.status(200).json({ message: "تم حذف المستخدم بنجاح" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء حذف المستخدم", error: error.message });
  }
};

// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Private (Admin or Self)
export const updatePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "الرجاء إدخال كلمة المرور القديمة والجديدة" });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    // تحقق من كلمة المرور القديمة
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "كلمة المرور القديمة غير صحيحة" });
    }

    // عمل هاش لكلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.status(200).json({ message: "تم تحديث كلمة المرور بنجاح" });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء تحديث كلمة المرور",
      error: error.message,
    });
  }
};
