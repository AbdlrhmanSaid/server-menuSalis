import cron from "node-cron";
import Promotion from "../models/Promotion.js";

export const initPromotionScheduler = (io) => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      
      const promotions = await Promotion.find({ isActive: true });
      let hasChanges = false;

      for (const promo of promotions) {
        let newStatus = promo.status;

        if (now >= promo.startDate && now < promo.endDate) {
          newStatus = "Active";
        } else if (now >= promo.endDate) {
          newStatus = "Expired";
        } else if (now < promo.startDate) {
          newStatus = "Scheduled";
        }

        if (promo.status !== newStatus) {
          promo.status = newStatus;
          await promo.save();
          hasChanges = true;
          
          if (io) {
            io.emit("promotion_updated", await promo.populate("target", "name slug"));
          }
        }
      }

      if (hasChanges) {
        console.log(`✅ Promotion statuses updated by scheduler at ${now.toISOString()}`);
        if (io) {
            io.emit("promotions_status_updated");
        }
      }
      
    } catch (error) {
      console.error("❌ Error in promotion scheduler:", error);
    }
  });

  console.log("⏰ Promotion scheduler initialized (runs every minute)");
};
