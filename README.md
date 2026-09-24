# 房東稅賦試算

比較「房東自租自管」「公益出租人」「社宅包租代管」「一般宅包租代管」四種出租身分的
綜所稅、房屋稅、地價稅與整年淨收益。

正式網址：<https://landlord.3mi.ai/>

## 結構

```
public/          # 網站本體，也是部署目錄
  index.html     # 單頁介面（樣式沿用窩算算 WoCalc 的色票與字型）
  calc.js        # 試算核心，純函式，與 test.js 共用
  favicon.svg  apple-touch-icon.png  og.png
  robots.txt  sitemap.xml
test.js          # 斷言測試，無框架
```

## 開發

直接開 `public/index.html` 即可，沒有建置步驟、沒有相依套件。

```bash
node test.js     # 跑測試
```

測試以長信物業公開範例為基準：月租 20,000、綜所稅率 20% 時，
年度綜所稅應為 自租 27,360／公益出租人 6,840／包租代管 4,800。

## 部署

Cloudflare Pages 專案 `landlord`，CLI 直推（非 Git 自動建置）。

```bash
npx wrangler login      # OAuth token 會過期，過期就重跑
npx wrangler pages deploy public --project-name=landlord --commit-dirty=true
```

自訂網域 `landlord.3mi.ai` 需在 Cloudflare Dashboard 掛，
wrangler 的 OAuth scope 沒有 DNS 編輯權限。

## 計算依據

- 綜所稅 ＝（月租金 − 免稅額）× 12 ×（1 − 必要費用率）× 綜所稅級距
- 免稅額：自租自管 0；公益出租人與社宅包租代管 每屋每月 15,000 元
- 必要費用率：自租自管與公益出租人 43%；社宅包租代管 60%
- 房屋稅：一般出租 2.4%；優惠身分 1.2%
- 地價稅：一般用地 10‰；優惠身分 2‰

來源連結列在頁面底部「參考來源」。
