const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { success, fail } = require('../utils/response');
const { authUser } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authUser);

router.get('/', async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.userId },
    orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
  });
  return success(res, addresses);
});

const PHONE_RE = /^1\d{10}$/;

function validateAddress(body) {
  const { name, phone, province, city, district, detail } = body;
  if (!name?.trim() || !phone?.trim() || !detail?.trim()) {
    return '请填写完整地址信息';
  }
  if (!PHONE_RE.test(phone.trim())) {
    return '请填写正确的手机号';
  }
  if (!province?.trim() || !city?.trim() || !district?.trim()) {
    return '请选择省市区';
  }
  return null;
}

router.post('/', async (req, res) => {
  const { name, phone, province, city, district, detail, isDefault } = req.body;
  const error = validateAddress(req.body);
  if (error) {
    return fail(res, 400, 40001, error);
  }
  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: req.userId }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({
    data: {
      userId: req.userId,
      name,
      phone,
      province: province || '',
      city: city || '',
      district: district || '',
      detail,
      isDefault: !!isDefault,
    },
  });
  return success(res, address);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.address.findFirst({ where: { id, userId: req.userId } });
  if (!existing) {
    return fail(res, 404, 40400, '地址不存在');
  }
  const error = validateAddress({ ...existing, ...req.body });
  if (error) {
    return fail(res, 400, 40001, error);
  }
  if (req.body.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.userId }, data: { isDefault: false } });
  }
  const address = await prisma.address.update({ where: { id }, data: req.body });
  return success(res, address);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.address.findFirst({ where: { id, userId: req.userId } });
  if (!existing) {
    return fail(res, 404, 40400, '地址不存在');
  }
  await prisma.address.delete({ where: { id } });
  return success(res, null);
});

router.patch('/:id/default', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.address.findFirst({ where: { id, userId: req.userId } });
  if (!existing) {
    return fail(res, 404, 40400, '地址不存在');
  }
  await prisma.address.updateMany({ where: { userId: req.userId }, data: { isDefault: false } });
  const address = await prisma.address.update({ where: { id }, data: { isDefault: true } });
  return success(res, address);
});

module.exports = router;
