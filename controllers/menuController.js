import Menu from "../models/Menu.js";
import Company from "../models/Company.js";
import Product from "../models/Product.js";

// 🟢 WebSocket instance
let io;
export const setSocketIO = (ioInstance) => {
  io = ioInstance;
};

// @desc Get all menus
// @route GET /api/menus
export const getMenus = async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = companyId ? { company: companyId } : {};
    const menus = await Menu.find(filter).populate("company", "name").populate({
      path: "products",
      select: "name availableBranches price",
    });

    res.status(200).json(menus);
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في جلب المنيو", error: error.message });
  }
};

// @desc Get single menu
// @route GET /api/menus/:id
export const getMenuById = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id)
      .populate("company", "name")
      .populate({
        path: "products",
        select: "name availableBranches price",
      });

    if (!menu) return res.status(404).json({ message: "المنيو غير موجود" });
    res.status(200).json(menu);
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في جلب المنيو", error: error.message });
  }
};

// @desc Get menus by company slug
// @route GET /api/menus/by-company/:slug
export const getMenusByCompanySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const company = await Company.findOne({ slug });
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    const menus = await Menu.find({ company: company._id })
      .populate("company", "name slug")
      .populate({
        path: "products",
        select: "name availableBranches price",
      });

    res.status(200).json(menus);
  } catch (error) {
    res.status(500).json({
      message: "فشل في جلب المنيو عن طريق الشركة",
      error: error.message,
    });
  }
};

// @desc Create menu
// @route POST /api/menus
export const createMenu = async (req, res) => {
  try {
    const { name, description, company, products } = req.body;

    const companyExists = await Company.findById(company);
    if (!companyExists) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    const menu = await Menu.create({ name, description, company, products });

    // 🔔 بث التغيير
    io?.emit("menu_created", menu);

    res.status(201).json({ message: "تم إنشاء المنيو بنجاح", menu });
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في إنشاء المنيو", error: error.message });
  }
};

// @desc Update menu
// @route PUT /api/menus/:id
export const updateMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("company", "name")
      .populate("products", "name availableBranches");

    if (!menu) return res.status(404).json({ message: "المنيو غير موجود" });

    // 🔔 بث التغيير
    io?.emit("menu_updated", menu);

    res.status(200).json({ message: "تم تحديث المنيو", menu });
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في تحديث المنيو", error: error.message });
  }
};

// @desc Delete menu and related products
// @route DELETE /api/menus/:id
export const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: "المنيو غير موجود" });

    // 🗑️ حذف المنتجات المرتبطة بالمنيو
    const deletedProducts = await Product.deleteMany({
      _id: { $in: menu.products },
    });

    await menu.deleteOne();

    // 🔔 بث التغيير
    io?.emit("menu_deleted", { id: req.params.id });

    res.status(200).json({
      message: "تم حذف المنيو والمنتجات المرتبطة به",
      deletedProducts: deletedProducts.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "فشل في حذف المنيو",
      error: error.message,
    });
  }
};
