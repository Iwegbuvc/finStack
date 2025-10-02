require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const connectDataBase = require('./config/db');
const authRoutes = require("./routes/authRoutes")
const sendMail = require("./utilities/sendMail");



const app = express();

const PORT = process.env.PORT || 8000;

// Database connection
connectDataBase();

// Middlewares
app.use(express.json());
app.use(cookieParser());



// Routes
app.use("/api", authRoutes)
// Test email route
app.get("/test-email", async (req, res) => {
  try {
    await sendMail(
      process.env.EMAIL_ADDRESS, // send to yourself for test
      "Render Test Email",
      "<h1>Hello from Render backend 🎉</h1>"
    );
    res.send("✅ Email sent successfully, check your inbox!");
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).send("❌ Email failed: " + error.message);
  }
});


app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});