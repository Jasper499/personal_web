# API 接口文档

**Base URL**：`http://localhost:3000/api`  
**鉴权**：Header `Authorization: Bearer <token>`

---

## 认证

### POST /auth/wx-login

微信登录（用户端）

**Body**
```json
{ "code": "微信 wx.login 返回的 code" }
```

**Response**
```json
{
  "token": "jwt_token",
  "user": { "id": 1, "nickname": "用户", "avatar": "" }
}
```

### POST /auth/admin-login

管理员登录

**Body**
```json
{ "username": "admin", "password": "admin123" }
```

---

## 商品

### GET /categories

分类列表

### GET /products

商品列表

**Query**: `categoryId`, `page`, `pageSize`, `keyword`, `sort`（sales|price）

### GET /products/:id

商品详情（含 SKU）

### POST /admin/products

创建商品（管理员）

### PUT /admin/products/:id

更新商品

### PATCH /admin/products/:id/status

上下架 `{ "isActive": true }`

---

## 购物车

### GET /cart

当前用户购物车

### POST /cart

添加 `{ "productId", "skuId?", "quantity" }`

### PUT /cart/:id

更新数量 `{ "quantity" }`

### DELETE /cart/:id

删除项

---

## 地址

### GET /addresses

### POST /addresses

### PUT /addresses/:id

### DELETE /addresses/:id

### PATCH /addresses/:id/default

---

## 订单

### POST /orders

创建订单

```json
{
  "items": [{ "productId": 1, "skuId": null, "quantity": 2 }],
  "deliveryType": "pickup",
  "addressId": null,
  "remark": ""
}
```

### GET /orders

订单列表，Query: `status`

### GET /orders/:id

订单详情

### POST /orders/:id/cancel

取消待付款订单

---

## 支付

### POST /pay/prepay

获取支付参数

```json
{ "orderId": 1 }
```

**Response**（供 `wx.requestPayment` 使用）
```json
{
  "timeStamp": "",
  "nonceStr": "",
  "package": "prepay_id=xxx",
  "signType": "RSA",
  "paySign": ""
}
```

### POST /pay/notify

微信支付回调（微信服务器调用）

### POST /pay/mock-success

开发环境模拟支付成功 `{ "orderId" }`

---

## Banner

### GET /banners

首页轮播

### CRUD /admin/banners

---

## 管理端订单

### GET /admin/orders

### GET /admin/orders/:id

### POST /admin/orders/:id/ship

发货 `{ "expressCompany", "expressNo" }`

### POST /admin/orders/:id/complete-pickup

自提核销

---

## 通用响应格式

**成功**
```json
{ "code": 0, "data": {}, "message": "ok" }
```

**错误**
```json
{ "code": 40001, "message": "错误描述", "data": null }
```

## 错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| 40100 | 未登录 |
| 40300 | 无权限 |
| 40400 | 资源不存在 |
| 40001 | 参数错误 |
| 50001 | 库存不足 |
| 50002 | 订单状态不允许操作 |
