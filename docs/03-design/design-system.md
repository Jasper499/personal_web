# 设计规范（Design System）

## 品牌标识

| 元素 | 值 |
|------|-----|
| 品牌名 | 匠心小铺 |
| 主色 Primary | `#E85D4C`（暖珊瑚红，传递温度与食欲感） |
| 辅助色 Secondary | `#2D3436`（深灰，标题与重要文字） |
| 强调色 Accent | `#F9CA24`（促销标签、会员点缀） |
| 成功色 Success | `#00B894` |
| 警告色 Warning | `#FDCB6E` |
| 错误色 Error | `#D63031` |

## 中性色

| 名称 | 色值 | 用途 |
|------|------|------|
| Gray-100 | `#F8F9FA` | 页面背景 |
| Gray-200 | `#E9ECEF` | 分割线、边框 |
| Gray-400 | `#ADB5BD` | 次要文字、占位符 |
| Gray-600 | `#6C757D` | 辅助说明 |
| Gray-900 | `#212529` | 正文 |
| White | `#FFFFFF` | 卡片背景 |

## 字体

微信小程序使用系统字体栈：

```
font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

| 层级 | 字号 | 字重 | 行高 |
|------|------|------|------|
| H1 页面标题 | 36rpx | 600 | 1.4 |
| H2 区块标题 | 32rpx | 600 | 1.4 |
| H3 卡片标题 | 28rpx | 500 | 1.5 |
| Body 正文 | 28rpx | 400 | 1.6 |
| Caption 说明 | 24rpx | 400 | 1.5 |
| Price 价格 | 36rpx | 600 | 1.2 |

## 间距（8rpx 栅格）

| Token | 值 | 用途 |
|-------|-----|------|
| space-xs | 8rpx | 紧凑间距 |
| space-sm | 16rpx | 组件内边距 |
| space-md | 24rpx | 卡片内边距 |
| space-lg | 32rpx | 区块间距 |
| space-xl | 48rpx | 大区块 |

## 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| radius-sm | 8rpx | 标签、小按钮 |
| radius-md | 16rpx | 卡片、输入框 |
| radius-lg | 24rpx | 大卡片、弹窗 |
| radius-full | 999rpx | 胶囊按钮 |

## 阴影

```css
/* 卡片阴影 */
box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

/* 浮层阴影 */
box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
```

## 组件规范

### 主按钮

- 背景：`#E85D4C`，文字白色
- 高度：88rpx，圆角 44rpx（全宽或自适应）
- 禁用：透明度 0.5

### 次级按钮

- 边框：2rpx `#E85D4C`，文字 `#E85D4C`，背景透明

### 商品卡片

- 图片比例 1:1，圆角 16rpx
- 标题最多 2 行省略
- 价格用主色，原价灰色删除线

### Tab Bar

- 未选中：`#999999`
- 选中：`#E85D4C`
- 购物车角标：红色圆点 + 白色数字

## 图标

使用 [iconfont](https://www.iconfont.cn/) 或微信内置 icon：
- 首页、分类、购物车、我的
- 搜索、地址、客服、箭头

## 交互状态

| 状态 | 表现 |
|------|------|
| 加载中 | 骨架屏或 loading 动画 |
| 空状态 | 插画 + 引导文案 + 操作按钮 |
| 错误 | Toast 提示 + 重试按钮 |
| 下拉刷新 | 微信原生 refresher |
