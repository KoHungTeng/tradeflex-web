# TradeFlex 交接文件
**日期：2026-05-06**

---

## 專案資訊
- **本機路徑**：`~/Desktop/tradeflex-web/`
- **GitHub**：https://github.com/KoHungTeng/tradeflex-web
- **線上網址**：https://tradeflex-web-ten.vercel.app
- **Supabase**：https://lntbjurpeifxwnepplpn.supabase.co
- **技術棧**：Next.js 16 + TypeScript + Tailwind CSS + Supabase + Vercel

## 使用者資訊
- **User ID**：`439a0f14-f8f2-47bd-bd8a-42437e0f62cf`

---

## 已完成功能

### ✅ 多語言系統（全部元件）
- StatsPanel.tsx、CalendarView.tsx、StrategyAnalysis.tsx、TradeList.tsx 全部套用
- 語言檔案：app/i18n/translations.ts

### ✅ 策略分析頁面
- 固定篩選區塊（策略、多/空、標籤、標的）
- 標籤多選浮動選單 + 關鍵字搜尋
- 多/空篩選、總盈虧、盈虧比顯示
- 指標平均值分析（獲勝 vs 虧損）

### ✅ 交易表單
- 標的欄位改為浮動選單（只能選已儲存標的）
- 選標的自動帶入預設手續費
- 備注欄位改為標籤浮動選單 + 關鍵字搜尋
- 策略選單簡化（無策略顯示 -）
- TradeForm 滾動問題修正

### ✅ 交易記錄表格
- 備注欄下拉選單改用 fixed 定位
- 備注欄支援關鍵字搜尋標籤

### ✅ 標籤系統
- 標籤按空格前綴自動分組
- 分組顯示套用於：設定頁面、TradeForm 備注選單、策略分析標籤選單

### ✅ IME 輸入法修正
- 日曆備注、隨手筆記、設定標籤：改用 compositionRef
- TradeForm：form onKeyDown 攔截

### ✅ 設定頁面
- 標的編輯儲存 bug 修正
- 標籤設定 Enter 不觸發新增

---

## 待完成功能

### ⏳ AI 分析（暫緩）
- 策略分析頁面加入 AI 分析按鈕
- 手動觸發 + 快取結果

---

## 重要技術細節

### 標籤格式
- 存在 completed.remark 欄位，格式：#4h MACD 0軸上 #TP 15k CISD
- 分組邏輯：取 # 後第一個空格前的文字當前綴

### 策略分析篩選順序
byStrategy → byDirection → bySymbol → filtered（標籤）

### API Route 認證方式
所有 app/api/*/route.ts 使用 request.headers.get('cookie') 方式，不用 next/headers

---

## 繼續開發提示
下一步請將 Claude 的上下文從這份文件開始，告訴 Claude：
「這是 TradeFlex 交易日誌系統，繼續幫我完成以下功能：[列出你想做的]」
並附上相關元件的程式碼。
