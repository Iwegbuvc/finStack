require("dotenv").config();
const axios = require("axios");

const API_KEY = process.env.PREMBLY_API_KEY;
const APP_ID = process.env.PREMBLY_APP_ID;

console.log("🔑 Prembly Credentials Loaded:");
console.log("APP_ID:", APP_ID);
console.log("API_KEY:", API_KEY ? "✅ Loaded" : "❌ Missing");
console.log("🧾 Sending NIN verification request...");

(async () => {
  try {
    const payload = {
      number: "12345678901", // 🔹 Replace with the user's actual NIN
      // Optional: Add `dob` or `firstname` depending on your integration level
    };

    const res = await axios.post(
      "https://api.prembly.com/verification/vnin",
      payload,
      {
        headers: {
          "x-api-key": API_KEY,
          "app-id": APP_ID,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Verification Success:", res.data);
  } catch (err) {
    console.error("❌ Prembly API Error:");
    console.error("Status:", err.response?.status || "No status");
    console.error("Data:", err.response?.data || err.message);
  }
})();
