import History from "../models/History.js";

export const getHistory = async (req, res) => {
  try {
    const history = await History.find().sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({
      message: "فشل في جلب السجل",
      error: error.message,
    });
  }
};

export const addHistory = async (req, res) => {
  try {
    const { action, user, target, type } = req.body;

    if (!action || !user || !target || !type) {
      return res.status(400).json({ message: "البيانات غير مكتملة" });
    }

    const newHistory = await History.create({ action, user, target, type });

    res.status(201).json({
      message: "تم إضافة الحدث إلى السجل",
      history: newHistory,
    });
  } catch (error) {
    res.status(500).json({
      message: "فشل في إضافة الحدث",
      error: error.message,
    });
  }
};

export const clearHistory = async (req, res) => {
  try {
    await History.deleteMany({});
    res.status(200).json({ message: "تم مسح كل السجل بنجاح" });
  } catch (error) {
    res.status(500).json({
      message: "فشل في مسح السجل",
      error: error.message,
    });
  }
};
