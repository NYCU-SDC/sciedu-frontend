# PR #61 教材 Chat 驗證紀錄

日期：2026-10-26（Asia/Taipei）。修改基底：frontend PR #61 `514f765541983c319ae1583f6fd6d6158f9dd319`。本輪只修改 frontend，保留 API／backend／LLM 工作分支原狀。

## 結果

| 項目                 | 結果與證據                                                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 前端測試             | 通過：34 files，146 tests，包含純閱讀／選填／多題、提交失敗／409、Summary、SSE、隔離及新快照測試                                                                                                     |
| 型別、lint、格式     | 通過；lint 無警告                                                                                                                                                                                    |
| Dev／國網 build      | 通過；各用指定 backend URL 編譯；既有大 chunk 提示仍存在                                                                                                                                             |
| 教材來源             | 4 個 Python 抽取測試、6 個 Node 上傳／simulation 測試通過；內容、simulation 原始資產未修改                                                                                                           |
| 本機完整播放器       | 初始提交→第二頁→第三頁→第四頁必填阻擋／最終提交通過；測試替身，非真實 LLM                                                                                                                            |
| Preset／契約         | 5 筆實際本機 HTTP 訊息僅使用 content、previousID、preset；全部使用 augmentation_teacher_and_peer                                                                                                     |
| 上下文               | 第一頁成功答案為 submitted，尚未記錄的最終答案為 unknown；填寫最終草稿並返回第三頁後為 draft                                                                                                         |
| 頁面隔離             | 第二、三頁 chatID 不同；第一、四頁無 Chat UI                                                                                                                                                         |
| 重產生與編輯         | 改變隔板後重產生／編輯舊訊息，快照與原輪完全相同；下一輪帶入新的無隔板設定                                                                                                                           |
| 重新整理             | 第三頁、模擬狀態、對話分支及學生文字恢復；UI 不出現快照 JSON                                                                                                                                         |
| 桌面與 390px         | 通過；文字可讀，聊天可捲動，document scrollWidth=clientWidth=390                                                                                                                                     |
| Dev 真實資料         | Zen 原登入可讀 PUBLISHED 科學論證教材與 ACTIVE 指派實驗；未新增／發布／指派教材，未提交或刪除既有答案                                                                                                |
| Dev 真實 Chat        | **阻擋／尚未驗證**：本機新版跨站 session 401；正常 Google 登入回到 localhost 後預覽仍401。原因未完全定位，未更改 cookie／CORS／瀏覽器安全設定。Codex 瀏覽器直接 Dev 入口另回報 ERR_BLOCKED_BY_CLIENT |
| 國網／晶創真實教材   | **阻擋**：Zen 已登入，GET /api/courses 回傳 items=[]、totalItems=0；本輪不建立或指派資料                                                                                                             |
| 國網真實 preset／LLM | **尚未驗證**；不能以健康檢查或 build 成功代替                                                                                                                                                        |

健康檢查：Dev 與國網 `/api/healthz` 都200。Dev 線上 LLM OpenAPI 的 `/agents` 支援 preset，`augmentation_teacher_and_peer` 存在，配置 Teacher、同儕與 RAG 工具；只做讀取，不更改內容。未將本機替身回覆當成 Teacher／Bunny 的真實輸入證據。

Dev 科學論證 course ID：`bca83d09-de5f-457d-adfe-8b2fb91019a8`；既有測試 experiment ID：`54bed8da-7354-4642-942d-5fb3d156ed3c`。驗收時為 ACTIVE；時段與指派可能變動，重跑需重新確認。

## 重現本機驗收

兩個終端執行（都在 frontend repo）：

```sh
VITE_APP_MODE=dev VITE_CHAT_MODE=real VITE_BACKEND_BASE_URL='' pnpm exec vite --host 127.0.0.1 --port 5191 --strictPort
python3 tools/argumentation/serve.py --fixture --chat-fixture --port 5190 --vite-port 5191 --state /tmp/pr61-context-fixture-state.json
```

開啟 `http://127.0.0.1:5190/tools/argumentation/preview.html`。填初始回答，第二頁送出測試問題；第三頁切換隔板、送出，再切回並重產生／編輯；第四頁填草稿再返回第三頁送新訊息。`GET /fixture/chat-evidence` 提供本機合成請求供查核。fixture 只綁 loopback、記憶體保存，不代理真實後端、不保存憑證；停止兩個終端即可關閉。

真實預覽須以指定 backend URL 啟動本機 Vite，帶 `?course=<真實 ID>`。預覽會查 session 與 Current Experiment，僅允許已有 ACTIVE 指派的教材；題目唯讀，聊天會寫入該登入帳號。401／無指派即停止，不繞過驗證。此工具不包含在 production bundle。

## 證據與限制

- [本機 HTTP 請求（全部合成資料）](context-evidence/requests.fixture.json)
- [完成資料](context-evidence/completed.png)（本機兩份成功提交）
- [桌面第二頁](context-evidence/desktop.png)、[桌面 simulation](context-evidence/simulation-desktop.png)
- [390px 教材](context-evidence/mobile.png)、[390px 聊天與導覽](context-evidence/mobile-chat.png)
- [功能與相容性](../../docs/material-chat.md)

沒有服務端四階段進度、管理者 preset 設定、Bunny 同快照保證。409 作答恢復仍需要既有 API 以外的後端支援。舊版無環境標記的本機進度不自動搬移，既有後端資料未改。待使用者合併與部署後，用已有教材的環境完成真實聊天／preset 品質驗收。

## 2026-10-26：同步已合併 #63 的 main

將 main `7852a31ea28790b06f54eb4f1bac4f37029e5e86` 合併進原 #61 分支；merge commit `333ae3e817f5a86214e944a8f8e245568022cbc6`，保留原作者與既有 commit，沒有 force push 或重寫歷史。沒有產品程式衝突，也沒有新增 API／backend／LLM 修改。

相對最新 main 的差異只剩 #61 教材、simulation、Chat 與驗證工具；#63 的 admin 元件、封存 hook、repository、測試與文件均與 main 完全相同，不重複列入 PR 差異。

| 本輪重新執行                                  | 結果與證據                                                                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 全部前端測試                                  | **PASS**：36 files、167 tests；含封存／逾時查核／快取，以及播放器、提交、Summary、SSE、編輯／重產生與跨 scope 隔離                                                                       |
| 教材驗證                                      | **PASS**：兩份既有教材 8 頁、9 題、15 圖；22 個既有教材／安全上傳 Python 測試、4 個科學論證抽取測試、6 個 Node 上傳／simulation 測試                                                     |
| TypeScript／ESLint／Prettier                  | **PASS**                                                                                                                                                                                 |
| Production build                              | **PASS**：Dev 與國網／晶創 backend URL 分別編譯；既有大 chunk 提示仍存在                                                                                                                 |
| 同步後四頁播放器                              | **PASS**：第一／四頁必填阻擋、兩份成功提交、第二頁初始回答回顯、第二／三頁無聊天仍可前進；第一／四頁無聊天室                                                                             |
| Simulation／恢復                              | **PASS**：隔板切換、第三到第四頁設定延續、第三頁重新整理後設定與對話恢復；重設後的新訊息使用新設定                                                                                       |
| Chat HTTP                                     | **PASS**：4 筆本機合成請求，均使用既有 content／previousID／preset；第二／三頁聊天室不同、重產生沿用原輪快照、新訊息含最終草稿與最新模擬狀態；沒有把 JSON 封裝顯示在正文／歷史           |
| 桌面／窄螢幕                                  | **PASS**：本機 fixture，390 × 844 下 document clientWidth=scrollWidth=390；正文、模擬、最終多行作答與討論區可捲動                                                                        |
| 同分支封存 UI                                 | **PASS**：Admin Demo 的提前結束確認與封存後唯讀，與教材流程使用同一份同步後 source；Demo 不呼叫真實 API                                                                                  |
| 真實本機後端封存／學生轉場                    | **PASS**：重跑 #63 驗收工具，ACTIVE／DRAFT／SCHEDULED／COMPLETED 均釋放重疊時段；保留時段、學生／教材指派與已提交答案；學生重新 GET Current Experiment 取得新實驗，舊教材在轉場前回傳403 |
| Dev／國網真實 Chat、preset 品質、學生完整流程 | **尚未驗證**：本輪未使用遠端測試帳號操作任何實驗或聊天。先前跨站 session 401、國網空教材清單的阻擋未被本機 fixture 或 build 解決；不能將本輪本機通過視為遠端功能通過                     |

真實本機後端仍使用 #63 文件所記錄的獨立 Phase B 服務 `http://localhost:58080`，使用既有專用測試管理者與學生甲，透過既有工具續發私密 session，未重建資料庫或修改後端產品程式。只建立本輪 `ARCHIVE-QA-*` 測試實驗並在結束後封存，保留 QA 教材／答案，不操作其他實驗。這驗證 API 狀態與存取行為，不是遠端 Dev 的瀏覽器驗收。

本輪本機證據（全部為合成／專用 QA 資料，不含 cookie 或認證標頭）：

- [Chat 請求](main-sync-evidence/requests.fixture.json)
- [真實本機後端封存與轉場 HTTP](main-sync-evidence/archive.local.json)
- [桌面教材與 Chat](main-sync-evidence/desktop.png)
- [窄螢幕最終作答](main-sync-evidence/mobile.png)、[窄螢幕 Chat](main-sync-evidence/mobile-chat.png)
- [兩份回答完成](main-sync-evidence/completed.png)
- [封存確認](main-sync-evidence/archive-confirm.png)、[封存完成唯讀](main-sync-evidence/archive-completed.png)

本機重現仍可使用上節 fixture 指令；本輪改用 fixture5196／Vite5197，Admin Demo 為5198，均只綁127.0.0.1。驗收完停止本輪建立的三個 listener，既有獨立後端環境保留。

推送後需等待新 head 的 GitHub CI 與預覽部署，確認預覽資產同時包含 `提前結束並封存`、`SCIEDU_MATERIAL_CONTEXT_V1` 與指定 preset；最終 CI／部署狀態以 PR checks 為準。合併仍由 Eason 手動執行。
