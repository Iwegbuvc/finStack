const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  gender: { type: String, required: true },
  dob: { 
    type: Date, 
    required: true, 
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: "Date of birth must be in the past"
    }
  },
  bvn: { type: String, match: /^[0-9]{11}$/, sparse: true },
  phone_number: { 
    type: String, 
    required: true,  
    match: [/^\+?[0-9]{7,15}$/, "Invalid phone number format"]  
  },
  address: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  id_type: { 
    type: String, 
    enum: ["NATIONAL_ID", "PASSPORT"], 
    // required: true 
  },
  id_number: { type: String, 
    // required: true 
  },
  id_expiry: { 
    type: Date, 
    validate: {
      validator: function(value) {
        return !value || value > new Date(); // must be future if provided
      },
      message: "ID expiry date must be in the future"
    }
  },
  nin_number: { type: String },
  selfie: { type: String, required: true },
  proof_address: { type: String, required: true },
  proof_id: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["PENDING", "APPROVED", "REJECTED"], 
    default: "PENDING" 
  },
  rejectionReason: { type: String, default: null },
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
}, { timestamps: true });

// Custom validation to ensure NIN and BVN are provided for Nigerian users
kycSchema.pre("validate", function (next) {
  if(this.country.toLowerCase() === "nigeria") {
    if(!this.nin_number){

        return next(new Error("NIN number is required for users from Nigeria"));
    }
    if(!this.bvn) {
        return next(new Error("BVN is required for users from Nigeria"));
    }
  }
  next();
});

const KYC = new mongoose.model("KYC", kycSchema)

module.exports = KYC;
