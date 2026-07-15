// controllers/companyController.js
import Company from "../models/Company.js";
import cloudinary from "../config/cloudinary.js";

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
    const { name, slug, description } = req.body;

    let logo = null;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploaded = await cloudinary.uploader.upload(dataURI, {
        folder: "companies",
      });
      logo = {
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
      };
    }

    const newCompany = await Company.create({
      name,
      slug,
      description,
      logo,
    });

    // 🔔 بث التغيير عبر WebSocket
    io?.emit("company_created", newCompany);

    res
      .status(201)
      .json({ message: "تم إنشاء الشركة بنجاح", company: newCompany });
  } catch (error) {
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

    if (req.file) {
      if (company.logo?.public_id) {
        await cloudinary.uploader.destroy(company.logo.public_id);
      }

      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploaded = await cloudinary.uploader.upload(dataURI, {
        folder: "companies",
      });
      company.logo = {
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
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

    if (company.logo?.public_id) {
      await cloudinary.uploader.destroy(company.logo.public_id);
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
