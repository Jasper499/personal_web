# 数据库设计

## ER 关系图

```mermaid
erDiagram
  users ||--o{ orders : places
  users ||--o{ addresses : has
  users ||--o{ cart_items : has
  categories ||--o{ products : contains
  products ||--o{ product_skus : has
  products ||--o{ cart_items : references
  product_skus ||--o{ cart_items : references
  product_skus ||--o{ order_items : references
  orders ||--|{ order_items : contains
  products ||--o{ order_items : references

  users {
    int id PK
    string openid UK
    string nickname
    string phone
    string avatar
    datetime created_at
  }

  categories {
    int id PK
    string name
    string icon
    int sort_order
    boolean is_active
  }

  products {
    int id PK
    int category_id FK
    string name
    string description
    decimal price
    decimal original_price
    int stock
    string cover_image
    json images
    int sales_count
    boolean is_active
  }

  product_skus {
    int id PK
    int product_id FK
    string spec_name
    decimal price
    int stock
  }

  cart_items {
    int id PK
    int user_id FK
    int product_id FK
    int sku_id FK
    int quantity
  }

  addresses {
    int id PK
    int user_id FK
    string name
    string phone
    string province
    string city
    string district
    string detail
    boolean is_default
  }

  orders {
    int id PK
    string order_no UK
    int user_id FK
    string status
    decimal total_amount
    decimal freight
    decimal pay_amount
    string delivery_type
    json address_snapshot
    string remark
    string pickup_code
    datetime paid_at
    datetime shipped_at
    datetime completed_at
  }

  order_items {
    int id PK
    int order_id FK
    int product_id FK
    int sku_id FK
    string product_name
    string spec_name
    decimal price
    int quantity
    string cover_image
  }

  banners {
    int id PK
    string image_url
    string link_type
    string link_value
    int sort_order
    boolean is_active
  }

  admins {
    int id PK
    string username UK
    string password_hash
    string name
  }
```

## 订单状态枚举

| 值 | 说明 |
|----|------|
| `pending` | 待付款 |
| `paid` | 已付款/待发货 |
| `shipped` | 已发货/待收货 |
| `completed` | 已完成 |
| `cancelled` | 已取消 |
| `refunding` | 退款中（P2） |

## 配送方式

| 值 | 说明 |
|----|------|
| `pickup` | 到店自提 |
| `express` | 快递配送 |

## 索引建议

- `users.openid` UNIQUE
- `orders.order_no` UNIQUE
- `orders(user_id, status)`
- `products(category_id, is_active)`
- `cart_items(user_id, product_id, sku_id)` UNIQUE
