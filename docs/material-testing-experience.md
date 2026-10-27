# 教材測試體驗、續作保存與首頁導覽

2026-10-27。分支 `feat/material-testing-experience`，基底 frontend main `7585655e0944e6f026afbaff94d968aecaa81efb`（已合併 #64）。只修改 frontend，沒有變更 API spec、backend、LLM、部署設定或既有實驗／學生資料。

## 使用方式

1. 登入後 `/` 為首頁。依部署模式顯示教材、實驗管理、AI 聊天；管理入口只提供 ADMIN／EXPERIMENTER。新聊天在 `/chat`，既有 `/chat/:chatID` 保持有效。
2. 管理者新增專用測試實驗，在基本設定選「無限練習」。設定有效時段、指派教材與學生，再啟用。一般實驗仍是預設；ACTIVE 後不可切換模式。
3. 練習仍需目前有效的實驗與教材指派。教材頁顯示「本機練習，不計正式成績」。題目必填驗證保留，答案不送正式答案 API、不產生假答案 ID、不呼叫評分 API。
4. 教材列表、播放器及完成頁可「繼續練習／重新練習」。重新練習先確認，重置本輪答案、進度、simulation、Mental Set 通知及頁面聊天室。遠端舊對話不刪除。
5. 練習 Chat 仍使用真實 Chat API 與教材 preset；本機驗收工具僅以模型替身檢查串流與請求。CCM 的 preset 為 `ccm-agent-test-tw`，SciArgu 為 `augmentation_teacher_and_peer`，快照明確標示 `practice`、輪次與本機答案。
6. 同一瀏覽器刷新、離頁、關閉分頁後重新進入，可恢復目前輪次。登出會清除本機學習資料；其他分頁收到登出通知後也停止操作。這不是跨裝置／跨瀏覽器同步。

## 狀態與保存契約

- ACTIVE 只在 `start <= now < end` 顯示進行中；開始前為尚未開始、到期為已結束。未啟動的 SCHEDULED 到期顯示排程已結束。其他後端狀態不變。
- 列表完整取得搜尋／日期符合的所有頁後，依同一時間分類篩選、排序、分頁。總覽與詳細頁也使用相同分類；時間邊界及分頁重新取得焦點時更新。
- 到期不代表後端已 COMPLETED 或 ARCHIVED，不自動發狀態更新。延長／封存權限依原始後端狀態；到期 ACTIVE 操作名稱為「封存已結束實驗」。
- 模式保存在 description 尾端 `<!-- sciedu-experience:v1:practice -->`。無標記為一般實驗；未知版本、重複或損壞標記阻擋教材。前端集中移除標記後顯示說明，總長不得超過 4,000 字。舊前端不認識此模式，請先部署此 PR 再建立練習實驗。
- 播放器／聊天室關聯／摘要改存 localStorage，保留舊 sessionStorage 的讀取遷移。鍵包含後端、帳號、實驗、教材；練習另有模式與 round ID，聊天室加頁面 ID。
- 教材恢復版本使用頁面與 resource ID 結構，不使用 fetch media 產生的暫時圖片網址。教材結構確實變更時不直接套用不相容的頁面進度。
- 每個 POST 前保存 pending；每題收到成功回應立即保存答案 ID，不等整頁完成。其他題失敗後重掛載，也不重送已確認題目。請求超過 30 秒中止等待，結果視為未知。
- 400／401／403／404／422 為明確拒絕，可修正後再試；409、網路中斷、5xx 或關閉分頁留下的 pending 不視為成功，也不自動重送。儲存失敗在頁面顯示錯誤並提供保存重試。
- 使用 Web Locks 避免同一課程同時在兩個分頁編輯。未取得鎖或瀏覽器不支援時顯示阻擋提示；關閉原分頁後可重新載入。返回瀏覽器快取頁時重新取得鎖。

## 評分穩定性

舊程式在 PENDING 時每 2 秒輪詢，Summary 又以 `isFetching` 切換整體載入文字／數字，會反覆改變畫面；部分提交的成功回呼原本只在整頁全部成功後發出，重掛載會遺失已成功題目的紀錄。

本次以回歸測試重現成功回呼遺失，再修成逐題保存。評分改為進入時查一次、後續手動「重新載入評分」，停用定時、焦點與重新連線自動查詢。刷新保留既有資料，只更新按鈕狀態；待批改、評分失敗、未公開、無法取得分開呈現。未評分顯示「尚無評分」，不當作零分或答錯。現有結果契約不能可靠區分未設定 rubric 的原因，因此不推測「尚未設定評分標準」。

## 驗收結果

| 項目               | 結果與證據                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 實驗時間與模式     | 通過：邊界、時區、焦點返回、封存、未知標記、說明長度與 ACTIVE 模式鎖定測試；本機管理頁顯示原始 ACTIVE 的到期實驗為已結束                    |
| 無限練習           | 通過：CCM 七頁與 SciArgu 四頁各連續三輪；必填與單選、原有 Chat 開關、不同輪次 ID、preset 與完整快照、正式答案呼叫為零                       |
| 續作               | 通過：瀏覽器實測 CCM 輸入後刷新，關閉原分頁後從另一分頁接續第二頁與草稿；SciArgu 正式模式關閉再開後保留第一題 ID，返回第一頁不重送          |
| 部分提交／未知結果 | 通過：第一題成功、另一題尚未回應即保存；重掛載只送尚未成功題；pending／unknown／409 不自動重送；儲存失敗不發 POST                           |
| 隔離               | 通過：帳號、實驗、後端、頁面、練習輪次；摘要與正式紀錄分開；logout、遷移、雙分頁鎖、StrictMode 重掛載及 bfcache 恢復                        |
| 評分               | 通過：PENDING、FAILED、隱藏與無結果回歸；手動刷新不切整頁載入；練習 Summary 不呼叫評分 API                                                  |
| 首頁               | 通過：三種部署模式、非管理者隱藏管理入口；瀏覽器確認首頁 → 教材／管理，以及返回首頁                                                         |
| 程式檢查           | 全部前端測試、TypeScript、ESLint、Prettier、production build 通過；詳見 PR CI 與下列重跑指令                                                |
| 教材工具           | CCM 抽取 1 測試、SciArgu 抽取 4 測試、上傳／simulation 工具 35 測試通過；CCM 資產雜湊核對通過                                               |
| 真實環境           | 尚未驗收：本輪使用獨立 loopback fixture，沒有對國網／Dev 的現有實驗送出修改或正式答案；真實 preset 回覆品質及專用實驗指派，需合併部署後確認 |

瀏覽器驗收使用 1440×1000／390×844，首頁另含 1280×720。圖片與網路紀錄位於 [material-testing-evidence](material-testing-evidence/)。其中所有帳號、實驗與答案皆為本機合成測試資料，Chat 回覆為測試替身。

- [首頁桌面](material-testing-evidence/home-desktop.png)、[首頁窄螢幕](material-testing-evidence/home-mobile.png)
- [CCM 練習](material-testing-evidence/practice-desktop.png)、[窄螢幕作答](material-testing-evidence/practice-mobile.png)、[練習聊天室](material-testing-evidence/practice-chat.png)
- [雙分頁保護](material-testing-evidence/second-tab-lock.png)、[實驗時間標籤](material-testing-evidence/experiment-status.png)、[待批改摘要](material-testing-evidence/summary-pending.png)
- [練習請求](material-testing-evidence/practice-network.json)：答案 POST 為 0，CCM Chat 實際請求攜帶指定 preset 與 practice 快照。
- [正式模式請求](material-testing-evidence/standard-network.json)：兩題各僅 POST 一次。開發時 HMR 重新掛載會追加進入頁面的 GET；不能將整份累積 GET 數當輪詢頻率。
- [穩定性觀察](material-testing-evidence/grading-observation.json)：固定頁面觀察前後與手動刷新的請求數。

## 重跑

```sh
npm test
npm run typecheck
npm run lint
npm run format
VITE_APP_MODE=dev VITE_CHAT_MODE=real npm run build
python3 tools/ccm/validate.py
python3 tools/ccm/build_upload.py
python3 -m unittest discover -s tools/argumentation -p 'test_*.py' -v
node --test tools/argumentation/test_*.mjs tools/ccm/test_*.mjs
```

本機瀏覽器 fixture（兩個終端，無 remote proxy、不讀正式 cookie）：

```sh
VITE_APP_MODE=dev VITE_CHAT_MODE=real VITE_ADMIN_DEMO_MODE=false \
VITE_BACKEND_BASE_URL=http://localhost:3003 npm run dev -- --host 127.0.0.1 --port 5178
python3 tools/experience/serve.py
```

開啟 `http://localhost:3003/`。`--standard` 可測一般實驗；改用另一組 port／vite-port 時也要一起調整 `VITE_BACKEND_BASE_URL`。fixture 資料只存在程序記憶體，重啟會清空後端替身；瀏覽器資料仍可能存在，請使用新瀏覽器測試範圍或明確清除該 localhost 的測試資料。此工具不在 production build 內。

## 已知限制與部署後驗收

- 已清除本機紀錄、舊的未知 409、或後端提交成功但回覆遺失，仍不能靠現有學生 API 找回答案 ID。不用管理者 API 繞過學生權限。
- 本機練習不等於正式無限次作答，不會在研究後端產生正式答案／成績；真實 Chat 仍會保存遠端對話。
- 模式標記是現有欄位上的前端約定，跨裝置正式進度、attempt API、完整評分與歷次練習管理不在此 PR。
- build 有既有的大型 bundle 提醒，非編譯失敗；本輪不改打包／部署策略。
- 合併部署後：以專用測試學生指派新練習實驗，確認國網首頁、CCM／SciArgu 真實 preset、三輪新對話、到期阻擋、登出清理。正式實驗請另用專用測試資料驗證，不重用老師既有研究答案。
