# Dual AI Chat (雙模協作智能)

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Google GenAI SDK](https://img.shields.io/badge/GenAI_SDK-v1.0-green?logo=google)](https://www.npmjs.com/package/@google/genai)
[![Vite](https://img.shields.io/badge/Vite-6.0+-purple?logo=vite)](https://vitejs.dev/)

**透過辯證思維，解鎖 AI 的深層潛力。 **

[線上體驗](#-線上體驗-live-demos) • [核心特性](#-核心特性) • [本地部署](#-本地部署) • [設定指南](#-設定指南)

</div>

**Dual AI Chat** 是一個基於 React 19 建構的下一代 AI 聊天應用程式。它引入了 **「協作智慧」** 的概念，透過兩個性格迥異的 AI 代理——**Cognito (邏輯)** 和 **Muse (創意)**——之間的內部辯論與協作，為您提供比單一模型更準確、更全面、經過深思熟慮的答案。

---

## 🌐 線上體驗 (Live Demos)

無需安裝，立即體驗 Dual AI Chat 的強大功能：

| 平台 | 連結 | 說明 |
| :--- | :--- | :--- |
| **Google AI Studio** | [**🚀 點擊免費使用**](https://ai.studio/apps/drive/1wS-wmXT_J4S-sfYxY1wItwh4UuV4STEk?fullscreenApplet=truea) | **推薦**。直接在 Google 官方環境中運行，通常無需配置 Key (或使用 Google 配額)。 |
| **Cloudflare Pages** | [**🌐 網頁版 Demo**](https://c3d98006.dual-ai-chat-dvb.pages.dev/) | **純淨版**。需在右上角設定中填入您自己的 API Key (Google Gemini 或 OpenAI 相容 Key)。 |

---

## ✨ 核心特性

### 🧠 雙 AI 辯證系統
使用者的一個問題，會觸發兩個 AI 的即時協作：
* **Cognito (邏輯引擎):** 負責事實查核、邏輯推理、結構化分析和最終答案的綜合。
* **Muse (創意引擎):** 負責橫向思考、挑戰假設、補充盲點和提供創新視角。

### ⚡ 深度支持「思考模型」 (Thinking Models)
原生整合 Google Gemini 2.5 / 3.0 系列模式的深度思考能力：
* **視覺化控制:** 在設定中直觀調節 Token 預算 (Budget) 和 思考強度 (Level)。
* **混合模式:** 結合內部辯論與模型本身的思考鏈 (CoT)，處理複雜推理任務。

### 📝 智慧協作記事本
記事本不僅是輸出區域，更是 AI 的共享工作區：
* **狀態保持:** 兩個 AI 均可讀取並修改記事本，作為長對話的「外在記憶」。
* **Diff 視圖:** 新增差異對比模式，清楚展示 AI 對程式碼或文字的每一次修改（新增/刪除）。
* **全功能編輯器:** 支援 Markdown 預覽、原始碼編輯及多步驟撤銷/重做。

### 🔌 全相容後端架構
* **Google Gemini 原生:** 支援官方 API 及自訂代理 Endpoint。
* **OpenAI 相容介面:** 無縫對接 **DeepSeek**、**Ollama**、**LM Studio** 等本地或第三方大模型服務。

### 📱 現代化 UI/UX
* **React 19 核心:** 利用最新的 React Hook 和並發特性構建，性能極致流暢。
* **行動端適配:** 響應式佈局，手機端自動切換為底部導航模式。
* **多模態互動:** 支援圖片上傳與理解，AI 可基於視覺訊息進行討論。

---

## 💻 本機部署

### 1. 環境要求
* Node.js v18+
* npm 或 yarn

### 2. 安裝項目
『`bash
git clone https://github.com/your-username/dual-ai-chat.git
cd dual-ai-chat
npm install
```

### 3. 設定 API Key (可選)
為了方便開發，您可以在根目錄建立 `.env.local` 檔案（也可以稍後在網頁 UI 中設定）：
```env
GEMINI_API_KEY="AIzaSy..."
```

### 4. 啟動開發伺服器
『`bash
npm run dev
```
存取終端機顯示的位址（通常為 `http://localhost:3000`）。

---

## ⚙️ 模型與 API 配置指南

本專案支援高度自訂的模型連接方式，您可以在介面右上角的 **設定 (⚙️)** 面板中靈活切換：

| 設定模式 | 適用場景 | 關鍵參數 |
| :--- | :--- | :--- |
| **標準 Gemini** | 最簡單的 Google 官方服務接入 | 僅需 API Key (讀取自環境變數或手動輸入) |
| **自訂 Gemini** | 需要使用反向代理或 Vertex AI | Endpoint (如 `https://my-proxy.com`), API Key |
| **OpenAI 相容** | **本地模型 (Ollama)** 或 **DeepSeek** | Base URL (如 `http://localhost:11434/v1`), 模型 ID (如 `deepseek-chat`) |

> **提示:** 在 OpenAI 相容模式下，您可以為 Cognito 和 Muse 分別指定不同的模型 ID。例如：讓 Cognito 使用擅長推理的 `o1-reasoning`，讓 Muse 使用擅長創意的 `gpt-4o`。

---

## 🛠️ 技術堆疊詳情

* **Core:** React 19, TypeScript, Vite
* **AI Integration:** `@google/genai` (Google Official SDK v1.0+)
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **Utilities:**
 * `marked` & `dompurify`: 安全的 Markdown 渲染
 * `katex`: 數學公式渲染
 * `diff`: 文字差異對比演算法

---
