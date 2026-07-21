import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";

// 🟢 WebSocket setter من الكنترولر
import { setSocketIO as setProductSocketIO } from "./controllers/productController.js";
import { setSocketIO as setMenuSocketIO } from "./controllers/menuController.js";
import { setSocketIO as setCompanySocketIO } from "./controllers/companyController.js";
import { setSocketIO as setPromotionSocketIO } from "./controllers/promotionController.js";

import { initPromotionScheduler } from "./cron/promotionScheduler.js";

// 📊 Import History model for cleanup
import History from "./models/History.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS;

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.options(/.*/, cors());

app.use(express.json());
app.use(morgan("dev"));
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", async (req, res) => {
  try {
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || "development",
      mongodb_uri_set: !!process.env.MONGODB_URI,
      jwt_secret_set: !!process.env.JWT_SECRET,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ✅ API Endpoints
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/products", productRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/promotions", promotionRoutes);

// WebSocket
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

setProductSocketIO(io);
setMenuSocketIO(io);
setCompanySocketIO(io);
setPromotionSocketIO(io);

initPromotionScheduler(io);

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// 🕐 Setup daily history cleanup at 3:00 AM
cron.schedule(
  "0 3 * * *",
  async () => {
    try {
      console.log("🧹 Starting daily history cleanup...");
      const result = await History.deleteMany({});
      console.log(
        `✅ History cleanup completed. Deleted ${result.deletedCount} records.`,
      );
    } catch (error) {
      console.error("❌ Error during history cleanup:", error);
    }
  },
  {
    timezone: "Africa/Cairo", // Egypt timezone
  },
);

console.log("⏰ Daily history cleanup scheduled for 3:00 AM (Cairo time)");

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌐 WebSocket running on port ${PORT}`);
  console.log(`⏰ History cleanup scheduled daily at 3:00 AM`);
});

export default app;
