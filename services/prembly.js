    require("dotenv").config();
  const axios = require("axios");

  const PREMBLY_API_KEY = process.env.PREMBLY_API_KEY;
  const PREMBLY_APP_ID = process.env.PREMBLY_APP_ID;

  const headers = {
    "x-api-key": PREMBLY_API_KEY,
    "app-id": PREMBLY_APP_ID,
    "Content-Type": "application/json",
  };

  // Detect environment
  const isProduction = process.env.NODE_ENV === "production";

  // 🌍 Use correct base depending on mode
  const BASE_URL = "https://api.prembly.com";

  /**
   * 🔍 Verify BVN
   */
  async function verifyBVN(bvn) {
    try {
      const url = `${BASE_URL}/verification/bvn_validation`;
      console.log("🔍 Calling BVN endpoint:", url);

      const response = await axios.post(
        url,
        { number: bvn },
        { headers, timeout: 20000 } // 20s timeout
      );

      console.log("✅ BVN verification response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ BVN verification error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to verify BVN");
    }
  }

  /**
   * 🔍 Verify NIN
   */
  async function verifyNIN(nin) {
    try {
      const url = `${BASE_URL}/verification/vnin`;
      console.log("🔍 Calling NIN endpoint:", url);

      const response = await axios.post(
        url,
        { number: nin },
        { headers, timeout: 20000 }
      );

      console.log("✅ NIN verification response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ NIN verification error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to verify NIN");
    }
  }

  module.exports = { verifyBVN, verifyNIN };
