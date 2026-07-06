function generateOrderNo() {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const date =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${date}${random}`;
}

function generatePickupCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { generateOrderNo, generatePickupCode };
