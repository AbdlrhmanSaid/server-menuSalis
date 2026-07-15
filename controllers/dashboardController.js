import Company from "../models/Company.js";
import Branch from "../models/Branch.js";
import Menu from "../models/Menu.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
  try {
    const companiesCount = await Company.countDocuments();
    const branchesCount = await Branch.countDocuments();
    const menusCount = await Menu.countDocuments();
    const productsCount = await Product.countDocuments();
    const usersCount = await User.countDocuments();

    res.status(200).json({
      companies: companiesCount,
      branches: branchesCount,
      menus: menusCount,
      products: productsCount,
      users: usersCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب إحصائيات الداشبورد",
      error: error.message,
    });
  }
};
