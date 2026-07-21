import Promotion from "../models/Promotion.js";
import History from "../models/History.js";
import { uploadImage, deleteImage } from "../helpers/uploadImage.js";

let io;
export const setSocketIO = (ioInstance) => {
  io = ioInstance;
};

const addToHistory = async (action, user, target, type) => {
  try {
    await History.create({ action, user, target, type });
  } catch (error) {
    console.error("Error adding to history:", error);
  }
};

export const getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find().populate("target", "name slug");
    res.status(200).json(promotions);
  } catch (error) {
    res.status(500).json({ message: "فشل في جلب العروض", error: error.message });
  }
};

export const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gt: now },
    })
      .sort({ priority: -1 })
      .populate("target", "name slug");
    res.status(200).json(promotions);
  } catch (error) {
    res.status(500).json({ message: "فشل في جلب العروض النشطة", error: error.message });
  }
};

export const getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id).populate("target", "name slug");
    if (!promotion) return res.status(404).json({ message: "العرض غير موجود" });
    res.status(200).json(promotion);
  } catch (error) {
    res.status(500).json({ message: "فشل في جلب العرض", error: error.message });
  }
};

export const createPromotion = async (req, res) => {
  try {
    const {
      title,
      description,
      targetType,
      target,
      discountType,
      discountValue,
      priority,
      startDate,
      endDate,
      isActive,
      userName,
    } = req.body;

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء" });
    }

    let banner = null;
    if (req.files && req.files.banner && req.files.banner[0]) {
      const uploaded = await uploadImage(req.files.banner[0].buffer, "promotions", req.files.banner[0].originalname);
      banner = {
        public_id: uploaded.fileId,
        url: uploaded.url,
      };
    }

    const promotion = await Promotion.create({
      title,
      description,
      banner,
      targetType,
      target,
      discountType,
      discountValue,
      priority: priority || 0,
      startDate,
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: userName,
    });

    const populatedPromotion = await Promotion.findById(promotion._id).populate("target", "name slug");

    io?.emit("promotion_created", populatedPromotion);
    if (userName) {
      await addToHistory(`قام ${userName} بإنشاء عرض جديد "${title}"`, userName, title, "promotion");
    }

    res.status(201).json({ message: "تم إنشاء العرض بنجاح", promotion: populatedPromotion });
  } catch (error) {
    res.status(400).json({ message: "فشل في إنشاء العرض", error: error.message });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return res.status(404).json({ message: "العرض غير موجود" });

    const {
      title,
      description,
      targetType,
      target,
      discountType,
      discountValue,
      priority,
      startDate,
      endDate,
      isActive,
      userName,
    } = req.body;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء" });
    }

    if (title) promotion.title = title;
    if (description !== undefined) promotion.description = description;
    if (targetType) promotion.targetType = targetType;
    if (target) promotion.target = target;
    if (discountType) promotion.discountType = discountType;
    if (discountValue !== undefined) promotion.discountValue = discountValue;
    if (priority !== undefined) promotion.priority = priority;
    if (startDate) promotion.startDate = startDate;
    if (endDate) promotion.endDate = endDate;
    if (isActive !== undefined) promotion.isActive = isActive;

    if (req.files && req.files.banner && req.files.banner[0]) {
      if (promotion.banner?.public_id) {
        await deleteImage(promotion.banner.public_id);
      }
      const uploaded = await uploadImage(req.files.banner[0].buffer, "promotions", req.files.banner[0].originalname);
      promotion.banner = {
        public_id: uploaded.fileId,
        url: uploaded.url,
      };
    }

    await promotion.save();
    
    const populatedPromotion = await Promotion.findById(promotion._id).populate("target", "name slug");

    io?.emit("promotion_updated", populatedPromotion);
    if (userName) {
      await addToHistory(`قام ${userName} بتعديل العرض "${promotion.title}"`, userName, promotion.title, "promotion");
    }

    res.status(200).json({ message: "تم تعديل العرض بنجاح", promotion: populatedPromotion });
  } catch (error) {
    res.status(500).json({ message: "فشل في تعديل العرض", error: error.message });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return res.status(404).json({ message: "العرض غير موجود" });

    if (promotion.banner?.public_id) {
      await deleteImage(promotion.banner.public_id);
    }

    await promotion.deleteOne();

    io?.emit("promotion_deleted", { id: req.params.id });

    // Assuming userName comes from query or body for DELETE, usually it doesn't unless passed specifically.
    // For simplicity, we just delete.

    res.status(200).json({ message: "تم حذف العرض بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "فشل في حذف العرض", error: error.message });
  }
};

export const togglePromotionStatus = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return res.status(404).json({ message: "العرض غير موجود" });

    promotion.isActive = !promotion.isActive;
    await promotion.save();

    const populatedPromotion = await Promotion.findById(promotion._id).populate("target", "name slug");

    io?.emit("promotion_updated", populatedPromotion);
    
    if (req.body.userName) {
        const action = promotion.isActive ? "تفعيل" : "إيقاف";
        await addToHistory(`قام ${req.body.userName} بـ ${action} العرض "${promotion.title}"`, req.body.userName, promotion.title, "promotion");
    }

    res.status(200).json({ message: `تم ${promotion.isActive ? 'تفعيل' : 'إيقاف'} العرض بنجاح`, promotion: populatedPromotion });
  } catch (error) {
    res.status(500).json({ message: "فشل في تغيير حالة العرض", error: error.message });
  }
};
