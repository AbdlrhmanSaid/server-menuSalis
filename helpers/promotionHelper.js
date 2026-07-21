import Promotion from "../models/Promotion.js";

/**
 * Calculates the final price for a product based on the active promotion.
 */
const calculateDiscount = (originalPrice, promotion) => {
  if (promotion.discountType === "Percentage") {
    return Math.max(0, originalPrice - (originalPrice * promotion.discountValue) / 100);
  } else if (promotion.discountType === "Fixed Amount") {
    return Math.max(0, originalPrice - promotion.discountValue);
  } else if (promotion.discountType === "Fixed Price") {
    return Math.max(0, promotion.discountValue);
  }
  return originalPrice;
};

/**
 * Applies promotions to an array of products or a single product.
 * Modifies and returns the products as plain objects.
 * Ensure that products have `.menu` and `.menu.company` populated, or provide them.
 */
export const applyPromotionsToProducts = async (products) => {
  if (!products) return products;

  const isArray = Array.isArray(products);
  const productsArray = isArray ? products : [products];

  if (productsArray.length === 0) return products;

  const now = new Date();
  
  // Fetch all active promotions, sorted by priority (descending)
  const activePromotions = await Promotion.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gt: now },
  }).sort({ priority: -1 }).lean();

  const productPromotions = activePromotions.filter((p) => p.targetType === "Product");
  const menuPromotions = activePromotions.filter((p) => p.targetType === "Menu");
  const companyPromotions = activePromotions.filter((p) => p.targetType === "Company");

  const processedProducts = productsArray.map((prodDoc) => {
    // Convert to plain object if it's a mongoose document
    const product = typeof prodDoc.toObject === "function" ? prodDoc.toObject() : { ...prodDoc };

    let selectedPromotion = null;

    // 1. Check Product Promotions
    const prodPromo = productPromotions.find((p) => p.target.toString() === product._id.toString());
    if (prodPromo) {
      selectedPromotion = prodPromo;
    }

    // 2. Check Menu Promotions
    if (!selectedPromotion && product.menu) {
      const menuId = typeof product.menu === "object" ? product.menu._id?.toString() : product.menu.toString();
      const menuPromo = menuPromotions.find((p) => p.target.toString() === menuId);
      if (menuPromo) {
        selectedPromotion = menuPromo;
      }
    }

    // 3. Check Company Promotions
    if (!selectedPromotion && product.menu) {
      // product.menu could be populated with company
      let companyId = null;
      if (typeof product.menu === "object" && product.menu.company) {
        companyId = typeof product.menu.company === "object" ? product.menu.company._id?.toString() : product.menu.company.toString();
      }
      
      if (companyId) {
        const compPromo = companyPromotions.find((p) => p.target.toString() === companyId);
        if (compPromo) {
          selectedPromotion = compPromo;
        }
      }
    }

    product.originalPrice = product.price;
    product.finalPrice = product.price;

    if (selectedPromotion) {
      product.activePromotion = selectedPromotion;
      product.finalPrice = calculateDiscount(product.price, selectedPromotion);
    }

    return product;
  });

  return isArray ? processedProducts : processedProducts[0];
};
