require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const connectDataBase = require('./config/db');
const authRoutes = require("./routes/authRoutes")


const app = express();

const PORT = process.env.PORT || 8000;

// Database connection
connectDataBase();

// Middlewares
app.use(express.json());
app.use(cookieParser());



// Routes
app.use("/api", authRoutes)

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});