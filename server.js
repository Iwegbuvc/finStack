require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const webhookRoutes = require("./routes/webhookRoutes");
const connectDataBase = require('./config/db');
const authRoutes = require("./routes/authRoutes")
const adminRoutes = require("./routes/adminRoutes")
const kycRoutes = require("./routes/kycRoutes")
const walletRoutes = require ("./routes/walletRoutes");
const transactionRoutes = require ("./routes/transactionRoute");
const transferRoutes = require ("./routes/transferRoute");
const p2pRoutes = require ("./routes/p2pRoute");
const merchantRoutes = require ("./routes/merchantRoutes");

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = ["https://finstack-vert.vercel.app", "http://localhost:3000"]

app.use(helmet());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true, 
}));

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Database connection
connectDataBase();

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Routes
app.use("/api", authRoutes)
app.use("/api", adminRoutes)
app.use("/api", kycRoutes)
app.use("/api", walletRoutes)
app.use("/api", transactionRoutes)
app.use("/api", transferRoutes)
app.use("/api", p2pRoutes)
app.use("/api", merchantRoutes)
app.use("/api", webhookRoutes)
// app.use("/", webhookRoutes)

const PORT = process.env.PORT || 8000;
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});

console.log("Prembly API ID:", process.env.PREMBLY_API_ID);
console.log("Prembly API Key:", process.env.PREMBLY_API_KEY ? "✅ Loaded" : "❌ Missing");
