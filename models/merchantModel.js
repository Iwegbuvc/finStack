const mongoose = require('mongoose');

// Note: For production, ensure you import or define the referenced models if they are in the same file.
// Here we assume 'User' is the correct string name of the Mongoose model for users.

const merchantSchema = new mongoose.Schema({
    // Refined to be clear this is a foreign key to the User model
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Use string reference for robustness
        required: true,
        immutable: true, // A listing should always belong to the same user
        index: true // Indexing foreign keys is crucial for performance
    },
    // Type of ad (BUY: Merchant buys crypto for fiat, SELL: Merchant sells crypto for fiat)
    type: { 
        type: String, 
        enum: ["BUY", "SELL"], 
        required: true, 
        immutable: true,
        index: true // Useful for querying: finding all "BUY" ads
    },
    // Crypto asset (e.g., "BTC", "ETH")
    asset: { 
        type: String, 
        required: true, 
        immutable: true,
        uppercase: true, // Ensure consistency (e.g., BTC, not btc)
        trim: true,
        index: true
    },
    // Fiat currency (e.g., "USD", "NGN")
    fiat: { 
        type: String, 
        required: true, 
        immutable: true,
        uppercase: true,
        trim: true,
        index: true
    },
    // Price is frozen once ad is live (critical for fairness). 
    // For high-precision financial data, consider Decimal128 or storing in the smallest unit (cents/satoshis) 
    // and multiplying/dividing, but a Number is often acceptable for quoted P2P prices.
    price: {
        type: Number, 
        required: true, 
        immutable: true,
        min: 0.01 // Basic validation
    }, 
    minLimit: {
        type: Number, 
        required: true,
        min: 0.01
    },
    maxLimit: {
        type: Number, 
        required: true,
        validate: { // Ensure max is greater than min at the schema level
            validator: function(v) {
                return v >= this.minLimit;
            },
            message: props => `Max limit (${props.value}) must be greater than or equal to the minimum limit.`
        }
    },
    // Array of accepted payment methods (e.g., "Bank Transfer", "PayPal")
    paymentMethods: [ { 
        type: String,
        required: true,
        trim: true,
    }],
    // Ad visibility and operational status
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "CLOSED"], // INACTIVE is temporary pause, CLOSED is permanent
        default: "ACTIVE",
        index: true
    },
    // We remove the manual `createdAt` field and rely solely on `timestamps: true`
    
}, { timestamps: true }) // Mongoose adds createdAt and updatedAt automatically

// Optional: Add a combined index for fast ad lookup by type, asset, and fiat
merchantSchema.index({ type: 1, asset: 1, fiat: 1, status: 1 });

const Merchant = mongoose.model('Merchant', merchantSchema);

module.exports = Merchant;
