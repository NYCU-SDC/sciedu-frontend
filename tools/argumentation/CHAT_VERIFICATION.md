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
