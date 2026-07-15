import Branch from "../models/Branch.js";
import Product from "../models/Product.js";
import Company from "../models/Company.js";
import History from "../models/History.js";

// Helper function to add history
const addToHistory = async (action, user, target, type) => {
  try {
    await History.create({
      action,
      user,
      target,
      type,
    });
  } catch (error) {
    console.error("Error adding to history:", error);
  }
};

/**
 * @desc    Get all branches
 * @route   GET /api/branches
 */
export const getBranches = async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = companyId ? { company: companyId } : {};
    const branches = await Branch.find(filter).populate("company", "name slug");
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب الفروع",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single branch by ID
 * @route   GET /api/branches/:id
 */
export const getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate(
      "company",
      "name slug"
    );
    if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات الفرع",
      error: error.message,
    });
  }
};

/**
 * @desc    Create branch
 * @route   POST /api/branches
 */
export const createBranch = async (req, res) => {
  try {
    if (!req.body.company) {
      return res
        .status(400)
        .json({ message: "يجب تحديد الشركة المرتبطة بالفرع" });
    }

    const branch = await Branch.create(req.body);
    res.status(201).json({ message: "تم إنشاء الفرع بنجاح", branch });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء إنشاء الفرع",
      error: error.message,
    });
  }
};

/**
 * @desc    Update branch
 * @route   PUT /api/branches/:id
 */
export const updateBranch = async (req, res) => {
  try {
    const { userId, userName } = req.body;
    const branchId = req.params.id;

    const oldBranch = await Branch.findById(branchId);
    if (!oldBranch) return res.status(404).json({ message: "الفرع غير موجود" });

    const branch = await Branch.findByIdAndUpdate(branchId, req.body, {
      new: true,
      runValidators: true,
    });

    // Check if isActive status changed
    if (oldBranch.isActive !== branch.isActive && userId && userName) {
      const status = branch.isActive ? "يعمل" : "لا يعمل";
      await addToHistory(
        `قام ${userName} بجعل ${branch.name} ${status}`,
        userName,
        branch.name,
        "branch"
      );
    }

    res.status(200).json({ message: "تم تحديث بيانات الفرع", branch });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء تحديث الفرع",
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle branch active status
 * @route   PUT /api/branches/:id/toggle
 */
export const toggleBranchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;

    const branch = await Branch.findById(id);
    if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });

    const oldStatus = branch.isActive;
    branch.isActive = !branch.isActive;
    await branch.save();

    // Add to history
    const status = branch.isActive ? "يعمل" : "لا يعمل";
    await addToHistory(
      `قام ${userName} بجعل ${branch.name} ${status}`,
      userName,
      branch.name,
      "branch"
    );

    res.status(200).json({
      message: `تم جعل الفرع ${status}`,
      branch,
    });
  } catch (error) {
    res.status(500).json({
      message: "فشل في تغيير حالة الفرع",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete branch and remove its products availability
 * @route   DELETE /api/branches/:id
 */
export const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });

    // 🗑️ تعديل المنتجات: إزالة هذا الفرع من availableBranches
    const updatedProducts = await Product.updateMany(
      { availableBranches: branch._id },
      { $pull: { availableBranches: branch._id } }
    );

    // 🗑️ حذف الفرع نفسه
    await branch.deleteOne();

    res.status(200).json({
      message: "تم حذف الفرع وتم تحديث المنتجات المرتبطة به",
      updatedProducts: updatedProducts.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء حذف الفرع",
      error: error.message,
    });
  }
};

/**
 * @desc    Get branches by company slug
 * @route   GET /api/branches/by-company/:slug
 */
export const getBranchesByCompanySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1️⃣ دور على الشركة من خلال الـ slug
    const company = await Company.findOne({ slug });
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    // 2️⃣ هات الفروع المرتبطة بالشركة
    const branches = await Branch.find({ company: company._id }).populate(
      "company",
      "name slug"
    );

    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب فروع الشركة",
      error: error.message,
    });
  }
};
