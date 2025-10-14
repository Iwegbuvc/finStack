const Kyc = require('../models/kycModel');
const cloudinary = require("cloudinary").v2;
// const { extractPublicId } = require("../utilities/extractPublicId");
const extractPublicId = require("../utilities/extractPublicId");



// Create KYC Record
const submitKYC = async (req, res) => {
    try{
        const {
      firstname,
      lastname,
      gender,
      dob,
      bvn,
      phone_number,
      address,
      state,
      city,
      country,
      id_type,
      id_number,
      id_expiry,
      nin_number,
      user_id,
    } = req.body;

    const selfie = req.files?.selfie?.[0]?.path
    const proof_address = req.files?.proof_address?.[0]?.path
    const proof_id = req.files?.proof_id?.[0]?.path

    // Basic validation
    if (
      !firstname || !lastname || !gender || !dob || !phone_number ||
      !address || !state || !city || !country || !id_type || !id_number ||
      !selfie || !proof_address || !proof_id || !user_id
    ){
        return res.status(400).json({message: "All required fields must be provided"})
    }

    // Check for existing pending or approved KYC
    const existingKYC = await Kyc.findOne({ user_id, status: { $in: ["PENDING", "APPROVED"] } });
    if (existingKYC) {
        return res.status(400).json({ message: "KYC request is already pending or approved" });
    }
    // Create and save KYC record
    const kycData = new Kyc({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      gender: gender.trim().toUpperCase(),
      dob,
      bvn,
      phone_number,
      address,
      state,
      city,
      country,
      id_type: id_type.trim().toUpperCase(),
      id_number,
      id_expiry,
      nin_number,
      selfie,
      proof_address,
      proof_id,
      user_id,
    });
    
    await kycData.save();

    res.status(201).json({ message: "KYC submitted successfully and is under review", kycData });
    }catch(error){
         if (req.files) {
      const allFiles = [
        req.files?.selfie?.[0]?.path,
        req.files?.proof_address?.[0]?.path,
        req.files?.proof_id?.[0]?.path,
      ];
      for (const file of allFiles) {
        if (file) {
          const publicId = extractPublicId(file);
          try { await cloudinary.uploader.destroy(publicId); } catch(e){ /* ignore */ }
        }
      }
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }

}

// Admin: Update KYC Status
const adminUpdateKycStatus = async (req, res) => {
  try {
    const { id, status, rejectionReason } = req.body;

    if (!id || !status) {
      return res.status(400).json({ message: "KYC id and status are required" });
    }

    const newKyc = await Kyc.findById(id);
    if (!newKyc) {
      return res.status(404).json({ message: "KYC record not found" });
    }

    newKyc.status = status.toUpperCase();
    if (status.toUpperCase() === "REJECTED" && rejectionReason) {
      newKyc.rejectionReason = rejectionReason;
    }

    await newKyc.save();

    return res.status(200).json({
      message: `KYC status updated to ${status}`,
      data: newKyc,
    });

  } catch (error) {
    console.error("Update KYC status error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// get all kyc records(for admin dashboard)
const getAllKycRecords = async (req, res) => {
    try{
        const kycRecords = await Kyc.find().populate('user_id', 'email firstName lastName');
        return res.status(200).json({message: "KYC records fetched successfully", data: kycRecords})
    }catch(error){
        console.error("Error fetching KYC records:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};


// // get a single KYC record (by kycId or userId)
// const getSingleKyc = async (req, res) => {
//   try {
//     const { id } = req.params; // could be kycId or userId
//     const { searchByUserId = false } = req.query;

//     let kycRecord;
//     if (searchByUserId === "true") {
//       kycRecord = await KYC.findOne({ user_id: id }).populate("user_id", "email firstName lastName");
//     } else {
//       kycRecord = await KYC.findById(id).populate("user_id", "email firstName lastName");
//     }

//     if (!kycRecord) {
//       return res.status(404).json({ message: "KYC record not found" });
//     }

//     return res.status(200).json({
//       message: "KYC record fetched successfully",
//       data: kycRecord,
//     });
//   } catch (error) {
//     console.error("Error fetching KYC record:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };
// get a single KYC record (by kycId or userId) with role-based access
const getSingleKyc = async (req, res) => {
  try {
    const { id } = req.params; // could be userId or kycId
    const { searchByUserId = false } = req.query;

    let kycRecord;

    if (req.user.role === "ADMIN") {
      // Admin can fetch any record
      if (searchByUserId === "true") {
        kycRecord = await Kyc.findOne({ user_id: id }).populate("user_id", "email firstName lastName");
      } else {
        kycRecord = await Kyc.findById(id).populate("user_id", "email firstName lastName");
      }
    } else {
      // USER: only fetch their own record
      kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate("user_id", "email firstName lastName");
    }

    if (!kycRecord) {
      return res.status(404).json({ message: "KYC record not found" });
    }

    return res.status(200).json({
      message: "KYC record fetched successfully",
      data: kycRecord,
    });
  } catch (error) {
    console.error("Error fetching KYC record:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};



module.exports = { submitKYC, adminUpdateKycStatus, getAllKycRecords, getSingleKyc };