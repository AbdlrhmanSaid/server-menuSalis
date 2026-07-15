// controllers/productController.js
import Product from "../models/Product.js";
import Menu from "../models/Menu.js";
import cloudinary from "../config/cloudinary.js";
import Company from "../models/Company.js";
import Branch from "../models/Branch.js";
import History from "../models/History.js";
import mongoose from "mongoose";

// Socket instance (هنمرره من السيرفر)
let io;
export const setSocketIO = (ioInstance) => {
  io = ioInstance;
};

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

// Helper function لرفع الصور من buffer
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          return reject(new Error("فشل في رفع الصورة إلى Cloudinary"));
        }
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * @desc    Get all products (فلترة بالمنيو لو حبيت)
 * @route   GET /api/products
 */
export const getProducts = async (req, res) => {
  try {
    const { menuId } = req.query;
    const filter = menuId ? { menu: menuId } : {};
    const products = await Product.find(filter)
      .populate("menu", "name")
      .populate("availableBranches", "name"); // ✅

    res.status(200).json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في جلب المنتجات", error: error.message });
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 */
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("menu", "name")
      .populate("availableBranches", "name");

    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    res.status(200).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في جلب المنتج", error: error.message });
  }
};

/**
 * @desc    Create new product (بإستخدام companySlug بدل menuId)
 * @route   POST /api/products
 */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      companySlug,
      availableBranches,
      userId,
      userName,
    } = req.body;

    // 1️⃣ دور على الشركة بالـ slug
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    // 2️⃣ هات المنيو الخاص بالشركة
    const menu = await Menu.findOne({ company: company._id });
    if (!menu) {
      return res
        .status(404)
        .json({ message: "المنيو الخاص بالشركة غير موجود" });
    }

    // 3️⃣ لو المستخدم محدد فروع، استخدمها، لو مش محدد خليه فاضي
    let branchIds = [];
    if (availableBranches && availableBranches.length > 0) {
      const branches = await Branch.find({
        _id: { $in: availableBranches },
        company: company._id,
      });
      branchIds = branches.map((b) => b._id);
    }

    // 4️⃣ لو فيه صورة ارفعها
    let image = null;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "products");
      image = {
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
      };
    }

    // 5️⃣ اعمل إنشاء المنتج
    const newProduct = await Product.create({
      name,
      description,
      price,
      menu: menu._id,
      availableBranches: branchIds,
      image,
    });

    // 6️⃣ ضيف المنتج للمنيو
    menu.products.push(newProduct._id);
    await menu.save();

    // 7️⃣ ابعت socket update
    io?.emit("product_created", newProduct);

    // 8️⃣ Add to history if user info is provided
    if (userId && userName) {
      let branchInfo = "";
      if (branchIds.length > 0) {
        const branches = await Branch.find({ _id: { $in: branchIds } });
        if (branches.length === 1) {
          branchInfo = ` في ${branches[0].name}`;
        } else if (branches.length > 1) {
          const branchNames = branches.map((b) => b.name).join("، ");
          branchInfo = ` في الفروع: ${branchNames}`;
        }
      }

      await addToHistory(
        `قام ${userName} بإنشاء منتج جديد "${name}"${branchInfo}`,
        userName,
        name,
        "product"
      );
    }

    res.status(201).json({
      message: "تم إنشاء المنتج وربطه بالفروع المختارة",
      product: newProduct,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "فشل في إنشاء المنتج", error: error.message });
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 */
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate({
      path: "menu",
      select: "company name",
    });
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    console.log("🔍 Debug - product.menu:", product.menu);
    console.log("🔍 Debug - product.menu.company:", product.menu?.company);

    // Keep track of previous menu to sync Menu.products
    const previousMenuId =
      product.menu?._id?.toString?.() || product.menu?.toString?.();

    // Store old values for history tracking
    const oldName = product.name;
    const oldDescription = product.description;
    const oldPrice = product.price;

    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.price =
      req.body.price !== undefined ? req.body.price : product.price;
    product.menu = req.body.menu || product.menu._id;

    // Add history for basic product info changes
    if (req.body.userId && req.body.userName) {
      const changes = [];

      if (req.body.name && oldName !== req.body.name) {
        changes.push(`الاسم من "${oldName}" إلى "${req.body.name}"`);
      }

      if (req.body.description && oldDescription !== req.body.description) {
        changes.push("الوصف");
      }

      if (req.body.price !== undefined && oldPrice !== req.body.price) {
        changes.push(`السعر من ${oldPrice} إلى ${req.body.price}`);
      }

      if (changes.length > 0) {
        await addToHistory(
          `قام ${req.body.userName} بتعديل المنتج: ${changes.join("، ")}`,
          req.body.userName,
          product.name,
          "product"
        );
      }
    }

    if (req.body.availableBranches) {
      // 🔧 إصلاح: احصل على companyId من الـ menu مباشرة
      let companyId;

      if (product.menu && product.menu.company) {
        companyId = product.menu.company;
        console.log(
          "🔍 Debug - Using companyId from populated menu:",
          companyId
        );
      } else {
        // لو الـ menu مش populated، احصل عليه من جديد
        console.log("🔍 Debug - Menu not populated, fetching from database...");
        const menu = await Menu.findById(product.menu);
        console.log("🔍 Debug - Fetched menu:", menu);

        if (!menu) {
          return res.status(400).json({
            message: "المنيو غير موجود",
          });
        }
        companyId = menu.company;
        console.log("🔍 Debug - Using companyId from fetched menu:", companyId);
      }

      console.log("🔍 Debug - Final companyId:", companyId);
      console.log(
        "🔍 Debug - availableBranches from request:",
        req.body.availableBranches
      );

      // أولاً: تحقق من وجود الفروع
      const allBranches = await Branch.find({
        _id: { $in: req.body.availableBranches },
      });

      console.log("🔍 Debug - All branches found:", allBranches);

      // ثانياً: فلتر الفروع التابعة لنفس الشركة
      const validBranches = allBranches.filter(
        (branch) => branch.company.toString() === companyId.toString()
      );

      console.log("🔍 Debug - Valid branches for company:", validBranches);

      const oldBranches = product.availableBranches || [];
      const newBranches = validBranches.map((b) => b._id);

      // إضافة الهيستوري للتغيير في الفروع المتاحة
      if (req.body.userId && req.body.userName) {
        const oldCount = oldBranches.length;
        const newCount = newBranches.length;

        if (oldCount !== newCount) {
          let actionMessage;
          if (newCount === 0) {
            actionMessage = `قام ${req.body.userName} بجعل المنتج غير متاح في جميع الفروع`;
          } else if (newCount === 1) {
            const branchName = validBranches[0].name;
            actionMessage = `قام ${req.body.userName} بتعديل المنتجات في ${branchName}`;
          } else if (newCount <= 5) {
            // إذا كان عدد الفروع 5 أو أقل، اعرض أسماء الفروع
            const branchNames = validBranches.map((b) => b.name).join("، ");
            actionMessage = `قام ${req.body.userName} بتعديل المنتجات في الفروع: ${branchNames}`;
          } else {
            // إذا كان أكثر من 5 فروع، اعرض العدد فقط
            actionMessage = `قام ${req.body.userName} بتعديل المنتجات في ${newCount} فروع`;
          }

          await addToHistory(
            actionMessage,
            req.body.userName,
            product.name,
            "product"
          );
        }
      }

      product.availableBranches = newBranches;
    }

    if (req.file) {
      if (product.image?.public_id) {
        // 🔧 إصلاح: image بدل logo
        await cloudinary.uploader.destroy(product.image.public_id);
      }
      const uploaded = await uploadToCloudinary(req.file.buffer, "products");
      product.image = {
        // 🔧 إصلاح: image بدل logo
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
      };
    }

    await product.save();

    // Sync Menu.products if menu changed
    const newMenuId =
      product.menu?._id?.toString?.() || product.menu?.toString?.();
    if (previousMenuId && newMenuId && previousMenuId !== newMenuId) {
      await Menu.updateOne(
        { _id: previousMenuId },
        { $pull: { products: product._id } }
      );
      await Menu.updateOne(
        { _id: newMenuId },
        { $addToSet: { products: product._id } }
      );
    }

    const updatedProduct = await Product.findById(product._id)
      .populate("menu", "name company")
      .populate("availableBranches", "name");

    io?.emit("product_updated", updatedProduct);

    res
      .status(200)
      .json({ message: "تم تعديل المنتج بنجاح", product: updatedProduct });
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في تعديل المنتج", error: error.message });
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    if (product.image?.public_id) {
      // 🔧 إصلاح: image بدل logo
      await cloudinary.uploader.destroy(product.image.public_id);
    }

    await product.deleteOne();

    // 🔔 بث التغيير
    io?.emit("product_deleted", { id: req.params.id });

    res.status(200).json({ message: "تم حذف المنتج بنجاح" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "فشل في حذف المنتج", error: error.message });
  }
};

/**
 * @desc    Update product availability in multiple branches with detailed history
 * @route   PUT /api/products/:id/update-branches
 */
export const updateProductBranches = async (req, res) => {
  try {
    const { id } = req.params;
    const { availableBranches, userId, userName } = req.body;

    const product = await Product.findById(id).populate(
      "availableBranches",
      "name"
    );
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    const oldBranches = product.availableBranches.map((b) => b._id.toString());
    const newBranches = availableBranches || [];

    // Find added and removed branches
    const addedBranches = newBranches.filter((b) => !oldBranches.includes(b));
    const removedBranches = oldBranches.filter((b) => !newBranches.includes(b));

    // Get branch names for history
    const allBranches = await Branch.find({
      _id: { $in: [...addedBranches, ...removedBranches] },
    });
    const branchMap = {};
    allBranches.forEach((b) => {
      branchMap[b._id.toString()] = b.name;
    });

    // Add detailed history for each change
    if (userId && userName) {
      // History for added branches
      if (addedBranches.length > 0) {
        const addedNames = addedBranches
          .map((id) => branchMap[id])
          .filter(Boolean);
        if (addedNames.length === 1) {
          await addToHistory(
            `قام ${userName} بإضافة المنتج إلى ${addedNames[0]}`,
            userName,
            product.name,
            "product"
          );
        } else if (addedNames.length <= 5) {
          await addToHistory(
            `قام ${userName} بإضافة المنتج إلى الفروع: ${addedNames.join(
              "، "
            )}`,
            userName,
            product.name,
            "product"
          );
        } else {
          await addToHistory(
            `قام ${userName} بإضافة المنتج إلى ${addedNames.length} فروع`,
            userName,
            product.name,
            "product"
          );
        }
      }

      // History for removed branches
      if (removedBranches.length > 0) {
        const removedNames = removedBranches
          .map((id) => branchMap[id])
          .filter(Boolean);
        if (removedNames.length === 1) {
          await addToHistory(
            `قام ${userName} بإزالة المنتج من ${removedNames[0]}`,
            userName,
            product.name,
            "product"
          );
        } else if (removedNames.length <= 5) {
          await addToHistory(
            `قام ${userName} بإزالة المنتج من الفروع: ${removedNames.join(
              "، "
            )}`,
            userName,
            product.name,
            "product"
          );
        } else {
          await addToHistory(
            `قام ${userName} بإزالة المنتج من ${removedNames.length} فروع`,
            userName,
            product.name,
            "product"
          );
        }
      }
    }

    // Update product
    product.availableBranches = newBranches;
    await product.save();

    const updatedProduct = await Product.findById(id).populate(
      "availableBranches",
      "name"
    );

    res.status(200).json({
      message: "تم تحديث فروع المنتج بنجاح",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      message: "فشل في تحديث فروع المنتج",
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle product availability in specific branch
 * @route   PUT /api/products/:id/toggle-branch/:branchId
 */
export const toggleProductInBranch = async (req, res) => {
  try {
    const { id, branchId } = req.params;
    const { userId, userName } = req.body;

    const product = await Product.findById(id).populate(
      "availableBranches",
      "name"
    );
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });

    const isAvailable = product.availableBranches.some(
      (b) => b._id.toString() === branchId
    );

    if (isAvailable) {
      // Remove from available branches
      product.availableBranches = product.availableBranches.filter(
        (b) => b._id.toString() !== branchId
      );

      // Add to history - more specific message
      await addToHistory(
        `قام ${userName} بإزالة المنتج من ${branch.name}`,
        userName,
        `${product.name}`,
        "product"
      );
    } else {
      // Add to available branches
      product.availableBranches.push(branchId);

      // Add to history - more specific message
      await addToHistory(
        `قام ${userName} بإضافة المنتج إلى ${branch.name}`,
        userName,
        `${product.name}`,
        "product"
      );
    }

    await product.save();

    const updatedProduct = await Product.findById(id).populate(
      "availableBranches",
      "name"
    );

    io?.emit("product_updated", updatedProduct);

    res.status(200).json({
      message: isAvailable
        ? "تم جعل المنتج غير متاح في هذا الفرع"
        : "تم جعل المنتج متاح في هذا الفرع",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      message: "فشل في تحديث توفر المنتج",
      error: error.message,
    });
  }
};
