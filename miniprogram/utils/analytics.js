const { request, getToken } = require('./request');

function track(event, params = {}) {
  if (!getToken()) return;
  request('/analytics/events', {
    method: 'POST',
    data: { event, params },
  }).catch(() => {});
}

module.exports = { track };
