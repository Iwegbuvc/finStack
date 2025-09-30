
const getDatTimeUTC = () => {
    const now = new Date();

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const day = String(now.getUTCDate()).padStart(2, "0");
    const month = months[now.getUTCMonth()];
    const year = now.getUTCFullYear();
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");

    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} (UTC)`;
};

module.exports = { getDatTimeUTC };
