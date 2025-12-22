const mongoose = require("mongoose");
const axios = require("axios");
const Joi = require("joi");
const Kyc = require("../models/kycModel");
const KycAttempt = require("../models/kycSessionModel");
const KycAuditLog = require("../models/kycAuditLogModel");
const cloudinary = require("cloudinary").v2;
const extractPublicId = require("../utilities/extractPublicId");
const {verifyLiveliness, verifyBVN, verifyNIN } = require("../services/prembly");
const { decrypt } = require('../utilities/encryptionUtils'); 



const SESSION_TTL_MS = parseInt(process.env.KYC_SESSION_TTL_MS || String(5 * 60 * 1000), 10); // 5 minutes
const MAX_IMAGE_MB = parseFloat(process.env.KYC_MAX_IMAGE_MB || "8");


async function fetchImageAsBase64(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  const buf = Buffer.from(res.data, "binary");
  const sizeMB = buf.length / (1024 * 1024);
  if (sizeMB > MAX_IMAGE_MB) throw new Error(`Image too large (${sizeMB.toFixed(2)} MB). Max ${MAX_IMAGE_MB} MB`);
  return buf.toString("base64");
}


// --------------------- Joi Validation ---------------------
const kycSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  gender: Joi.string().valid("MALE", "FEMALE").required(),
  dob: Joi.date().required(),
  phone_number: Joi.string().required(),
  address: Joi.string().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  country: Joi.string().required(),
  // BVN and NIN are optional globally but conditionally required for Nigeria in the controller logic
  bvn: Joi.string().optional(),
  nin_number: Joi.string().optional(),
  // nin_user_id is typically not provided by the user but comes from a previous step or verification
  nin_user_id: Joi.string().optional(),
  id_type: Joi.string().required(),
  id_number: Joi.string().required(),
  id_expiry: Joi.string().optional(),
 // Include these because frontend submits them after the liveliness check
  liveliness_provider_reference: Joi.string().required(),
  liveliness_confidence: Joi.number().required(),
});

// --------------------- Helper: Cloudinary Cleanup ---------------------
async function cleanupFiles(files) {
  if (!files) return;
  const allFiles = [
    files.selfie?.[0]?.path,
    files.proof_address?.[0]?.path,
    files.proof_id_front?.[0]?.path,
    files.proof_id_back?.[0]?.path,
  ].filter(Boolean);

  if (allFiles.length === 0) return;
  for (const file of allFiles) {
    const publicId = extractPublicId(file);
    try {
      // In a real application, you should use the full URL to get the public ID
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      // Log as warning, not error, as cleanup failures shouldn't stop the main process
      console.warn("⚠️ Cleanup failed for file:", publicId, e.message);
    }
  }
}

// --------------------- Helper: Check if string is a raw ID ---------------------
/**
 * Simple check to see if a string consists only of digits, implying it is a raw number 
 * and not encrypted ciphertext (which typically includes non-numeric characters like Base64).
 * @param {string | null | undefined} value 
 * @returns {boolean}
 */
function isNumericId(value) {
  if (!value) return false;
  // Test if the string contains only digits.
  return /^\d+$/.test(value);
}

// --------------------- Controller: Submit KYC (CLEANED) ---------------------
// Create KYC session (one-time token)

async function createKycSession(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const ip = req.ip || req.headers["x-forwarded-for"] || null;
    const userAgent = req.headers["user-agent"] || null;

    const attempt = await KycAttempt.createAttempt(req.user.id, { ip, userAgent, ttlMs: SESSION_TTL_MS });

    return res.status(201).json({
      message: "KYC session created",
      kyc_session_id: attempt.attemptId,
      expiresAt: attempt.expiresAt,
    });
  } catch (err) {
    console.error("createKycSession error:", err);
    return res.status(500).json({ message: "Failed to create KYC session" });
  }
}

// 2) Liveliness check endpoint
// Accepts either: { kyc_session_id, selfie_url } OR { kyc_session_id, image: "data:image/...;base64,..." }
async function livelinessCheck(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const { kyc_session_id } = req.body;
    if (!kyc_session_id) return res.status(400).json({ message: "kyc_session_id required" });

    // 1. Validate session token exists, not used, not expired
    const attempt = await KycAttempt.findOne({ attemptId: kyc_session_id, user_id: req.user.id }).session(session);
    if (!attempt) {
      return res.status(403).json({ message: "Invalid or expired session" });
    }
    if (attempt.used) return res.status(403).json({ message: "Session already used" });
    if (attempt.expiresAt && attempt.expiresAt < new Date()) return res.status(403).json({ message: "Session expired" });

    // 2. Get image: either base64 in body or selfie_url (Cloudinary) in body
    let base64Image;
    const selfieUrl = req.body.selfie_url;
    const imageField = req.body.image; // optional base64 payload or data URL
    if (imageField) {
      // Validate data URL or raw base64
      const data = imageField.startsWith("data:") ? imageField.split(",")[1] : imageField;
      // quick size check
      const sizeMB = Buffer.byteLength(data, "base64") / (1024*1024);
      if (!data || sizeMB > MAX_IMAGE_MB) {
        return res.status(400).json({ message: "Invalid or too-large base64 image" });
      }
      base64Image = data;
    } else if (selfieUrl) {
      base64Image = await fetchImageAsBase64(selfieUrl);
    } else {
      return res.status(400).json({ message: "Selfie image not provided" });
    }

    // 3. Call Prembly liveliness
    // 3. Call Prembly liveliness
let premRes;
try {
  premRes = await verifyLiveliness(base64Image);
} catch (err) {
  // log audit with failure (safe: err.response?.data is plain JSON)
  await KycAuditLog.create({
    user_id: req.user.id,
    type: "LIVELINESS_CHECK",
    status: "FAILED",
    provider: "PREMBLY",
    raw_response: err.response?.data || { message: err.message },
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  });
  throw err;
}

// 4. Interpret premRes
const verified = !!(premRes?.data?.verification?.status === "VERIFIED" && premRes?.data?.status === true);
const confidence = premRes?.data?.data?.confidence_in_percentage ?? premRes?.data?.data?.confidence ?? null;
const providerRef = premRes?.data?.verification?.reference ?? premRes?.data?.verification?.verification_id ?? null;

// 5. Mark attempt used (prevent replay)
attempt.used = true;
await attempt.save({ session });

// 6. Create audit log (store only premRes.data)
await KycAuditLog.create([{
  user_id: req.user.id,
  type: "LIVELINESS_CHECK",
  status: verified ? "VERIFIED" : "FAILED",
  provider: "PREMBLY",
  provider_reference: providerRef,
  confidence,
  raw_response: premRes?.data ?? null,
  ip: req.ip,
  userAgent: req.headers["user-agent"]
}], { session });


    await session.commitTransaction();

    // 7. Return result to frontend (do NOT include raw_response unless needed)
    return res.status(200).json({
      verified,
      confidence,
      provider_reference: providerRef,
      detail: premRes?.detail ?? null
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("livelinessCheck error:", err.response?.data || err.message || err);
    // If prembly timed out
    if (err.code === "ECONNABORTED") return res.status(504).json({ message: "Liveliness provider timeout" });
    return res.status(400).json({ message: err.response?.data?.message || err.message || "Liveliness check failed" });
  } finally {
    session.endSession();
  }
}



const submitKYC = async (req, res) => {
    console.log("FILES RECEIVED:", Object.keys(req.files || {}));
  console.log("FILES FULL:", req.files);
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized: No user context found" });
  }

  const userId = req.user.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate request body
    const { error } = kycSchema.validate(req.body);
    if (error) {
      // Cleanup files immediately if validation fails
      await cleanupFiles(req.files);
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      firstname,
      lastname,
      gender,
      dob,
      bvn,
      nin_number,
      phone_number,
      address,
      state,
      city,
      country,
      id_type,
      id_number,
      id_expiry,
    } = req.body;


    // 2. Prevent duplicate KYC requests (PENDING or APPROVED)
    const existingKYC = await Kyc.findOne({
      user_id: userId,
      status: { $in: ["PENDING", "APPROVED"] },
    }).session(session);
    if (existingKYC) {
      await cleanupFiles(req.files);
      await session.abortTransaction();
      return res.status(400).json({ message: "KYC already submitted or approved" });
    }

     const { liveliness_provider_reference, liveliness_confidence } = req.body;
    if (!liveliness_provider_reference) {
      throw new Error("liveliness_provider_reference required; run livelinessCheck first");
    }
    if (!liveliness_confidence || Number(liveliness_confidence) < 60) {
      // Threshold is configurable. Set sensible minimum.
      throw new Error("Liveliness confidence too low");
    }
    // 3. Nigerian-specific BVN + NIN verification
    let verifiedFirstName = firstname.trim();
    let verifiedLastName = lastname.trim();
    let verifiedDob = dob;

    if (country.toLowerCase() === "nigeria") {
      if (!bvn || !nin_number) {
        // Files are uploaded, but we throw an error because required fields are missing for Nigeria
        throw new Error("BVN and NIN are required for Nigerian users");
      }
      
      // --- START ORIGINAL PREMBLY VERIFICATION ---
      
      // FIX IMPLEMENTED: Only attempt decryption if the string does not look like a raw numeric ID.
      const isBvnNumeric = isNumericId(bvn);
      const isNinNumeric = isNumericId(nin_number);
      
      const decryptedBvn = (bvn && !isBvnNumeric) ? decrypt(bvn) : bvn; 
      const decryptedNin = (nin_number && !isNinNumeric) ? decrypt(nin_number) : nin_number; 

      const bvnResult = await verifyBVN(decryptedBvn);
      const ninResult = await verifyNIN(decryptedNin);

      if (!bvnResult?.status) throw new Error(`BVN verification failed: ${bvnResult?.message || 'Unknown reason'}`);
      if (!ninResult?.status) throw new Error(`NIN verification failed: ${ninResult?.message || 'Unknown reason'}`);

      const bvnData = bvnResult.data;
      const ninData = ninResult.data || ninResult.nin_data;

      // Simple case-insensitive name check
      const bvnFirst = bvnData.firstName?.toLowerCase();
      const bvnLast = bvnData.lastName?.toLowerCase();
      const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
      const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

      if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
        throw new Error("BVN and NIN names do not match. Verification failed.");
      }

      // Use the verified data for the KYC record
      verifiedFirstName = bvnData.firstName || firstname.trim();
      verifiedLastName = bvnData.lastName || lastname.trim();
     
      verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
      // Capture the NIN user ID provided by the verification service
      req.body.nin_user_id = ninData.userId || ninData.nin_user_id || req.body.nin_user_id;
      // --- END ORIGINAL PREMBLY VERIFICATION ---
    }

    // 4. Conditional Proof Uploads
    let selfiePath = req.files?.selfie?.[0]?.path || null;
    let proofAddressPath = null;
    let proofId = { front: null, back: null };

    // Only require/save proof documents if BVN and NIN were NOT provided (for non-Nigerian KYC Tier 2/3)
    if (!(bvn && nin_number && country.toLowerCase() === "nigeria")) {
      proofAddressPath = req.files?.proof_address?.[0]?.path || null;
      proofId = {
        front: req.files?.proof_id_front?.[0]?.path || null,
        back: req.files?.proof_id_back?.[0]?.path || null,
      };

      // Basic check: If files are required, at least the ID front/selfie should exist.
      if (!selfiePath || !proofId.front) {
            throw new Error("KYC proofs (Selfie and ID Front) are required when BVN/NIN are not provided.");
      }

    } else {
      // Clear file paths if they were uploaded but not needed (e.g., user uploaded them anyway)
      // This prevents saving unnecessary paths if the BVN/NIN bypasses the need for them.
      proofAddressPath = null;
      proofId = { front: null, back: null };
      console.log("✅ BVN & NIN provided for Nigeria — proof uploads will be discarded.");
    }


    // 5. Save to DB (Note: BVN and NIN should be encrypted by your KycModel setter)
    const kycData = new Kyc({
      firstname: verifiedFirstName,
      lastname: verifiedLastName,
      gender: gender.toUpperCase(),
      dob: verifiedDob,
      bvn, // Encrypted by Model (This is the original, potentially encrypted, string from req.body)
      nin_number, // Encrypted by Model
      nin_user_id: req.body.nin_user_id, // Potential verified ID, also usually encrypted by Model
      phone_number,
      address,
      state,
      city,
      country,
      id_type: id_type.toUpperCase(),
      id_number,
      id_expiry,
      selfie: selfiePath,
      proof_address: proofAddressPath,
      proof_id: proofId,
      user_id: userId,
      status: "PENDING", // Status is always PENDING initially
      liveliness_confidence: Number(req.body.liveliness_confidence),
      liveliness_reference: req.body.liveliness_provider_reference,
      liveliness_status: req.body.liveliness_status,
      liveliness_raw: null 
    });

    await kycData.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Cleanup files in the background after the transaction commits (only necessary if they were uploaded but then discarded/not used in the DB)
    setImmediate(() => cleanupFiles(req.files));

    return res.status(201).json({
      message: "KYC submitted successfully and is under review",
      data: kycData,
    });
  } catch (error) {
    console.error("❌ KYC submission error:", error.message);
    // Ensure files are cleaned up and transaction is aborted on any failure
    await cleanupFiles(req.files);
    await session.abortTransaction();
    session.endSession();
    // Return a 400 for verification/validation issues, 500 otherwise
    const statusCode = error.message.includes("verification failed") || error.message.includes("required") ? 400 : 500;
    return res.status(statusCode).json({ message: error.message || "Internal server error" });
  }
};

/* -------------------------------------------------------------------------- */
/*                          USER/ADMIN: Get Single KYC Record                 */
/* -------------------------------------------------------------------------- */
const getSingleKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { searchByUserId = "false" } = req.query; // Ensure default is a string for comparison
    let kycRecord;

    if (req.user.role === "admin") {
      if (searchByUserId === "true") {
        kycRecord = await Kyc.findOne({ user_id: id }).populate(
          "user_id",
          "email firstName lastName"
        );
      } else {
        kycRecord = await Kyc.findById(id).populate(
          "user_id",
          "email firstName lastName"
        );
      }
    } else {
      // Non-admin users can only query their own KYC, ignoring the :id parameter
      // Assuming req.user._id is the Mongoose ObjectId
      kycRecord = await Kyc.findOne({ user_id: req.user.id }).populate(
        "user_id",
        "email firstName lastName"
      );
    }

    if (!kycRecord) {
      return res.status(404).json({ message: "KYC record not found" });
    }

    return res.status(200).json({
      message: "KYC record fetched successfully",
      data: kycRecord,
    });
  } catch (error) {
    console.error("❌ Error fetching single KYC record:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
   createKycSession,
  livelinessCheck,
  submitKYC,
  getSingleKyc,
};