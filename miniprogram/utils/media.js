const { getApiRoot } = require('./request');

function resolveImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const root = getApiRoot();
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${root}${path}`;
}

function mapProductImages(product) {
  if (!product) return product;
  const images = Array.isArray(product.images)
    ? product.images.map(resolveImageUrl)
    : product.images;
  return {
    ...product,
    coverImage: resolveImageUrl(product.coverImage),
    images,
  };
}

module.exports = { resolveImageUrl, mapProductImages };
