const axios = require("axios");

const createPaycrestOrder = async (payload) => {
  const { data } = await axios.post(
    `${process.env.PAYCREST_BASE_URL}/sender/orders`,
    payload,
    {
      headers: {
        "API-Key": process.env.PAYCREST_API_KEY,
        "Content-Type": "application/json"
      },
      timeout: 20000
    }
  );

  if (!data?.data?.id) {
    throw new Error("Invalid Paycrest order response");
  }

  return data.data;
};

module.exports = createPaycrestOrder;