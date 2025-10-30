// For now use static conversion rates, later you can integrate a live FX API
exports.convertCurrency = async (from, to) => {
  const staticRates = {
    "NGN/USD": 0.0011,
    "USD/NGN": 910,
    "USD/RMB": 7.2,
    "RMB/USD": 0.139,
    "NGN/RMB": 0.008,
    "RMB/NGN": 125,
    "USD/GHS": 15.5,
    "GHS/USD": 0.065,
  };

  const key = `${from}/${to}`;
  return staticRates[key] || 1; // fallback rate 1:1 if unknown
};
