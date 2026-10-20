# 房東稅賦試算

台灣房東租賃稅務與收益互動模擬器。輸入月租金，即時比較自行出租、公益出租人、
一般包租代管、社宅包租、社宅代管的所得稅、二代健保補充保費、房地稅、補助與年度淨現金流。

正式網址：<https://landlord.3mi.ai/>

## 結構

```
public/          # 網站本體，也是部署目錄
  index.html     # 單頁 dashboard（3mi.ai 色票與源樣黑體），狀態存網址 hash 可分享
  calc.js        # 計算引擎與版本化稅務規則（RULES），純函式，與 test.js 共用
  favicon.svg  apple-touch-icon.png  og.png
  robots.txt  sitemap.xml
test.js          # 斷言測試，無框架
```

## 開發

直接開 `public/index.html` 即可，沒有建置步驟、沒有相依套件。

```bash
node test.js     # 跑測試
```

測試涵蓋需求文件的 A（月租 30,000）、B（26,000、20%）、C（補充保費 549×12）、D（市場租金折扣）與邊界案例。

## 部署

Cloudflare Pages 專案 `landlord`，CLI 直推（非 Git 自動建置）。

```bash
npx wrangler login      # OAuth token 會過期，過期就重跑
npx wrangler pages deploy public --project-name=landlord --commit-dirty=true
```

自訂網域 `landlord.3mi.ai` 需在 Cloudflare Dashboard 掛，
wrangler 的 OAuth scope 沒有 DNS 編輯權限。

## 計算依據

公式與參考來源見 `public/calc.js` 的 `RULES` 與頁面底部「計算方式與依據」。
