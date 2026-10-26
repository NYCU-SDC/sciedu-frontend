# CCM：心臟的功能與血球的生成

教材 code 為 `ccm-heart-and-blood`。這是測試版七頁線性教材，所有學生都會進入 Mental Set 2，不進行迷思分流或教師推播。只使用既有 SciEdu API。

## 來源對照

原始資料夾：`Materials/CCM teacher agent 學生操作介面_20261015`。
原稿：`CCM teacher agent 學生操作介面_圖文說明_20261015.pptx`。完整 SHA-256 見 `manifest.json`。

| 學生頁面                  | 主要投影片 | 回答欄位                 | Chat | 補充來源                                     |
| ------------------------- | ---------- | ------------------------ | ---- | -------------------------------------------- |
| 01 迷思概念外顯化         | 2          | 預測、理由               | 關閉 | 3 文字版；4 靜態圖說                         |
| 02 心臟模擬與觀察         | 5          | 現象、相同／不相同、理由 | 關閉 | 6 文字版；7 模擬說明                         |
| 03 心臟概念診斷與討論     | 8          | 無；引用頁 1／2 回答     | 開啟 | 9 表格；10 文字版                            |
| 04 心臟概念重建後作答     | 11         | 功能、證據解釋           | 關閉 | 12 文字版                                    |
| 05 骨髓模擬與觀察         | 14         | 現象、相同／不相同、理由 | 關閉 | 13 Mental Set 2 封面；15 文字版；16 模擬說明 |
| 06 血球生成診斷與討論     | 17         | 無；引用頁 1／5 回答     | 開啟 | 18 表格；19 文字版                           |
| 07 血球生成概念重建後作答 | 20         | 生成位置、證據解釋       | 關閉 | 21 文字版                                    |

投影片 1、13 為封面，不另建學生頁面。第 21 張末題的「心臟功能的解釋」依第 20 張改為「血球生成的解釋」。第 6 頁保留「第一頁：心臟功能的原始預測」，不製造不存在的血球生成初始作答。

12 題全部以 TEXT 保存，兩個單選介面只保存「相同／不相同」文字，不定義正解。原始題號可重複，資源識別使用頁面與題目位置。圖文原稿的聊天室、按鈕和播放器示意不當作教材圖片；原始心臟靜態圖直接抽取，影片與骨髓圖使用原始 HTML 內嵌資產。

## 抽取與驗證

在 repo 根目錄執行（Python 標準函式庫即可）：

```sh
python3 tools/ccm/extract.py '/path/to/CCM teacher agent 學生操作介面_20261015'
python3 tools/ccm/prepare_simulations.py '/path/to/CCM teacher agent 學生操作介面_20261015'
python3 tools/ccm/test_extract.py '/path/to/CCM teacher agent 學生操作介面_20261015'
python3 tools/ccm/validate.py
python3 tools/ccm/build_upload.py
node --test tools/ccm/test_upload.mjs
npm test
npm run lint
npm run format
VITE_APP_MODE=dev npm run build
```

原稿未收進 repo。CI 驗證提交的 manifest、圖片／simulation 雜湊和上傳恢復；有原稿的本機額外執行可重複抽取核對。`simulation-source.json` 包含原 HTML、打包產物與每個內嵌資產 SHA-256。

## 播放器資料

- 隱藏 TEXT `displayOrder: 200`：原始圖說、模擬意義與測試流程說明；`201`：版本 1 的頁面設定。學生正文不渲染這兩種 block。
- `answerReferences` 指向先前頁面與題目索引；顯示本次已確認提交或草稿，無法取得時明確顯示。
- `textChoices` 以題目索引提供單選文字，後端題型仍為 TEXT。
- `mentalSet` 標示階段；`notice: ccm-linear-test` 在首次進入第 5 頁顯示指定文案。關閉狀態隨現有教材 session 保存，依環境／帳號／實驗／教材隔離，登出清除。
- 心臟與骨髓使用 `ccm-heart-v1`、`ccm-marrow-v1` 白名單識別碼。iframe 只允許腳本，核對訊息來源視窗及通道；只交換播放位置／階段及速度。離頁卸載 iframe，返回預設暫停。
- 骨髓速度沿用來源的「循環時間倍率」，`1.25` 慢、`1` 標準、`0.75` 快，並非影片播放倍速。

## CCM Chat

只在頁 3、6 掛載，聊天室依頁面隔離。教材 code 綁定 `ccm-agent-test-tw`，不使用 UUID 或新增管理 API。每輪沿用 `content` 的版本化快照，包含教材階段、圖說、答案狀態及兩個模擬設定；編輯／重產生保留原輪快照。一般教材及 `dark-room-v1` 維持原行為。

2026-10-27 讀取既有 Dev preset 時，其 teacher prompt 為 `agents/ccm-system-tw-20261013`，RAG 與 subagents 關閉。沒有變更服務或私有 prompt。Langfuse 未登入，未查核 prompt 版本號或最新草稿；模型診斷品質需指派有效測試實驗後人工驗收。

## 本機預覽

兩個終端機：

```sh
VITE_APP_MODE=dev VITE_CHAT_MODE=real VITE_BACKEND_BASE_URL='' npm run dev -- --host 127.0.0.1 --port 5177
python3 tools/ccm/serve.py --state /tmp/sciedu-ccm-preview-state.json --port 3002 --vite-port 5177 --fixture --chat-fixture
```

開啟 `http://localhost:3002/tools/ccm/preview.html`。使用合成資料及 Chat 替身，不呼叫 Dev、LLM、不正式批改。本機完成頁顯示十二題提交資料；正式路由沿用既有 Summary/PENDING。預覽入口不納入 production 路由。

## Dev 一次性上傳與發布

`build_upload.py` 在 `tools/ccm/build/` 產生自包含腳本、payload 和來源紀錄（不進 Git）。從已提交版本建立 bundle。固定目標 `https://dev.sciedu.sdc.nycu.club`，使用該頁面管理者 `hsien.eason@gmail.com` 的既有登入，以 `credentials: include` 呼叫 API，不讀取 cookie。

1. 管理者在 Dev 前端開發者 Console 執行 `UPLOAD-PASTE-IN-CONSOLE.js`。
2. 腳本驗證環境、帳號、權限、指紋，查詢既有教材；相同完整教材沿用，不同內容停止。
3. 建立 DRAFT：1 course、7 pages、33 TEXT、1 MEDIA、12 questions、46 PageBlocks，共 100 個建立資源；每筆先存 pending、取得 ID 後存入 localStorage 再 GET 核對。
4. 全部讀回核對一致後發布為 PUBLISHED，再確認清單可讀；不建立實驗、不指派學生。
5. 點「下載核對報告」，保存課程／資源 ID、HTTP 紀錄及來源 bundle 的 `SOURCE.json`。

逾時或回覆遺失的 POST 結果不明時停止，不刪進度重跑。已取得 ID 可續核；401 重新登入後續傳；發布結果不明先 GET 查核。同時只允許一個上傳程序。腳本不提供跨環境切換；本輪不供國網上傳。

新播放器須部署該 PR 才能呈現 CCM；Dev 資料發布不代表 Dev 已有新 UI。真實學生作答與 LLM 驗收仍需管理者指派有效實驗。
