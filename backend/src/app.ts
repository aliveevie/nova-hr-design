import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import recruitmentRoutes from "./routes/recruitment.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import performanceRoutes from "./routes/performance.routes.js";
import trainingRoutes from "./routes/training.routes.js";
import disciplineRoutes from "./routes/discipline.routes.js";
import holidayRoutes from "./routes/holiday.routes.js";
import inviteRoutes from "./routes/invite.routes.js";
import publicRoutes from "./routes/public.routes.js";

const app = express();

// Middleware - Allow multiple origins for development
const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins in development
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/applicants", recruitmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/discipline", disciplineRoutes);
app.use("/api/holidays", holidayRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;

