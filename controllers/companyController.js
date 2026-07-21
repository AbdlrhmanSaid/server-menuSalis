// controllers/companyController.js
import Company from "../models/Company.js";
import { uploadImage, deleteImage } from "../helpers/uploadImage.js";

// Socket instance (هنمرره من السيرفر)
let io;
export const setSocketIO = (ioInstance) => {
  io = ioInstance;
};

/**
 * @desc    Get all companies
 * @route   GET /api/companies
 */
export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find();
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({
      message: "فشل في جلب الشركات",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single company
 * @route   GET /api/companies/:id
 */
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({
      message: "فشل في جلب الشركة",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new company
 * @route   POST /api/companies
 */
export const createCompany = async (req, res) => {
  try {
    const { name, slug, description, primaryColor, secondaryColor } = req.body;

    let logo = null;
    let cover = null;

    if (req.files && req.files.logo && req.files.logo[0]) {
      console.log("📤 Uploading logo to ImageKit...");
      const uploaded = await uploadImage(req.files.logo[0].buffer, "companies", req.files.logo[0].originalname);
      console.log("✅ ImageKit upload success:", uploaded.url);
      logo = {
        public_id: uploaded.fileId,
        url: uploaded.url,
      };
    }

    if (req.files && req.files.cover && req.files.cover[0]) {
      console.log("📤 Uploading cover to ImageKit...");
      const uploaded = await uploadImage(req.files.cover[0].buffer, "companies_covers", req.files.cover[0].originalname);
      console.log("✅ ImageKit upload success:", uploaded.url);
      cover = {
        public_id: uploaded.fileId,
        url: uploaded.url,
      };
    }

    const newCompany = await Company.create({
      name,
      slug,
      description,
      logo,
      cover,
      primaryColor,
      secondaryColor,
    });

    // 🔔 بث التغيير عبر WebSocket
    io?.emit("company_created", newCompany);

    res
      .status(201)
      .json({ message: "تم إنشاء الشركة بنجاح", company: newCompany });
  } catch (error) {
    console.error("❌ createCompany error:", error.message);
    res.status(400).json({
      message: "فشل في إنشاء الشركة",
      error: error.message,
    });
  }
};

/**
 * @desc    Update company
 * @route   PUT /api/companies/:id
 */
export const updateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    company.name = req.body.name || company.name;
    company.slug = req.body.slug || company.slug;
    company.description = req.body.description || company.description;
    if (req.body.primaryColor !== undefined) company.primaryColor = req.body.primaryColor;
    if (req.body.secondaryColor !== undefined) company.secondaryColor = req.body.secondaryColor;

    if (req.files && req.files.logo && req.files.logo[0]) {
      // Delete old image if exists
      if (company.logo?.public_id) {
        await deleteImage(company.logo.public_id);
      }

      const uploaded = await uploadImage(req.files.logo[0].buffer, "companies", req.files.logo[0].originalname);
      company.logo = {
        public_id: uploaded.fileId,
        url: uploaded.url,
      };
    }

    if (req.files && req.files.cover && req.files.cover[0]) {
      // Delete old cover if exists
      if (company.cover?.public_id) {
        await deleteImage(company.cover.public_id);
      }

      const uploaded = await uploadImage(req.files.cover[0].buffer, "companies_covers", req.files.cover[0].originalname);
      company.cover = {
        public_id: uploaded.fileId,
        url: uploaded.url,
      };
    }

    await company.save();

    // 🔔 بث التغيير عبر WebSocket
    io?.emit("company_updated", company);

    res.status(200).json({ message: "تم تعديل الشركة بنجاح", company });
  } catch (error) {
    res.status(500).json({
      message: "فشل في تعديل الشركة",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete company
 * @route   DELETE /api/companies/:id
 */
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "الشركة غير موجودة" });
    }

    // Delete image from ImageKit
    if (company.logo?.public_id) {
      await deleteImage(company.logo.public_id);
    }
    if (company.cover?.public_id) {
      await deleteImage(company.cover.public_id);
    }

    await company.deleteOne();

    // 🔔 بث التغيير عبر WebSocket
    io?.emit("company_deleted", { id: req.params.id });

    res.status(200).json({ message: "تم حذف الشركة بنجاح" });
  } catch (error) {
    res.status(500).json({
      message: "فشل في حذف الشركة",
      error: error.message,
    });
  }
};
