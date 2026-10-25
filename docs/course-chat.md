# 教材 Chat：管理設定與科學論證

依賴 PR #61 的四頁教材播放器。此分支以 `feat/argumentation-simulation` 為基底，先合併 #61，再將本 PR 目標調整為 main。部署新版 LLM、API 契約及 backend migration 23 後，才部署本前端。

管理者在「實驗詳細資料 → 教材」或建立實驗的教材設定選取 preset 和流程。科學論證建議 `augmentation_teacher_and_peer` / `argumentation-v1`，必須按儲存才生效。一般未設定的舊教材保持原聊天。首次建立聊天室後，服務端永久鎖定該實驗教材設定；清空或重新開始對話不解除鎖定。學生不能改 preset。

第二、三頁各有獨立的「開始論證」。Claim 回答達標後由 Bunny 提觀點，Teacher 總結並介紹 Warrant；其他階段達標後選擇討論或繼續。討論時提供「完成討論」。頁面導覽不要求完成聊天。第一、四頁不掛載 Chat hook。控制操作保留可重產生的版本按鈕，但不顯示為學生說過的文字。

每次送出才傳即時草稿、simulation LED／隔板設定。正文、圖說、題目與正式提交由後端按登入身分與實驗查詢。重產生／編輯以 sourceMessageId 引用原輪快照，新的草稿不取代它。帳號、實驗、教材、頁面分別隔離；登出沿用播放器／對話 storage 與 React Query 清除。SSE 完成後必須先取得後端已提交的 teachingState，才開放下一步操作。

## 相容性與錯誤

- 舊一般聊天與空 body 建立聊天室不變；保留分支、重產生、SSE。
- 設定查詢失敗不改用全域 preset；顯示錯誤並禁止送出。
- 服務端 400／403／409／503 均保留原訊息；回覆中斷可重新讀取／重產生，不能自行推進階段。
- 圖片只透過隱藏描述供 LLM 參考；本輪不送圖片、不新增文字題評分。

## 驗證

`pnpm test`、`pnpm lint`、`pnpm format`、`VITE_APP_MODE=dev pnpm build`。

本機整合工具 `tools/course-chat/session_ui.py` 僅綁定 127.0.0.1:5188，讀取獨立 fixture 的私有 session 檔，以 HttpOnly cookie 切換本機測試角色。需明確設定 `COURSE_CHAT_WORKSPACE`，不屬於部署的公開 API，不能指向 dev／正式環境。

本機驗收使用真實 backend、資料庫與 session，模型為可重複測試替身；dev 的真實 preset、Langfuse prompt、RAG 及串流品質須部署四個配套後另驗收。完整跨 repo 報告由整合工作目錄交付。
