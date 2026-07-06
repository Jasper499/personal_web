function success(res, data = null, message = 'ok') {
  return res.json({ code: 0, data, message });
}

function fail(res, status, code, message) {
  return res.status(status).json({ code, message, data: null });
}

module.exports = { success, fail };
