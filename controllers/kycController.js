// // // const mongoose = require("mongoose");
// // // const Joi = require("joi");
// // // const Kyc = require("../models/kycModel");
// // // const cloudinary = require("cloudinary").v2;
// // // const extractPublicId = require("../utilities/extractPublicId");
// // // const { verifyBVN, verifyNIN } = require("../services/prembly");

// // // // --------------------- Joi Validation ---------------------
// // // const kycSchema = Joi.object({
// // //   firstname: Joi.string().required(),
// // //   lastname: Joi.string().required(),
// // //   gender: Joi.string().valid("MALE", "FEMALE").required(),
// // //   dob: Joi.date().required(),
// // //   phone_number: Joi.string().required(),
// // //   address: Joi.string().required(),
// // //   state: Joi.string().required(),
// // //   city: Joi.string().required(),
// // //   country: Joi.string().required(),
// // //   bvn: Joi.string().optional(),
// // //   nin_number: Joi.string().optional(),
// // //   id_type: Joi.string().required(),
// // //   id_number: Joi.string().required(),
// // //   id_expiry: Joi.string().optional(),
// // // });

// // // // --------------------- Helper: Cloudinary Cleanup ---------------------
// // // async function cleanupFiles(files) {
// // //   if (!files) return;
// // //   const allFiles = [
// // //     files.selfie?.[0]?.path,
// // //     files.proof_address?.[0]?.path,
// // //     files.proof_id_front?.[0]?.path,
// // //     files.proof_id_back?.[0]?.path,
// // //   ].filter(Boolean);

// // //   if (allFiles.length === 0) return;
// // //   for (const file of allFiles) {
// // //     const publicId = extractPublicId(file);
// // //     try {
// // //       await cloudinary.uploader.destroy(publicId);
// // //     } catch (e) {
// // //       console.warn("⚠️ Cleanup failed:", e.message);
// // //     }
// // //   }
// // // }

// // // // --------------------- Controller: Submit KYC ---------------------
// // // const submitKYC = async (req, res) => {
// // // if (!req.user || !req.user.id) {
// // //   return res.status(401).json({ message: "Unauthorized: No user context found" });
// // // }

// // // const userId = req.user.id; 


// // //   const session = await mongoose.startSession();
// // //   session.startTransaction();

// // //   try {
// // //     // ✅ 1. Validate request body
// // //     const { error } = kycSchema.validate(req.body);
// // //     if (error) {
// // //       await cleanupFiles(req.files);
// // //       return res.status(400).json({ message: error.details[0].message });
// // //     }

// // //     const {
// // //       firstname,
// // //       lastname,
// // //       gender,
// // //       dob,
// // //       bvn,
// // //       nin_number,
// // //       nin_user_id,
// // //       phone_number,
// // //       address,
// // //       state,
// // //       city,
// // //       country,
// // //       id_type,
// // //       id_number,
// // //       id_expiry,
// // //     } = req.body;


// // //     // ✅ 2. Prevent duplicate KYC requests
// // //     const existingKYC = await Kyc.findOne({
// // //       user_id: userId,
// // //       status: { $in: ["PENDING", "APPROVED"] },
// // //     }).session(session);
// // //     if (existingKYC) {
// // //       await cleanupFiles(req.files);
// // //       await session.abortTransaction();
// // //       session.endSession();
// // //       return res.status(400).json({ message: "KYC already submitted or approved" });
// // //     }

// // //     // ✅ 3. Nigerian-specific BVN + NIN verification
// // //     let verifiedFirstName = firstname.trim();
// // //     let verifiedLastName = lastname.trim();
// // //     let verifiedDob = dob;

// // //     if (country.toLowerCase() === "nigeria") {
// // //       if (!bvn || !nin_number) {
// // //         throw new Error("BVN and NIN are required for Nigerian users");
// // //       }

// // //       const bvnResult = await verifyBVN(bvn);
// // //       const ninResult = await verifyNIN(nin_number);

// // //       if (!bvnResult?.status) throw new Error("BVN verification failed");
// // //       if (!ninResult?.status) throw new Error("NIN verification failed");

// // //       const bvnData = bvnResult.data;
// // //       const ninData = ninResult.data || ninResult.nin_data;

// // //       const bvnFirst = bvnData.firstName?.toLowerCase();
// // //       const bvnLast = bvnData.lastName?.toLowerCase();
// // //       const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
// // //       const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

// // //       if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
// // //         throw new Error("BVN and NIN details do not match");
// // //       }

// // //       verifiedFirstName = bvnData.firstName;
// // //       verifiedLastName = bvnData.lastName;
// // //       verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
// // //     }

// // //     // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
// // //     // ------------------ Conditional Proof Uploads ------------------
// // //     let selfiePath = req.files?.selfie?.[0]?.path || null;
// // //     let proofAddressPath = null;
// // //     let proofId = { front: null, back: null };

// // //     // If BVN and NIN are both provided, no need for extra proof documents
// // //     if (!(bvn && nin_number)) {
// // //       proofAddressPath = req.files?.proof_address?.[0]?.path || null;
// // //       proofId = {
// // //         front: req.files?.proof_id_front?.[0]?.path || null,
// // //         back: req.files?.proof_id_back?.[0]?.path || null,
// // //       };
// // //     } else {
// // //       console.log("✅ BVN & NIN provided — skipping proof uploads.");
// // //     }

// // //     // ✅ 5. Save to DB
// // //     const kycData = new Kyc({
// // //       firstname: verifiedFirstName,
// // //       lastname: verifiedLastName,
// // //       gender: gender.toUpperCase(),
// // //       dob: verifiedDob,
// // //       bvn,
// // //       nin_number,
// // //       nin_user_id,
// // //       phone_number,
// // //       address,
// // //       state,
// // //       city,
// // //       country,
// // //       id_type: id_type.toUpperCase(),
// // //       id_number,
// // //       id_expiry,
// // //       selfie: selfiePath,
// // //       proof_address: proofAddressPath,
// // //       proof_id: proofId,
// // //       user_id: userId,
// // //     });

// // //     await kycData.save({ session });
// // //     await session.commitTransaction();
// // //     session.endSession();

// // //     setImmediate(() => cleanupFiles(req.files));

// // //     return res.status(201).json({
// // //       message: "KYC submitted successfully and is under review",
// // //       data: kycData,
// // //     });
// // //   } catch (error) {
// // //     console.error("❌ KYC submission error:", error.message);
// // //     await cleanupFiles(req.files);
// // //     await session.abortTransaction();
// // //     session.endSession();
// // //     return res.status(500).json({ message: error.message || "Internal server error" });
// // //   }
// // // };


// // // // --------------------- Admin Updates KYC ---------------------
// // // const adminUpdateKycStatus = async (req, res) => {
// // //     // 🔒 Assumed: Admin role check is done before this function runs or at the start
// // //     if (!req.user || req.user.role !== "admin")
// // //         return res.status(403).json({ message: "Forbidden: admin only" });

// // //     const session = await mongoose.startSession();
// // //     session.startTransaction();

// // //     try {
// // //         const { id, status, rejectionReason } = req.body;
// // //         if (!id || !status) throw new Error("KYC ID and status are required");

// // //         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
// // //         if (!newKyc) throw new Error("KYC record not found");

// // //         newKyc.status = status.toUpperCase();
// // //         if (status.toUpperCase() === "REJECTED" && rejectionReason)
// // //             newKyc.rejectionReason = rejectionReason;

// // //         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
// // //         await newKyc.save({ session });

// // //         // ======================= WALLET CREATION LOGIC =======================
// // //         if (status.toUpperCase() === "APPROVED") {

// // //             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
// // //             if (newKyc.country.toLowerCase() === "nigeria") {
// // //                 // If any of the following lines fail, the error will automatically
// // //                 // propagate to the main 'catch' block, aborting the transaction.

// // //                 const kycData = await Kyc.getVerifiedDataFor9PSB(newKyc.user_id._id);

// // //                 // Format DOB (dd/MM/yyyy)
// // //                 const dob = new Date(kycData.dateOfBirth);
// // //                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

// // //                 const payload = {
// // //                     transactionTrackingRef: `TX-${Date.now()}`,
// // //                     lastName: kycData.lastname,
// // //                     otherNames: kycData.firstname,
// // //                     accountName: `${kycData.firstname} ${kycData.lastname}`,
// // //                     phoneNo: kycData.phoneNo,
// // //                     gender: kycData.gender,
// // //                     dateOfBirth: formattedDOB,
// // //                     address: kycData.address,
// // //                     email: kycData.email,
// // //                     nationalIdentityNo: kycData.nin || null,
// // //                     ninUserId: kycData.nin ? kycData.ninUserId || "NINUSR-" + Date.now() : null,
// // //                     bvn: kycData.bvn || null,
// // //                 };

// // //                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

// // //                 const wallet = new Wallet({
// // //                     user_id: newKyc.user_id._id,
// // //                     currency: "NGN",
// // //                     account_number: walletData.data.account_number,
// // //                     account_name: walletData.data.account_name,
// // //                     provider: "9PSB",
// // //                     status: "ACTIVE",
// // //                 });

// // //                 await wallet.save({ session }); // Save NGN wallet within the transaction
// // //             }

// // //             // 3. 🌐 CREATE SECONDARY USD (BLOCKRADAR) WALLET (FOR ALL USERS)
// // //             // This is wrapped in a try/catch. Failure logs a warning but allows the NGN 
// // //             // transaction (if any) to commit, as USD is secondary.
// // //             // 🚨 CRITICAL NOTE: If the user is NON-NIGERIAN, this is the ONLY wallet.
// // //             // You may want to THROW an error if country !== 'nigeria' and this fails.
// // //             try {
// // //                 await createBlockradarWallet({ 
// // //                     userId: newKyc.user_id._id,
// // //                     email: newKyc.user_id.email,
// // //                     name: `${newKyc.firstname} ${newKyc.lastname}`,
// // //                     currency: "USD",
// // //                 });
// // //                 console.log(`✅ Blockradar wallet successfully created for ${newKyc.user_id.email}`);
// // //             } catch (err) {
// // //                 const errorMessage = `⚠️ Failed to create Blockradar wallet for ${newKyc.user_id.email}. ${err.message}`;
                
// // //                 if (newKyc.country.toLowerCase() === "nigeria") {
// // //                      // For Nigerians, NGN account is primary, so we just warn.
// // //                     console.warn(errorMessage); 
// // //                 } else {
// // //                      // For non-Nigerians, this is the primary wallet. Failure is critical.
// // //                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
// // //                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
// // //                 }
// // //             }
// // //         }
// // //         // =====================================================================

// // //         // Commit all changes (KYC status + Wallet saves) if successful
// // //         await session.commitTransaction(); 
// // //         session.endSession();
// // //         return res.status(200).json({ message: `KYC status updated to ${status}` });

// // //     } catch (error) {
// // //         // 🛑 Centralized rollback if any step (DB save or API call) failed
// // //         console.error("❌ Update KYC error:", error.message);
// // //         await session.abortTransaction();
// // //         session.endSession();
// // //         // Return the specific error message to the admin
// // //         return res.status(500).json({ message: error.message });
// // //     }
// // // };
// // // /* -------------------------------------------------------------------------- */
// // // /*                            ADMIN: Get All KYC Records                      */
// // // /* -------------------------------------------------------------------------- */
// // // const getAllKycRecords = async (req, res) => {
// // //   try {
// // //     const kycRecords = await Kyc.find().populate(
// // //       "user_id",
// // //       "email firstName lastName"
// // //     );
// // //     return res.status(200).json({
// // //       message: "KYC records fetched successfully",
// // //       data: kycRecords,
// // //     });
// // //   } catch (error) {
// // //     console.error("❌ Error fetching KYC records:", error);
// // //     return res.status(500).json({
// // //       message: "Internal server error",
// // //       error: error.message,
// // //     });
// // //   }
// // // };

// // // /* -------------------------------------------------------------------------- */
// // // /*                          USER/ADMIN: Get Single KYC Record                 */
// // // /* -------------------------------------------------------------------------- */
// // // const getSingleKyc = async (req, res) => {
// // //   try {
// // //     const { id } = req.params;
// // //     const { searchByUserId = false } = req.query;
// // //     let kycRecord;

// // //     if (req.user.role === "admin") {
// // //       if (searchByUserId === "true") {
// // //         kycRecord = await Kyc.findOne({ user_id: id }).populate(
// // //           "user_id",
// // //           "email firstName lastName"
// // //         );
// // //       } else {
// // //         kycRecord = await Kyc.findById(id).populate(
// // //           "user_id",
// // //           "email firstName lastName"
// // //         );
// // //       }
// // //     } else {
// // //       kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
// // //         "user_id",
// // //         "email firstName lastName"
// // //       );
// // //     }

// // //     if (!kycRecord) {
// // //       return res.status(404).json({ message: "KYC record not found" });
// // //     }

// // //     return res.status(200).json({
// // //       message: "KYC record fetched successfully",
// // //       data: kycRecord,
// // //     });
// // //   } catch (error) {
// // //     console.error("❌ Error fetching single KYC record:", error);
// // //     return res.status(500).json({
// // //       message: "Internal server error",
// // //       error: error.message,
// // //     });
// // //   }
// // // };

// // // /* -------------------------------------------------------------------------- */
// // // /*                                   EXPORTS                                  */
// // // /* -------------------------------------------------------------------------- */
// // // module.exports = {
// // //   submitKYC,
// // //   adminUpdateKycStatus,
// // //   getAllKycRecords,
// // //   getSingleKyc,
// // // };
// // const mongoose = require("mongoose");
// // const Joi = require("joi");
// // const Kyc = require("../models/kycModel");
// // // NOTE: Assuming Wallet model, createNairaWallet, and createBlockradarWallet are imported from elsewhere
// // const Wallet = require("../models/walletModel"); 
// // const { createNairaWallet } = require("../services/providers/ninePSBServices");
// // const { createBlockradarWallet } = require("../services/providers/blockrader");

// // const cloudinary = require("cloudinary").v2;
// // const extractPublicId = require("../utilities/extractPublicId");
// // const { verifyBVN, verifyNIN } = require("../services/prembly");

// // // --------------------- Joi Validation ---------------------
// // const kycSchema = Joi.object({
// //   firstname: Joi.string().required(),
// //   lastname: Joi.string().required(),
// //   gender: Joi.string().valid("MALE", "FEMALE").required(),
// //   dob: Joi.date().required(),
// //   phone_number: Joi.string().required(),
// //   address: Joi.string().required(),
// //   state: Joi.string().required(),
// //   city: Joi.string().required(),
// //   country: Joi.string().required(),
// //   bvn: Joi.string().optional(),
// //   nin_number: Joi.string().optional(),
// //   id_type: Joi.string().required(),
// //   id_number: Joi.string().required(),
// //   id_expiry: Joi.string().optional(),
// // });

// // // --------------------- Helper: Cloudinary Cleanup ---------------------
// // async function cleanupFiles(files) {
// //   if (!files) return;
// //   const allFiles = [
// //     files.selfie?.[0]?.path,
// //     files.proof_address?.[0]?.path,
// //     files.proof_id_front?.[0]?.path,
// //     files.proof_id_back?.[0]?.path,
// //   ].filter(Boolean);

// //   if (allFiles.length === 0) return;
// //   for (const file of allFiles) {
// //     const publicId = extractPublicId(file);
// //     try {
// //       await cloudinary.uploader.destroy(publicId);
// //     } catch (e) {
// //       console.warn("⚠️ Cleanup failed:", e.message);
// //     }
// //   }
// // }

// // // --------------------- Controller: Submit KYC ---------------------
// // const submitKYC = async (req, res) => {
// // if (!req.user || !req.user.id) {
// //   return res.status(401).json({ message: "Unauthorized: No user context found" });
// // }

// // const userId = req.user.id; 


// //   const session = await mongoose.startSession();
// //   session.startTransaction();

// //   try {
// //     // ✅ 1. Validate request body
// //     const { error } = kycSchema.validate(req.body);
// //     if (error) {
// //       await cleanupFiles(req.files);
// //       return res.status(400).json({ message: error.details[0].message });
// //     }

// //     const {
// //       firstname,
// //       lastname,
// //       gender,
// //       dob,
// //       bvn,
// //       nin_number,
// //       nin_user_id,
// //       phone_number,
// //       address,
// //       state,
// //       city,
// //       country,
// //       id_type,
// //       id_number,
// //       id_expiry,
// //     } = req.body;


// //     // ✅ 2. Prevent duplicate KYC requests
// //     const existingKYC = await Kyc.findOne({
// //       user_id: userId,
// //       status: { $in: ["PENDING", "APPROVED"] },
// //     }).session(session);
// //     if (existingKYC) {
// //       await cleanupFiles(req.files);
// //       await session.abortTransaction();
// //       session.endSession();
// //       return res.status(400).json({ message: "KYC already submitted or approved" });
// //     }

// //     // ✅ 3. Nigerian-specific BVN + NIN verification
// //     let verifiedFirstName = firstname.trim();
// //     let verifiedLastName = lastname.trim();
// //     let verifiedDob = dob;

// //     if (country.toLowerCase() === "nigeria") {
// //       if (!bvn || !nin_number) {
// //         throw new Error("BVN and NIN are required for Nigerian users");
// //       }

// //       const bvnResult = await verifyBVN(bvn);
// //       const ninResult = await verifyNIN(nin_number);

// //       if (!bvnResult?.status) throw new Error("BVN verification failed");
// //       if (!ninResult?.status) throw new Error("NIN verification failed");

// //       const bvnData = bvnResult.data;
// //       const ninData = ninResult.data || ninResult.nin_data;

// //       const bvnFirst = bvnData.firstName?.toLowerCase();
// //       const bvnLast = bvnData.lastName?.toLowerCase();
// //       const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
// //       const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

// //       if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
// //         throw new Error("BVN and NIN details do not match");
// //       }

// //       verifiedFirstName = bvnData.firstName;
// //       verifiedLastName = bvnData.lastName;
// //       verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
// //     }

// //     // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
// //     // ------------------ Conditional Proof Uploads ------------------
// //     let selfiePath = req.files?.selfie?.[0]?.path || null;
// //     let proofAddressPath = null;
// //     let proofId = { front: null, back: null };

// //     // If BVN and NIN are both provided, no need for extra proof documents
// //     if (!(bvn && nin_number)) {
// //       proofAddressPath = req.files?.proof_address?.[0]?.path || null;
// //       proofId = {
// //         front: req.files?.proof_id_front?.[0]?.path || null,
// //         back: req.files?.proof_id_back?.[0]?.path || null,
// //       };
// //     } else {
// //       console.log("✅ BVN & NIN provided — skipping proof uploads.");
// //     }

// //     // ✅ 5. Save to DB
// //     const kycData = new Kyc({
// //       firstname: verifiedFirstName,
// //       lastname: verifiedLastName,
// //       gender: gender.toUpperCase(),
// //       dob: verifiedDob,
// //       bvn,
// //       nin_number,
// //       nin_user_id,
// //       phone_number,
// //       address,
// //       state,
// //       city,
// //       country,
// //       id_type: id_type.toUpperCase(),
// //       id_number,
// //       id_expiry,
// //       selfie: selfiePath,
// //       proof_address: proofAddressPath,
// //       proof_id: proofId,
// //       user_id: userId,
// //     });

// //     await kycData.save({ session });
// //     await session.commitTransaction();
// //     session.endSession();

// //     setImmediate(() => cleanupFiles(req.files));

// //     return res.status(201).json({
// //       message: "KYC submitted successfully and is under review",
// //       data: kycData,
// //     });
// //   } catch (error) {
// //     console.error("❌ KYC submission error:", error.message);
// //     await cleanupFiles(req.files);
// //     await session.abortTransaction();
// //     session.endSession();
// //     return res.status(500).json({ message: error.message || "Internal server error" });
// //   }
// // };


// // // --------------------- Admin Updates KYC ---------------------
// // // const adminUpdateKycStatus = async (req, res) => {
// // //     // 🔒 Assumed: Admin role check is done before this function runs or at the start
// // //     if (!req.user || req.user.role !== "admin")
// // //         return res.status(403).json({ message: "Forbidden: admin only" });

// // //     const session = await mongoose.startSession();
// // //     session.startTransaction();

// // //     try {
// // //         const { id, status, rejectionReason } = req.body;
// // //         if (!id || !status) throw new Error("KYC ID and status are required");

// // //         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
// // //         if (!newKyc) throw new Error("KYC record not found");

// // //         newKyc.status = status.toUpperCase();
// // //         if (status.toUpperCase() === "REJECTED" && rejectionReason)
// // //             newKyc.rejectionReason = rejectionReason;

// // //         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
// // //         await newKyc.save({ session });

// // //         // ======================= WALLET CREATION LOGIC =======================
// // //         if (status.toUpperCase() === "APPROVED") {

// // //             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
// // //             // if (newKyc.country.toLowerCase() === "nigeria") {
// // //             //     // If any of the following lines fail, the error will automatically
// // //             //     // propagate to the main 'catch' block, aborting the transaction.

// // //             //     const kycData = await Kyc.getVerifiedDataFor9PSB(newKyc.user_id._id);

// // //             //     // Format DOB (dd/MM/yyyy)
// // //             if (status.toUpperCase() === "APPROVED") {

// // //             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
// // //             if (newKyc.country.toLowerCase() === "nigeria") {
// // //                 // If any of the following lines fail, the error will automatically
// // //                 // propagate to the main 'catch' block, aborting the transaction.

// // //                 // 🚨 FIX: Pass the 'session' object here 
// // //                 const kycData = await Kyc.getVerifiedDataFor9PSB(newKyc.user_id._id, session);

// // //                 // Format DOB (dd/MM/yyyy)
// // //                 const dob = new Date(kycData.dateOfBirth);
// // //                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

// // //                 const payload = {
// // //                     transactionTrackingRef: `TX-${Date.now()}`,
// // //                     lastName: kycData.lastname,
// // //                     otherNames: kycData.firstname,
// // //                     accountName: `${kycData.firstname} ${kycData.lastname}`,
// // //                     phoneNo: kycData.phoneNo,
// // //                     gender: kycData.gender,
// // //                     dateOfBirth: formattedDOB,
// // //                     address: kycData.address,
// // //                     email: kycData.email,
// // //                     nationalIdentityNo: kycData.nin || null,
// // //                     ninUserId: kycData.nin ? kycData.ninUserId || "NINUSR-" + Date.now() : null,
// // //                     bvn: kycData.bvn || null,
// // //                 };

// // //                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

// // //                 const wallet = new Wallet({
// // //                     user_id: newKyc.user_id._id,
// // //                     currency: "NGN",
// // //                     // ⭐️ FIXED: Using accountNumber and fullName from the API response
// // //                     account_number: walletData.data.accountNumber,
// // //                     account_name: walletData.data.fullName,
// // //                     provider: "9PSB",
// // //                     status: "ACTIVE",
// // //                 });

// // //                 await wallet.save({ session }); // Save NGN wallet within the transaction
// // //             }

// // //             // 3. 🌐 CREATE SECONDARY USD (BLOCKRADAR) WALLET (FOR ALL USERS)
// // //             // This is wrapped in a try/catch. Failure logs a warning but allows the NGN 
// // //             // transaction (if any) to commit, as USD is secondary.
// // //             // 🚨 CRITICAL NOTE: If the user is NON-NIGERIAN, this is the ONLY wallet.
// // //             // You may want to THROW an error if country !== 'nigeria' and this fails.
// // //             try {
// // //                 await createBlockradarWallet({ 
// // //                     userId: newKyc.user_id._id,
// // //                     email: newKyc.user_id.email,
// // //                     name: `${newKyc.firstname} ${newKyc.lastname}`,
// // //                     currency: "USD",
// // //                 });
// // //                 console.log(`✅ Blockradar wallet successfully created for ${newKyc.user_id.email}`);
// // //             } catch (err) {
// // //                 const errorMessage = `⚠️ Failed to create Blockradar wallet for ${newKyc.user_id.email}. ${err.message}`;
                
// // //                 if (newKyc.country.toLowerCase() === "nigeria") {
// // //                      // For Nigerians, NGN account is primary, so we just warn.
// // //                     console.warn(errorMessage); 
// // //                 } else {
// // //                      // For non-Nigerians, this is the primary wallet. Failure is critical.
// // //                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
// // //                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
// // //                 }
// // //             }
// // //         }
// // //         // =====================================================================

// // //         // Commit all changes (KYC status + Wallet saves) if successful
// // //         await session.commitTransaction(); 
// // //         session.endSession();
// // //         return res.status(200).json({ message: `KYC status updated to ${status}` });

// // //     } catch (error) {
// // //         // 🛑 Centralized rollback if any step (DB save or API call) failed
// // //         console.error("❌ Update KYC error:", error.message);
// // //         await session.abortTransaction();
// // //         session.endSession();
// // //         // Return the specific error message to the admin
// // //         return res.status(500).json({ message: error.message });
// // //     }
// // // };
// // // NEWUPDATE FOR ADMIN
// // // --------------------- Admin Updates KYC ---------------------
// // const adminUpdateKycStatus = async (req, res) => {
// //     // 🔒 Assumed: Admin role check is done before this function runs or at the start
// //     if (!req.user || req.user.role !== "admin")
// //         return res.status(403).json({ message: "Forbidden: admin only" });

// //     const session = await mongoose.startSession();
// //     session.startTransaction();

// //     try {
// //         const { id, status, rejectionReason } = req.body;
// //         if (!id || !status) throw new Error("KYC ID and status are required");

// //         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
// //         if (!newKyc) throw new Error("KYC record not found");

// //         newKyc.status = status.toUpperCase();
// //         if (status.toUpperCase() === "REJECTED" && rejectionReason)
// //             newKyc.rejectionReason = rejectionReason;

// //         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
// //         await newKyc.save({ session });

// //         // ======================= WALLET CREATION LOGIC =======================
// //         if (status.toUpperCase() === "APPROVED") {

// //             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
// //             if (newKyc.country.toLowerCase() === "nigeria") {
// //                 // If any of the following lines fail, the error will automatically
// //                 // propagate to the main 'catch' block, aborting the transaction.

// //                 // 🚨 FIX: Ensure the correct 'session' is passed here
// //                 const kycData = await Kyc.getVerifiedDataFor9PSB(newKyc.user_id._id, session);

// //                 // Format DOB (dd/MM/yyyy)
// //                 const dob = new Date(kycData.dateOfBirth);
// //                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

// //                 const payload = {
// //                     transactionTrackingRef: `TX-${Date.now()}`,
// //                     lastName: kycData.lastname,
// //                     otherNames: kycData.firstname,
// //                     accountName: `${kycData.firstname} ${kycData.lastname}`,
// //                     phoneNo: kycData.phoneNo,
// //                     gender: kycData.gender,
// //                     dateOfBirth: formattedDOB,
// //                     address: kycData.address,
// //                     email: kycData.email,
// //                     nationalIdentityNo: kycData.nin || null,
// //                     ninUserId: kycData.nin ? kycData.ninUserId || "NINUSR-" + Date.now() : null,
// //                     bvn: kycData.bvn || null,
// //                 };

// //                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

// //                 const wallet = new Wallet({
// //                     user_id: newKyc.user_id._id,
// //                     currency: "NGN",
// //                     // ⭐️ FIXED: Using accountNumber and fullName from the API response
// //                     account_number: walletData.data.accountNumber,
// //                     account_name: walletData.data.fullName,
// //                     provider: "9PSB",
// //                     status: "ACTIVE",
// //                 });

// //                 await wallet.save({ session }); // Save NGN wallet within the transaction
// //             }

// //             // 3. 🌐 CREATE SECONDARY USD (BLOCKRADAR) WALLET (FOR ALL USERS)
// //             // This is wrapped in a try/catch. Failure logs a warning but allows the NGN 
// //             // transaction (if any) to commit, as USD is secondary.
// //             // 🚨 CRITICAL NOTE: If the user is NON-NIGERIAN, this is the ONLY wallet.
// //             // You may want to THROW an error if country !== 'nigeria' and this fails.
// //             try {
// //                 await createBlockradarWallet({ 
// //                     userId: newKyc.user_id._id,
// //                     email: newKyc.user_id.email,
// //                     name: `${newKyc.firstname} ${newKyc.lastname}`,
// //                     currency: "USD",
// //                 });
// //                 console.log(`✅ Blockradar wallet successfully created for ${newKyc.user_id.email}`);
// //             } catch (err) {
// //                 const errorMessage = `⚠️ Failed to create Blockradar wallet for ${newKyc.user_id.email}. ${err.message}`;
                
// //                 if (newKyc.country.toLowerCase() === "nigeria") {
// //                     // For Nigerians, NGN account is primary, so we just warn.
// //                     console.warn(errorMessage); 
// //                 } else {
// //                     // For non-Nigerians, this is the primary wallet. Failure is critical.
// //                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
// //                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
// //                 }
// //             }
// //         }
// //         // =====================================================================

// //         // Commit all changes (KYC status + Wallet saves) if successful
// //         await session.commitTransaction(); 
// //         session.endSession();
// //         return res.status(200).json({ message: `KYC status updated to ${status}` });

// //     } catch (error) { // <-- THIS is line 681 (the original error point)
// //         // 🛑 Centralized rollback if any step (DB save or API call) failed
// //         console.error("❌ Update KYC error:", error.message);
// //         await session.abortTransaction();
// //         session.endSession();
// //         // Return the specific error message to the admin
// //         return res.status(500).json({ message: error.message });
// //     }
// // };
// // /* -------------------------------------------------------------------------- */
// // /*                            ADMIN: Get All KYC Records                      */
// // /* -------------------------------------------------------------------------- */
// // const getAllKycRecords = async (req, res) => {
// //   try {
// //     const kycRecords = await Kyc.find().populate(
// //       "user_id",
// //       "email firstName lastName"
// //     );
// //     return res.status(200).json({
// //       message: "KYC records fetched successfully",
// //       data: kycRecords,
// //     });
// //   } catch (error) {
// //     console.error("❌ Error fetching KYC records:", error);
// //     return res.status(500).json({
// //       message: "Internal server error",
// //       error: error.message,
// //     });
// //   }
// // };

// // /* -------------------------------------------------------------------------- */
// // /*                          USER/ADMIN: Get Single KYC Record                 */
// // /* -------------------------------------------------------------------------- */
// // const getSingleKyc = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { searchByUserId = false } = req.query;
// //     let kycRecord;

// //     if (req.user.role === "admin") {
// //       if (searchByUserId === "true") {
// //         kycRecord = await Kyc.findOne({ user_id: id }).populate(
// //           "user_id",
// //           "email firstName lastName"
// //         );
// //       } else {
// //         kycRecord = await Kyc.findById(id).populate(
// //           "user_id",
// //           "email firstName lastName"
// //         );
// //       }
// //     } else {
// //       kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
// //         "user_id",
// //         "email firstName lastName"
// //       );
// //     }

// //     if (!kycRecord) {
// //       return res.status(404).json({ message: "KYC record not found" });
// //     }

// //     return res.status(200).json({
// //       message: "KYC record fetched successfully",
// //       data: kycRecord,
// //     });
// //   } catch (error) {
// //     console.error("❌ Error fetching single KYC record:", error);
// //     return res.status(500).json({
// //       message: "Internal server error",
// //       error: error.message,
// //     });
// //   }
// // };

// // /* -------------------------------------------------------------------------- */
// // /*                                   EXPORTS                                  */
// // /* -------------------------------------------------------------------------- */
// // module.exports = {
// //   submitKYC,
// //   adminUpdateKycStatus,
// //   getAllKycRecords,
// //   getSingleKyc,
// // };

// // NEWUPDATE
// const mongoose = require("mongoose");
// const Joi = require("joi");
// const Kyc = require("../models/kycModel");
// // NOTE: Assuming Wallet model, createNairaWallet, and createBlockradarWallet are imported from elsewhere
// const Wallet = require("../models/walletModel"); 
// const { createNairaWallet } = require("../services/providers/ninePSBServices");
// const { createBlockradarWallet } = require("../services/providers/blockrader");

// const cloudinary = require("cloudinary").v2;
// const extractPublicId = require("../utilities/extractPublicId");
// const { verifyBVN, verifyNIN } = require("../services/prembly");

// // --------------------- Joi Validation ---------------------
// const kycSchema = Joi.object({
//   firstname: Joi.string().required(),
//   lastname: Joi.string().required(),
//   gender: Joi.string().valid("MALE", "FEMALE").required(),
//   dob: Joi.date().required(),
//   phone_number: Joi.string().required(),
//   address: Joi.string().required(),
//   state: Joi.string().required(),
//   city: Joi.string().required(),
//   country: Joi.string().required(),
//   bvn: Joi.string().optional(),
//   nin_number: Joi.string().optional(),
//   id_type: Joi.string().required(),
//   id_number: Joi.string().required(),
//   id_expiry: Joi.string().optional(),
// });

// // --------------------- Helper: Cloudinary Cleanup ---------------------
// async function cleanupFiles(files) {
//   if (!files) return;
//   const allFiles = [
//     files.selfie?.[0]?.path,
//     files.proof_address?.[0]?.path,
//     files.proof_id_front?.[0]?.path,
//     files.proof_id_back?.[0]?.path,
//   ].filter(Boolean);

//   if (allFiles.length === 0) return;
//   for (const file of allFiles) {
//     const publicId = extractPublicId(file);
//     try {
//       await cloudinary.uploader.destroy(publicId);
//     } catch (e) {
//       console.warn("⚠️ Cleanup failed:", e.message);
//     }
//   }
// }

// // --------------------- Controller: Submit KYC ---------------------
// const submitKYC = async (req, res) => {
// if (!req.user || !req.user.id) {
//   return res.status(401).json({ message: "Unauthorized: No user context found" });
// }

// const userId = req.user.id; 


//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ 1. Validate request body
//     const { error } = kycSchema.validate(req.body);
//     if (error) {
//       await cleanupFiles(req.files);
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     const {
//       firstname,
//       lastname,
//       gender,
//       dob,
//       bvn,
//       nin_number,
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type,
//       id_number,
//       id_expiry,
//     } = req.body;


//     // ✅ 2. Prevent duplicate KYC requests
//     const existingKYC = await Kyc.findOne({
//       user_id: userId,
//       status: { $in: ["PENDING", "APPROVED"] },
//     }).session(session);
//     if (existingKYC) {
//       await cleanupFiles(req.files);
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "KYC already submitted or approved" });
//     }

//     // ✅ 3. Nigerian-specific BVN + NIN verification
//     let verifiedFirstName = firstname.trim();
//     let verifiedLastName = lastname.trim();
//     let verifiedDob = dob;

//     if (country.toLowerCase() === "nigeria") {
//       if (!bvn || !nin_number) {
//         throw new Error("BVN and NIN are required for Nigerian users");
//       }

//       const bvnResult = await verifyBVN(bvn);
//       const ninResult = await verifyNIN(nin_number);

//       if (!bvnResult?.status) throw new Error("BVN verification failed");
//       if (!ninResult?.status) throw new Error("NIN verification failed");

//       const bvnData = bvnResult.data;
//       const ninData = ninResult.data || ninResult.nin_data;

//       const bvnFirst = bvnData.firstName?.toLowerCase();
//       const bvnLast = bvnData.lastName?.toLowerCase();
//       const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
//       const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

//       if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
//         throw new Error("BVN and NIN details do not match");
//       }

//       verifiedFirstName = bvnData.firstName;
//       verifiedLastName = bvnData.lastName;
//       verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
//     }

//     // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
//     // ------------------ Conditional Proof Uploads ------------------
//     let selfiePath = req.files?.selfie?.[0]?.path || null;
//     let proofAddressPath = null;
//     let proofId = { front: null, back: null };

//     // If BVN and NIN are both provided, no need for extra proof documents
//     if (!(bvn && nin_number)) {
//       proofAddressPath = req.files?.proof_address?.[0]?.path || null;
//       proofId = {
//         front: req.files?.proof_id_front?.[0]?.path || null,
//         back: req.files?.proof_id_back?.[0]?.path || null,
//       };
//     } else {
//       console.log("✅ BVN & NIN provided — skipping proof uploads.");
//     }

//     // ✅ 5. Save to DB
//     const kycData = new Kyc({
//       firstname: verifiedFirstName,
//       lastname: verifiedLastName,
//       gender: gender.toUpperCase(),
//       dob: verifiedDob,
//       bvn,
//       nin_number,
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type: id_type.toUpperCase(),
//       id_number,
//       id_expiry,
//       selfie: selfiePath,
//       proof_address: proofAddressPath,
//       proof_id: proofId,
//       user_id: userId,
//     });

//     await kycData.save({ session });
//     await session.commitTransaction();
//     session.endSession();

//     setImmediate(() => cleanupFiles(req.files));

//     return res.status(201).json({
//       message: "KYC submitted successfully and is under review",
//       data: kycData,
//     });
//   } catch (error) {
//     console.error("❌ KYC submission error:", error.message);
//     await cleanupFiles(req.files);
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ message: error.message || "Internal server error" });
//   }
// };

// // --------------------- Helper: Generate Compliant NIN User ID ---------------------
// /**
//  * Generates a random NIN User ID compliant with 9PSB format: 6 letters followed by a hyphen and 4 digits (e.g., 'ABCDEF-0123').
//  * @returns {string} The formatted NIN User ID.
//  */
// const generateNinUserIdFallback = () => {
//     // Generates a random 6-letter string (e.g., 'AJKLSN')
//     const randomLetters = Array.from({ length: 6 }, () => 
//         String.fromCharCode(65 + Math.floor(Math.random() * 26)) // 65 is 'A'
//     ).join('');
    
//     // Generates a random 4-digit string (e.g., '5842')
//     const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); 
    
//     return `${randomLetters}-${randomDigits}`;
// };

// // --------------------- Admin Updates KYC ---------------------
// const adminUpdateKycStatus = async (req, res) => {
//     // 🔒 Assumed: Admin role check is done before this function runs or at the start
//     if (!req.user || req.user.role !== "admin")
//         return res.status(403).json({ message: "Forbidden: admin only" });

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { id, status, rejectionReason } = req.body;
//         if (!id || !status) throw new Error("KYC ID and status are required");

//         // Populate user details along with KYC data
//         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
//         if (!newKyc) throw new Error("KYC record not found");

//         newKyc.status = status.toUpperCase();
//         if (status.toUpperCase() === "REJECTED" && rejectionReason)
//             newKyc.rejectionReason = rejectionReason;

//         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
//         await newKyc.save({ session });

//         // ======================= WALLET CREATION LOGIC =======================
//         if (status.toUpperCase() === "APPROVED") {

//             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
//             if (newKyc.country.toLowerCase() === "nigeria") {
//                 // If any of the following lines fail, the error will automatically
//                 // propagate to the main 'catch' block, aborting the transaction.

//                 // Format DOB (dd/MM/yyyy)
//                 const dob = new Date(newKyc.dob);
//                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

//                 // Map gender string to required integer code (0=Male, 1=Female)
//                 const genderCode = newKyc.gender === 'MALE' ? 0 : (newKyc.gender === 'FEMALE' ? 1 : null);
                
//                 // If gender is missing or invalid, throw an error to prevent API failure
//                 if (genderCode === null) {
//                     throw new Error(`Invalid or missing gender in KYC record: ${newKyc.gender}`);
//                 }

//                 const payload = {
//                     transactionTrackingRef: `TX-${Date.now()}`,
//                     lastName: newKyc.lastname,
//                     otherNames: newKyc.firstname,
//                     accountName: `${newKyc.firstname} ${newKyc.lastname}`,
//                     phoneNo: newKyc.phone_number,
//                     gender: genderCode, // ✅ FIXED: Uses integer (0 or 1)
//                     dateOfBirth: formattedDOB,
//                     address: newKyc.address,
//                     email: newKyc.user_id.email,
//                     nationalIdentityNo: newKyc.nin_number || null,
//                     // ✅ FIXED: Use saved ID or generate compliant fallback
//                     ninUserId: newKyc.nin_user_id || (newKyc.nin_number ? generateNinUserIdFallback() : null), 
//                     bvn: newKyc.bvn || null,
//                 };

//                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

//                 const wallet = new Wallet({
//                     user_id: newKyc.user_id._id,
//                     currency: "NGN",
//                     account_number: walletData.data.accountNumber,
//                     account_name: walletData.data.fullName,
//                     provider: "9PSB",
//                     status: "ACTIVE",
//                 });

//                 await wallet.save({ session }); // Save NGN wallet within the transaction
//             }

//             // 3. 🌐 CREATE SECONDARY USD (BLOCKRADAR) WALLET (FOR ALL USERS)
//             // This is wrapped in a try/catch. Failure logs a warning but allows the NGN 
//             // transaction (if any) to commit, as USD is secondary.
//             // 🚨 CRITICAL NOTE: If the user is NON-NIGERIAN, this is the ONLY wallet.
//             // You may want to THROW an error if country !== 'nigeria' and this fails.
//             try {
//                 await createBlockradarWallet({ 
//                     userId: newKyc.user_id._id,
//                     email: newKyc.user_id.email,
//                     name: `${newKyc.firstname} ${newKyc.lastname}`,
//                     currency: "USD",
//                 });
//                 console.log(`✅ Blockradar wallet successfully created for ${newKyc.user_id.email}`);
//             } catch (err) {
//                 const errorMessage = `⚠️ Failed to create Blockradar wallet for ${newKyc.user_id.email}. ${err.message}`;
//                 
//                 if (newKyc.country.toLowerCase() === "nigeria") {
//                     // For Nigerians, NGN account is primary, so we just warn.
//                     console.warn(errorMessage); 
//                 } else {
//                     // For non-Nigerians, this is the primary wallet. Failure is critical.
//                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
//                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
//                 }
//             }
//         }
//         // =====================================================================

//         // Commit all changes (KYC status + Wallet saves) if successful
//         await session.commitTransaction(); 
//         session.endSession();
//         return res.status(200).json({ message: `KYC status updated to ${status}` });

//     } catch (error) { 
//         // 🛑 Centralized rollback if any step (DB save or API call) failed
//         console.error("❌ Update KYC error:", error.message);
//         await session.abortTransaction();
//         session.endSession();
//         // Return the specific error message to the admin
//         return res.status(500).json({ message: error.message });
//     }
// };
// /* -------------------------------------------------------------------------- */
// /*                            ADMIN: Get All KYC Records                      */
// /* -------------------------------------------------------------------------- */
// const getAllKycRecords = async (req, res) => {
//   try {
//     const kycRecords = await Kyc.find().populate(
//       "user_id",
//       "email firstName lastName"
//     );
//     return res.status(200).json({
//       message: "KYC records fetched successfully",
//       data: kycRecords,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching KYC records:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                          USER/ADMIN: Get Single KYC Record                 */
// /* -------------------------------------------------------------------------- */
// const getSingleKyc = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { searchByUserId = false } = req.query;
//     let kycRecord;

//     if (req.user.role === "admin") {
//       if (searchByUserId === "true") {
//         kycRecord = await Kyc.findOne({ user_id: id }).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       } else {
//         kycRecord = await Kyc.findById(id).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       }
//     } else {
//       kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
//         "user_id",
//         "email firstName lastName"
//       );
//     }

//     if (!kycRecord) {
//       return res.status(404).json({ message: "KYC record not found" });
//     }

//     return res.status(200).json({
//       message: "KYC record fetched successfully",
//       data: kycRecord,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching single KYC record:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                                   EXPORTS                                  */
// /* -------------------------------------------------------------------------- */
// module.exports = {
//   submitKYC,
//   adminUpdateKycStatus,
//   getAllKycRecords,
//   getSingleKyc,
// };
// // NEW UPDATE WITH ECRYPTION SOLUTION ADDED
// const mongoose = require("mongoose");
// const Joi = require("joi");
// const Kyc = require("../models/kycModel");
// // NOTE: Assuming Wallet model, createNairaWallet, and createBlockradarWallet are imported from elsewhere
// const Wallet = require("../models/walletModel");
// const { createNairaWallet } = require("../services/providers/ninePSBServices");
// const { createBlockradarWallet } = require("../services/providers/blockrader");

// const cloudinary = require("cloudinary").v2;
// const extractPublicId = require("../utilities/extractPublicId");
// const { verifyBVN, verifyNIN } = require("../services/prembly");

// // ✅ FIX 1: Import the decryption utility
// const { decrypt } = require('../utilities/encryptionUtils');


// // --------------------- Joi Validation ---------------------
// const kycSchema = Joi.object({
//   firstname: Joi.string().required(),
//   lastname: Joi.string().required(),
//   gender: Joi.string().valid("MALE", "FEMALE").required(),
//   dob: Joi.date().required(),
//   phone_number: Joi.string().required(),
//   address: Joi.string().required(),
//   state: Joi.string().required(),
//   city: Joi.string().required(),
//   country: Joi.string().required(),
//   bvn: Joi.string().optional(),
//   nin_number: Joi.string().optional(),
//   id_type: Joi.string().required(),
//   id_number: Joi.string().required(),
//   id_expiry: Joi.string().optional(),
// });

// // --------------------- Helper: Cloudinary Cleanup ---------------------
// async function cleanupFiles(files) {
//   if (!files) return;
//   const allFiles = [
//     files.selfie?.[0]?.path,
//     files.proof_address?.[0]?.path,
//     files.proof_id_front?.[0]?.path,
//     files.proof_id_back?.[0]?.path,
//   ].filter(Boolean);

//   if (allFiles.length === 0) return;
//   for (const file of allFiles) {
//     const publicId = extractPublicId(file);
//     try {
//       await cloudinary.uploader.destroy(publicId);
//     } catch (e) {
//       console.warn("⚠️ Cleanup failed:", e.message);
//     }
//   }
// }

// // --------------------- Controller: Submit KYC ---------------------
// const submitKYC = async (req, res) => {
// if (!req.user || !req.user.id) {
//   return res.status(401).json({ message: "Unauthorized: No user context found" });
// }

// const userId = req.user.id; 


//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ 1. Validate request body
//     const { error } = kycSchema.validate(req.body);
//     if (error) {
//       await cleanupFiles(req.files);
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     const {
//       firstname,
//       lastname,
//       gender,
//       dob,
//       bvn,
//       nin_number,
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type,
//       id_number,
//       id_expiry,
//     } = req.body;


//     // ✅ 2. Prevent duplicate KYC requests
//     const existingKYC = await Kyc.findOne({
//       user_id: userId,
//       status: { $in: ["PENDING", "APPROVED"] },
//     }).session(session);
//     if (existingKYC) {
//       await cleanupFiles(req.files);
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "KYC already submitted or approved" });
//     }

//     // ✅ 3. Nigerian-specific BVN + NIN verification
//     let verifiedFirstName = firstname.trim();
//     let verifiedLastName = lastname.trim();
//     let verifiedDob = dob;

//     if (country.toLowerCase() === "nigeria") {
//       if (!bvn || !nin_number) {
//         throw new Error("BVN and NIN are required for Nigerian users");
//       }

//       // 💡 NOTE: Decrypting during the initial submission verification (Prembly) might also be necessary here
//       // Assuming verifyBVN and verifyNIN handle decryption internally or the submitted data is not encrypted yet.

//       const bvnResult = await verifyBVN(bvn);
//       const ninResult = await verifyNIN(nin_number);

//       if (!bvnResult?.status) throw new Error("BVN verification failed");
//       if (!ninResult?.status) throw new Error("NIN verification failed");

//       const bvnData = bvnResult.data;
//       const ninData = ninResult.data || ninResult.nin_data;

//       const bvnFirst = bvnData.firstName?.toLowerCase();
//       const bvnLast = bvnData.lastName?.toLowerCase();
//       const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
//       const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

//       if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
//         throw new Error("BVN and NIN details do not match");
//       }

//       verifiedFirstName = bvnData.firstName;
//       verifiedLastName = bvnData.lastName;
//       verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
//     }

//     // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
//     // ------------------ Conditional Proof Uploads ------------------
//     let selfiePath = req.files?.selfie?.[0]?.path || null;
//     let proofAddressPath = null;
//     let proofId = { front: null, back: null };

//     // If BVN and NIN are both provided, no need for extra proof documents
//     if (!(bvn && nin_number)) {
//       proofAddressPath = req.files?.proof_address?.[0]?.path || null;
//       proofId = {
//         front: req.files?.proof_id_front?.[0]?.path || null,
//         back: req.files?.proof_id_back?.[0]?.path || null,
//       };
//     } else {
//       console.log("✅ BVN & NIN provided — skipping proof uploads.");
//     }

//     // ✅ 5. Save to DB
//     const kycData = new Kyc({
//       firstname: verifiedFirstName,
//       lastname: verifiedLastName,
//       gender: gender.toUpperCase(),
//       dob: verifiedDob,
//       bvn, // This is the encrypted BVN
//       nin_number, // This is the encrypted NIN
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type: id_type.toUpperCase(),
//       id_number,
//       id_expiry,
//       selfie: selfiePath,
//       proof_address: proofAddressPath,
//       proof_id: proofId,
//       user_id: userId,
//     });

//     await kycData.save({ session });
//     await session.commitTransaction();
//     session.endSession();

//     setImmediate(() => cleanupFiles(req.files));

//     return res.status(201).json({
//       message: "KYC submitted successfully and is under review",
//       data: kycData,
//     });
//   } catch (error) {
//     console.error("❌ KYC submission error:", error.message);
//     await cleanupFiles(req.files);
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ message: error.message || "Internal server error" });
//   }
// };

// // --------------------- Helper: Generate Compliant NIN User ID ---------------------
// /**
//  * Generates a random NIN User ID compliant with 9PSB format: 6 letters followed by a hyphen and 4 digits (e.g., 'ABCDEF-0123').
//  * @returns {string} The formatted NIN User ID.
//  */
// const generateNinUserIdFallback = () => {
//     // Generates a random 6-letter string (e.g., 'AJKLSN')
//     const randomLetters = Array.from({ length: 6 }, () => 
//         String.fromCharCode(65 + Math.floor(Math.random() * 26)) // 65 is 'A'
//     ).join('');
    
//     // Generates a random 4-digit string (e.g., '5842')
//     const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); 
    
//     return `${randomLetters}-${randomDigits}`;
// };

// // --------------------- Admin Updates KYC ---------------------
// const adminUpdateKycStatus = async (req, res) => {
//     // 🔒 Assumed: Admin role check is done before this function runs or at the start
//     if (!req.user || req.user.role !== "admin")
//         return res.status(403).json({ message: "Forbidden: admin only" });

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { id, status, rejectionReason } = req.body;
//         if (!id || !status) throw new Error("KYC ID and status are required");

//         // Populate user details along with KYC data
//         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
//         if (!newKyc) throw new Error("KYC record not found");

//         newKyc.status = status.toUpperCase();
//         if (status.toUpperCase() === "REJECTED" && rejectionReason)
//             newKyc.rejectionReason = rejectionReason;

//         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
//         await newKyc.save({ session });

//         // ======================= WALLET CREATION LOGIC =======================
//         if (status.toUpperCase() === "APPROVED") {

//             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
//             if (newKyc.country.toLowerCase() === "nigeria") {

//                 // ------------------ NIN/IDENTITY DECRYPTION & VALIDATION ------------------
//                 const decryptedNin = newKyc.nin_number ? decrypt(newKyc.nin_number) : null;
//                 const decryptedBvn = newKyc.bvn ? decrypt(newKyc.bvn) : null; // ✅ Decrypt BVN too

//                 const nin = decryptedNin; 
//                 let nationalIdentityNo = null;

//                 if (nin) {
//                     const cleanedNin = nin.trim();
//                     if (cleanedNin.length !== 11 || !/^\d+$/.test(cleanedNin)) {
//                         // 🛑 This will throw a specific error if the decrypted NIN is bad 
//                         throw new Error(`CRITICAL DATA ERROR: Decrypted NIN ('${cleanedNin}') is not 11 digits. Please check user's Kyc record in DB.`);
//                     }
//                     nationalIdentityNo = cleanedNin;
//                 } else {
//                     // NIN is mandatory for Nigerian wallet creation
//                     throw new Error("CRITICAL DATA ERROR: NIN is null or missing for a Nigerian user.");
//                 }
//                 // --------------------------------------------------------------------------

//                 // Format DOB (dd/MM/yyyy)
//                 const dob = new Date(newKyc.dob);
//                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

//                 // Map gender string to required integer code (0=Male, 1=Female)
//                 const genderCode = newKyc.gender === 'MALE' ? 0 : (newKyc.gender === 'FEMALE' ? 1 : null);
                
//                 if (genderCode === null) {
//                     throw new Error(`Invalid or missing gender in KYC record: ${newKyc.gender}`);
//                 }

//                 const payload = {
//                     transactionTrackingRef: `TX-${Date.now()}`,
//                     lastName: newKyc.lastname,
//                     otherNames: newKyc.firstname,
//                     accountName: `${newKyc.firstname} ${newKyc.lastname}`,
//                     phoneNo: newKyc.phone_number,
//                     gender: genderCode, 
//                     dateOfBirth: formattedDOB,
//                     address: newKyc.address,
//                     email: newKyc.user_id.email,
//                     nationalIdentityNo: nationalIdentityNo, // ✅ Uses the decrypted and validated NIN
//                     ninUserId: newKyc.nin_user_id || (nationalIdentityNo ? generateNinUserIdFallback() : null), 
//                     bvn: decryptedBvn || null, // ✅ Uses the decrypted BVN
//                 };

//                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

//                 const wallet = new Wallet({
//                     user_id: newKyc.user_id._id,
//                     currency: "NGN",
//                     account_number: walletData.data.accountNumber,
//                     account_name: walletData.data.fullName,
//                     provider: "9PSB",
//                     status: "ACTIVE",
//                 });

//                 await wallet.save({ session }); // Save NGN wallet within the transaction
//             }

//             // 3. 🌐 CREATE SECONDARY USD (BLOCKRADAR) WALLET (FOR ALL USERS)
//             try {
//                 await createBlockradarWallet({ 
//                     userId: newKyc.user_id._id,
//                     email: newKyc.user_id.email,
//                     name: `${newKyc.firstname} ${newKyc.lastname}`,
//                     currency: "USD",
//                 });
//                 console.log(`✅ Blockradar wallet successfully created for ${newKyc.user_id.email}`);
//             } catch (err) {
//                 const errorMessage = `⚠️ Failed to create Blockradar wallet for ${newKyc.user_id.email}. ${err.message}`;
//                 
//                 if (newKyc.country.toLowerCase() === "nigeria") {
//                     // For Nigerians, NGN account is primary, so we just warn.
//                     console.warn(errorMessage); 
//                 } else {
//                     // For non-Nigerians, this is the primary wallet. Failure is critical.
//                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
//                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
//                 }
//             }
//         }
//         // =====================================================================

//         // Commit all changes (KYC status + Wallet saves) if successful
//         await session.commitTransaction(); 
//         session.endSession();
//         return res.status(200).json({ message: `KYC status updated to ${status}` });

//     } catch (error) { 
//         // 🛑 Centralized rollback if any step (DB save or API call) failed
//         console.error("❌ Update KYC error:", error.message);
//         await session.abortTransaction();
//         session.endSession();
//         // Return the specific error message to the admin
//         return res.status(500).json({ message: error.message });
//     }
// };
// /* -------------------------------------------------------------------------- */
// /*                            ADMIN: Get All KYC Records                      */
// /* -------------------------------------------------------------------------- */
// const getAllKycRecords = async (req, res) => {
//   try {
//     const kycRecords = await Kyc.find().populate(
//       "user_id",
//       "email firstName lastName"
//     );
//     return res.status(200).json({
//       message: "KYC records fetched successfully",
//       data: kycRecords,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching KYC records:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                          USER/ADMIN: Get Single KYC Record                 */
// /* -------------------------------------------------------------------------- */
// const getSingleKyc = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { searchByUserId = false } = req.query;
//     let kycRecord;

//     if (req.user.role === "admin") {
//       if (searchByUserId === "true") {
//         kycRecord = await Kyc.findOne({ user_id: id }).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       } else {
//         kycRecord = await Kyc.findById(id).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       }
//     } else {
//       kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
//         "user_id",
//         "email firstName lastName"
//       );
//     }

//     if (!kycRecord) {
//       return res.status(404).json({ message: "KYC record not found" });
//     }

//     return res.status(200).json({
//       message: "KYC record fetched successfully",
//       data: kycRecord,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching single KYC record:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                                   EXPORTS                                  */
// /* -------------------------------------------------------------------------- */
// module.exports = {
//   submitKYC,
//   adminUpdateKycStatus,
//   getAllKycRecords,
//   getSingleKyc,
// };

// // FIX MONGODB DUPLICATE 
// const mongoose = require("mongoose");
// const Joi = require("joi");
// const Kyc = require("../models/kycModel");
// // NOTE: Assuming Wallet model, createNairaWallet, and createBlockradarWallet are imported from elsewhere
// const Wallet = require("../models/walletModel");
// const { createNairaWallet } = require("../services/providers/ninePSBServices");
// const { createBlockradarWallet } = require("../services/providers/blockrader");

// const cloudinary = require("cloudinary").v2;
// const extractPublicId = require("../utilities/extractPublicId");
// const { verifyBVN, verifyNIN } = require("../services/prembly");

// // ✅ FIX 1: Import the decryption utility
// const { decrypt } = require('../utilities/encryptionUtils');


// // --------------------- Joi Validation ---------------------
// const kycSchema = Joi.object({
//   firstname: Joi.string().required(),
//   lastname: Joi.string().required(),
//   gender: Joi.string().valid("MALE", "FEMALE").required(),
//   dob: Joi.date().required(),
//   phone_number: Joi.string().required(),
//   address: Joi.string().required(),
//   state: Joi.string().required(),
//   city: Joi.string().required(),
//   country: Joi.string().required(),
//   bvn: Joi.string().optional(),
//   nin_number: Joi.string().optional(),
//   id_type: Joi.string().required(),
//   id_number: Joi.string().required(),
//   id_expiry: Joi.string().optional(),
// });

// // --------------------- Helper: Cloudinary Cleanup ---------------------
// async function cleanupFiles(files) {
//   if (!files) return;
//   const allFiles = [
//     files.selfie?.[0]?.path,
//     files.proof_address?.[0]?.path,
//     files.proof_id_front?.[0]?.path,
//     files.proof_id_back?.[0]?.path,
//   ].filter(Boolean);

//   if (allFiles.length === 0) return;
//   for (const file of allFiles) {
//     const publicId = extractPublicId(file);
//     try {
//       await cloudinary.uploader.destroy(publicId);
//     } catch (e) {
//       console.warn("⚠️ Cleanup failed:", e.message);
//     }
//   }
// }

// // --------------------- Controller: Submit KYC ---------------------
// const submitKYC = async (req, res) => {
// if (!req.user || !req.user.id) {
//   return res.status(401).json({ message: "Unauthorized: No user context found" });
// }

// const userId = req.user.id; 


//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ 1. Validate request body
//     const { error } = kycSchema.validate(req.body);
//     if (error) {
//       await cleanupFiles(req.files);
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     const {
//       firstname,
//       lastname,
//       gender,
//       dob,
//       bvn,
//       nin_number,
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type,
//       id_number,
//       id_expiry,
//     } = req.body;


//     // ✅ 2. Prevent duplicate KYC requests
//     const existingKYC = await Kyc.findOne({
//       user_id: userId,
//       status: { $in: ["PENDING", "APPROVED"] },
//     }).session(session);
//     if (existingKYC) {
//       await cleanupFiles(req.files);
//       await session.abortTransaction();
//       return res.status(400).json({ message: "KYC already submitted or approved" });
//     }

//     // ✅ 3. Nigerian-specific BVN + NIN verification
//     let verifiedFirstName = firstname.trim();
//     let verifiedLastName = lastname.trim();
//     let verifiedDob = dob;

//     if (country.toLowerCase() === "nigeria") {
//       if (!bvn || !nin_number) {
//         throw new Error("BVN and NIN are required for Nigerian users");
//       }

//       // 💡 NOTE: Decrypting during the initial submission verification (Prembly) might also be necessary here
//       // Assuming verifyBVN and verifyNIN handle decryption internally or the submitted data is not encrypted yet.

//       const bvnResult = await verifyBVN(bvn);
//       const ninResult = await verifyNIN(nin_number);

//       if (!bvnResult?.status) throw new Error("BVN verification failed");
//       if (!ninResult?.status) throw new Error("NIN verification failed");

//       const bvnData = bvnResult.data;
//       const ninData = ninResult.data || ninResult.nin_data;

//       const bvnFirst = bvnData.firstName?.toLowerCase();
//       const bvnLast = bvnData.lastName?.toLowerCase();
//       const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
//       const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

//       if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
//         throw new Error("BVN and NIN details do not match");
//       }

//       verifiedFirstName = bvnData.firstName;
//       verifiedLastName = bvnData.lastName;
//       verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
//     }

//     // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
//     // ------------------ Conditional Proof Uploads ------------------
//     let selfiePath = req.files?.selfie?.[0]?.path || null;
//     let proofAddressPath = null;
//     let proofId = { front: null, back: null };

//     // If BVN and NIN are both provided, no need for extra proof documents
//     if (!(bvn && nin_number)) {
//       proofAddressPath = req.files?.proof_address?.[0]?.path || null;
//       proofId = {
//         front: req.files?.proof_id_front?.[0]?.path || null,
//         back: req.files?.proof_id_back?.[0]?.path || null,
//       };
//     } else {
//       console.log("✅ BVN & NIN provided — skipping proof uploads.");
//     }

//     // ✅ 5. Save to DB
//     const kycData = new Kyc({
//       firstname: verifiedFirstName,
//       lastname: verifiedLastName,
//       gender: gender.toUpperCase(),
//       dob: verifiedDob,
//       bvn, // This is the encrypted BVN
//       nin_number, // This is the encrypted NIN
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type: id_type.toUpperCase(),
//       id_number,
//       id_expiry,
//       selfie: selfiePath,
//       proof_address: proofAddressPath,
//       proof_id: proofId,
//       user_id: userId,
//     });

//     await kycData.save({ session });
//     await session.commitTransaction();
//     setImmediate(() => cleanupFiles(req.files));

//     return res.status(201).json({
//       message: "KYC submitted successfully and is under review",
//       data: kycData,
//     });
//   } catch (error) {
//     console.error("❌ KYC submission error:", error.message);
//     await cleanupFiles(req.files);
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ message: error.message || "Internal server error" });
//   }
// };

// // --------------------- Helper: Generate Compliant NIN User ID ---------------------
// /**
//  * Generates a random NIN User ID compliant with 9PSB format: 6 letters followed by a hyphen and 4 digits (e.g., 'ABCDEF-0123').
//  * @returns {string} The formatted NIN User ID.
//  */
// const generateNinUserIdFallback = () => {
//     // Generates a random 6-letter string (e.g., 'AJKLSN')
//     const randomLetters = Array.from({ length: 6 }, () => 
//         String.fromCharCode(65 + Math.floor(Math.random() * 26)) // 65 is 'A'
//     ).join('');
//     
//     // Generates a random 4-digit string (e.g., '5842')
//     const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); 
//     
//     return `${randomLetters}-${randomDigits}`;
// };

// // --------------------- Admin Updates KYC ---------------------
// const adminUpdateKycStatus = async (req, res) => {
//     // 🔒 Assumed: Admin role check is done before this function runs or at the start
//     if (!req.user || req.user.role !== "admin")
//         return res.status(403).json({ message: "Forbidden: admin only" });

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { id, status, rejectionReason } = req.body;
//         if (!id || !status) throw new Error("KYC ID and status are required");

//         // Populate user details along with KYC data
//         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
//         if (!newKyc) throw new Error("KYC record not found");

//         newKyc.status = status.toUpperCase();
//         if (status.toUpperCase() === "REJECTED" && rejectionReason)
//             newKyc.rejectionReason = rejectionReason;

//         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
//         await newKyc.save({ session });

//         // ======================= WALLET CREATION LOGIC =======================
//         if (status.toUpperCase() === "APPROVED") {

//             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
//             if (newKyc.country.toLowerCase() === "nigeria") {

//                 // ------------------ NIN/IDENTITY DECRYPTION & VALIDATION ------------------
//                 const decryptedNin = newKyc.nin_number ? decrypt(newKyc.nin_number) : null;
//                 const decryptedBvn = newKyc.bvn ? decrypt(newKyc.bvn) : null; // ✅ Decrypt BVN too

//                 const nin = decryptedNin; 
//                 let nationalIdentityNo = null;

//                 if (nin) {
//                     const cleanedNin = nin.trim();
//                     if (cleanedNin.length !== 11 || !/^\d+$/.test(cleanedNin)) {
//                         // 🛑 This will throw a specific error if the decrypted NIN is bad 
//                         throw new Error(`CRITICAL DATA ERROR: Decrypted NIN ('${cleanedNin}') is not 11 digits. Please check user's Kyc record in DB.`);
//                     }
//                     nationalIdentityNo = cleanedNin;
//                 } else {
//                     // NIN is mandatory for Nigerian wallet creation
//                     throw new Error("CRITICAL DATA ERROR: NIN is null or missing for a Nigerian user.");
//                 }
//                 // --------------------------------------------------------------------------

//                 // Format DOB (dd/MM/yyyy)
//                 const dob = new Date(newKyc.dob);
//                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

//                 // Map gender string to required integer code (0=Male, 1=Female)
//                 const genderCode = newKyc.gender === 'MALE' ? 0 : (newKyc.gender === 'FEMALE' ? 1 : null);
//                 
//                 if (genderCode === null) {
//                     throw new Error(`Invalid or missing gender in KYC record: ${newKyc.gender}`);
//                 }

//                 const payload = {
//                     transactionTrackingRef: `TX-${Date.now()}`,
//                     lastName: newKyc.lastname,
//                     otherNames: newKyc.firstname,
//                     accountName: `${newKyc.firstname} ${newKyc.lastname}`,
//                     phoneNo: newKyc.phone_number,
//                     gender: genderCode, 
//                     dateOfBirth: formattedDOB,
//                     address: newKyc.address,
//                     email: newKyc.user_id.email,
//                     nationalIdentityNo: nationalIdentityNo, // ✅ Uses the decrypted and validated NIN
//                     ninUserId: newKyc.nin_user_id || (nationalIdentityNo ? generateNinUserIdFallback() : null), 
//                     bvn: decryptedBvn || null, // ✅ Uses the decrypted BVN
//                 };

//                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

//                 // 💡 CRITICAL FIX: To prevent the E11000 duplicate key error on index 'user_id_1', 
//                 // we must only query using the unique key (user_id), thereby ensuring we only
//                 // ever insert one document per user and update it subsequently.
//                 await Wallet.findOneAndUpdate(
//                     { user_id: newKyc.user_id._id }, // Query: Find by the UNIQUE key (user_id) only
//                     {
//                         // Update: Set or overwrite the NGN wallet details on the single document
//                         currency: "NGN", // Set the primary currency for this wallet
//                         account_number: walletData.data.accountNumber,
//                         account_name: walletData.data.fullName,
//                         provider: "9PSB",
//                         status: "ACTIVE",
//                     },
//                     { 
//                         upsert: true, // Create the document if it doesn't exist
//                         new: true, // Return the modified document
//                         session // Ensure operation is part of the transaction
//                     } 
//                 );
//             }

//             // 3. 🌐 CREATE SECONDARY USD (BLOCKRADAR) WALLET (FOR ALL USERS)
//             try {
//                 // NOTE: The underlying Blockradar service should also use only the user_id for its upsert/update
//                 await createBlockradarWallet({ 
//                     userId: newKyc.user_id._id,
//                     email: newKyc.user_id.email,
//                     name: `${newKyc.firstname} ${newKyc.lastname}`,
//                     currency: "USD",
//                 });
//                 console.log(`✅ Blockradar wallet successfully created for ${newKyc.user_id.email}`);
//             } catch (err) {
//                 const errorMessage = `⚠️ Failed to create Blockradar wallet for ${newKyc.user_id.email}. ${err.message}`;
//                 
//                 if (newKyc.country.toLowerCase() === "nigeria") {
//                     // For Nigerians, NGN account is primary, so we just warn.
//                     console.warn(errorMessage); 
//                 } else {
//                     // For non-Nigerians, this is the primary wallet. Failure is critical.
//                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
//                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
//                 }
//             }
//         }
//         // =====================================================================

//         // Commit all changes (KYC status + Wallet saves/updates) if successful
//         await session.commitTransaction(); 
//         session.endSession();
//         return res.status(200).json({ message: `KYC status updated to ${status}` });

//     } catch (error) { 
//         // 🛑 Centralized rollback if any step (DB save or API call) failed
//         console.error("❌ Update KYC error:", error.message);
//         await session.abortTransaction();
//         session.endSession();
//         // Return the specific error message to the admin
//         return res.status(500).json({ message: error.message });
//     }
// };
// /* -------------------------------------------------------------------------- */
// /*                            ADMIN: Get All KYC Records                      */
// /* -------------------------------------------------------------------------- */
// const getAllKycRecords = async (req, res) => {
//   try {
//     const kycRecords = await Kyc.find().populate(
//       "user_id",
//       "email firstName lastName"
//     );
//     return res.status(200).json({
//       message: "KYC records fetched successfully",
//       data: kycRecords,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching KYC records:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                          USER/ADMIN: Get Single KYC Record                 */
// /* -------------------------------------------------------------------------- */
// const getSingleKyc = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { searchByUserId = false } = req.query;
//     let kycRecord;

//     if (req.user.role === "admin") {
//       if (searchByUserId === "true") {
//         kycRecord = await Kyc.findOne({ user_id: id }).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       } else {
//         kycRecord = await Kyc.findById(id).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       }
//     } else {
//       kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
//         "user_id",
//         "email firstName lastName"
//       );
//     }

//     if (!kycRecord) {
//       return res.status(404).json({ message: "KYC record not found" });
//     }

//     return res.status(200).json({
//       message: "KYC record fetched successfully",
//       data: kycRecord,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching single KYC record:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                                   EXPORTS                                  */
// /* -------------------------------------------------------------------------- */
// module.exports = {
//   submitKYC,
//   adminUpdateKycStatus,
//   getAllKycRecords,
//   getSingleKyc,
// };

// FIX MONGODB DUPLICATE
// const mongoose = require("mongoose");
// const Joi = require("joi");
// const Kyc = require("../models/kycModel");
// // NOTE: Assuming Wallet model, createNairaWallet, and createBlockradarWallet are imported from elsewhere
// const Wallet = require("../models/walletModel");
// const { createNairaWallet } = require("../services/providers/ninePSBServices");
// const { createBlockradarWallet } = require("../services/providers/blockrader");

// const cloudinary = require("cloudinary").v2;
// const extractPublicId = require("../utilities/extractPublicId");
// const { verifyBVN, verifyNIN } = require("../services/prembly");

// // ✅ FIX 1: Import the decryption utility
// const { decrypt } = require('../utilities/encryptionUtils');


// // --------------------- Joi Validation ---------------------
// const kycSchema = Joi.object({
//   firstname: Joi.string().required(),
//   lastname: Joi.string().required(),
//   gender: Joi.string().valid("MALE", "FEMALE").required(),
//   dob: Joi.date().required(),
//   phone_number: Joi.string().required(),
//   address: Joi.string().required(),
//   state: Joi.string().required(),
//   city: Joi.string().required(),
//   country: Joi.string().required(),
//   bvn: Joi.string().optional(),
//   nin_number: Joi.string().optional(),
//   id_type: Joi.string().required(),
//   id_number: Joi.string().required(),
//   id_expiry: Joi.string().optional(),
// });

// // --------------------- Helper: Cloudinary Cleanup ---------------------
// async function cleanupFiles(files) {
//   if (!files) return;
//   const allFiles = [
//     files.selfie?.[0]?.path,
//     files.proof_address?.[0]?.path,
//     files.proof_id_front?.[0]?.path,
//     files.proof_id_back?.[0]?.path,
//   ].filter(Boolean);

//   if (allFiles.length === 0) return;
//   for (const file of allFiles) {
//     const publicId = extractPublicId(file);
//     try {
//       await cloudinary.uploader.destroy(publicId);
//     } catch (e) {
//       console.warn("⚠️ Cleanup failed:", e.message);
//     }
//   }
// }

// // --------------------- Controller: Submit KYC ---------------------
// const submitKYC = async (req, res) => {
// if (!req.user || !req.user.id) {
//   return res.status(401).json({ message: "Unauthorized: No user context found" });
// }

// const userId = req.user.id; 


//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ 1. Validate request body
//     const { error } = kycSchema.validate(req.body);
//     if (error) {
//       await cleanupFiles(req.files);
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     const {
//       firstname,
//       lastname,
//       gender,
//       dob,
//       bvn,
//       nin_number,
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type,
//       id_number,
//       id_expiry,
//     } = req.body;


//     // ✅ 2. Prevent duplicate KYC requests
//     const existingKYC = await Kyc.findOne({
//       user_id: userId,
//       status: { $in: ["PENDING", "APPROVED"] },
//     }).session(session);
//     if (existingKYC) {
//       await cleanupFiles(req.files);
//       await session.abortTransaction();
//       return res.status(400).json({ message: "KYC already submitted or approved" });
//     }

//     // ✅ 3. Nigerian-specific BVN + NIN verification
//     let verifiedFirstName = firstname.trim();
//     let verifiedLastName = lastname.trim();
//     let verifiedDob = dob;

//     if (country.toLowerCase() === "nigeria") {
//       if (!bvn || !nin_number) {
//         throw new Error("BVN and NIN are required for Nigerian users");
//       }

//       // 💡 NOTE: Decrypting during the initial submission verification (Prembly) might also be necessary here
//       // Assuming verifyBVN and verifyNIN handle decryption internally or the submitted data is not encrypted yet.

//       const bvnResult = await verifyBVN(bvn);
//       const ninResult = await verifyNIN(nin_number);

//       if (!bvnResult?.status) throw new Error("BVN verification failed");
//       if (!ninResult?.status) throw new Error("NIN verification failed");

//       const bvnData = bvnResult.data;
//       const ninData = ninResult.data || ninResult.nin_data;

//       const bvnFirst = bvnData.firstName?.toLowerCase();
//       const bvnLast = bvnData.lastName?.toLowerCase();
//       const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
//       const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

//       if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
//         throw new Error("BVN and NIN details do not match");
//       }

//       verifiedFirstName = bvnData.firstName;
//       verifiedLastName = bvnData.lastName;
//       verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
//     }

//     // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
//     // ------------------ Conditional Proof Uploads ------------------
//     let selfiePath = req.files?.selfie?.[0]?.path || null;
//     let proofAddressPath = null;
//     let proofId = { front: null, back: null };

//     // If BVN and NIN are both provided, no need for extra proof documents
//     if (!(bvn && nin_number)) {
//       proofAddressPath = req.files?.proof_address?.[0]?.path || null;
//       proofId = {
//         front: req.files?.proof_id_front?.[0]?.path || null,
//         back: req.files?.proof_id_back?.[0]?.path || null,
//       };
//     } else {
//       console.log("✅ BVN & NIN provided — skipping proof uploads.");
//     }

//     // ✅ 5. Save to DB
//     const kycData = new Kyc({
//       firstname: verifiedFirstName,
//       lastname: verifiedLastName,
//       gender: gender.toUpperCase(),
//       dob: verifiedDob,
//       bvn, // This is the encrypted BVN
//       nin_number, // This is the encrypted NIN
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type: id_type.toUpperCase(),
//       id_number,
//       id_expiry,
//       selfie: selfiePath,
//       proof_address: proofAddressPath,
//       proof_id: proofId,
//       user_id: userId,
//     });

//     await kycData.save({ session });
//     await session.commitTransaction();
//     setImmediate(() => cleanupFiles(req.files));

//     return res.status(201).json({
//       message: "KYC submitted successfully and is under review",
//       data: kycData,
//     });
//   } catch (error) {
//     console.error("❌ KYC submission error:", error.message);
//     await cleanupFiles(req.files);
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ message: error.message || "Internal server error" });
//   }
// };

// // --------------------- Helper: Generate Compliant NIN User ID ---------------------
// /**
//  * Generates a random NIN User ID compliant with 9PSB format: 6 letters followed by a hyphen and 4 digits (e.g., 'ABCDEF-0123').
//  * @returns {string} The formatted NIN User ID.
//  */
// const generateNinUserIdFallback = () => {
//     // Generates a random 6-letter string (e.g., 'AJKLSN')
//     const randomLetters = Array.from({ length: 6 }, () => 
//         String.fromCharCode(65 + Math.floor(Math.random() * 26)) // 65 is 'A'
//     ).join('');
//     
//     // Generates a random 4-digit string (e.g., '5842')
//     const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); 
//     
//     return `${randomLetters}-${randomDigits}`;
// };

// // --------------------- Admin Updates KYC ---------------------
// const adminUpdateKycStatus = async (req, res) => {
//     // 🔒 Assumed: Admin role check is done before this function runs or at the start
//     if (!req.user || req.user.role !== "admin")
//         return res.status(403).json({ message: "Forbidden: admin only" });

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { id, status, rejectionReason } = req.body;
//         if (!id || !status) throw new Error("KYC ID and status are required");

//         // Populate user details along with KYC data
//         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
//         if (!newKyc) throw new Error("KYC record not found");

//         newKyc.status = status.toUpperCase();
//         if (status.toUpperCase() === "REJECTED" && rejectionReason)
//             newKyc.rejectionReason = rejectionReason;

//         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
//         await newKyc.save({ session });

//         // ======================= WALLET CREATION LOGIC =======================
//         if (status.toUpperCase() === "APPROVED") {

//             // 2. 🇳🇬 CREATE PRIMARY NAIRA (9PSB) WALLET (CRITICAL: NO INNER TRY/CATCH)
//             if (newKyc.country.toLowerCase() === "nigeria") {

//                 // ------------------ NIN/IDENTITY DECRYPTION & VALIDATION ------------------
//                 const decryptedNin = newKyc.nin_number ? decrypt(newKyc.nin_number) : null;
//                 const decryptedBvn = newKyc.bvn ? decrypt(newKyc.bvn) : null; // ✅ Decrypt BVN too

//                 const nin = decryptedNin; 
//                 let nationalIdentityNo = null;

//                 if (nin) {
//                     const cleanedNin = nin.trim();
//                     if (cleanedNin.length !== 11 || !/^\d+$/.test(cleanedNin)) {
//                         // 🛑 This will throw a specific error if the decrypted NIN is bad 
//                         throw new Error(`CRITICAL DATA ERROR: Decrypted NIN ('${cleanedNin}') is not 11 digits. Please check user's Kyc record in DB.`);
//                     }
//                     nationalIdentityNo = cleanedNin;
//                 } else {
//                     // NIN is mandatory for Nigerian wallet creation
//                     throw new Error("CRITICAL DATA ERROR: NIN is null or missing for a Nigerian user.");
//                 }
//                 // --------------------------------------------------------------------------

//                 // Format DOB (dd/MM/yyyy)
//                 const dob = new Date(newKyc.dob);
//                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

//                 // Map gender string to required integer code (0=Male, 1=Female)
//                 const genderCode = newKyc.gender === 'MALE' ? 0 : (newKyc.gender === 'FEMALE' ? 1 : null);
//                 
//                 if (genderCode === null) {
//                     throw new Error(`Invalid or missing gender in KYC record: ${newKyc.gender}`);
//                 }

//                 const payload = {
//                     transactionTrackingRef: `TX-${Date.now()}`,
//                     lastName: newKyc.lastname,
//                     otherNames: newKyc.firstname,
//                     accountName: `${newKyc.firstname} ${newKyc.lastname}`,
//                     phoneNo: newKyc.phone_number,
//                     gender: genderCode, 
//                     dateOfBirth: formattedDOB,
//                     address: newKyc.address,
//                     email: newKyc.user_id.email,
//                     nationalIdentityNo: nationalIdentityNo, // ✅ Uses the decrypted and validated NIN
//                     ninUserId: newKyc.nin_user_id || (nationalIdentityNo ? generateNinUserIdFallback() : null), 
//                     bvn: decryptedBvn || null, // ✅ Uses the decrypted BVN
//                 };

//                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

//                 // 💡 CRITICAL FIX: The compound index allows one user per currency. The query MUST include
//                 // both `user_id` and `currency` to correctly find/upsert the intended NGN wallet
//                 // without accidentally overwriting another currency wallet for the same user.
//                 await Wallet.findOneAndUpdate(
//                     { user_id: newKyc.user_id._id, currency: "NGN" }, // CORRECT Query: Targets the NGN wallet
//                     {
//                         // Update: Set or overwrite the NGN wallet details on the single document
//                         currency: "NGN", 
//                         walletType: "USER", // CRITICAL: Wallet Model requires this field
//                         accountNumber: walletData.data.accountNumber, // CORRECTED field name
//                         accountName: walletData.data.fullName,      // CORRECTED field name
//                         provider: "9PSB",
//                         status: "ACTIVE",
//                     },
//                     { 
//                         upsert: true, // Create the document if it doesn't exist
//                         new: true, // Return the modified document
//                         session // Ensure operation is part of the transaction
//                     } 
//                 );
//             }

//             // 3. 🌐 CREATE SECONDARY USD (BLOCKRADAR) WALLET (FOR ALL USERS)
//             try {
//                 // NOTE: The underlying Blockradar service should also use only the user_id for its upsert/update
//                 await createBlockradarWallet({ 
//                     userId: newKyc.user_id._id,
//                     email: newKyc.user_id.email,
//                     name: `${newKyc.firstname} ${newKyc.lastname}`,
//                     currency: "USD",
//                 });
//                 console.log(`✅ Blockradar wallet successfully created for ${newKyc.user_id.email}`);
//             } catch (err) {
//                 const errorMessage = `⚠️ Failed to create Blockradar wallet for ${newKyc.user_id.email}. ${err.message}`;
//                 
//                 if (newKyc.country.toLowerCase() === "nigeria") {
//                     // For Nigerians, NGN account is primary, so we just warn.
//                     console.warn(errorMessage); 
//                 } else {
//                     // For non-Nigerians, this is the primary wallet. Failure is critical.
//                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
//                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
//                 }
//             }
//         }
//         // =====================================================================

//         // Commit all changes (KYC status + Wallet saves/updates) if successful
//         await session.commitTransaction(); 
//         session.endSession();
//         return res.status(200).json({ message: `KYC status updated to ${status}` });

//     } catch (error) { 
//         // 🛑 Centralized rollback if any step (DB save or API call) failed
//         console.error("❌ Update KYC error:", error.message);
//         await session.abortTransaction();
//         session.endSession();
//         // Return the specific error message to the admin
//         return res.status(500).json({ message: error.message });
//     }
// };
// /* -------------------------------------------------------------------------- */
// /*                            ADMIN: Get All KYC Records                      */
// /* -------------------------------------------------------------------------- */
// const getAllKycRecords = async (req, res) => {
//   try {
//     const kycRecords = await Kyc.find().populate(
//       "user_id",
//       "email firstName lastName"
//     );
//     return res.status(200).json({
//       message: "KYC records fetched successfully",
//       data: kycRecords,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching KYC records:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                          USER/ADMIN: Get Single KYC Record                 */
// /* -------------------------------------------------------------------------- */
// const getSingleKyc = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { searchByUserId = false } = req.query;
//     let kycRecord;

//     if (req.user.role === "admin") {
//       if (searchByUserId === "true") {
//         kycRecord = await Kyc.findOne({ user_id: id }).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       } else {
//         kycRecord = await Kyc.findById(id).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       }
//     } else {
//       kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
//         "user_id",
//         "email firstName lastName"
//       );
//     }

//     if (!kycRecord) {
//       return res.status(404).json({ message: "KYC record not found" });
//     }

//     return res.status(200).json({
//       message: "KYC record fetched successfully",
//       data: kycRecord,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching single KYC record:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                                   EXPORTS                                  */
// /* -------------------------------------------------------------------------- */
// module.exports = {
//   submitKYC,
//   adminUpdateKycStatus,
//   getAllKycRecords,
//   getSingleKyc,
// };

// // ONLY ONE ACCOUNT PER USER
// const mongoose = require("mongoose");
// const Joi = require("joi");
// const Kyc = require("../models/kycModel");
// // NOTE: Assuming Wallet model, createNairaWallet, and createBlockradarWallet are imported from elsewhere
// const Wallet = require("../models/walletModel");
// const { createNairaWallet } = require("../services/providers/ninePSBServices");
// const { createBlockradarWallet } = require("../services/providers/blockrader");

// const cloudinary = require("cloudinary").v2;
// const extractPublicId = require("../utilities/extractPublicId");
// const { verifyBVN, verifyNIN } = require("../services/prembly");

// // ✅ FIX 1: Import the decryption utility
// const { decrypt } = require('../utilities/encryptionUtils');


// // --------------------- Joi Validation ---------------------
// const kycSchema = Joi.object({
//   firstname: Joi.string().required(),
//   lastname: Joi.string().required(),
//   gender: Joi.string().valid("MALE", "FEMALE").required(),
//   dob: Joi.date().required(),
//   phone_number: Joi.string().required(),
//   address: Joi.string().required(),
//   state: Joi.string().required(),
//   city: Joi.string().required(),
//   country: Joi.string().required(),
//   bvn: Joi.string().optional(),
//   nin_number: Joi.string().optional(),
//   id_type: Joi.string().required(),
//   id_number: Joi.string().required(),
//   id_expiry: Joi.string().optional(),
// });

// // --------------------- Helper: Cloudinary Cleanup ---------------------
// async function cleanupFiles(files) {
//   if (!files) return;
//   const allFiles = [
//     files.selfie?.[0]?.path,
//     files.proof_address?.[0]?.path,
//     files.proof_id_front?.[0]?.path,
//     files.proof_id_back?.[0]?.path,
//   ].filter(Boolean);

//   if (allFiles.length === 0) return;
//   for (const file of allFiles) {
//     const publicId = extractPublicId(file);
//     try {
//       await cloudinary.uploader.destroy(publicId);
//     } catch (e) {
//       console.warn("⚠️ Cleanup failed:", e.message);
//     }
//   }
// }

// // --------------------- Controller: Submit KYC ---------------------
// const submitKYC = async (req, res) => {
// if (!req.user || !req.user.id) {
//   return res.status(401).json({ message: "Unauthorized: No user context found" });
// }

// const userId = req.user.id; 


//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ 1. Validate request body
//     const { error } = kycSchema.validate(req.body);
//     if (error) {
//       await cleanupFiles(req.files);
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     const {
//       firstname,
//       lastname,
//       gender,
//       dob,
//       bvn,
//       nin_number,
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type,
//       id_number,
//       id_expiry,
//     } = req.body;


//     // ✅ 2. Prevent duplicate KYC requests
//     const existingKYC = await Kyc.findOne({
//       user_id: userId,
//       status: { $in: ["PENDING", "APPROVED"] },
//     }).session(session);
//     if (existingKYC) {
//       await cleanupFiles(req.files);
//       await session.abortTransaction();
//       return res.status(400).json({ message: "KYC already submitted or approved" });
//     }

//     // ✅ 3. Nigerian-specific BVN + NIN verification
//     let verifiedFirstName = firstname.trim();
//     let verifiedLastName = lastname.trim();
//     let verifiedDob = dob;

//     if (country.toLowerCase() === "nigeria") {
//       if (!bvn || !nin_number) {
//         throw new Error("BVN and NIN are required for Nigerian users");
//       }

//       // 💡 NOTE: Decrypting during the initial submission verification (Prembly) might also be necessary here
//       // Assuming verifyBVN and verifyNIN handle decryption internally or the submitted data is not encrypted yet.

//       const bvnResult = await verifyBVN(bvn);
//       const ninResult = await verifyNIN(nin_number);

//       if (!bvnResult?.status) throw new Error("BVN verification failed");
//       if (!ninResult?.status) throw new Error("NIN verification failed");

//       const bvnData = bvnResult.data;
//       const ninData = ninResult.data || ninResult.nin_data;

//       const bvnFirst = bvnData.firstName?.toLowerCase();
//       const bvnLast = bvnData.lastName?.toLowerCase();
//       const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
//       const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

//       if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
//         throw new Error("BVN and NIN details do not match");
//       }

//       verifiedFirstName = bvnData.firstName;
//       verifiedLastName = bvnData.lastName;
//       verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
//     }

//     // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
//     // ------------------ Conditional Proof Uploads ------------------
//     let selfiePath = req.files?.selfie?.[0]?.path || null;
//     let proofAddressPath = null;
//     let proofId = { front: null, back: null };

//     // If BVN and NIN are both provided, no need for extra proof documents
//     if (!(bvn && nin_number)) {
//       proofAddressPath = req.files?.proof_address?.[0]?.path || null;
//       proofId = {
//         front: req.files?.proof_id_front?.[0]?.path || null,
//         back: req.files?.proof_id_back?.[0]?.path || null,
//       };
//     } else {
//       console.log("✅ BVN & NIN provided — skipping proof uploads.");
//     }

//     // ✅ 5. Save to DB
//     const kycData = new Kyc({
//       firstname: verifiedFirstName,
//       lastname: verifiedLastName,
//       gender: gender.toUpperCase(),
//       dob: verifiedDob,
//       bvn, // This is the encrypted BVN
//       nin_number, // This is the encrypted NIN
//       nin_user_id,
//       phone_number,
//       address,
//       state,
//       city,
//       country,
//       id_type: id_type.toUpperCase(),
//       id_number,
//       id_expiry,
//       selfie: selfiePath,
//       proof_address: proofAddressPath,
//       proof_id: proofId,
//       user_id: userId,
//     });

//     await kycData.save({ session });
//     await session.commitTransaction();
//     setImmediate(() => cleanupFiles(req.files));

//     return res.status(201).json({
//       message: "KYC submitted successfully and is under review",
//       data: kycData,
//     });
//   } catch (error) {
//     console.error("❌ KYC submission error:", error.message);
//     await cleanupFiles(req.files);
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({ message: error.message || "Internal server error" });
//   }
// };

// // --------------------- Helper: Generate Compliant NIN User ID ---------------------
// /**
//  * Generates a random NIN User ID compliant with 9PSB format: 6 letters followed by a hyphen and 4 digits (e.g., 'ABCDEF-0123').
//  * @returns {string} The formatted NIN User ID.
//  */
// const generateNinUserIdFallback = () => {
//     // Generates a random 6-letter string (e.g., 'AJKLSN')
//     const randomLetters = Array.from({ length: 6 }, () => 
//         String.fromCharCode(65 + Math.floor(Math.random() * 26)) // 65 is 'A'
//     ).join('');
//     
//     // Generates a random 4-digit string (e.g., '5842')
//     const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); 
//     
//     return `${randomLetters}-${randomDigits}`;
// };

// // --------------------- Admin Updates KYC ---------------------
// const adminUpdateKycStatus = async (req, res) => {
//     // 🔒 Assumed: Admin role check is done before this function runs or at the start
//     if (!req.user || req.user.role !== "admin")
//         return res.status(403).json({ message: "Forbidden: admin only" });

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { id, status, rejectionReason } = req.body;
//         if (!id || !status) throw new Error("KYC ID and status are required");

//         // Populate user details along with KYC data
//         const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
//         if (!newKyc) throw new Error("KYC record not found");

//         newKyc.status = status.toUpperCase();
//         if (status.toUpperCase() === "REJECTED" && rejectionReason)
//             newKyc.rejectionReason = rejectionReason;

//         // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
//         await newKyc.save({ session });

//         // ======================= WALLET CREATION LOGIC =======================
//         if (status.toUpperCase() === "APPROVED") {

//             const isNigerianUser = newKyc.country.toLowerCase() === "nigeria";

//             if (isNigerianUser) {
//                 // 2. 🇳🇬 NIGERIAN USER: CREATE PRIMARY NAIRA (9PSB) WALLET ONLY
//                 
//                 // ------------------ NIN/IDENTITY DECRYPTION & VALIDATION ------------------
//                 const decryptedNin = newKyc.nin_number ? decrypt(newKyc.nin_number) : null;
//                 const decryptedBvn = newKyc.bvn ? decrypt(newKyc.bvn) : null; 

//                 const nin = decryptedNin; 
//                 let nationalIdentityNo = null;

//                 if (nin) {
//                     const cleanedNin = nin.trim();
//                     if (cleanedNin.length !== 11 || !/^\d+$/.test(cleanedNin)) {
//                         throw new Error(`CRITICAL DATA ERROR: Decrypted NIN ('${cleanedNin}') is not 11 digits. Please check user's Kyc record in DB.`);
//                     }
//                     nationalIdentityNo = cleanedNin;
//                 } else {
//                     throw new Error("CRITICAL DATA ERROR: NIN is null or missing for a Nigerian user.");
//                 }
//                 // --------------------------------------------------------------------------

//                 // Format DOB (dd/MM/yyyy)
//                 const dob = new Date(newKyc.dob);
//                 const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

//                 // Map gender string to required integer code (0=Male, 1=Female)
//                 const genderCode = newKyc.gender === 'MALE' ? 0 : (newKyc.gender === 'FEMALE' ? 1 : null);
//                 
//                 if (genderCode === null) {
//                     throw new Error(`Invalid or missing gender in KYC record: ${newKyc.gender}`);
//                 }

//                 const payload = {
//                     transactionTrackingRef: `TX-${Date.now()}`,
//                     lastName: newKyc.lastname,
//                     otherNames: newKyc.firstname,
//                     accountName: `${newKyc.firstname} ${newKyc.lastname}`,
//                     phoneNo: newKyc.phone_number,
//                     gender: genderCode, 
//                     dateOfBirth: formattedDOB,
//                     address: newKyc.address,
//                     email: newKyc.user_id.email,
//                     nationalIdentityNo: nationalIdentityNo, 
//                     ninUserId: newKyc.nin_user_id || (nationalIdentityNo ? generateNinUserIdFallback() : null), 
//                     bvn: decryptedBvn || null, 
//                 };

//                 const walletData = await createNairaWallet(payload); // 💥 Failure here aborts transaction

//                 // CRITICAL: Use compound key (user_id, currency) and add required walletType
//                 await Wallet.findOneAndUpdate(
//                     { user_id: newKyc.user_id._id, currency: "NGN" }, 
//                     {
//                         currency: "NGN", 
//                         walletType: "USER", 
//                         accountNumber: walletData.data.accountNumber, 
//                         accountName: walletData.data.fullName,      
//                         provider: "9PSB",
//                         status: "ACTIVE",
//                     },
//                     { 
//                         upsert: true, 
//                         new: true, 
//                         session 
//                     } 
//                 );
//                 console.log(`✅ NGN 9PSB wallet successfully created for ${newKyc.user_id.email}`);

//             } else {
//                 // 3. 🌐 NON-NIGERIAN USER: CREATE PRIMARY USD (BLOCKRADAR) WALLET ONLY
//                 try {
//                     await createBlockradarWallet({ 
//                         userId: newKyc.user_id._id,
//                         email: newKyc.user_id.email,
//                         name: `${newKyc.firstname} ${newKyc.lastname}`,
//                         currency: "USD",
//                     });
//                     console.log(`✅ USD Blockradar wallet successfully created for ${newKyc.user_id.email}`);
//                 } catch (err) {
//                     // Failure is critical since this is the only wallet for them.
//                     console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
//                     throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
//                 }
//             }
//         }
//         // =====================================================================

//         // Commit all changes (KYC status + Wallet saves/updates) if successful
//         await session.commitTransaction(); 
//         session.endSession();
//         return res.status(200).json({ message: `KYC status updated to ${status}` });

//     } catch (error) { 
//         // 🛑 Centralized rollback if any step (DB save or API call) failed
//         console.error("❌ Update KYC error:", error.message);
//         await session.abortTransaction();
//         session.endSession();
//         // Return the specific error message to the admin
//         return res.status(500).json({ message: error.message });
//     }
// };
// /* -------------------------------------------------------------------------- */
// /*                            ADMIN: Get All KYC Records                      */
// /* -------------------------------------------------------------------------- */
// const getAllKycRecords = async (req, res) => {
//   try {
//     const kycRecords = await Kyc.find().populate(
//       "user_id",
//       "email firstName lastName"
//     );
//     return res.status(200).json({
//       message: "KYC records fetched successfully",
//       data: kycRecords,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching KYC records:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                          USER/ADMIN: Get Single KYC Record                 */
// /* -------------------------------------------------------------------------- */
// const getSingleKyc = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { searchByUserId = false } = req.query;
//     let kycRecord;

//     if (req.user.role === "admin") {
//       if (searchByUserId === "true") {
//         kycRecord = await Kyc.findOne({ user_id: id }).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       } else {
//         kycRecord = await Kyc.findById(id).populate(
//           "user_id",
//           "email firstName lastName"
//         );
//       }
//     } else {
//       kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
//         "user_id",
//         "email firstName lastName"
//       );
//     }

//     if (!kycRecord) {
//       return res.status(404).json({ message: "KYC record not found" });
//     }

//     return res.status(200).json({
//       message: "KYC record fetched successfully",
//       data: kycRecord,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching single KYC record:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                                   EXPORTS                                  */
// /* -------------------------------------------------------------------------- */
// module.exports = {
//   submitKYC,
//   adminUpdateKycStatus,
//   getAllKycRecords,
//   getSingleKyc,
// };

// ONLY ONE ACCOUNT PER USER
const mongoose = require("mongoose");
const Joi = require("joi");
const Kyc = require("../models/kycModel");
// NOTE: Assuming Wallet model, createNairaWallet, and createBlockradarWallet are imported from elsewhere
const Wallet = require("../models/walletModel");
const { createNairaWallet } = require("../services/providers/ninePSBServices");
const { createBlockradarWallet } = require("../services/providers/blockrader");

const cloudinary = require("cloudinary").v2;
const extractPublicId = require("../utilities/extractPublicId");
const { verifyBVN, verifyNIN } = require("../services/prembly");

// ✅ FIX 1: Import the decryption utility
const { decrypt } = require('../utilities/encryptionUtils');


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
  bvn: Joi.string().optional(),
  nin_number: Joi.string().optional(),
  id_type: Joi.string().required(),
  id_number: Joi.string().required(),
  id_expiry: Joi.string().optional(),
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
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.warn("⚠️ Cleanup failed:", e.message);
    }
  }
}

// --------------------- Controller: Submit KYC ---------------------
const submitKYC = async (req, res) => {
if (!req.user || !req.user.id) {
  return res.status(401).json({ message: "Unauthorized: No user context found" });
}

const userId = req.user.id; 


  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ✅ 1. Validate request body
    const { error } = kycSchema.validate(req.body);
    if (error) {
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
      nin_user_id,
      phone_number,
      address,
      state,
      city,
      country,
      id_type,
      id_number,
      id_expiry,
    } = req.body;


    // ✅ 2. Prevent duplicate KYC requests
    const existingKYC = await Kyc.findOne({
      user_id: userId,
      status: { $in: ["PENDING", "APPROVED"] },
    }).session(session);
    if (existingKYC) {
      await cleanupFiles(req.files);
      await session.abortTransaction();
      return res.status(400).json({ message: "KYC already submitted or approved" });
    }

    // ✅ 3. Nigerian-specific BVN + NIN verification
    let verifiedFirstName = firstname.trim();
    let verifiedLastName = lastname.trim();
    let verifiedDob = dob;

    if (country.toLowerCase() === "nigeria") {
      if (!bvn || !nin_number) {
        throw new Error("BVN and NIN are required for Nigerian users");
      }

      // 💡 NOTE: Decrypting during the initial submission verification (Prembly) might also be necessary here
      // Assuming verifyBVN and verifyNIN handle decryption internally or the submitted data is not encrypted yet.

      const bvnResult = await verifyBVN(bvn);
      const ninResult = await verifyNIN(nin_number);

      if (!bvnResult?.status) throw new Error("BVN verification failed");
      if (!ninResult?.status) throw new Error("NIN verification failed");

      const bvnData = bvnResult.data;
      const ninData = ninResult.data || ninResult.nin_data;

      const bvnFirst = bvnData.firstName?.toLowerCase();
      const bvnLast = bvnData.lastName?.toLowerCase();
      const ninFirst = (ninData.firstName || ninData.firstname)?.toLowerCase();
      const ninLast = (ninData.lastName || ninData.surname)?.toLowerCase();

      if (bvnFirst !== ninFirst || bvnLast !== ninLast) {
        throw new Error("BVN and NIN details do not match");
      }

      verifiedFirstName = bvnData.firstName;
      verifiedLastName = bvnData.lastName;
      verifiedDob = bvnData.dateOfBirth || ninData.dateOfBirth || dob;
    }

    // ✅ 4. 🔹 PLACE THE CONDITIONAL UPLOAD SNIPPET HERE 🔹
    // ------------------ Conditional Proof Uploads ------------------
    let selfiePath = req.files?.selfie?.[0]?.path || null;
    let proofAddressPath = null;
    let proofId = { front: null, back: null };

    // If BVN and NIN are both provided, no need for extra proof documents
    if (!(bvn && nin_number)) {
      proofAddressPath = req.files?.proof_address?.[0]?.path || null;
      proofId = {
        front: req.files?.proof_id_front?.[0]?.path || null,
        back: req.files?.proof_id_back?.[0]?.path || null,
      };
    } else {
      console.log("✅ BVN & NIN provided — skipping proof uploads.");
    }

    // ✅ 5. Save to DB
    const kycData = new Kyc({
      firstname: verifiedFirstName,
      lastname: verifiedLastName,
      gender: gender.toUpperCase(),
      dob: verifiedDob,
      bvn, // This is the encrypted BVN
      nin_number, // This is the encrypted NIN
      nin_user_id,
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
    });

    await kycData.save({ session });
    await session.commitTransaction();
    setImmediate(() => cleanupFiles(req.files));

    return res.status(201).json({
      message: "KYC submitted successfully and is under review",
      data: kycData,
    });
  } catch (error) {
    console.error("❌ KYC submission error:", error.message);
    await cleanupFiles(req.files);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// --------------------- Helper: Generate Compliant NIN User ID ---------------------
/**
 * Generates a random NIN User ID compliant with 9PSB format: 6 letters followed by a hyphen and 4 digits (e.g., 'ABCDEF-0123').
 * @returns {string} The formatted NIN User ID.
 */
const generateNinUserIdFallback = () => {
    // Generates a random 6-letter string (e.g., 'AJKLSN')
    const randomLetters = Array.from({ length: 6 }, () => 
      String.fromCharCode(65 + Math.floor(Math.random() * 26)) // 65 is 'A'
    ).join('');
    
    // Generates a random 4-digit string (e.g., '5842')
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); 
    
    return `${randomLetters}-${randomDigits}`;
};

// --------------------- Admin Updates KYC ---------------------
const adminUpdateKycStatus = async (req, res) => {
    // 🔒 Assumed: Admin role check is done before this function runs or at the start
    if (!req.user || req.user.role !== "admin")
        return res.status(403).json({ message: "Forbidden: admin only" });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id, status, rejectionReason } = req.body;
        if (!id || !status) throw new Error("KYC ID and status are required");

        // Populate user details along with KYC data
        const newKyc = await Kyc.findById(id).populate("user_id", "email firstName lastName").session(session);
        if (!newKyc) throw new Error("KYC record not found");

        newKyc.status = status.toUpperCase();
        if (status.toUpperCase() === "REJECTED" && rejectionReason)
            newKyc.rejectionReason = rejectionReason;

        // 1. Save the new KYC status (APPROVED/REJECTED) within the transaction
        await newKyc.save({ session });

        // ======================= WALLET CREATION LOGIC =======================
        if (status.toUpperCase() === "APPROVED") {

            const isNigerianUser = newKyc.country.toLowerCase() === "nigeria";

            if (isNigerianUser) {
                // 2. 🇳🇬 NIGERIAN USER: CREATE PRIMARY NAIRA (9PSB) WALLET ONLY
                
                // ------------------ NIN/IDENTITY DECRYPTION & VALIDATION ------------------
                const decryptedNin = newKyc.nin_number ? decrypt(newKyc.nin_number) : null;
                const decryptedBvn = newKyc.bvn ? decrypt(newKyc.bvn) : null; 

                const nin = decryptedNin; 
                let nationalIdentityNo = null;

                if (nin) {
                    const cleanedNin = nin.trim();
                    if (cleanedNin.length !== 11 || !/^\d+$/.test(cleanedNin)) {
                        throw new Error(`CRITICAL DATA ERROR: Decrypted NIN ('${cleanedNin}') is not 11 digits. Please check user's Kyc record in DB.`);
                    }
                    nationalIdentityNo = cleanedNin;
                } else {
                    throw new Error("CRITICAL DATA ERROR: NIN is null or missing for a Nigerian user.");
                }
                // --------------------------------------------------------------------------

                // Format DOB (dd/MM/yyyy)
                const dob = new Date(newKyc.dob);
                const formattedDOB = `${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()}`;

                // Map gender string to required integer code (0=Male, 1=Female)
                const genderCode = newKyc.gender === 'MALE' ? 0 : (newKyc.gender === 'FEMALE' ? 1 : null);
                
                if (genderCode === null) {
                    throw new Error(`Invalid or missing gender in KYC record: ${newKyc.gender}`);
                }

                // Prepare Payload
                const payload = {
                    transactionTrackingRef: `TX-${Date.now()}`,
                    lastName: newKyc.lastname,
                    otherNames: newKyc.firstname,
                    accountName: `${newKyc.firstname} ${newKyc.lastname}`,
                    phoneNo: newKyc.phone_number,
                    gender: genderCode, 
                    dateOfBirth: formattedDOB,
                    address: newKyc.address,
                    email: newKyc.user_id.email,
                    nationalIdentityNo: nationalIdentityNo, 
                    // Use stored ninUserId or fallback ONLY if needed
                    ninUserId: newKyc.nin_user_id || generateNinUserIdFallback(), 
                    bvn: decryptedBvn || null, 
                };

                let walletData = null;
                
                // 🚨 FIX: Isolate the API call and check for the paradoxical success error
                try {
                    walletData = await createNairaWallet(payload);
                } catch (apiError) {
                    // Check if the error message contains the known success string.
                    if (apiError.message.includes("Account Opening successful")) {
                        console.warn(
                            "⚠️ 9PSB Paradoxical Success: Account opening succeeded on the 9PSB side, but the 'createNairaWallet' service function threw an error. This likely means the successful response body was malformed, missing the 'data' field, or missing required sub-fields (accountNumber/fullName)."
                        );
                        // We must re-throw, as we cannot safely update our DB without the account number.
                        throw new Error(`9PSB Wallet Creation failed: Account Opening successful (Database rollback initiated because successful response data was missing or incomplete. Check the 9PSB service function code!)`);
                    } else {
                        // Re-throw a genuine failure
                        throw apiError; 
                    }
                }
                
                // Ensure walletData is present and structured correctly before continuing
                if (!walletData?.data?.accountNumber || !walletData?.data?.fullName) {
                    // This handles cases where the call didn't throw, but returned bad data
                    throw new Error("9PSB Wallet Creation failed: API response was missing required 'accountNumber' or 'fullName' fields.");
                }


                // CRITICAL: Use compound key (user_id, currency) and add required walletType
                await Wallet.findOneAndUpdate(
                    { user_id: newKyc.user_id._id, currency: "NGN" }, 
                    {
                        currency: "NGN", 
                        walletType: "USER", 
                        accountNumber: walletData.data.accountNumber, 
                        accountName: walletData.data.fullName,      
                        provider: "9PSB",
                        status: "ACTIVE",
                    },
                    { 
                        upsert: true, 
                        new: true, 
                        session 
                    } 
                );
                console.log(`✅ NGN 9PSB wallet successfully created for ${newKyc.user_id.email}`);

            } else {
                // 3. 🌐 NON-NIGERIAN USER: CREATE PRIMARY USD (BLOCKRADAR) WALLET ONLY
                try {
                    await createBlockradarWallet({ 
                        userId: newKyc.user_id._id,
                        email: newKyc.user_id.email,
                        name: `${newKyc.firstname} ${newKyc.lastname}`,
                        currency: "USD",
                    });
                    console.log(`✅ USD Blockradar wallet successfully created for ${newKyc.user_id.email}`);
                } catch (err) {
                    // Failure is critical since this is the only wallet for them.
                    console.error("❌ CRITICAL: Blockradar failed for non-Nigerian user (Rolling back).", err.message);
                    throw new Error("Failed to create primary USD wallet via Blockradar: " + err.message);
                }
            }
        }
        // =====================================================================

        // Commit all changes (KYC status + Wallet saves/updates) if successful
        await session.commitTransaction(); 
        session.endSession();
        return res.status(200).json({ message: `KYC status updated to ${status}` });

    } catch (error) { 
        // 🛑 Centralized rollback if any step (DB save or API call) failed
        console.error("❌ Update KYC error:", error.message);
        await session.abortTransaction();
        session.endSession();
        // Return the specific error message to the admin
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};
/* -------------------------------------------------------------------------- */
/*                            ADMIN: Get All KYC Records                      */
/* -------------------------------------------------------------------------- */
const getAllKycRecords = async (req, res) => {
  try {
    const kycRecords = await Kyc.find().populate(
      "user_id",
      "email firstName lastName"
    );
    return res.status(200).json({
      message: "KYC records fetched successfully",
      data: kycRecords,
    });
  } catch (error) {
    console.error("❌ Error fetching KYC records:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                          USER/ADMIN: Get Single KYC Record                 */
/* -------------------------------------------------------------------------- */
const getSingleKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { searchByUserId = false } = req.query;
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
      kycRecord = await Kyc.findOne({ user_id: req.user._id }).populate(
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

/* -------------------------------------------------------------------------- */
/*                                   EXPORTS                                  */
/* -------------------------------------------------------------------------- */
module.exports = {
  submitKYC,
  adminUpdateKycStatus,
  getAllKycRecords,
  getSingleKyc,
};
