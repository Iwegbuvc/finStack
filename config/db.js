const mongoose = require('mongoose');
require('dotenv').config();

const DB_URL = process.env.MONGODB_URL;


const connectDataBase = async()=>{
    try {
    await mongoose.connect(DB_URL).then(()=>{
        console.log(`Database connected successfully`);
    })
} catch (error) {
    console.error("Error connecting to MongoDB:", error);
}
}


module.exports = connectDataBase;