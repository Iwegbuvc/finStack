// models/OtpCode.js
const mongoose = require('mongoose');

const OtpCodeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    action: {
        type: String, 
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // Sets a TTL index in MongoDB to automatically delete documents after 10 minutes
        index: { expires: '5m' } 
    }
}, {timestamps: true} );


module.exports = mongoose.model('OtpCode', OtpCodeSchema);