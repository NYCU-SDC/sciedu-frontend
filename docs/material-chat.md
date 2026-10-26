# 科學論證教材 Chat（僅前端）

教材 code `scientific-argumentation-dark-room` 固定使用 `augmentation_teacher_and_peer`。其他教材保留全域 preset／既有預設行為。這是過渡綁定，不提供管理者設定表單或服務端鎖定；以後有第二份教材再擴充。

## 現有 API 契約

建立聊天室維持空 body 的 `POST /api/chat`；送出仍只有 `content`、`previousID`、`preset`。不呼叫 `/api/course-chat/configuration`、`/api/chat/presets` 或 `chat-configuration`，也沒有 `learning`、`courseContext`、`teachingState` wire 欄位。不依賴 PR #62、LLM #27、新 migration 或 API 修改。

每次送出先複製目前播放器資料，再透過既有內容／題目 GET 讀取當頁正文、order 200 圖說／模擬說明及教材題目。只選取需要的欄位，不展開 API 原始物件；不傳標準答案、成績、其他學生答案、email 或 cookie。order 201 只用來識別教材階段與聊天室開關，不直接加入正文。

快照以版本化文字封裝在 `content` 中，和學生輸入一起存入原本聊天紀錄。學生文字在前，快照在後；前端 REST 邊界解析後，訊息、編輯欄及標題不顯示技術封裝。一般聊天歷史頁也使用相同解析。`materialContext` 是前端記憶體型別，不是 API 欄位。重產生及編輯使用原輪快照；新增訊息才讀取最新資料。

草稿與已確認提交分開保存。正式提交只引用目前登入／實驗的本機成功回應紀錄；缺少紀錄標示 unknown，而不是推論後端沒作答。unanswered 只表示本機明確留空，submission 仍為 unknown。模擬狀態只代表當下 LED／隔板，不代表學生做過的實驗。

必要內容讀取失敗、scope 不符或封裝超過 64,000 UTF-8 bytes 時，保留輸入並停止送出；不截斷內容、不換 preset。64 KB 是前端防護預算，並非模型 context window 保證。後端仍可能拒絕過長對話或不存在的 preset。

## 隔離與相容性

每個部署以既有 `VITE_BACKEND_BASE_URL` 選定後端，不在錯誤時切換服務。教材聊天室、播放器及摘要紀錄依後端／帳號／實驗／教材隔離，聊天室再依頁面隔離。登出清除本機關聯。

舊版未記錄後端來源的 sessionStorage 不自動搬移或刪除，避免錯誤歸屬；後端已存的答案、聊天不受影響。這可能使舊本機進度無法在新版直接恢復。已存在答案再次提交的 409 限制仍在，不能把它視為成功或自動重新提交。

現有 SSE、分支、錯誤恢復保持；#62 專為服務端 teachingState 等待持久化所加的邏輯不帶入。第一／四頁不掛載聊天；第二／三頁獨立，導覽不要求聊天。

## 能力界線

Teacher 可從既有訊息取得快照。Bunny 僅接受現有 LLM 轉交的任務，無法保證它收到相同快照；四階段達標評估、40 字限制、角色時序及跨裝置流程進度均未實作。本輪完全依現有 preset 引導，不以回覆文字猜測階段。

快照是前端參考資料，不是服務端驗證的正式學習紀錄，也不是機密欄位。舊版前端或直接讀取 API 仍可能看見封裝；LLM 也可能引用圖說。沒有修改任何 LLM 提示、RAG 或後端設定。

驗證與畫面：[CHAT_VERIFICATION.md](../tools/argumentation/CHAT_VERIFICATION.md)。
