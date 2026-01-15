// require("dotenv").config();
// const axios = require("axios");

// const PREMBLY_API_KEY = process.env.PREMBLY_API_KEY;
// const PREMBLY_APP_ID = process.env.PREMBLY_API_ID;
// const PREMBLY_BASE = process.env.PREMBLY_BASE_URL || "https://api.prembly.com";

// const prembly = axios.create({
//   baseURL: PREMBLY_BASE,
//   timeout: parseInt(process.env.PREMBLY_TIMEOUT_MS || "15000", 10),
//   headers: {
//     "x-api-key": PREMBLY_API_KEY,
//     "app-id": PREMBLY_APP_ID,
//     "Content-Type": "application/json",
//   },
// });

// prembly.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     err.isPremblyError = true;
//     return Promise.reject(err);
//   }
// );

// // simple retry wrapper
// async function requestWithRetry(fn, retries = 2, delayMs = 700) {
//   let lastErr;

//   for (let i = 0; i <= retries; i++) {
//     try {
//       return await fn();
//     } catch (err) {
//       lastErr = err;

//       // 🔴 LOG PREMBLY ERROR PAYLOAD
//       if (err.response) {
//         console.error("PREMBLY ERROR:", {
//           status: err.response.status,
//           data: err.response.data,
//         });
//       } else {
//         console.error("PREMBLY NETWORK ERROR:", err.message);
//       }

//       // Decide if retryable
//       const status = err.response?.status;
//       if (status && status < 500) break; // don't retry 4xx errors

//       if (i < retries) {
//         await new Promise((r) => setTimeout(r, delayMs));
//       }
//     }
//   }

//   throw lastErr;
// }

// async function verifyBVN(bvn) {
//   const url = `/verification/bvn_validation`;
//   return requestWithRetry(() => prembly.post(url, { number: bvn }));
// }

// async function verifyNIN(nin) {
//   const url = `/verification/vnin`;
//   //api.prembly.com/verification/vnin
//   https: return requestWithRetry(() => prembly.post(url, { number: nin }));
// }

// async function verifyLiveliness(base64Image) {
//   const url = `/verification/biometrics/face/liveliness_check`;
//   return requestWithRetry(
//     () => prembly.post(url, { image: base64Image }),
//     2,
//     800
//   );
// }

// module.exports = {
//   verifyBVN,
//   verifyNIN,
//   verifyLiveliness,
// };

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

prembly.interceptors.response.use(
  (res) => res,
  (err) => {
    err.isPremblyError = true;
    return Promise.reject(err);
  }
);

// simple retry wrapper
async function requestWithRetry(fn, retries = 2, delayMs = 700) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (err.response) {
        console.error("PREMBLY ERROR:", {
          status: err.response.status,
          data: err.response.data,
        });
      } else {
        console.error("PREMBLY NETWORK ERROR:", err.message);
      }

      const status = err.response?.status;
      if (status && status < 500) break;

      if (i < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

// BVN Basic
async function verifyBVN(bvn) {
  if (!bvn || !/^\d{11}$/.test(bvn)) {
    throw new Error("Invalid BVN format (must be 11 digits)");
  }

  return requestWithRetry(() =>
    prembly.post("/verification/bvn_validation", { number: bvn })
  );
}

// NIN Basic
async function verifyNIN(nin) {
  if (!nin || !/^\d{11}$/.test(nin)) {
    throw new Error("Invalid NIN format (must be 11 digits)");
  }

  return requestWithRetry(() =>
    prembly.post("/verification/vnin-basic", { number: nin })
  );
}

// Liveliness (Face Biometrics)
async function verifyLiveliness(base64Image) {
  if (!base64Image) throw new Error("Base64 image is required");

  return requestWithRetry(
    () =>
      prembly.post("/verification/biometrics/face/liveliness_check", {
        image: base64Image,
      }),
    2,
    800
  );
}

module.exports = {
  verifyBVN,
  verifyNIN,
  verifyLiveliness,
};
