// const NINEPSB_WEBHOOK_USERNAME = process.env.NINEPSB_WEBHOOK_USER;
// const NINEPSB_WEBHOOK_PASSWORD = process.env.NINEPSB_WEBHOOK_PASS;

// /**
//  * Middleware to enforce Basic Authentication for 9PSB Webhooks.
//  */
// const basicAuthMiddleware = (req, res, next) => {

//     // --- TEMPORARY DEBUG LOGS START ---
//     console.log("DEBUG: Received Username:", username);
//     console.log("DEBUG: Received Password:", password);
//     console.log("DEBUG: Expected Username:", NINEPSB_WEBHOOK_USERNAME);
//     console.log("DEBUG: Expected Password:", NINEPSB_WEBHOOK_PASSWORD);
//     // --- TEMPORARY DEBUG LOGS END ---
//     // 1. Check for Authorization header
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Basic ')) {
//         console.error("❌ 9PSB Webhook: Missing or invalid Basic Auth header.");
//         // Required acknowledgement response body for 9PSB (even for failure)
//         return res.status(401).json({ "success": false, "code": "401", "status": "FAILURE", "message": "Unauthorized" });
//     }

//     // 2. Decode credentials
//     // The base64 part is everything after 'Basic '
//     const encodedCredentials = authHeader.substring(6);
//     const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf8');
//     const [username, password] = decodedCredentials.split(':');

//     // 3. Verify credentials
//     if (username === NINEPSB_WEBHOOK_USERNAME && password === NINEPSB_WEBHOOK_PASSWORD) {
//         // Credentials are valid, proceed to controller
//         console.log("✅ 9PSB Webhook: Basic Auth successful.");
//         next();
//     } else {
//         console.error("❌ 9PSB Webhook: Incorrect credentials.");
//         return res.status(401).json({ "success": false, "code": "401", "status": "FAILURE", "message": "Unauthorized" });
//     }
// };

// module.exports = {
//     basicAuthMiddleware
// };

const NINEPSB_WEBHOOK_USERNAME = process.env.NINEPSB_WEBHOOK_USER;
const NINEPSB_WEBHOOK_PASSWORD = process.env.NINEPSB_WEBHOOK_PASS;

/**
 * Middleware to enforce Basic Authentication for 9PSB Webhooks.
 */
const basicAuthMiddleware = (req, res, next) => {

    // 1. Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        console.error("❌ 9PSB Webhook: Missing or invalid Basic Auth header.");
        // Required acknowledgement response body for 9PSB (even for failure)
        return res.status(401).json({ "success": false, "code": "401", "status": "FAILURE", "message": "Unauthorized" });
    }

    // 2. Decode credentials
    // The base64 part is everything after 'Basic '
    const encodedCredentials = authHeader.substring(6);
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf8');
    const [username, password] = decodedCredentials.split(':');

    // --- TEMPORARY DEBUG LOGS START (Correct Position) ---
    console.log("DEBUG: Received Username:", username);
    console.log("DEBUG: Received Password:", password);
    console.log("DEBUG: Expected Username:", NINEPSB_WEBHOOK_USERNAME);
    console.log("DEBUG: Expected Password:", NINEPSB_WEBHOOK_PASSWORD);
    // --- TEMPORARY DEBUG LOGS END ---

    // 3. Verify credentials
    if (username === NINEPSB_WEBHOOK_USERNAME && password === NINEPSB_WEBHOOK_PASSWORD) {
        // Credentials are valid, proceed to controller
        console.log("✅ 9PSB Webhook: Basic Auth successful.");
        next();
    } else {
        console.error("❌ 9PSB Webhook: Incorrect credentials.");
        return res.status(401).json({ "success": false, "code": "401", "status": "FAILURE", "message": "Unauthorized" });
    }
};

module.exports = {
    basicAuthMiddleware
};