const { getPayConfig } = require('./pay');

let templatesCache = null;

async function getTemplates() {
  if (!templatesCache) {
    const config = await getPayConfig();
    templatesCache = (config && config.subscribeTemplates) || {};
  }
  return templatesCache;
}

async function requestOrderSubscribe() {
  const templates = await getTemplates();
  const tmplIds = [templates.paid, templates.shipped, templates.pickup].filter(Boolean);
  if (!tmplIds.length) return null;

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds,
      complete: resolve,
    });
  });
}

module.exports = { requestOrderSubscribe };
