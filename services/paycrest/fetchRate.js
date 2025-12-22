const axios = require("axios");

const fetchPaycrestRate = async ({ token, amount, currency, network }) => {
  const url = `${process.env.PAYCREST_BASE_URL}/rates/${token}/${amount}/${currency}?network=${network}`;

  const { data } = await axios.get(url, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000
  });

  if (!data?.data) {
    throw new Error("Failed to fetch Paycrest rate");
  }

  return data.data; // rate object
};

module.exports = fetchPaycrestRate;