// require('dotenv').config();
// const axios = require('axios');

// // --------------------- Configuration and Token Cache ---------------------
// const WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;

// // Correct API Endpoints based on document:
// const AUTH_URL = `${WAAS_BASE_URL}api/v1/authenticate`;
// // Updated URL based on the common structure (assuming 'open wallet' is not a single path segment)
// // If the actual API path is different, this must be adjusted.
// const WALLET_OPENING_URL = `${WAAS_BASE_URL}api/v1/openwallet`; 
// const DEPOSIT_URL = `${WAAS_BASE_URL}api/v1/credit/transfer`; 

// // In-memory cache for the token
// let accessToken = null;
// let accessTokenExpiresAt = 0; // Timestamp when the token expires (in milliseconds)

// // --------------------- Core Function 1: Authentication ---------------------

// /**
//  * Handles FINSTACK WAAS authentication, returns a valid token, and caches it.
//  * This is used for all subsequent 9PSB calls (Account Creation, Deposit).
//  * @returns {string} The valid access token.
//  */
// const authenticateNinePSB = async () => {
//     // 1. Check if the token is still valid (1-minute buffer)
//     if (accessToken && Date.now() < accessTokenExpiresAt) {
//         return accessToken;
//     }

//     console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
    
//     // 2. Prepare the authentication payload
//     const payload = {
//         username: process.env.NINEPSB_WAAS_USERNAME,
//         password: process.env.NINEPSB_WAAS_PASSWORD,
//         clientid: process.env.NINEPSB_WAAS_CLIENT_ID,
//         clientSecret: process.env.NINEPSB_WAAS_CLIENT_SECRET
//     };

//     try {
//         // 3. Make the API call
//         const response = await axios.post(AUTH_URL, payload);

//         // Based on Postman snippet, successful message can be 'successful' or status 'Success'
//         if (response.data.status !== 'Success' && response.data.message !== 'successful' || !response.data.accessToken) {
//             throw new Error(`Authentication failed: ${response.data.message || 'Unknown error'}`);
//         }

//         const data = response.data;
        
//         // 4. Cache the new token and calculate expiry time
//         // Use default 3600 if 'expiresin' is missing or invalid.
//         const expiresInSeconds = parseInt(data.expiresin, 10) || 3600; 
//         // Set expiry time 60 seconds (60000ms) earlier for buffer
//         accessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000) - 60000; 
//         accessToken = data.accessToken;

//         console.log("✅ New NINEPSB WAAS token generated successfully.");
//         return accessToken;
//     } catch (error) {
//         console.error("❌ NINEPSB WAAS Authentication Error:", error.message);
//         // Throw a generic error to the caller (e.g., controller)
//         throw new Error("Failed to authenticate with 9PSB WAAS service.");
//     }
// };

// // --------------------- Core Function 2: Wallet Creation (Account Creation) ---------------------

// /**
//  * Creates a new customer wallet account via FINSTACK WAAS (Use Case 2).
//  * @param {object} userData - Pre-formatted data from the controller.
//  * @returns {object} The API response data.
//  */
// // const createNairaWallet = async (userData) => {
// //     const token = await authenticateNinePSB();

// //     // Mapping: API expects otherNames for first name. Gender 0=Male, 1=Female.
// //     const genderCode = userData.gender === 'MALE' ? 0 : (userData.gender === 'FEMALE' ? 1 : 0);
    
// //     const payload = {
// //         transactionTrackingRef: userData.transactionTrackingRef,
// //         lastName: userData.lastName,
// //         otherNames: userData.otherNames, // This is the user's first name
// //         phoneNo: userData.phoneNo,
// //         gender: genderCode, 
// //         dateOfBirth: userData.dateOfBirth, // Format: dd/MM/yyyy
// //         address: userData.address,
// //         bvn: userData.bvn || null,
// //         nationalIdentityNo: userData.nationalIdentityNo || null,
// //         ninUserId: userData.ninUserId || null
// //     };
    
// //     // Remove null/undefined keys before sending
// //     Object.keys(payload).forEach(key => (payload[key] === null || payload[key] === undefined) && delete payload[key]);

// //     try {
// //         const response = await axios.post(WALLET_OPENING_URL, payload, {
// //             headers: {
// //                 'Authorization': `Bearer ${token}`,
// //                 'Content-Type': 'application/json'
// //             }
// //         });

// //         if (response.data.status !== 'Success' || !response.data.data.account_number) {
// //             // Provide specific API error message
// //             const apiError = response.data.message || (response.data.data ? response.data.data.data.message : 'Unknown 9PSB API error');
// //             throw new Error(`9PSB Wallet Creation failed: ${apiError}`);
// //         }
        
// //         // Return the whole data object which contains the wallet details
// //         return response.data; 
// //     } catch (error) {
// //         // Log the error and re-throw with a meaningful message for the controller to catch and roll back
// //         console.error("❌ 9PSB Wallet Creation Error:", error.message);
// //         throw new Error(error.message || "Failed to create Naira wallet via 9PSB.");
// //     }
// // };


// // // --------------------- Core Function 3: Deposit (Credit) ---------------------

// // /**
// //  * Deposits funds (credits the customer's wallet) via FINSTACK WAAS (Use Case 3).
// //  * @param {string} accountNo - The customer wallet account number.
// //  * @param {number} amount - The amount to credit.
// //  * @returns {object} The API response data.
// //  */
// // const depositFunds = async (accountNo, amount) => {
// //     const token = await authenticateNinePSB();
    
// //     const transactionId = `DEPOSIT-${Date.now()}`;
// //     const narration = `Credit for wallet ${accountNo}`;

// //     // Mandatory fields for Single Wallet Credit (Deposit)
// //     const payload = {
// //         accountNo: accountNo,
// //         // Ensure amount is passed as a string with 2 decimal places as required by most payment APIs
// //         totalAmount: amount.toFixed(2).toString(), 
// //         transactionId: transactionId,
// //         narration: narration,
// //         merchant: { 
// //             isFee: false, 
// //         }
// //     };

// //     try {
// //         const response = await axios.post(DEPOSIT_URL, payload, {
// //             headers: {
// //                 'Authorization': `Bearer ${token}`,
// //                 'Content-Type': 'application/json'
// //             }
// //         });

// //         if (response.data.status !== 'Success') {
// //             const apiError = response.data.message || (response.data.data ? response.data.data.message : 'Unknown 9PSB API error');
// //             throw new Error(`9PSB Deposit failed: ${apiError}`);
// //         }

// //         return response.data;
// //     } catch (error) {
// //         console.error("❌ 9PSB Deposit Error:", error.message);
// //         throw new Error(error.message || "Failed to deposit funds into the wallet.");
// //     }
// // };

// // // Mock function needed for your controller's Blockradar fallback/secondary logic
// // const getNairaWalletBalance = async (accountNumber) => {
// //     console.log("🔹 Mock: getNairaWalletBalance called for:", accountNumber);
// //     return 50000; 
// // };
// const createNairaWallet = async (userData) => {
//     const token = await authenticateNinePSB();

//     // Mapping: API expects otherNames for first name. Gender 0=Male, 1=Female.
//     // CRITICAL IMPROVEMENT: Throw error if gender is neither MALE nor FEMALE 
//     let genderCode;
//     if (userData.gender === 'MALE') {
//         genderCode = 0;
//     } else if (userData.gender === 'FEMALE') {
//         genderCode = 1;
//     } else {
//         // If gender is mandatory and only MALE/FEMALE are supported by 9PSB
//         throw new Error(`Invalid or unsupported gender code provided for 9PSB: ${userData.gender}. Only MALE (0) and FEMALE (1) are supported.`);
//     }
    
//     const payload = {
//         transactionTrackingRef: userData.transactionTrackingRef,
//         lastName: userData.lastName,
//         otherNames: userData.otherNames, // This is the user's first name
//         phoneNo: userData.phoneNo,
//         gender: genderCode, 
//         dateOfBirth: userData.dateOfBirth, // Format: dd/MM/yyyy
//         address: userData.address,
//         bvn: userData.bvn || null,
//         nationalIdentityNo: userData.nationalIdentityNo || null,
//         ninUserId: userData.ninUserId || null
//     };
    
//     // Remove null/undefined keys before sending
//     Object.keys(payload).forEach(key => (payload[key] === null || payload[key] === undefined) && delete payload[key]);

//     try {
//         const response = await axios.post(WALLET_OPENING_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         if (response.data.status !== 'Success' || !response.data.data.account_number) {
//             // Provide specific API error message
//             const apiError = response.data.message || (response.data.data ? response.data.data.data.message : 'Unknown 9PSB API error');
//             throw new Error(`9PSB Wallet Creation failed: ${apiError}`);
//         }
        
//         // Return the whole data object which contains the wallet details
//         return response.data; 
//     } catch (error) {
//         // Log the error and re-throw with a meaningful message for the controller to catch and roll back
//         console.error("❌ 9PSB Wallet Creation Error:", error.message);
//         throw new Error(error.message || "Failed to create Naira wallet via 9PSB.");
//     }
// };


// // --------------------- Core Function 3: Deposit (Credit) ---------------------

// /**
//  * Deposits funds (credits the customer's wallet) via FINSTACK WAAS (Use Case 3).
//  * @param {string} accountNo - The customer wallet account number.
//  * @param {number} amount - The amount to credit.
//  * @returns {object} The API response data.
//  */
// const depositFunds = async (accountNo, amount) => {
//     const token = await authenticateNinePSB();
    
//     const transactionId = `DEPOSIT-${Date.now()}`;
//     const narration = `Credit for wallet ${accountNo}`;

//     // Mandatory fields for Single Wallet Credit (Deposit)
//     const payload = {
//         accountNo: accountNo,
//         // Ensure amount is passed as a string with 2 decimal places as required by most payment APIs
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     try {
//         const response = await axios.post(DEPOSIT_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         if (response.data.status !== 'Success') {
//             const apiError = response.data.message || (response.data.data ? response.data.data.message : 'Unknown 9PSB API error');
//             throw new Error(`9PSB Deposit failed: ${apiError}`);
//         }

//         return response.data;
//     } catch (error) {
//         console.error("❌ 9PSB Deposit Error:", error.message);
//         throw new Error(error.message || "Failed to deposit funds into the wallet.");
//     }
// };

// // Mock function needed for your controller's Blockradar fallback/secondary logic
// const getNairaWalletBalance = async (accountNumber) => {
//     console.log("🔹 Mock: getNairaWalletBalance called for:", accountNumber);
//     return 50000; 
// };



// // module.exports = { authenticateNinePSB, createNairaWallet, getNairaWalletBalance, depositFunds };
// require('dotenv').config();
// const axios = require('axios');

// // --------------------- Configuration and Token Cache ---------------------
// const WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;

// // API Endpoints: Ensure these match the WAAS documentation exactly.
// const AUTH_URL = `${WAAS_BASE_URL}api/v1/authenticate`;
// const WALLET_OPENING_URL = `${WAAS_BASE_URL}api/v1/openwallet`; 
// const DEPOSIT_URL = `${WAAS_BASE_URL}api/v1/credit/transfer`; 

// // In-memory cache for the token
// let accessToken = null;
// // Timestamp when the token expires (in milliseconds)
// let accessTokenExpiresAt = 0; 

// // --------------------- Core Function 1: Authentication ---------------------

// /**
//  * Handles FINSTACK WAAS authentication, returns a valid token, and caches it.
//  * This is used for all subsequent 9PSB calls (Account Creation, Deposit).
//  * * @async
//  * @returns {Promise<string>} The valid access token.
//  * @throws {Error} If authentication fails.
//  */
// const authenticateNinePSB = async () => {
//     // Check if the token is still valid (60-second buffer)
//     if (accessToken && Date.now() < accessTokenExpiresAt) {
//         return accessToken;
//     }

//     console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
//     console.log("NINEPSB_BASE_URL check:", process.env.NINEPSB_WAAS_BASE_URL);
// // You should see: http://102.216.128.75:9090/waas/
    
//     // Prepare the authentication payload
//     const payload = {
//         username: process.env.NINEPSB_WAAS_USERNAME,
//         password: process.env.NINEPSB_WAAS_PASSWORD,
//         clientid: process.env.NINEPSB_WAAS_CLIENT_ID,
//         clientSecret: process.env.NINEPSB_WAAS_CLIENT_SECRET
//     };

//     try {
//         // Make the API call
//         const response = await axios.post(AUTH_URL, payload);
//         const data = response.data;

//         // Check for success status and the presence of the access token
//         const isSuccess = data.status === 'Success' || data.message === 'successful';

//         if (!isSuccess || !data.accessToken) {
//             throw new Error(`Authentication failed: ${data.message || 'Access token missing in response.'}`);
//         }
        
//         // Cache the new token and calculate expiry time
//         // Use default 3600 seconds if 'expiresin' is missing or invalid.
//         const expiresInSeconds = parseInt(data.expiresin, 10) || 3600; 
        
//         // Set expiry time 60 seconds (60000ms) earlier for buffer
//         accessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000) - 60000; 
//         accessToken = data.accessToken;

//         console.log("✅ New NINEPSB WAAS token generated successfully.");
//         return accessToken;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;
            
//         console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
//         // Throw a generic error to the caller (e.g., controller)
//         throw new Error("Failed to authenticate with 9PSB WAAS service.");
//     }
// };

// // --------------------- Core Function 2: Wallet Creation (Account Creation) ---------------------

// /**
//  * Creates a new customer wallet account via FINSTACK WAAS (Use Case 2).
//  * * @async
//  * @param {object} userData - Pre-formatted customer data.
//  * @param {string} userData.transactionTrackingRef - Unique reference for the transaction.
//  * @param {string} userData.lastName
//  * @param {string} userData.otherNames - Customer's first name (API requires 'otherNames' for first name).
//  * @param {string} userData.phoneNo
//  * @param {'MALE' | 'FEMALE'} userData.gender
//  * @param {string} userData.dateOfBirth - Format: dd/MM/yyyy
//  * @param {string} userData.address
//  * @param {string} [userData.bvn]
//  * @returns {Promise<object>} The API response data containing wallet details.
//  * @throws {Error} If wallet creation fails.
//  */
// const createNairaWallet = async (userData) => {
//     const token = await authenticateNinePSB();

//     // Map gender string to required API integer code (0=Male, 1=Female)
//     let genderCode;
//     if (userData.gender === 'MALE') {
//         genderCode = 0;
//     } else if (userData.gender === 'FEMALE') {
//         genderCode = 1;
//     } else {
//         throw new Error(`Invalid or unsupported gender code provided for 9PSB: ${userData.gender}. Only 'MALE' (0) and 'FEMALE' (1) are supported.`);
//     }
    
//     const rawPayload = {
//         transactionTrackingRef: userData.transactionTrackingRef,
//         lastName: userData.lastName,
//         otherNames: userData.otherNames, // This is the user's first name
//         phoneNo: userData.phoneNo,
//         gender: genderCode, 
//         dateOfBirth: userData.dateOfBirth, // Format: dd/MM/yyyy
//         address: userData.address,
//         bvn: userData.bvn || null,
//         nationalIdentityNo: userData.nationalIdentityNo || null,
//         ninUserId: userData.ninUserId || null
//     };
    
//     // Filter out keys with null or undefined values for a cleaner payload
//     const payload = Object.fromEntries(
//         Object.entries(rawPayload).filter(([_, v]) => v != null)
//     );

//     try {
//         const response = await axios.post(WALLET_OPENING_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         const data = response.data;
        
//         if (data.status !== 'Success' || !data.data || !data.data.account_number) {
//             // Attempt to get the most specific error message
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error (missing account_number)';
//             throw new Error(`9PSB Wallet Creation failed: ${apiError}`);
//         }
        
//         // Return the whole data object which contains the wallet details
//         return data; 
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;
            
//         console.error("❌ 9PSB Wallet Creation Error:", errorMessage);
//         throw new Error(error.message || "Failed to create Naira wallet via 9PSB.");
//     }
// };


// // --------------------- Core Function 3: Deposit (Credit) ---------------------

// /**
//  * Deposits funds (credits the customer's wallet) via FINSTACK WAAS (Use Case 3).
//  * * @async
//  * @param {string} accountNo - The customer wallet account number.
//  * @param {number} amount - The amount to credit.
//  * @returns {Promise<object>} The API response data.
//  * @throws {Error} If the deposit fails.
//  */
// const depositFunds = async (accountNo, amount) => {
//     const token = await authenticateNinePSB();
    
//     // Generate a unique transaction ID for idempotency/tracking
//     const transactionId = `DEPOSIT-${Date.now()}`;
//     const narration = `Credit for wallet ${accountNo}`;

//     // Mandatory fields for Single Wallet Credit (Deposit)
//     const payload = {
//         accountNo: accountNo,
//         // CRITICAL: Ensure amount is passed as a string with 2 decimal places
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     try {
//         const response = await axios.post(DEPOSIT_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = response.data;

//         if (data.status !== 'Success') {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error';
//             throw new Error(`9PSB Deposit failed: ${apiError}`);
//         }

//         return data;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Deposit Error:", errorMessage);
//         throw new Error(error.message || "Failed to deposit funds into the wallet.");
//     }
// };

// // --------------------- Mock/Fallback Function ---------------------

// /**
//  * MOCK Function: Placeholder for a real implementation to fetch wallet balance.
//  * * @async
//  * @param {string} accountNumber - The wallet account number.
//  * @returns {Promise<number>} A mock balance value.
//  */
// const getNairaWalletBalance = async (accountNumber) => {
//     console.log("🔹 Mock: getNairaWalletBalance called for:", accountNumber);
//     // TODO: Replace this with a real API call when the endpoint is available/needed
//     return 50000; 
// };


// module.exports = { authenticateNinePSB, createNairaWallet, getNairaWalletBalance, depositFunds };


// // module.exports = { authenticateNinePSB, createNairaWallet, getNairaWalletBalance, depositFunds };
// require('dotenv').config();
// const axios = require('axios');

// // --------------------- Configuration and Token Cache ---------------------
// const WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;

// // API Endpoints: Ensure these match the WAAS documentation exactly.
// const AUTH_URL = `${WAAS_BASE_URL}api/v1/authenticate`;
// // ✅ FIX: Added the required underscore (_)
// const WALLET_OPENING_URL = `${WAAS_BASE_URL}api/v1/open_wallet`;
// const DEPOSIT_URL = `${WAAS_BASE_URL}api/v1/credit/transfer`; 

// // In-memory cache for the token
// let accessToken = null;
// // Timestamp when the token expires (in milliseconds)
// let accessTokenExpiresAt = 0; 

// // --------------------- Core Function 1: Authentication ---------------------

// /**
//  * Handles FINSTACK WAAS authentication, returns a valid token, and caches it.
//  * This is used for all subsequent 9PSB calls (Account Creation, Deposit).
//  * * @async
//  * @returns {Promise<string>} The valid access token.
//  * @throws {Error} If authentication fails.
//  */
// const authenticateNinePSB = async () => {
//     // Check if the token is still valid (60-second buffer)
//     if (accessToken && Date.now() < accessTokenExpiresAt) {
//         return accessToken;
//     }

//     console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
//     
//     // Prepare the authentication payload
//     const payload = {
//         username: process.env.NINEPSB_WAAS_USERNAME,
//         password: process.env.NINEPSB_WAAS_PASSWORD,
//         // ✅ FIX 1: Changed 'clientid' to 'clientId' (camelCase fix from previous error)
//         clientId: process.env.NINEPSB_WAAS_CLIENT_ID, 
//         clientSecret: process.env.NINEPSB_WAAS_CLIENT_SECRET
//     };

//     try {
//         // Make the API call
//         const response = await axios.post(AUTH_URL, payload);
//         const data = response.data;

//         // Check for success status and the presence of the access token
//         const isSuccess = data.status === 'Success' || data.message === 'successful';

//         if (!isSuccess || !data.accessToken) {
//             throw new Error(`Authentication failed: ${data.message || 'Access token missing in response.'}`);
//         }
//         
//         // Cache the new token and calculate expiry time
//         // Use default 3600 seconds if 'expiresin' is missing or invalid.
//         const expiresInSeconds = parseInt(data.expiresin, 10) || 3600; 
//         
//         // Set expiry time 60 seconds (60000ms) earlier for buffer
//         accessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000) - 60000; 
//         accessToken = data.accessToken;

//         console.log("✅ New NINEPSB WAAS token generated successfully.");
//         return accessToken;
//     } catch (error) {
//         // Enhanced logging to capture network vs API errors
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             `Network/DNS error: ${error.code || error.message}`;
//             
//         console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
//         // Throw a generic error to the caller (e.g., controller)
//         throw new Error("Failed to authenticate with 9PSB WAAS service.");
//     }
// };

// // --------------------- Core Function 2: Wallet Creation (Account Creation) ---------------------

// /**
//  * Creates a new customer wallet account via FINSTACK WAAS (Use Case 2).
//  * * @async
//  * @param {object} userData - Pre-formatted customer data.
//  * @param {string} userData.transactionTrackingRef - Unique reference for the transaction.
//  * @param {string} userData.lastName
//  * @param {string} userData.otherNames - Customer's first name (API requires 'otherNames' for first name).
//  * @param {string} userData.phoneNo
//  * @param {number} userData.gender - Expected 0 (Male) or 1 (Female).
//  * @param {string} userData.dateOfBirth - Format: dd/MM/yyyy
//  * @param {string} userData.address
//  * @param {string} [userData.bvn]
//  * @returns {Promise<object>} The API response data containing wallet details.
//  * @throws {Error} If wallet creation fails.
//  */
// const createNairaWallet = async (userData) => {
//     const token = await authenticateNinePSB();

//     // ✅ FIX 2: Removed conflicting string-based gender mapping.
//     // The model/controller now passes the correct integer code (0 or 1).
    
//     // Validate that the gender code is the expected number (0 or 1)
//     if (userData.gender !== 0 && userData.gender !== 1) {
//         throw new Error(`Invalid gender format provided for 9PSB. Expected 0 or 1, but received: ${userData.gender}.`);
//     }
//     
//     const rawPayload = {
//         transactionTrackingRef: userData.transactionTrackingRef,
//         lastName: userData.lastName,
//         otherNames: userData.otherNames, // This is the user's first name
//         phoneNo: userData.phoneNo,
//         gender: userData.gender, // 👈 Use the code passed directly (0 or 1)
//         dateOfBirth: userData.dateOfBirth, // Format: dd/MM/yyyy
//         address: userData.address,
//         bvn: userData.bvn || null,
//         nationalIdentityNo: userData.nationalIdentityNo || null,
//         ninUserId: userData.ninUserId || null
//     };
//     
//     // Filter out keys with null or undefined values for a cleaner payload
//     const payload = Object.fromEntries(
//         Object.entries(rawPayload).filter(([_, v]) => v != null)
//     );

//     try {
//         const response = await axios.post(WALLET_OPENING_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         const data = response.data;
//         
//         if (data.status !== 'Success' || !data.data || !data.data.accountNumber) {
//             // Attempt to get the most specific error message
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error (missing account number)';
//             throw new Error(`9PSB Wallet Creation failed: ${apiError}`);
//         }
//         
//         // Return the whole data object which contains the wallet details
//         return data; 
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;
//             
//         console.error("❌ 9PSB Wallet Creation Error:", errorMessage);
//         throw new Error(error.message || "Failed to create Naira wallet via 9PSB.");
//     }
// };


// // --------------------- Core Function 3: Deposit (Credit) ---------------------

// /**
//  * Deposits funds (credits the customer's wallet) via FINSTACK WAAS (Use Case 3).
//  * * @async
//  * @param {string} accountNo - The customer wallet account number.
//  * @param {number} amount - The amount to credit.
//  * @returns {Promise<object>} The API response data.
//  * @throws {Error} If the deposit fails.
//  */
// const depositFunds = async (accountNo, amount) => {
//     const token = await authenticateNinePSB();
//     
//     // Generate a unique transaction ID for idempotency/tracking
//     const transactionId = `DEPOSIT-${Date.now()}`;
//     const narration = `Credit for wallet ${accountNo}`;

//     // Mandatory fields for Single Wallet Credit (Deposit)
//     const payload = {
//         accountNo: accountNo,
//         // CRITICAL: Ensure amount is passed as a string with 2 decimal places
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     try {
//         const response = await axios.post(DEPOSIT_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
//         
//         const data = response.data;

//         if (data.status !== 'Success') {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error';
//             throw new Error(`9PSB Deposit failed: ${apiError}`);
//         }

//         return data;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Deposit Error:", errorMessage);
//         throw new Error(error.message || "Failed to deposit funds into the wallet.");
//     }
// };

// // --------------------- Mock/Fallback Function ---------------------

// /**
//  * MOCK Function: Placeholder for a real implementation to fetch wallet balance.
//  * * @async
//  * @param {string} accountNumber - The wallet account number.
//  * @returns {Promise<number>} A mock balance value.
//  */
// const getNairaWalletBalance = async (accountNumber) => {
//     console.log("🔹 Mock: getNairaWalletBalance called for:", accountNumber);
//     // TODO: Replace this with a real API call when the endpoint is available/needed
//     return 50000; 
// };


// module.exports = { authenticateNinePSB, createNairaWallet, getNairaWalletBalance, depositFunds };

// NEW UPDATE CATCHING CLEANER ERROR

// module.exports = { authenticateNinePSB, createNairaWallet, getNairaWalletBalance, depositFunds };
// module.exports = { authenticateNinePSB, createNairaWallet, getNairaWalletBalance, depositFunds };

// require('dotenv').config();
// const axios = require('axios');

// // --------------------- Configuration and Token Cache ---------------------
// const WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;

// // API Endpoints: Ensure these match the WAAS documentation exactly.
// const AUTH_URL = `${WAAS_BASE_URL}api/v1/authenticate`;
// // ✅ FIX: Added the required underscore (_)
// const WALLET_OPENING_URL = `${WAAS_BASE_URL}api/v1/open_wallet`;
// const DEPOSIT_URL = `${WAAS_BASE_URL}api/v1/credit/transfer`; 

// // In-memory cache for the token
// let accessToken = null;
// // Timestamp when the token expires (in milliseconds)
// let accessTokenExpiresAt = 0; 

// // --------------------- Core Function 1: Authentication ---------------------

// /**
//  * Handles FINSTACK WAAS authentication, returns a valid token, and caches it.
//  * This is used for all subsequent 9PSB calls (Account Creation, Deposit).
//  * * @async
//  * @returns {Promise<string>} The valid access token.
//  * @throws {Error} If authentication fails.
//  */
// const authenticateNinePSB = async () => {
//     // Check if the token is still valid (60-second buffer)
//     if (accessToken && Date.now() < accessTokenExpiresAt) {
//         return accessToken;
//     }

//     console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
//     
//     // Prepare the authentication payload
//     const payload = {
//         username: process.env.NINEPSB_WAAS_USERNAME,
//         password: process.env.NINEPSB_WAAS_PASSWORD,
//         // ✅ FIX 1: Changed 'clientid' to 'clientId' (camelCase fix from previous error)
//         clientId: process.env.NINEPSB_WAAS_CLIENT_ID, 
//         clientSecret: process.env.NINEPSB_WAAS_CLIENT_SECRET
//     };

//     try {
//         // Make the API call
//         const response = await axios.post(AUTH_URL, payload);
//         const data = response.data;

//         // Check for success status and the presence of the access token
//         const isSuccess = data.status === 'Success' || data.message === 'successful';

//         if (!isSuccess || !data.accessToken) {
//             throw new Error(`Authentication failed: ${data.message || 'Access token missing in response.'}`);
//         }
//         
//         // Cache the new token and calculate expiry time
//         // Use default 3600 seconds if 'expiresin' is missing or invalid.
//         const expiresInSeconds = parseInt(data.expiresin, 10) || 3600; 
//         
//         // Set expiry time 60 seconds (60000ms) earlier for buffer
//         accessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000) - 60000; 
//         accessToken = data.accessToken;

//         console.log("✅ New NINEPSB WAAS token generated successfully.");
//         return accessToken;
//     } catch (error) {
//         // Enhanced logging to capture network vs API errors
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             `Network/DNS error: ${error.code || error.message}`;
//             
//         console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
//         // Throw a generic error to the caller (e.g., controller)
//         throw new Error("Failed to authenticate with 9PSB WAAS service.");
//     }
// };

// // --------------------- Core Function 2: Wallet Creation (Account Creation) ---------------------

// /**
//  * Creates a new customer wallet account via FINSTACK WAAS (Use Case 2).
//  * * @async
//  * @param {object} userData - Pre-formatted customer data.
//  * @param {string} userData.transactionTrackingRef - Unique reference for the transaction.
//  * @param {string} userData.lastName
//  * @param {string} userData.otherNames - Customer's first name (API requires 'otherNames' for first name).
//  * @param {string} userData.phoneNo
//  * @param {number} userData.gender - Expected 0 (Male) or 1 (Female).
//  * @param {string} userData.dateOfBirth - Format: dd/MM/yyyy
//  * @param {string} userData.address
//  * @param {string} [userData.bvn]
//  * @returns {Promise<object>} The API response data containing wallet details.
//  * @throws {Error} If wallet creation fails.
//  */
// const createNairaWallet = async (userData) => {
//     const token = await authenticateNinePSB();

//     // ✅ FIX 2: Removed conflicting string-based gender mapping.
//     // The model/controller now passes the correct integer code (0 or 1).
//     
//     // Validate that the gender code is the expected number (0 or 1)
//     if (userData.gender !== 0 && userData.gender !== 1) {
//         throw new Error(`Invalid gender format provided for 9PSB. Expected 0 or 1, but received: ${userData.gender}.`);
//     }
//     
//     const rawPayload = {
//         transactionTrackingRef: userData.transactionTrackingRef,
//         lastName: userData.lastName,
//         otherNames: userData.otherNames, // This is the user's first name
//         phoneNo: userData.phoneNo,
//         gender: userData.gender, // 👈 Use the code passed directly (0 or 1)
//         dateOfBirth: userData.dateOfBirth, // Format: dd/MM/yyyy
//         address: userData.address,
//         bvn: userData.bvn || null,
//         nationalIdentityNo: userData.nationalIdentityNo || null,
//         ninUserId: userData.ninUserId || null
//     };
//     
//     // Filter out keys with null or undefined values for a cleaner payload
//     const payload = Object.fromEntries(
//         Object.entries(rawPayload).filter(([_, v]) => v != null)
//     );

//     try {
//         const response = await axios.post(WALLET_OPENING_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         const data = response.data;
//         
//         if (data.status !== 'Success' || !data.data || !data.data.accountNumber) {
//             // Attempt to get the most specific error message
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error (missing account number)';
//             throw new Error(`9PSB Wallet Creation failed: ${apiError}`);
//         }
//         
//         // Return the whole data object which contains the wallet details
//         return data; 
//     } catch (error) {
//         // 💡 FIX START: Implementation for handling contradictory success message AND "Wallet Already Exists"
//         const responseData = error.response?.data;
//         if (responseData && responseData.message) {
            
//             // NEW FIX: Handle "A Wallet Already Exists For This User" as a successful retrieval
//             if (responseData.message.includes("A Wallet Already Exists For This User")) {
//                 console.warn("⚠️ NINEPSB WARNING: Wallet already exists. Returning existing account details instead of throwing an error.");
//                 // The responseData contains the account number and user details we need.
//                 return responseData;
//             }
            
//             // PREVIOUS FIX: Handle contradictory success message where status != 200 but body says 'successful'
//             if (responseData.message.includes("Account Opening successful")) {
//                 console.warn("⚠️ NINEPSB WARNING: Received non-200 HTTP status but API reported 'Account Opening successful'. Proceeding with wallet data.");
//                 // We assume the successful account data is present in responseData.
//                 return responseData; 
//             }
//         }
//         // 💡 FIX END

//         // Original error handling for genuine failures
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(responseData)}` :
//             error.message;
//             
//         console.error("❌ 9PSB Wallet Creation Error (Genuine Failure):", errorMessage);
//         throw new Error(error.message || "Failed to create Naira wallet via 9PSB.");
//     }
// };


// // --------------------- Core Function 3: Deposit (Credit) ---------------------

// /**
//  * Deposits funds (credits the customer's wallet) via FINSTACK WAAS (Use Case 3).
//  * * @async
//  * @param {string} accountNo - The customer wallet account number.
//  * @param {number} amount - The amount to credit.
//  * @returns {Promise<object>} The API response data.
//  * @throws {Error} If the deposit fails.
//  */
// const depositFunds = async (accountNo, amount) => {
//     const token = await authenticateNinePSB();
//     
//     // Generate a unique transaction ID for idempotency/tracking
//     const transactionId = `DEPOSIT-${Date.now()}`;
//     const narration = `Credit for wallet ${accountNo}`;

//     // Mandatory fields for Single Wallet Credit (Deposit)
//     const payload = {
//         accountNo: accountNo,
//         // CRITICAL: Ensure amount is passed as a string with 2 decimal places
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     try {
//         const response = await axios.post(DEPOSIT_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
//         
//         const data = response.data;

//         if (data.status !== 'Success') {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error';
//             throw new Error(`9PSB Deposit failed: ${apiError}`);
//         }

//         return data;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Deposit Error:", errorMessage);
//         throw new Error(error.message || "Failed to deposit funds into the wallet.");
//     }
// };

// // --------------------- Mock/Fallback Function ---------------------

// /**
//  * MOCK Function: Placeholder for a real implementation to fetch wallet balance.
//  * * @async
//  * @param {string} accountNumber - The wallet account number.
//  * @returns {Promise<number>} A mock balance value.
//  */
// const getNairaWalletBalance = async (accountNumber) => {
//     console.log("🔹 Mock: getNairaWalletBalance called for:", accountNumber);
//     // TODO: Replace this with a real API call when the endpoint is available/needed
//     return 50000; 
// };


// module.exports = { authenticateNinePSB, createNairaWallet, getNairaWalletBalance, depositFunds };

// // ADDED DEPOSIT AND WITHDRAW LOGS AND URL
// require('dotenv').config();
// const axios = require('axios');

// // --------------------- Configuration and Token Cache ---------------------
// const WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;

// // API Endpoints: Ensure these match the WAAS documentation exactly.
// const AUTH_URL = `${WAAS_BASE_URL}api/v1/authenticate`;
// const WALLET_OPENING_URL = `${WAAS_BASE_URL}api/v1/open_wallet`;
// const DEPOSIT_URL = `${WAAS_BASE_URL}api/v1/credit/transfer`; 
// // >> NEW: Assuming standard endpoint for balance enquiry
// const BALANCE_URL = `${WAAS_BASE_URL}api/v1/balance/enquiry`; 
// // >> NEW: Assuming standard endpoint for debit/transfer (withdrawal/P2P)
// const DEBIT_TRANSFER_URL = `${WAAS_BASE_URL}api/v1/debit/transfer`;

// // In-memory cache for the token
// let accessToken = null;
// // Timestamp when the token expires (in milliseconds)
// let accessTokenExpiresAt = 0; 

// // --------------------- Core Function 1: Authentication ---------------------

// /**
//  * Handles FINSTACK WAAS authentication, returns a valid token, and caches it.
//  * This is used for all subsequent 9PSB calls.
//  * @async
//  * @returns {Promise<string>} The valid access token.
//  * @throws {Error} If authentication fails.
//  */
// const authenticateNinePSB = async () => {
//     // Check if the token is still valid (60-second buffer)
//     if (accessToken && Date.now() < accessTokenExpiresAt) {
//         return accessToken;
//     }

//     console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
    
//     // Prepare the authentication payload
//     const payload = {
//         username: process.env.NINEPSB_WAAS_USERNAME,
//         password: process.env.NINEPSB_WAAS_PASSWORD,
//         clientId: process.env.NINEPSB_WAAS_CLIENT_ID, 
//         clientSecret: process.env.NINEPSB_WAAS_CLIENT_SECRET
//     };

//     try {
//         // Make the API call
//         const response = await axios.post(AUTH_URL, payload);
//         const data = response.data;

//         // Check for success status and the presence of the access token
//         const isSuccess = data.status === 'Success' || data.message === 'successful';

//         if (!isSuccess || !data.accessToken) {
//             throw new Error(`Authentication failed: ${data.message || 'Access token missing in response.'}`);
//         }
        
//         // Cache the new token and calculate expiry time
//         const expiresInSeconds = parseInt(data.expiresin, 10) || 3600; 
        
//         // Set expiry time 60 seconds (60000ms) earlier for buffer
//         accessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000) - 60000; 
//         accessToken = data.accessToken;

//         console.log("✅ New NINEPSB WAAS token generated successfully.");
//         return accessToken;
//     } catch (error) {
//         // Enhanced logging to capture network vs API errors
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             `Network/DNS error: ${error.code || error.message}`;
            
//         console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
//         // Throw a generic error to the caller (e.g., controller)
//         throw new Error("Failed to authenticate with 9PSB WAAS service.");
//     }
// };

// // --------------------- Core Function 2: Wallet Creation (Account Creation) ---------------------

// /**
//  * Creates a new customer wallet account via FINSTACK WAAS (Use Case 2).
//  * @async
//  * @param {object} userData - Pre-formatted customer data.
//  * @param {string} userData.transactionTrackingRef - Unique reference for the transaction.
//  * @param {string} userData.lastName
//  * @param {string} userData.otherNames - Customer's first name (API requires 'otherNames' for first name).
//  * @param {string} userData.phoneNo
//  * @param {number} userData.gender - Expected 0 (Male) or 1 (Female).
//  * @param {string} userData.dateOfBirth - Format: dd/MM/yyyy
//  * @param {string} userData.address
//  * @param {string} [userData.bvn]
//  * @returns {Promise<object>} The API response data containing wallet details.
//  * @throws {Error} If wallet creation fails.
//  */
// const createNairaWallet = async (userData) => {
//     const token = await authenticateNinePSB();
    
//     // Validate that the gender code is the expected number (0 or 1)
//     if (userData.gender !== 0 && userData.gender !== 1) {
//         throw new Error(`Invalid gender format provided for 9PSB. Expected 0 or 1, but received: ${userData.gender}.`);
//     }
    
//     const rawPayload = {
//         transactionTrackingRef: userData.transactionTrackingRef,
//         lastName: userData.lastName,
//         otherNames: userData.otherNames, // This is the user's first name
//         phoneNo: userData.phoneNo,
//         gender: userData.gender, // 👈 Use the code passed directly (0 or 1)
//         dateOfBirth: userData.dateOfBirth, // Format: dd/MM/yyyy
//         address: userData.address,
//         bvn: userData.bvn || null,
//         nationalIdentityNo: userData.nationalIdentityNo || null,
//         ninUserId: userData.ninUserId || null
//     };
    
//     // Filter out keys with null or undefined values for a cleaner payload
//     const payload = Object.fromEntries(
//         Object.entries(rawPayload).filter(([_, v]) => v != null)
//     );

//     try {
//         const response = await axios.post(WALLET_OPENING_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         const data = response.data;
        
//         if (data.status !== 'Success' || !data.data || !data.data.accountNumber) {
//             // Attempt to get the most specific error message
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error (missing account number)';
//             throw new Error(`9PSB Wallet Creation failed: ${apiError}`);
//         }
        
//         // Return the whole data object which contains the wallet details
//         return data; 
//     } catch (error) {
//         const responseData = error.response?.data;
//         if (responseData && responseData.message) {
            
//             // Handle "A Wallet Already Exists For This User" as a successful retrieval
//             if (responseData.message.includes("A Wallet Already Exists For This User")) {
//                 console.warn("⚠️ NINEPSB WARNING: Wallet already exists. Returning existing account details instead of throwing an error.");
//                 // The responseData contains the account number and user details we need.
//                 return responseData;
//             }
            
//             // Handle contradictory success message where status != 200 but body says 'successful'
//             if (responseData.message.includes("Account Opening successful")) {
//                 console.warn("⚠️ NINEPSB WARNING: Received non-200 HTTP status but API reported 'Account Opening successful'. Proceeding with wallet data.");
//                 // We assume the successful account data is present in responseData.
//                 return responseData; 
//             }
//         }

//         // Original error handling for genuine failures
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(responseData)}` :
//             error.message;
            
//         console.error("❌ 9PSB Wallet Creation Error (Genuine Failure):", errorMessage);
//         throw new Error(error.message || "Failed to create Naira wallet via 9PSB.");
//     }
// };


// // --------------------- Core Function 3: Deposit (Credit) ---------------------

// /**
//  * Deposits funds (credits the customer's wallet) via FINSTACK WAAS (Use Case 3).
//  * @async
//  * @param {string} accountNo - The customer wallet account number.
//  * @param {number} amount - The amount to credit.
//  * @returns {Promise<object>} The API response data.
//  * @throws {Error} If the deposit fails.
//  */
// const depositFunds = async (accountNo, amount) => {
//     const token = await authenticateNinePSB();
    
//     // Generate a unique transaction ID for idempotency/tracking
//     const transactionId = `DEPOSIT-${Date.now()}`;
//     const narration = `Credit for wallet ${accountNo}`;

//     // Mandatory fields for Single Wallet Credit (Deposit)
//     const payload = {
//         accountNo: accountNo,
//         // CRITICAL: Ensure amount is passed as a string with 2 decimal places
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     try {
//         const response = await axios.post(DEPOSIT_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = response.data;

//         if (data.status !== 'Success') {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error';
//             throw new Error(`9PSB Deposit failed: ${apiError}`);
//         }

//         return data;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Deposit Error:", errorMessage);
//         throw new Error(error.message || "Failed to deposit funds into the wallet.");
//     }
// };

// // --------------------- Core Function 4: Get Balance (Replaced Mock) ---------------------

// /**
//  * Retrieves the current balance of a customer wallet via FINSTACK WAAS.
//  * 💡 NOTE: This endpoint URL is an assumption based on common API patterns.
//  * @async
//  * @param {string} accountNo - The customer wallet account number.
//  * @returns {Promise<object>} The API response data containing the balance.
//  * @throws {Error} If the balance enquiry fails.
//  */
// const getNairaWalletBalance = async (accountNo) => {
//     const token = await authenticateNinePSB();

//     const transactionId = `BALANCE-${Date.now()}`;
    
//     const payload = {
//         accountNo: accountNo,
//         transactionId: transactionId,
//     };

//     try {
//         const response = await axios.post(BALANCE_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = response.data;

//         if (data.status !== 'Success' || !data.data || data.data.balance === undefined) {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error (missing balance)';
//             throw new Error(`9PSB Balance Enquiry failed: ${apiError}`);
//         }

//         return data; // Contains data.data.balance
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Balance Enquiry Error:", errorMessage);
//         throw new Error(error.message || "Failed to retrieve wallet balance.");
//     }
// };

// // --------------------- Core Function 5: Transfer/Withdraw (Debit) ---------------------

// /**
//  * Debits funds from the customer's wallet for transfer or withdrawal via FINSTACK WAAS.
//  * This can be used for P2P transfers, bank transfers (withdrawals), or merchant payments.
//  * 💡 NOTE: This endpoint URL and payload structure are assumptions based on the credit endpoint.
//  * @async
//  * @param {string} sourceAccountNo - The customer wallet account number (source).
//  * @param {number} amount - The amount to debit.
//  * @param {string} narration - Description of the transaction.
//  * @param {string} destinationAccountNo - The account number of the recipient.
//  * @param {string} [destinationBankCode] - The bank code of the recipient (optional for intra-bank).
//  * @returns {Promise<object>} The API response data.
//  * @throws {Error} If the debit transfer fails.
//  */
// const transferFunds = async (sourceAccountNo, amount, narration, destinationAccountNo, destinationBankCode = null) => {
//     const token = await authenticateNinePSB();
    
//     const transactionId = `DEBIT-${Date.now()}`;

//     // Mandatory fields for Debit/Transfer
//     const payload = {
//         sourceAccountNo: sourceAccountNo,
//         // CRITICAL: Ensure amount is passed as a string with 2 decimal places
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         destinationAccountNo: destinationAccountNo, // Required for transfer
//         destinationBankCode: destinationBankCode, // Only required for inter-bank (CBN/NIBSS banks)
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     // Filter out nulls for a clean payload (especially destinationBankCode if not provided)
//     const finalPayload = Object.fromEntries(
//         Object.entries(payload).filter(([_, v]) => v != null)
//     );

//     try {
//         const response = await axios.post(DEBIT_TRANSFER_URL, finalPayload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = response.data;

//         if (data.status !== 'Success' || !data.transactionId) {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API debit error';
//             throw new Error(`9PSB Debit Transfer failed: ${apiError}`);
//         }

//         return data;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Debit/Transfer Error:", errorMessage);
//         throw new Error(error.message || "Failed to transfer funds.");
//     }
// };


// module.exports = { 
//     authenticateNinePSB, 
//     createNairaWallet, 
//     getNairaWalletBalance, 
//     depositFunds,
//     transferFunds // << NEW FUNCTION EXPORTED
// };
// require('dotenv').config();
// const axios = require('axios');

// // --------------------- Configuration and Token Cache ---------------------
// const WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;

// // API Endpoints: Ensure these match the WAAS documentation exactly.
// const AUTH_URL = `${WAAS_BASE_URL}api/v1/authenticate`;
// const WALLET_OPENING_URL = `${WAAS_BASE_URL}api/v1/open_wallet`;
// const DEPOSIT_URL = `${WAAS_BASE_URL}api/v1/credit/transfer`; 
// // >> NEW: Assuming standard endpoint for balance enquiry
// const BALANCE_URL = `${WAAS_BASE_URL}api/v1/balance/enquiry`; 
// // >> NEW: Assuming standard endpoint for debit/transfer (withdrawal/P2P)
// const DEBIT_TRANSFER_URL = `${WAAS_BASE_URL}api/v1/debit/transfer`;

// // In-memory cache for the token
// let accessToken = null;
// // Timestamp when the token expires (in milliseconds)
// let accessTokenExpiresAt = 0; 

// // --------------------- Core Function 1: Authentication ---------------------

// /**
//  * Handles FINSTACK WAAS authentication, returns a valid token, and caches it.
//  * This is used for all subsequent 9PSB calls.
//  * @async
//  * @returns {Promise<string>} The valid access token.
//  * @throws {Error} If authentication fails.
//  */
// const authenticateNinePSB = async () => {
//     // Check if the token is still valid (60-second buffer)
//     if (accessToken && Date.now() < accessTokenExpiresAt) {
//         return accessToken;
//     }

//     console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
    
//     // Prepare the authentication payload
//     const payload = {
//         username: process.env.NINEPSB_WAAS_USERNAME,
//         password: process.env.NINEPSB_WAAS_PASSWORD,
//         clientId: process.env.NINEPSB_WAAS_CLIENT_ID, 
//         clientSecret: process.env.NINEPSB_WAAS_CLIENT_SECRET
//     };

//     try {
//         // Make the API call
//         const response = await axios.post(AUTH_URL, payload);
//         const data = response.data;

//         // Check for success status and the presence of the access token
//         const isSuccess = data.status === 'Success' || data.message === 'successful';

//         if (!isSuccess || !data.accessToken) {
//             throw new Error(`Authentication failed: ${data.message || 'Access token missing in response.'}`);
//         }
        
//         // Cache the new token and calculate expiry time
//         const expiresInSeconds = parseInt(data.expiresin, 10) || 3600; 
        
//         // Set expiry time 60 seconds (60000ms) earlier for buffer
//         accessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000) - 60000; 
//         accessToken = data.accessToken;

//         console.log("✅ New NINEPSB WAAS token generated successfully.");
//         return accessToken;
//     } catch (error) {
//         // Enhanced logging to capture network vs API errors
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             `Network/DNS error: ${error.code || error.message}`;
            
//         console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
//         // Throw a generic error to the caller (e.g., controller)
//         throw new Error("Failed to authenticate with 9PSB WAAS service.");
//     }
// };

// // --------------------- Core Function 2: Wallet Creation (Account Creation) ---------------------

// /**
//  * Creates a new customer wallet account via FINSTACK WAAS (Use Case 2).
//  * @async
//  * @param {object} userData - Pre-formatted customer data.
//  * @param {string} userData.transactionTrackingRef - Unique reference for the transaction.
//  * @param {string} userData.lastName
//  * @param {string} userData.otherNames - Customer's first name (API requires 'otherNames' for first name).
//  * @param {string} userData.phoneNo
//  * @param {number} userData.gender - Expected 0 (Male) or 1 (Female).
//  * @param {string} userData.dateOfBirth - Format: dd/MM/yyyy
//  * @param {string} userData.address
//  * @param {string} [userData.bvn]
//  * @returns {Promise<object>} The API response data containing wallet details.
//  * @throws {Error} If wallet creation fails.
//  */
// const createNairaWallet = async (userData) => {
//     const token = await authenticateNinePSB();
    
//     // Validate that the gender code is the expected number (0 or 1)
//     if (userData.gender !== 0 && userData.gender !== 1) {
//         throw new Error(`Invalid gender format provided for 9PSB. Expected 0 or 1, but received: ${userData.gender}.`);
//     }
    
//     const rawPayload = {
//         transactionTrackingRef: userData.transactionTrackingRef,
//         lastName: userData.lastName,
//         otherNames: userData.otherNames, // This is the user's first name
//         phoneNo: userData.phoneNo,
//         gender: userData.gender, // 👈 Use the code passed directly (0 or 1)
//         dateOfBirth: userData.dateOfBirth, // Format: dd/MM/yyyy
//         address: userData.address,
//         bvn: userData.bvn || null,
//         nationalIdentityNo: userData.nationalIdentityNo || null,
//         ninUserId: userData.ninUserId || null
//     };
    
//     // Filter out keys with null or undefined values for a cleaner payload
//     const payload = Object.fromEntries(
//         Object.entries(rawPayload).filter(([_, v]) => v != null)
//     );

//     try {
//         const response = await axios.post(WALLET_OPENING_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         const data = response.data;
        
//         // 1. Check for success status/code (handling 'Success' or '00' as success)
//         const isApiSuccess = data.status === 'Success' || data.statusCode === '00';

//         if (!isApiSuccess) {
//             // If the API explicitly reports failure
//             const apiError = data.message || (data.data && data.data.message) || `9PSB API reported failure (Status: ${data.status || 'N/A'}, Code: ${data.statusCode || 'N/A'})`;
//             throw new Error(`9PSB Wallet Creation failed: ${apiError}`);
//         }

//         // 2. Verify Data Structure: Ensure required wallet details are present
//         // We require data.data, data.data.accountNumber, and data.data.fullName
//         if (!data.data || !data.data.accountNumber || !data.data.fullName) {
//              console.error("❌ 9PSB Wallet Creation Success Missing Data:", JSON.stringify(data));
//              throw new Error('9PSB Wallet Creation successful, but critical data (accountNumber/fullName) is missing in response.');
//         }
        
//         // Return the whole data object which contains the wallet details
//         return data; 
//     } catch (error) {
//         const responseData = error.response?.data;
//         if (responseData && responseData.message) {
            
//             // Handle "A Wallet Already Exists For This User" as a successful retrieval
//             if (responseData.message.includes("A Wallet Already Exists For This User")) {
//                 console.warn("⚠️ NINEPSB WARNING: Wallet already exists. Returning existing account details instead of throwing an error.");
//                 // The responseData contains the account number and user details we need.
//                 return responseData;
//             }
            
//             // Handle contradictory success message where status != 200 but body says 'successful'
//             if (responseData.message.includes("Account Opening successful")) {
//                 console.warn("⚠️ NINEPSB WARNING: Received non-200 HTTP status but API reported 'Account Opening successful'. Proceeding with wallet data.");
//                 // We assume the successful account data is present in responseData.
//                 return responseData; 
//             }
//         }

//         // Original error handling for genuine failures
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(responseData)}` :
//             error.message;
            
//         console.error("❌ 9PSB Wallet Creation Error (Genuine Failure):", errorMessage);
//         throw new Error(error.message || "Failed to create Naira wallet via 9PSB.");
//     }
// };


// // --------------------- Core Function 3: Deposit (Credit) ---------------------

// /**
//  * Deposits funds (credits the customer's wallet) via FINSTACK WAAS (Use Case 3).
//  * @async
//  * @param {string} accountNo - The customer wallet account number.
//  * @param {number} amount - The amount to credit.
//  * @returns {Promise<object>} The API response data.
//  * @throws {Error} If the deposit fails.
//  */
// const depositFunds = async (accountNo, amount) => {
//     const token = await authenticateNinePSB();
    
//     // Generate a unique transaction ID for idempotency/tracking
//     const transactionId = `DEPOSIT-${Date.now()}`;
//     const narration = `Credit for wallet ${accountNo}`;

//     // Mandatory fields for Single Wallet Credit (Deposit)
//     const payload = {
//         accountNo: accountNo,
//         // CRITICAL: Ensure amount is passed as a string with 2 decimal places
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     try {
//         const response = await axios.post(DEPOSIT_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = response.data;

//         if (data.status !== 'Success') {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error';
//             throw new Error(`9PSB Deposit failed: ${apiError}`);
//         }

//         return data;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Deposit Error:", errorMessage);
//         throw new Error(error.message || "Failed to deposit funds into the wallet.");
//     }
// };

// // --------------------- Core Function 4: Get Balance (Replaced Mock) ---------------------

// /**
//  * Retrieves the current balance of a customer wallet via FINSTACK WAAS.
//  * 💡 NOTE: This endpoint URL is an assumption based on common API patterns.
//  * @async
//  * @param {string} accountNo - The customer wallet account number.
//  * @returns {Promise<object>} The API response data containing the balance.
//  * @throws {Error} If the balance enquiry fails.
//  */
// const getNairaWalletBalance = async (accountNo) => {
//     const token = await authenticateNinePSB();

//     const transactionId = `BALANCE-${Date.now()}`;
    
//     const payload = {
//         accountNo: accountNo,
//         transactionId: transactionId,
//     };

//     try {
//         const response = await axios.post(BALANCE_URL, payload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = response.data;

//         if (data.status !== 'Success' || !data.data || data.data.balance === undefined) {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API error (missing balance)';
//             throw new Error(`9PSB Balance Enquiry failed: ${apiError}`);
//         }

//         return data; // Contains data.data.balance
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Balance Enquiry Error:", errorMessage);
//         throw new Error(error.message || "Failed to retrieve wallet balance.");
//     }
// };

// // --------------------- Core Function 5: Transfer/Withdraw (Debit) ---------------------

// /**
//  * Debits funds from the customer's wallet for transfer or withdrawal via FINSTACK WAAS.
//  * This can be used for P2P transfers, bank transfers (withdrawals), or merchant payments.
//  * 💡 NOTE: This endpoint URL and payload structure are assumptions based on the credit endpoint.
//  * @async
//  * @param {string} sourceAccountNo - The customer wallet account number (source).
//  * @param {number} amount - The amount to debit.
//  * @param {string} narration - Description of the transaction.
//  * @param {string} destinationAccountNo - The account number of the recipient.
//  * @param {string} [destinationBankCode] - The bank code of the recipient (optional for intra-bank).
//  * @returns {Promise<object>} The API response data.
//  * @throws {Error} If the debit transfer fails.
//  */
// const transferFunds = async (sourceAccountNo, amount, narration, destinationAccountNo, destinationBankCode = null) => {
//     const token = await authenticateNinePSB();
    
//     const transactionId = `DEBIT-${Date.now()}`;

//     // Mandatory fields for Debit/Transfer
//     const payload = {
//         sourceAccountNo: sourceAccountNo,
//         // CRITICAL: Ensure amount is passed as a string with 2 decimal places
//         totalAmount: amount.toFixed(2).toString(), 
//         transactionId: transactionId,
//         narration: narration,
//         destinationAccountNo: destinationAccountNo, // Required for transfer
//         destinationBankCode: destinationBankCode, // Only required for inter-bank (CBN/NIBSS banks)
//         merchant: { 
//             isFee: false, 
//         }
//     };

//     // Filter out nulls for a clean payload (especially destinationBankCode if not provided)
//     const finalPayload = Object.fromEntries(
//         Object.entries(payload).filter(([_, v]) => v != null)
//     );

//     try {
//         const response = await axios.post(DEBIT_TRANSFER_URL, finalPayload, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         const data = response.data;

//         if (data.status !== 'Success' || !data.transactionId) {
//             const apiError = data.message || (data.data && data.data.message) || 'Unknown 9PSB API debit error';
//             throw new Error(`9PSB Debit Transfer failed: ${apiError}`);
//         }

//         return data;
//     } catch (error) {
//         const errorMessage = error.response ? 
//             `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
//             error.message;

//         console.error("❌ 9PSB Debit/Transfer Error:", errorMessage);
//         throw new Error(error.message || "Failed to transfer funds.");
//     }
// };


// module.exports = { 
//     authenticateNinePSB, 
//     createNairaWallet, 
//     getNairaWalletBalance, 
//     depositFunds,
//     transferFunds // << NEW FUNCTION EXPORTED
// };
require('dotenv').config();
const axios = require('axios');
// --------------------- Configuration and Token Cache ---------------------
// --- Environment Config (Pulled from .env) ---
const NINEPSB_WAAS_USERNAME = process.env.NINEPSB_WAAS_USERNAME;
const NINEPSB_WAAS_PASSWORD = process.env.NINEPSB_WAAS_PASSWORD;
const NINEPSB_WAAS_CLIENT_ID = process.env.NINEPSB_WAAS_CLIENT_ID;
const NINEPSB_WAAS_CLIENT_SECRET = process.env.NINEPSB_WAAS_CLIENT_SECRET;
const NINEPSB_WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;

// The platform's central NGN account for P2P escrow/float management
const NINEPSB_FLOAT_ACCOUNT = process.env.NINEPSB_FLOAT_ACCOUNT; 

// Simple in-memory token cache
let cachedToken = {
    accessToken: null,
    expiresAt: 0,
};

// API Endpoints: Using the confirmed Core Wallet endpoints for all operations.
const ENDPOINTS = {
    AUTH: 'api/v1/authenticate',
    WALLET_OPENING: 'api/v1/open_wallet',
    // Single Wallet Credit (Used for Deposits AND Escrow Settlement)
    DEPOSIT: 'api/v1/credit/transfer', 
    BALANCE_ENQUIRY: 'api/v1/balance/enquiry',
    // Single Wallet Debit (Used for Transfers AND Escrow Fund Securing)
    DEBIT_TRANSFER: 'api/v1/debit/transfer', 
};

// ---------------------------------
// 🔒 Core: Authentication
// ---------------------------------

/**
 * Handles FINSTACK WAAS authentication, returns a valid token, and caches it.
 * @async
 * @throws {Error} If authentication fails.
 */
async function authenticate() {
    if (cachedToken.accessToken && Date.now() < cachedToken.expiresAt) {
        return; 
    }

    console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
    
    const authUrl = `${NINEPSB_WAAS_BASE_URL}${ENDPOINTS.AUTH}`;
    
    const payload = {
        username: NINEPSB_WAAS_USERNAME,
        password: NINEPSB_WAAS_PASSWORD,
        clientId: NINEPSB_WAAS_CLIENT_ID, 
        clientSecret: NINEPSB_WAAS_CLIENT_SECRET
    };

    try {
        const response = await axios.post(authUrl, payload);
        const data = response.data;

        const isSuccess = data.status === 'Success' || data.message === 'successful';

        if (!isSuccess || !data.accessToken) {
            throw new Error(`Authentication failed: ${data.message || 'Access token missing in response.'}`);
        }
        
        const expiresInSeconds = parseInt(data.expiresin, 10) || 3600; 
        
        // Set expiry time 60 seconds (60000ms) earlier for buffer
        cachedToken.expiresAt = Date.now() + (expiresInSeconds * 1000) - 60000; 
        cachedToken.accessToken = data.accessToken;

        console.log("✅ New NINEPSB WAAS token generated successfully.");
    } catch (error) {
        const errorMessage = error.response ? 
            `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}` :
            `Network/DNS error: ${error.code || error.message}`;
            
        console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
        throw new Error("Failed to authenticate with 9PSB WAAS service.");
    }
}

// ---------------------------------
// 🧩 Utility: Centralized API Call
// ---------------------------------

/**
 * Executes an authenticated API call to the 9PSB WAAS endpoint.
 * @param {string} endpoint - The API path (from the ENDPOINTS object)
 * @param {object} payload - The request body.
 * @returns {Promise<object>} The full 9PSB response data object.
 */
async function apiCall(endpoint, payload) {
    await authenticate();
    
    const url = `${NINEPSB_WAAS_BASE_URL}${endpoint}`;
    const headers = {
        "Authorization": `Bearer ${cachedToken.accessToken}`,
        "Content-Type": "application/json",
    };

    try {
        console.log(`[9PSB] API Call to ${endpoint}`);
        const response = await axios.post(url, payload, { headers });
        const data = response.data;
        
        const isApiSuccess = data.status === 'Success' || data.statusCode === '00';
        
        if (!isApiSuccess) {
             throw new Error(`9PSB API failed: ${data.message || 'Unknown error'}`);
        }
        
        return data; 

    } catch (error) {
        const responseData = error.response?.data;
        
        // Handle specific "Wallet Already Exists" for WALLET_OPENING
        if (endpoint === ENDPOINTS.WALLET_OPENING && responseData && responseData.message && responseData.message.includes("A Wallet Already Exists For This User")) {
             console.warn("⚠️ NINEPSB WARNING: Wallet already exists. Returning existing account details.");
             return responseData; 
        }

        const errorMsg = responseData?.message || error.message;
        const status = error.response?.status || 'N/A';
        console.error(`[9PSB] Error executing API call to ${endpoint} (HTTP Status ${status}):`, errorMsg);
        
        throw new Error(`9PSB Service failed: ${errorMsg}`);
    }
}

// ---------------------------------
// 🏦 Core Wallet Functions (Standard Use Cases)
// ---------------------------------

/**
 * Creates a new customer wallet account.
 */
const createNairaWallet = async (userData) => {
    
    if (userData.gender !== 0 && userData.gender !== 1) {
        throw new Error(`Invalid gender format provided for 9PSB. Expected 0 or 1, but received: ${userData.gender}.`);
    }
    
    const rawPayload = {
        transactionTrackingRef: userData.transactionTrackingRef,
        lastName: userData.lastName,
        otherNames: userData.otherNames, 
        phoneNo: userData.phoneNo,
        gender: userData.gender, 
        dateOfBirth: userData.dateOfBirth, 
        address: userData.address,
        bvn: userData.bvn || null,
        nationalIdentityNo: userData.nationalIdentityNo || null,
        ninUserId: userData.ninUserId || null
    };
    
    const payload = Object.fromEntries(
        Object.entries(rawPayload).filter(([_, v]) => v != null)
    );

    const data = await apiCall(ENDPOINTS.WALLET_OPENING, payload);

    if (!data.data || !data.data.accountNumber || !data.data.fullName) {
        console.error("❌ 9PSB Wallet Creation Success Missing Data:", JSON.stringify(data));
        throw new Error('9PSB Wallet Creation successful, but critical data (accountNumber/fullName) is missing in response.');
    }
    
    return data;
};

/**
 * Retrieves the current balance of a customer wallet.
 */
const getNairaWalletBalance = async (accountNo) => {
    const transactionId = `BALANCE-${Date.now()}`;
    
    const payload = {
        accountNo: accountNo,
        transactionId: transactionId,
    };

    const data = await apiCall(ENDPOINTS.BALANCE_ENQUIRY, payload); 

    if (!data.data || data.data.balance === undefined) {
        throw new Error('9PSB Balance Enquiry successful, but balance data is missing in response.');
    }

    return data; 
};

/**
 * Deposits funds (credits the customer's wallet) from the platform's float.
 * This is the "Single Wallet Credit" API.
 */
const depositFunds = async (accountNo, amount) => {
    const transactionId = `DEPOSIT-${Date.now()}`;
    const narration = `Credit for wallet ${accountNo}`;

    const payload = {
        accountNo: accountNo,
        totalAmount: amount.toFixed(2).toString(), 
        transactionId: transactionId,
        narration: narration,
        merchant: { 
            isFee: false, 
        },
        transactionType: "CREDIT_WALLET",
    };

    return apiCall(ENDPOINTS.DEPOSIT, payload);
};

/**
 * Debits funds from a source wallet to a destination (transfer/withdrawal/escrow).
 * This is the "Single Wallet Debit" API.
 */
const transferFunds = async (sourceAccountNo, amount, narration, destinationAccountNo, destinationBankCode = null) => {
    
    const transactionId = `DEBIT-${Date.now()}`;

    const payload = {
        sourceAccountNo: sourceAccountNo,
        totalAmount: amount.toFixed(2).toString(), 
        transactionId: transactionId,
        narration: narration,
        destinationAccountNo: destinationAccountNo, 
        destinationBankCode: destinationBankCode, 
        merchant: { 
            isFee: false, 
        },
        transactionType: "DEBIT_WALLET"
    };

    const finalPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v != null)
    );

    const data = await apiCall(ENDPOINTS.DEBIT_TRANSFER, finalPayload);
    
    if (!data.transactionId) {
        throw new Error('9PSB Debit Transfer failed: Transaction ID missing in response.');
    }

    return data;
};


// ---------------------------------
// 🏦 NGN Transfer Functions (P2P/Escrow - CORRECTED to use Core APIs)
// ---------------------------------

/**
 * 🔒 ESCROW STEP 1: Debits a source 9PSB wallet (User) and Credits the platform's float account (Escrow).
 * This implements the "Single wallet debit" endpoint flow using the core transferFunds function.
 * @param {string} sourceAccount - The user's wallet account to debit.
 * @param {number} amount - Amount to debit.
 * @param {string} reference - Unique transaction reference (P2P Trade Reference).
 * @param {string} narration - Description of the transaction.
 * @returns {Promise<object>} The transfer result data from 9PSB
 */
async function debitWallet({ sourceAccount, amount, reference, narration = "P2P Escrow - Secure Funds" }) {
    // Uses the Single Wallet Debit API (transferFunds)
    return transferFunds(
        sourceAccount, 
        amount, 
        narration, 
        NINEPSB_FLOAT_ACCOUNT // Destination is the pre-configured platform float account
    );
}

/**
 * ✅ ESCROW STEP 2: Credits a beneficiary 9PSB wallet/account (Beneficiary) from the platform's float account (Release).
 * This implements the "Single wallet credit" endpoint flow using the core depositFunds function.
 * @param {string} beneficiaryAccount - The account to credit (e.g., Merchant's 9PSB wallet number).
 * @param {number} amount - Amount to credit.
 * @param {string} reference - Unique transaction reference (P2P Trade Reference).
 * @param {string} narration - Description of the transaction.
 * @returns {Promise<object>} The transfer result data from 9PSB
 */
async function creditWallet({ beneficiaryAccount, amount, reference, narration = "P2P Escrow - Settle Beneficiary" }) {
    // Uses the Single Wallet Credit API (depositFunds)
    return depositFunds(
        beneficiaryAccount, 
        amount
    );
}


// ---------------------------------
// 📦 Exported Module
// ---------------------------------

module.exports = {
    // Core Wallet Functions
    createNairaWallet, 
    getNairaWalletBalance, 
    depositFunds,
    transferFunds,

    // P2P/Escrow Functions (using Core Wallet functions under the hood)
    debitWallet, // Escrow Payment (Debit User -> Credit Float)
    creditWallet, // Escrow Settlement (Debit Float -> Credit Beneficiary)
    
    // Environment/Config Exports
    NINEPSB_FLOAT_ACCOUNT,
};