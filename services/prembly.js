  //   require("dotenv").config();
  // const axios = require("axios");

  // const PREMBLY_API_KEY = process.env.PREMBLY_API_KEY;
  // const PREMBLY_APP_ID = process.env.PREMBLY_APP_ID;

  // const headers = {
  //   "x-api-key": PREMBLY_API_KEY,
  //   "app-id": PREMBLY_APP_ID,
  //   "Content-Type": "application/json",
  // };

  // // Detect environment
  // const isProduction = process.env.NODE_ENV === "production";

  // // 🌍 Use correct base depending on mode
  // const BASE_URL = "https://api.prembly.com";

  // /**
  //  * 🔍 Verify BVN
  //  */
  // async function verifyBVN(bvn) {
  //   try {
  //     const url = `${BASE_URL}/verification/bvn_validation`;
  //     console.log("🔍 Calling BVN endpoint:", url);

  //     const response = await axios.post(
  //       url,
  //       { number: bvn },
  //       { headers, timeout: 20000 } // 20s timeout
  //     );

  //     console.log("✅ BVN verification response:", response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       "❌ BVN verification error:",
  //       error.response?.data || error.message
  //     );
  //     throw new Error("Failed to verify BVN");
  //   }
  // }

  // /**
  //  * 🔍 Verify NIN
  //  */
  // async function verifyNIN(nin) {
  //   try {
  //     const url = `${BASE_URL}/verification/vnin`;
  //     console.log("🔍 Calling NIN endpoint:", url);

  //     const response = await axios.post(
  //       url,
  //       { number: nin },
  //       { headers, timeout: 20000 }
  //     );

  //     console.log("✅ NIN verification response:", response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       "❌ NIN verification error:",
  //       error.response?.data || error.message
  //     );
  //     throw new Error("Failed to verify NIN");
  //   }
  // }

  // module.exports = { verifyBVN, verifyNIN };

//NEW: services/prembly.js
require("dotenv").config();
const axios = require("axios");

const PREMBLY_API_KEY = process.env.PREMBLY_API_KEY;
const PREMBLY_APP_ID = process.env.PREMBLY_APP_ID;
const PREMBLY_BASE = process.env.PREMBLY_BASE_URL || "https://api.prembly.com";

const prembly = axios.create({
  baseURL: PREMBLY_BASE,
  timeout: parseInt(process.env.PREMBLY_TIMEOUT_MS || "15000", 10),
  headers: {
    "x-api-key": PREMBLY_API_KEY,
    "app-id": PREMBLY_APP_ID,
    "Content-Type": "application/json",
  },
});

// simple retry wrapper
async function requestWithRetry(fn, retries = 2, delayMs = 700) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // decide if retryable: network errors, 5xx
      const status = err.response?.status;
      if (status && status < 500) break; // don't retry 4xx
      if (i < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function verifyBVN(bvn) {
  const url = `/verification/bvn_validation`;
  return requestWithRetry(() => prembly.post(url, { number: bvn }));
}

async function verifyNIN(nin) {
  const url = `/verification/vnin`;
  return requestWithRetry(() => prembly.post(url, { number: nin }));
}

async function verifyLiveliness(base64Image) {
  const url = `/verification/biometrics/face/liveliness_check`;
  return requestWithRetry(() => prembly.post(url, { image: base64Image }), 2, 800);
}

module.exports = {
  verifyBVN,
  verifyNIN,
  verifyLiveliness,
};
