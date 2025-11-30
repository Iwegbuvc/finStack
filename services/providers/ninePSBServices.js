// require("dotenv").config();
// const axios = require("axios");

// // --------------------- Configuration and Token Cache ---------------------
// const NINEPSB_WAAS_USERNAME = process.env.NINEPSB_WAAS_USERNAME;
// const NINEPSB_WAAS_PASSWORD = process.env.NINEPSB_WAAS_PASSWORD;
// const NINEPSB_WAAS_CLIENT_ID = process.env.NINEPSB_WAAS_CLIENT_ID;
// const NINEPSB_WAAS_CLIENT_SECRET = process.env.NINEPSB_WAAS_CLIENT_SECRET;
// const NINEPSB_WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;
// const NINEPSB_FLOAT_ACCOUNT = process.env.NINEPSB_FLOAT_ACCOUNT;

// // Simple in-memory token cache
// let cachedToken = {
//   accessToken: null,
//   expiresAt: 0,
// };

// // API Endpoints
// const ENDPOINTS = {
//   AUTH: "api/v1/authenticate",
//   WALLET_OPENING: "api/v1/open_wallet",
//   DEPOSIT: "api/v1/credit/transfer",
//   BALANCE_ENQUIRY: "api/v1/wallet_enquiry",
//   DEBIT_TRANSFER: "api/v1/debit/transfer",
// };

// // ---------------------------------
// // 🔒 Authentication
// // ---------------------------------
// async function authenticate() {
//   if (cachedToken.accessToken && Date.now() < cachedToken.expiresAt) {
//     return;
//   }

//   console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");

//   const authUrl = `${NINEPSB_WAAS_BASE_URL}${ENDPOINTS.AUTH}`;
//   const payload = {
//     username: NINEPSB_WAAS_USERNAME,
//     password: NINEPSB_WAAS_PASSWORD,
//     clientId: NINEPSB_WAAS_CLIENT_ID,
//     clientSecret: NINEPSB_WAAS_CLIENT_SECRET,
//   };

//   try {
//     const response = await axios.post(authUrl, payload);
//     const data = response.data;
//     const isSuccess = data.status === "Success" || data.message === "successful";

//     if (!isSuccess || !data.accessToken) {
//       throw new Error(
//         `Authentication failed: ${data.message || "Access token missing in response."}`
//       );
//     }

//     const expiresInSeconds = parseInt(data.expiresin, 10) || 3600;
//     cachedToken.expiresAt = Date.now() + expiresInSeconds * 1000 - 60000;
//     cachedToken.accessToken = data.accessToken;

//     console.log("✅ New NINEPSB WAAS token generated successfully.");
//   } catch (error) {
//     const errorMessage = error.response
//       ? `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}`
//       : `Network/DNS error: ${error.code || error.message}`;

//     console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
//     throw new Error("Failed to authenticate with 9PSB WAAS service.");
//   }
// }

// // ---------------------------------
// // 🧩 Centralized API Call
// // ---------------------------------
// async function apiCall(endpoint, payload) {
//   await authenticate();

//   const url = `${NINEPSB_WAAS_BASE_URL}${endpoint}`;
//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${cachedToken.accessToken}`,
//   };

//   console.log(`[9PSB] API Call to ${endpoint}`);
//   console.log(`[9PSB] Full Request URL: ${url}`);
//   console.log(`[9PSB] Payload for ${endpoint}: ${JSON.stringify(payload)}`);

//   const response = await axios.post(url, payload, { headers, validateStatus: () => true });
//   const data = response.data;

//   // 🧠 Normalize inconsistent success formats
//   const approved =
//     data.status?.toUpperCase() === "SUCCESS" ||
//     data.responseCode === "00" ||
//     data.data?.responseCode === "00" ||
//     data.message?.toUpperCase().includes("APPROVED");

//   if (approved) {
//     console.log(`✅ Transaction approved: ${data.data?.reference || payload.transactionId}`);
//     return {
//       success: true,
//       message: data.message || "Transaction Approved",
//       data: data.data || {},
//     };
//   }

//   // Handle paradoxical success (false flag but message = approved)
//   if (data.success === false && data.message === "Approved by Financial Institution") {
//     console.warn(
//       "⚠️ Paradoxical 9PSB response detected (success=false but approved message). Normalizing..."
//     );
//     return {
//       success: true,
//       message: "Transaction Approved by Financial Institution (Normalized)",
//       data: {
//         transactionId: payload.transactionId,
//         responseCode: "00",
//       },
//     };
//   }

//   // Otherwise fail
//   console.error(`[9PSB] API returned non-approved status: ${JSON.stringify(data)}`);
// return {
//   success: false,
//   message: data.message || "9PSB API request failed.",
//   data,
// };

// }

// // ---------------------------------
// // 👤 Wallet Creation
// // ---------------------------------
// const createNairaWallet = async (payload) => {
//   const responseData = await apiCall(ENDPOINTS.WALLET_OPENING, payload);
//   const dataBody = responseData.data || responseData;

//   const accountNumber =
//     dataBody.accountNumber || dataBody.wallet?.accountNumber || null;
//   const fullName =
//     dataBody.fullName ||
//     dataBody.accountName ||
//     (dataBody.firstName && dataBody.lastName
//       ? `${dataBody.firstName} ${dataBody.lastName}`
//       : null);

//   if (!accountNumber || !fullName) {
//     console.error("9PSB Response Data (Missing Wallet Details):", responseData);
//     throw new Error(
//       "Account details (accountNumber/fullName) could not be extracted from the 9PSB response."
//     );
//   }

//   return {
//     status: true,
//     message: responseData.message || "Account Opening successful",
//     data: { accountNumber, fullName },
//   };
// };

// // ---------------------------------
// // 💰 Balance Enquiry
// // ---------------------------------
// const getNairaWalletBalance = async (accountNo) => {
//   const transactionId = `BALANCE-${Date.now()}`;
//   const payload = { accountNo, transactionId };
//   const data = await apiCall(ENDPOINTS.BALANCE_ENQUIRY, payload);

//   const hasBalanceData = data.data && data.data.availableBalance !== undefined;
//   if (!hasBalanceData) {
//     throw new Error("Balance data missing in 9PSB response.");
//   }

//   console.log(`9PSB Balance Enquiry successful, Response Data: ${JSON.stringify(data)}`);
//   return data;
// };

// // ---------------------------------
// // 💵 Deposit (Credit Wallet)
// // ---------------------------------
// const depositFunds = async (accountNo, amount) => {
//   const numericAmount = parseFloat(amount);
//   const transactionId = `WAAS${Date.now()}`;
//   const narration = `APP/CREDIT_WALLET/${NINEPSB_FLOAT_ACCOUNT}/${transactionId}`;

//   const payload = {
//     accountNo,
//     totalAmount: numericAmount.toFixed(2),
//     transactionId,
//     narration,
//     merchant: { isFee: false, merchantFeeAccount: "", merchantFeeAmount: "" },
//     transactionType: "CREDIT_WALLET",
//   };

//   const apiResult = await apiCall(ENDPOINTS.DEPOSIT, payload);

//   const isApproved =
//     apiResult.success === true ||
//     apiResult.message?.toUpperCase().includes("APPROVED") ||
//     apiResult.data?.responseCode === "00";

//   if (isApproved) {
//     console.log("💰 Deposit successful for:", accountNo, "TxnID:", transactionId);
//     return {
//       success: true,
//       message: apiResult.message || "Deposit Approved by Financial Institution",
//       data: {
//         transactionId,
//         reference: apiResult.data?.reference || transactionId,
//         responseCode: "00",
//       },
//     };
//   }

//   console.error("Deposit failed:", apiResult);
//   return { success: false, message: apiResult.message || "Deposit failed" };
// };

// // ---------------------------------
// // 💳 Debit / Transfer Funds
// // ---------------------------------
// const transferFunds = async (
//   sourceAccountNo,
//   amount,
//   narration,
//   destinationAccountNo,
//   destinationBankCode = null
// ) => {
//   const transactionId = `DEBIT-${Date.now()}`;
//   const payload = {
//     sourceAccountNo,
//     totalAmount: amount.toFixed(2).toString(),
//     transactionId,
//     narration,
//     destinationAccountNo,
//     destinationBankCode,
//     merchant: { isFee: false },
//     transactionType: "DEBIT_WALLET",
//   };

//   const finalPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v != null));
//   return apiCall(ENDPOINTS.DEBIT_TRANSFER, finalPayload);
// };

// // ---------------------------------
// // 🧩 Escrow Logic
// // ---------------------------------
// async function debitWallet({
//   sourceAccount,
//   amount,
//   reference,
//   narration = "P2P Escrow - Secure Funds",
// }) {
//   return transferFunds(sourceAccount, amount, narration, NINEPSB_FLOAT_ACCOUNT);
// }

// async function creditWallet({
//   beneficiaryAccount,
//   amount,
//   reference,
//   narration = "P2P Escrow - Settle Beneficiary",
// }) {
//   return depositFunds(beneficiaryAccount, amount);
// }

// // ---------------------------------
// // 📦 Exports
// // ---------------------------------
// module.exports = {
//   createNairaWallet,
//   getNairaWalletBalance,
//   depositFunds,
//   transferFunds,
//   debitWallet,
//   creditWallet,
//   NINEPSB_FLOAT_ACCOUNT,
// };

// TESTED THE DEPOSIT BELOW AND BALNCE AND IT WORKS FINE
// require("dotenv").config();
// const axios = require("axios");

// // --------------------- Configuration and Token Cache ---------------------
// const NINEPSB_WAAS_USERNAME = process.env.NINEPSB_WAAS_USERNAME;
// const NINEPSB_WAAS_PASSWORD = process.env.NINEPSB_WAAS_PASSWORD;
// const NINEPSB_WAAS_CLIENT_ID = process.env.NINEPSB_WAAS_CLIENT_ID;
// const NINEPSB_WAAS_CLIENT_SECRET = process.env.NINEPSB_WAAS_CLIENT_SECRET;
// const NINEPSB_WAAS_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;
// const NINEPSB_FLOAT_ACCOUNT = process.env.NINEPSB_FLOAT_ACCOUNT;

// // Simple in-memory token cache
// let cachedToken = {
//   accessToken: null,
//   expiresAt: 0,
// };

// // API Endpoints
// const ENDPOINTS = {
//   AUTH: "api/v1/authenticate",
//   WALLET_OPENING: "api/v1/open_wallet",
//   DEPOSIT: "api/v1/credit/transfer",
//   BALANCE_ENQUIRY: "api/v1/wallet_enquiry",
//   DEBIT_TRANSFER: "api/v1/debit/transfer",
//   TRANSACTION_STATUS_QUERY: "api/v1/transaction_status_query", // <-- NEW TSQ Endpoint
// };

// // ---------------------------------
// // 🔒 Authentication
// // ---------------------------------
// async function authenticate() {
//   if (cachedToken.accessToken && Date.now() < cachedToken.expiresAt) {
//     return;
//   }

//   console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");

//   const authUrl = `${NINEPSB_WAAS_BASE_URL}${ENDPOINTS.AUTH}`;
//   const payload = {
//     username: NINEPSB_WAAS_USERNAME,
//     password: NINEPSB_WAAS_PASSWORD,
//     clientId: NINEPSB_WAAS_CLIENT_ID,
//     clientSecret: NINEPSB_WAAS_CLIENT_SECRET,
//   };

//   try {
//     const response = await axios.post(authUrl, payload);
//     const data = response.data;
//     const isSuccess = data.status === "Success" || data.message === "successful";

//     if (!isSuccess || !data.accessToken) {
//       throw new Error(
//         `Authentication failed: ${data.message || "Access token missing in response."}`
//       );
//     }

//     const expiresInSeconds = parseInt(data.expiresin, 10) || 3600;
//     cachedToken.expiresAt = Date.now() + expiresInSeconds * 1000 - 60000;
//     cachedToken.accessToken = data.accessToken;

//     console.log("✅ New NINEPSB WAAS token generated successfully.");
//   } catch (error) {
//     const errorMessage = error.response
//       ? `API returned status ${error.response.status}: ${JSON.stringify(error.response.data)}`
//       : `Network/DNS error: ${error.code || error.message}`;

//     console.error("❌ NINEPSB WAAS Authentication Error:", errorMessage);
//     throw new Error("Failed to authenticate with 9PSB WAAS service.");
//   }
// }

// // ---------------------------------
// // 🧩 Centralized API Call
// // ---------------------------------
// async function apiCall(endpoint, payload) {
//   await authenticate();

//   const url = `${NINEPSB_WAAS_BASE_URL}${endpoint}`;
//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${cachedToken.accessToken}`,
//   };

//   console.log(`[9PSB] API Call to ${endpoint}`);
//   console.log(`[9PSB] Full Request URL: ${url}`);
//   // Log payload, but mask sensitive data if this were a production system (not needed here)
//   console.log(`[9PSB] Payload for ${endpoint}: ${JSON.stringify(payload)}`);

//   const response = await axios.post(url, payload, { headers, validateStatus: () => true });
//   const data = response.data;

//   // 🧠 Normalize inconsistent success formats
//   const approved =
//     data.status?.toUpperCase() === "SUCCESS" ||
//     data.responseCode === "00" ||
//     data.data?.responseCode === "00" ||
//     data.message?.toUpperCase().includes("APPROVED");

//   if (approved) {
//     console.log(`✅ Transaction approved: ${data.data?.reference || payload.transactionId}`);
//     return {
//       success: true,
//       message: data.message || "Transaction Approved",
//       data: data.data || data, // data.data is common, but sometimes the whole body is the data
//     };
//   }

//   // Handle paradoxical success (false flag but message = approved)
//   if (data.success === false && data.message === "Approved by Financial Institution") {
//     console.warn(
//       "⚠️ Paradoxical 9PSB response detected (success=false but approved message). Normalizing..."
//     );
//     return {
//       success: true,
//       message: "Transaction Approved by Financial Institution (Normalized)",
//       data: {
//         transactionId: payload.transactionId,
//         responseCode: "00",
//       },
//     };
//   }

//   // Otherwise fail
//   console.error(`[9PSB] API returned non-approved status: ${JSON.stringify(data)}`);
// return {
//   success: false,
//   message: data.message || "9PSB API request failed.",
//   data,
// };

// }

// // ---------------------------------
// // 👤 Wallet Creation
// // ---------------------------------
// const createNairaWallet = async (payload) => {
//   const responseData = await apiCall(ENDPOINTS.WALLET_OPENING, payload);
//   const dataBody = responseData.data || responseData;

//   const accountNumber =
//     dataBody.accountNumber || dataBody.wallet?.accountNumber || null;
//   const fullName =
//     dataBody.fullName ||
//     dataBody.accountName ||
//     (dataBody.firstName && dataBody.lastName
//       ? `${dataBody.firstName} ${dataBody.lastName}`
//       : null);

//   if (!accountNumber || !fullName) {
//     console.error("9PSB Response Data (Missing Wallet Details):", responseData);
//     throw new Error(
//       "Account details (accountNumber/fullName) could not be extracted from the 9PSB response."
//     );
//   }

//   return {
//     status: true,
//     message: responseData.message || "Account Opening successful",
//     data: { accountNumber, fullName },
//   };
// };

// // ---------------------------------
// // 💰 Balance Enquiry
// // ---------------------------------
// const getNairaWalletBalance = async (accountNo) => {
//   const transactionId = `BALANCE-${Date.now()}`;
//   const payload = { accountNo, transactionId };
//   const data = await apiCall(ENDPOINTS.BALANCE_ENQUIRY, payload);

//   const hasBalanceData = data.data && data.data.availableBalance !== undefined;
//   if (!hasBalanceData) {
//     throw new Error("Balance data missing in 9PSB response.");
//   }

//   console.log(`9PSB Balance Enquiry successful, Response Data: ${JSON.stringify(data)}`);
//   return data;
// };

// // ---------------------------------
// // 💵 Deposit (Credit Wallet)
// // ---------------------------------
// const depositFunds = async (accountNo, amount) => {
//   const numericAmount = parseFloat(amount);
//   const transactionId = `WAAS${Date.now()}`;
//   const narration = `APP/CREDIT_WALLET/${NINEPSB_FLOAT_ACCOUNT}/${transactionId}`;

//   const payload = {
//     accountNo,
//     totalAmount: numericAmount.toFixed(2),
//     transactionId,
//     narration,
//     merchant: { isFee: false, merchantFeeAccount: "", merchantFeeAmount: "" },
//     transactionType: "CREDIT_WALLET",
//   };

//   const apiResult = await apiCall(ENDPOINTS.DEPOSIT, payload);

//   const isApproved =
//     apiResult.success === true ||
//     apiResult.message?.toUpperCase().includes("APPROVED") ||
//     apiResult.data?.responseCode === "00";

//   if (isApproved) {
//     console.log("💰 Deposit successful for:", accountNo, "TxnID:", transactionId);
//     return {
//       success: true,
//       message: apiResult.message || "Deposit Approved by Financial Institution",
//       data: {
//         transactionId,
//         reference: apiResult.data?.reference || transactionId,
//         responseCode: "00",
//       },
//     };
//   }

//   console.error("Deposit failed:", apiResult);
//   return { success: false, message: apiResult.message || "Deposit failed" };
// };

// // ---------------------------------
// // 💳 Debit / Transfer Funds
// // ---------------------------------
// const transferFunds = async (
//   sourceAccountNo,
//   amount,
//   narration,
//   destinationAccountNo,
//   destinationBankCode = null
// ) => {
//   const transactionId = `DEBIT-${Date.now()}`;
//   const payload = {
//     sourceAccountNo,
//     totalAmount: amount.toFixed(2).toString(),
//     transactionId,
//     narration,
//     destinationAccountNo,
//     destinationBankCode,
//     merchant: { isFee: false },
//     transactionType: "DEBIT_WALLET",
//   };

//   const finalPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v != null));
//   return apiCall(ENDPOINTS.DEBIT_TRANSFER, finalPayload);
// };

// // ---------------------------------
// // 🔍 Transaction Status Query (TSQ)
// // ---------------------------------
// /**
//  * @name getTransactionStatus
//  * @description Queries 9PSB for the final status of a transaction using the local transactionId.
//  * @param {string} transactionId - The transaction ID generated by your system (e.g., WAAS1715456987456).
//  * @returns {Object} API response with transaction details and status.
//  */
// const getTransactionStatus = async (transactionId) => {
//   const payload = { transactionId };
//   const apiResult = await apiCall(ENDPOINTS.TRANSACTION_STATUS_QUERY, payload);

//   const hasTSQData = apiResult.success && apiResult.data;
//   if (!hasTSQData) {
//     console.error(`TSQ failed for ${transactionId}:`, apiResult);
//     // Throw an error if the TSQ itself failed, as we can't determine the transaction status.
//     throw new Error(apiResult.message || "TSQ failed to retrieve transaction data.");
//   }

//   // The caller is expected to inspect apiResult.data for the actual status codes/messages.
//   return {
//     success: apiResult.success,
//     message: apiResult.message,
//     data: apiResult.data,
//   };
// };

// // ---------------------------------
// // 🧩 Escrow Logic
// // ---------------------------------
// async function debitWallet({
//   sourceAccount,
//   amount,
//   reference,
//   narration = "P2P Escrow - Secure Funds",
// }) {
//   return transferFunds(sourceAccount, amount, narration, NINEPSB_FLOAT_ACCOUNT);
// }

// async function creditWallet({
//   beneficiaryAccount,
//   amount,
//   reference,
//   narration = "P2P Escrow - Settle Beneficiary",
// }) {
//   return depositFunds(beneficiaryAccount, amount);
// }

// // ---------------------------------
// // 📦 Exports
// // ---------------------------------
// module.exports = {
//   createNairaWallet,
//   getNairaWalletBalance,
//   depositFunds,
//   transferFunds,
//   debitWallet,
//   creditWallet,
//   getTransactionStatus, // <-- NEW EXPORT
//   NINEPSB_FLOAT_ACCOUNT,
// };

// NEW UPDATE FOR MERGING ALL 9PSB 
// ninePSBServices.js

// // --- External Dependencies ---
// const axios = require("axios");
// // --- Environment Config ---
// const NINEPSB_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;
// const NINEPSB_WAAS_USERNAME = process.env.NINEPSB_WAAS_USERNAME; 
// const NINEPSB_WAAS_PASSWORD = process.env.NINEPSB_WAAS_PASSWORD;
// const NINEPSB_CLIENT_ID = process.env.NINEPSB_WAAS_CLIENT_ID;
// const NINEPSB_CLIENT_SECRET = process.env.NINEPSB_WAAS_CLIENT_SECRET;
// const NINEPSB_API_KEY = process.env.NINEPSB_API_KEY; 
// const NINEPSB_FLOAT_ACCOUNT = process.env.NINEPSB_FLOAT_ACCOUNT; 

// // --- Token Cache ---
// let NINEPSB_BEARER_TOKEN = null;
// let TOKEN_EXPIRY_TIME = 0;

// // ---------------------------------
// // 🧩 API Endpoints
// // ---------------------------------
// const ENDPOINTS = {
//   AUTH: "api/v1/authenticate",
//   WALLET_OPENING: "api/v1/open_wallet",
//   // CREDIT_TRANSFER is used for ALL inflow to a customer wallet (implicitly debits the Float account)
//   DEPOSIT: "api/v1/credit/transfer", 
//   // DEBIT_TRANSFER is used for ALL outflow from a customer wallet (implicitly credits the Float account)
//   DEBIT_TRANSFER: "api/v1/debit/transfer", 
//   BALANCE_ENQUIRY: "api/v1/wallet_enquiry",
//   TRANSACTION_STATUS_QUERY: "api/v1/wallet_requery",
// };

// // ---------------------------------
// // 🧩 Utility: Centralized Error Logger
// // ---------------------------------
// function logNinepsbError(context, error) {
//   if (error.response) {
//     const apiMessage = error.response.data?.message;
//     console.error(
//       `[9PSB] ${context} failed with status ${error.response.status}. API Message: ${apiMessage}`
//     );
//     console.error(`[9PSB RAW ERROR DATA]: Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
//     // If the message is a success message being incorrectly logged as an error, 
//     // throw the message itself to be caught as a success upstream if possible, 
//     // but typically we must treat it as a failure since the API structure was unexpected.
//     throw new Error(apiMessage || `9PSB API Error during ${context}: ${error.response.status}`);
//   } else if (error.request) {
//     console.error(`[9PSB] ${context} failed: No response received.`, error.message);
//     throw new Error(`9PSB API Error during ${context}: No response from server.`);
//   } else {
//     console.error(`[9PSB] ${context} failed: Request setup error.`, error.message);
//     throw new Error(`9PSB API Error during ${context}: ${error.message}`);
//   }
// }


// // ---------------------------------
// // 🔒 Authentication 
// // ---------------------------------
// async function getWaasToken() {
//   // Check if token is still valid (simplified expiry check: 5 minutes)
//   if (NINEPSB_BEARER_TOKEN && Date.now() < TOKEN_EXPIRY_TIME - (5 * 60 * 1000)) {
//     return NINEPSB_BEARER_TOKEN;
//   }
//   
//   console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
//   
//   const endpoint = ENDPOINTS.AUTH;
//   const url = `${NINEPSB_BASE_URL.replace(/\/$/, '')}/${endpoint}`;
//   
//   try {
//     const authResponse = await axios.post(url, {
//       username: NINEPSB_WAAS_USERNAME,
//       password: NINEPSB_WAAS_PASSWORD,
//       clientId: NINEPSB_CLIENT_ID,
//       clientSecret: NINEPSB_CLIENT_SECRET,
//     });
//   
//     if (authResponse.data.message === "successful") {
//       NINEPSB_BEARER_TOKEN = authResponse.data.accessToken;
//       // Set expiry to 1 hour from now (in ms)
//       TOKEN_EXPIRY_TIME = Date.now() + (3600 * 1000); 
//       console.log("✅ New NINEPSB WAAS token generated successfully.");
//       return NINEPSB_BEARER_TOKEN;
//     }
//     // Fallback for unsuccessful message
//     throw new Error(authResponse.data.message || 'Authentication failed with unknown message.');
//   } catch (error) {
//     logNinepsbError("Authenticate", error);
//     // Re-throw the error from logNinepsbError
//   }
// }


// // ---------------------------------
// // 🚀 Core API Call Wrapper - CRITICAL FIX APPLIED HERE
// // ---------------------------------
// async function apiCall(endpoint, payload) {
//   const token = await getWaasToken();
//   const url = `${NINEPSB_BASE_URL.replace(/\/$/, '')}/${endpoint}`;
//   const context = endpoint.split('/').pop() || endpoint;

//   try {
//     const response = await axios.post(url, payload, {
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`,
//         "apikey": NINEPSB_API_KEY, 
//       },
//     });

//     // 9PSB always returns 200 on success/failure, check the internal code and message
//     const apiStatus = response.data.code || response.data.statusCode;
//     const apiMessage = response.data.message;
    
//     // ✅ FIX: Include known success messages in the success check.
//     // The "Approved by Financial Institution" message is a success indicator 
//     // even when the 'code' field is missing/undefined.
//     const isSuccessMessage = apiMessage === "successful" || apiMessage === "Approved by Financial Institution";
    
//     if (apiStatus === "00" || apiStatus === 200 || isSuccessMessage) {
//       return {
//         success: true,
//         message: apiMessage || "Success",
//         data: response.data.data || response.data,
//       };
//     }
//     
//     // Handle API-side failure (e.g., insufficient funds, bad payload)
//     console.error(`[9PSB] ${context} failed with code ${apiStatus}. Message: ${apiMessage}`);
//     throw new Error(apiMessage || `9PSB API Failure: ${apiStatus}`);

//   } catch (error) {
//     // Handle network/HTTP errors (404, 500, etc.)
//     logNinepsbError(context, error);
//     // Re-throw error from logNinepsbError
//   }
// }


// // ---------------------------------
// // 💸 Single Wallet Transfer Logic (Debit/Credit)
// // ---------------------------------
// const performTransfer = async (accountNo, amount, reference, transactionType) => {
//     if (!NINEPSB_FLOAT_ACCOUNT) {
//         throw new Error("Missing NINEPSB_FLOAT_ACCOUNT environment variable.");
//     }
    
//     // Determine which endpoint to use
//     const endpoint = (transactionType === "DEBIT_WALLET") 
//         ? ENDPOINTS.DEBIT_TRANSFER 
//         : ENDPOINTS.DEPOSIT; // DEPOSIT is 'api/v1/credit/transfer'

//     const numericAmount = parseFloat(amount);
//     const transactionId = reference; 
//     const narration = `P2P/${transactionType}/${accountNo}/${transactionId}`;

//     const payload = {
//         accountNo, // The user/merchant wallet being affected
//         totalAmount: numericAmount.toFixed(2),
//         transactionId,
//         narration,
//         merchant: { 
//             isFee: false, 
//             merchantFeeAccount: "", 
//             merchantFeeAmount: "" 
//         },
//         transactionType, // CRITICAL: DEBIT_WALLET or CREDIT_WALLET
//     };

//     console.log(`[9PSB] Attempting ${transactionType} for account ${accountNo}...`);

//     try {
//         const apiResult = await apiCall(endpoint, payload);
        
//         // apiCall handles the '00'/success message check
//         const isApproved = apiResult.success; 

//         if (isApproved) {
//             console.log(`✅ ${transactionType} successful for: ${accountNo} TxnID: ${transactionId}`);
//             return {
//                 success: true,
//                 message: apiResult.message || `${transactionType} Approved`,
//                 data: {
//                     transactionId,
//                     reference: apiResult.data?.reference || transactionId,
//                     responseCode: "00",
//                 },
//             };
//         }
//     } catch (error) {
//         // Error already logged and re-thrown by apiCall/logNinepsbError
//         throw error;
//     }
// };


// // ---------------------------------
// // 🧩 Escrow Logic (P2P Service Wrappers)
// // ---------------------------------

// /**
//  * @name debitUserToEscrow
//  * @description Debits the Buyer's NGN wallet (OUTFLOW) and implicitly credits the central Float account.
//  */
// async function debitUserToEscrow(buyerAccountNumber, amount, reference) {
//     // This uses the DEBIT_TRANSFER endpoint
//     return performTransfer(
//         buyerAccountNumber, 
//         amount, 
//         reference, 
//         "DEBIT_WALLET"
//     );
// }

// /**
//  * @name creditMerchantFromEscrow
//  * @description Debits the central Float account (INFLOW to Merchant) and credits the Merchant's NGN wallet.
//  */
// async function creditMerchantFromEscrow(merchantAccountNumber, amount, reference) {
//     // This uses the CREDIT_TRANSFER (DEPOSIT) endpoint
//     return performTransfer(
//         merchantAccountNumber, 
//         amount, 
//         reference, 
//         "CREDIT_WALLET"
//     );
// }

// /**
//  * @name creditUserFromEscrow
//  * @description Reverses the escrow: Debits Float/Escrow and credits the Buyer's NGN wallet (reversal credit).
//  */
// async function creditUserFromEscrow(buyerAccountNumber, amount, reference) {
//     // This uses the CREDIT_TRANSFER (DEPOSIT) endpoint for a reversal
//     return performTransfer(
//         buyerAccountNumber, 
//         amount, 
//         reference, 
//         "CREDIT_WALLET"
//     );
// }


// // --- LEGACY/DEPRECATED FUNCTIONS (Kept for compatibility) ---

// async function debitWallet({ sourceAccount, amount, reference, }) {
//   console.warn("⚠️ Legacy function debitWallet detected. Mapping to debitUserToEscrow...");
//   return debitUserToEscrow(sourceAccount, amount, reference);
// }

// async function creditWallet({ beneficiaryAccount, amount, reference, }) {
//   console.warn("⚠️ Legacy function creditWallet detected. Mapping to creditMerchantFromEscrow...");
//   return creditMerchantFromEscrow(beneficiaryAccount, amount, reference);
// }


// // ---------------------------------
// // 📦 Exports
// // ---------------------------------
// module.exports = {
//   // P2P Escrow Operations (Primary)
//   debitUserToEscrow, 
//   creditMerchantFromEscrow,
//   creditUserFromEscrow,
  
//   PROVIDER_NAME: "9PSB",
// };



//LATEST UPDATE
// --- External Dependencies ---
const axios = require("axios");
// --- Environment Config ---
const NINEPSB_BASE_URL = process.env.NINEPSB_WAAS_BASE_URL;
const NINEPSB_WAAS_USERNAME = process.env.NINEPSB_WAAS_USERNAME;
const NINEPSB_WAAS_PASSWORD = process.env.NINEPSB_WAAS_PASSWORD;
const NINEPSB_CLIENT_ID = process.env.NINEPSB_WAAS_CLIENT_ID;
const NINEPSB_CLIENT_SECRET = process.env.NINEPSB_WAAS_CLIENT_SECRET;
const NINEPSB_API_KEY = process.env.NINEPSB_API_KEY;
const NINEPSB_FLOAT_ACCOUNT = process.env.NINEPSB_FLOAT_ACCOUNT;

// --- Token Cache ---
let NINEPSB_BEARER_TOKEN = null;
let TOKEN_EXPIRY_TIME = 0;

// ---------------------------------
// 🧩 API Endpoints
// ---------------------------------
const ENDPOINTS = {
  AUTH: "api/v1/authenticate",
  WALLET_OPENING: "api/v1/open_wallet",
  VIRTUAL_ACCOUNT_QUERY: "api/v1/virtual_account_enquiry", 
  DEPOSIT: "api/v1/credit/transfer",
  DEBIT_TRANSFER: "api/v1/debit/transfer",
  BALANCE_ENQUIRY: "api/v1/wallet_enquiry",
  TRANSACTION_STATUS_QUERY: "api/v1/wallet_requery",
};

// ---------------------------------
// 🧩 Utility: Centralized Error Logger
// ---------------------------------
function logNinepsbError(context, error) {
  if (error.response) {
    const apiMessage = error.response.data?.message;
    console.error(
      `[9PSB] ${context} failed with status ${error.response.status}. API Message: ${apiMessage}`
    );
    console.error(`[9PSB RAW ERROR DATA]: Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    throw new Error(apiMessage || `9PSB API Error during ${context}: ${error.response.status}`);
  } else if (error.request) {
    console.error(`[9PSB] ${context} failed: No response received.`, error.message);
    throw new Error(`9PSB API Error during ${context}: No response from server.`);
  } else {
    console.error(`[9PSB] ${context} failed: Request setup error.`, error.message);
    throw new Error(`9PSB API Error during ${context}: ${error.message}`);
  }
}


// ---------------------------------
// 🔒 Authentication
// ---------------------------------
async function getWaasToken() {
  // Check if token is still valid (simplified expiry check: 5 minutes buffer)
  if (NINEPSB_BEARER_TOKEN && Date.now() < TOKEN_EXPIRY_TIME - (5 * 60 * 1000)) {
    return NINEPSB_BEARER_TOKEN;
  }
 
  console.log("🔄 NINEPSB WAAS token expired or missing. Generating new token...");
 
  const endpoint = ENDPOINTS.AUTH;
  const url = `${NINEPSB_BASE_URL.replace(/\/$/, '')}/${endpoint}`;
 
  try {
    const authResponse = await axios.post(url, {
      username: NINEPSB_WAAS_USERNAME,
      password: NINEPSB_WAAS_PASSWORD,
      clientId: NINEPSB_CLIENT_ID,
      clientSecret: NINEPSB_CLIENT_SECRET,
    });
 
    if (authResponse.data.message === "successful") {
      NINEPSB_BEARER_TOKEN = authResponse.data.accessToken;
      // Set expiry to 1 hour from now (in ms)
      TOKEN_EXPIRY_TIME = Date.now() + (3600 * 1000);
      console.log("✅ New NINEPSB WAAS token generated successfully.");
      return NINEPSB_BEARER_TOKEN;
    }
    // Fallback for unsuccessful message
    throw new Error(authResponse.data.message || 'Authentication failed with unknown message.');
  } catch (error) {
    logNinepsbError("Authenticate", error);
    // Re-throw the error from logNinepsbError
  }
}


// ---------------------------------
// 🚀 Core API Call Wrapper - UPDATED for Flexible Success Check
// ---------------------------------
async function apiCall(endpoint, payload) {
  const token = await getWaasToken();
  const url = `${NINEPSB_BASE_URL.replace(/\/$/, '')}/${endpoint}`;
  const context = endpoint.split('/').pop() || endpoint;

console.log(`[9PSB DEBUG] Payload being sent to ${endpoint}:`);
    console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": NINEPSB_API_KEY,
      },
    });

    // 9PSB always returns 200 on success/failure, check the internal code and message
    const apiStatus = response.data.code || response.data.statusCode;
    const apiMessage = response.data.message;
   
    // ✅ NEW FLEXIBLE SUCCESS CHECK (as requested)
    const isSuccessMessage =
      apiMessage?.toLowerCase().includes("successful") ||
      apiMessage?.toLowerCase().includes("approved");
   
    if (apiStatus === "00" || apiStatus === 200 || isSuccessMessage) {
      return {
        success: true,
        message: apiMessage || "Success",
        data: response.data.data || response.data,
      };
    }
   
    // Handle API-side failure (e.g., insufficient funds, bad payload)
    console.error(`[9PSB] ${context} failed with code ${apiStatus}. Message: ${apiMessage}`);
    throw new Error(apiMessage || `9PSB API Failure: ${apiStatus}`);

  } catch (error) {
    // Handle network/HTTP errors (404, 500, etc.)
    logNinepsbError(context, error);
    // Re-throw error from logNinepsbError
  }
}


// ---------------------------------
// 💸 Single Wallet Transfer Logic (Debit/Credit)
// ---------------------------------
const performTransfer = async (accountNo, amount, reference, transactionType) => {
    if (!NINEPSB_FLOAT_ACCOUNT) {
        throw new Error("Missing NINEPSB_FLOAT_ACCOUNT environment variable.");
    }
    
    // Determine which endpoint to use
    const endpoint = (transactionType === "DEBIT_WALLET")
        ? ENDPOINTS.DEBIT_TRANSFER
        : ENDPOINTS.DEPOSIT; // DEPOSIT is 'api/v1/credit/transfer'

    const numericAmount = parseFloat(amount);
    const transactionId = reference;
    const narration = `P2P/${transactionType}/${accountNo}/${transactionId}`;

    const counterPartyAccount = NINEPSB_FLOAT_ACCOUNT;
    let payload = {}; // Initialize payload

    // --- Core Fields common to both DEBIT and CREDIT ---
    const basePayload = {
        totalAmount: numericAmount.toFixed(2),
        transactionId,
        narration,
        merchant: {
            isFee: false,
            merchantFeeAccount: "",
            merchantFeeAmount: ""
        },
        transactionType, 
    };

    if (transactionType === "CREDIT_WALLET") if (transactionType === "CREDIT_WALLET") {
    // FIX ATTEMPT #4: User as primary accountNo, Float as sourceAccount
    payload = {
        ...basePayload,
        accountNo: accountNo,          // Destination: User's Account
        sourceAccount: counterPartyAccount, // Source: Float Account
        // NOTE: If this fails, try removing the statusCallbackUrl field entirely, as that may also be a source of the error.
    };
}else { // DEBIT_WALLET
        // --- Use previous structure for DEBIT_WALLET as it's often simpler (Source is the user) ---
        payload = {
            ...basePayload,
            // 1. Primary accountNo is the User Account (Source)
            accountNo: accountNo,
            // 2. Destination is the Float Account
            destinationAccount: counterPartyAccount,
        };
    }

    console.log(`[9PSB] Attempting ${transactionType} for account ${accountNo}...`);
    // NOTE: Console logging the payload here can help debug if needed
    // console.log("Payload sent:", JSON.stringify(payload)); 

    try {
        const apiResult = await apiCall(endpoint, payload);
        
        const isApproved = apiResult.success;

        if (isApproved) {
            console.log(`✅ ${transactionType} successful for: ${accountNo} TxnID: ${transactionId}`);
            return {
                success: true,
                message: apiResult.message || `${transactionType} Approved`,
                data: {
                    transactionId,
                    reference: apiResult.data?.reference || transactionId,
                    responseCode: "00",
                    apiTransactionId: apiResult.data?.transactionId || apiResult.data?.reference,
                },
            };
        }
    } catch (error) {
        throw error;
    }
};

// ---------------------------------
// 🏦 User Deposit / Info (NEW FUNCTIONS)
// ---------------------------------

/**
 * @name getVirtualAccount
 * @description Fetches the dedicated virtual account details for a user's wallet.
 */
async function getVirtualAccount(accountNumber) {
    const endpoint = ENDPOINTS.VIRTUAL_ACCOUNT_QUERY;
    const payload = {
        accountNo: accountNumber,
    };

    console.log(`[9PSB] Attempting to fetch virtual account for: ${accountNumber}...`);

    try {
        const apiResult = await apiCall(endpoint, payload);
        
        if (apiResult.success && apiResult.data) {
            console.log(`✅ Virtual account fetch successful for: ${accountNumber}`);
            return apiResult.data; 
        }

        throw new Error(apiResult.message || "Virtual account details not returned by 9PSB.");
    } catch (error) {
        throw error;
    }
}

/**
 * @name getTransactionStatus
 * @description Queries the final status of a transaction (Transaction Status Query - TSQ).
 */
async function getTransactionStatus(transactionId) {
    const endpoint = ENDPOINTS.TRANSACTION_STATUS_QUERY;
    const payload = {
        transactionId,
    };

    console.log(`[9PSB] Initiating TSQ for transaction: ${transactionId}...`);

    try {
        const apiResult = await apiCall(endpoint, payload);
        
        if (apiResult.success) {
            return {
                success: true,
                message: apiResult.message,
                data: apiResult.data, 
            };
        }

        throw new Error(apiResult.message || `TSQ failed for: ${transactionId}`);
    } catch (error) {
        throw error;
    }
}


// ---------------------------------
// 🧩 Escrow Logic (P2P Service Wrappers)
// ---------------------------------

/**
 * @name debitUserToEscrow
 * @description Debits the Buyer's NGN wallet (OUTFLOW) and implicitly credits the central Float account.
 */
async function debitUserToEscrow(buyerAccountNumber, amount, reference) {
    // This uses the DEBIT_TRANSFER endpoint
    return performTransfer(
        buyerAccountNumber,
        amount,
        reference,
        "DEBIT_WALLET"
    );
}

/**
 * @name creditMerchantFromEscrow
 * @description Debits the central Float account (INFLOW to Merchant) and credits the Merchant's NGN wallet.
 */
async function creditMerchantFromEscrow(merchantAccountNumber, amount, reference) {
    // This uses the CREDIT_TRANSFER (DEPOSIT) endpoint
    return performTransfer(
        merchantAccountNumber,
        amount,
        reference,
        "CREDIT_WALLET"
    );
}

/**
 * @name creditUserFromEscrow
 * @description Reverses the escrow: Debits Float/Escrow and credits the Buyer's NGN wallet (reversal credit).
 */
async function creditUserFromEscrow(buyerAccountNumber, amount, reference) {
    // This uses the CREDIT_TRANSFER (DEPOSIT) endpoint for a reversal
    return performTransfer(
        buyerAccountNumber,
        amount,
        reference,
        "CREDIT_WALLET"
    );
}


// --- LEGACY/DEPRECATED FUNCTIONS (Kept for compatibility) ---

async function debitWallet({ sourceAccount, amount, reference, }) {
  console.warn("⚠️ Legacy function debitWallet detected. Mapping to debitUserToEscrow...");
  return debitUserToEscrow(sourceAccount, amount, reference);
}

async function creditWallet({ beneficiaryAccount, amount, reference, }) {
  console.warn("⚠️ Legacy function creditWallet detected. Mapping to creditMerchantFromEscrow...");
  return creditMerchantFromEscrow(beneficiaryAccount, amount, reference);
}


// ---------------------------------
// 📦 Exports
// ---------------------------------
module.exports = {
  // P2P Escrow Operations (Primary)
  debitUserToEscrow,
  creditMerchantFromEscrow,
  creditUserFromEscrow,
 
  // NEW: Deposit and Status Query
  getVirtualAccount,
  getTransactionStatus,
 
  PROVIDER_NAME: "9PSB",
}; 