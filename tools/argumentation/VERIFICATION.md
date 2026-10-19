# 科學論證教材驗收（2026-10-19）

## 版本與範圍

- Frontend 基底：`75614b6c4d4c3c52f58ba727832ef9529d70386d`（最新 main）。
- 分支：`feat/argumentation-simulation`。
- 既有 dev backend：`https://dev.sciedu.sdc.nycu.club`，本輪未修改／部署 backend 或 API spec。
- 來源版本：見 `manifest.json` 的原稿 SHA-256、每頁 sourceSlide，以及 `simulation-source.json`。
- 課程 ID：`56d20d09-df27-44bf-91d5-220f5b29782c`。

## dev 資料核對：通過

使用既有 Google 管理帳號 session。曾短暫連線逾時，恢復後登入成功才開始上傳。
上傳前列表只有腦機介面與恐狼；不存在同 code／title 的科學論證教材。

建立並 GET 核對 **41 筆資源**：1 course、4 pages、14 TEXT、2 MEDIA、2 questions、18 PageBlocks。
兩筆 MEDIA 引用同一張原稿 JPEG，重新下載後 SHA-256 與 manifest 一致。
每筆 TEXT／QUESTION 內容、PageBlock 類型／排序／required、course／page 關係與頁數核對通過。
41 次 POST 均回傳 201；完整重跑 checkpoint 核對後仍只有 41 次 POST、41 個相同 ID，新增請求皆為 GET；未呼叫發布、指派或啟用 API。上傳階段最終狀態 **DRAFT**。使用者後續明確要求發布，於 2026-10-19 22:45（台北）
以既有狀態 API 切換成 **PUBLISHED**，PUT 200 後重新 GET 200 確認；未更動實驗或學生指派。

| 頁面                 | dev page ID                            | Chat | 題目                                   |
| -------------------- | -------------------------------------- | ---- | -------------------------------------- |
| 01 題目與初始作答    | `36cd1350-49d1-4ae7-a82c-aa1b1c8dd0e8` | 關閉 | `5c5c74f5-c626-4f50-91c4-6e3d3ce309ac` |
| 02 開始做論證        | `9d846ebb-6caf-4a2c-b032-e7ebff279406` | 開啟 | 無新增題目                             |
| 03 Simulation 與論證 | `33b4ca89-1be3-4b7c-9cc4-e272b5050ac6` | 開啟 | 無新增題目                             |
| 04 回答問題（無 AI） | `5ad799bc-676f-422b-a2ba-59b87d3295ee` | 關閉 | `8acd6813-c817-4a97-ae8e-68245591b03e` |

## 畫面與互動：通過

**本機新版 frontend + 本機 fixture**：走完第一頁必填阻擋、初始提交、第二頁唯讀初始回答、
第三頁互動、第四頁最終提交；完成回呼收到兩個不同 question ID 的答案。
第二、三頁未傳送聊天訊息即可前進。第四頁無 Chat；刷新仍停留正確頁面且保留隔板設定。

**本機新版 frontend + 真實 dev 草稿**：管理者唯讀預覽核對四頁文字、原圖、隱藏 metadata、
Chat 開關、第三／四頁 simulation 及跨頁控制項保存。沒有以管理帳號提交 dev 學生答案。

- LED 關閉：顯示觀察者看不見；開啟無隔板：看得見；開啟有隔板：看不見。
- 放大／縮回 simulation、重設 LED／隔板通過；切頁 iframe 卸載，返回重建並恢復控制項。
- 桌面正文左、視覺右、回答下方；390px 窄螢幕正文、視覺、問題順序排列，作答區及提交鈕可捲動到達。
- 另以真實 dev 腦機介面四頁回歸檢查，包含第二頁三張圖、兩題及來源題號 2／3；第三頁重複來源題號 3 保留。
- 五項最終引導保留段落換行；圖片保持比例；隱藏 context／JSON 沒有進入學生正文。

## 自動檢查：通過

- Frontend：33 個測試檔，133 個測試通過（含新增圖示展開／收合回歸）。
- 新抽取／來源雜湊：4 個 Python 測試通過；原始 deck 重複抽取與已提交 manifest 完全一致。
- 舊教材抽取／上傳回歸：22 個 Python 測試通過。
- Node：6 個測試通過，含 2 個真實 simulation 指標事件回歸；4 個草稿上傳安全測試涵蓋 pending 禁止重送、checkpoint 寫入順序、斷線停止、已發布父課程禁止新增。
- 型別、ESLint、Prettier、production build、git diff whitespace 檢查通過。原始 simulation 資產保留 CRLF／EOF，透過 .gitattributes 排除文字正規化與 whitespace 檢查。
- 新流程測試包含提交失敗留在原頁、成功後才前進、跨帳號與實驗狀態隔離、登出清理、未知 simulation／非法設定、iframe 訊息來源與格式及載入逾時恢復。
- 既有 Summary PENDING／FAILED 與其他教材測試隨完整測試套件通過。

## 尚未驗證／交付後步驟

- 尚未 merge 新版 frontend 至 main；PR #61 使用預覽部署。教材已依使用者要求發布，dev 主站需新版播放器部署後才支援此教材。
- 真實學生發布／指派後的提交與 PENDING 端到端流程尚未執行，初次驗收限定 DRAFT，發布後亦尚未新增實驗指派驗收；未將本機 fixture 當成真實批改通過。
- 本次另開 simulation 本機獨立頁驗證上下拖曳，避開原先 iframe 座標檢查限制；滾輪與雙指縮放以實際事件 handler 的 Node 回歸測試驗證，未宣稱完成實體觸控裝置驗收。
- 文字題正式批改、LLM context、專用對話策略、CCM 與教學模式切換不在本輪範圍。

本機證據放在 repo 外的 `integration/argumentation-evidence/`：checkpoint 包含資源 ID 與 HTTP method/path/status，
不含 cookie。另附本機作答畫面、dev 草稿預覽的桌面與窄螢幕截圖。

## PR #61 排版回饋修正（2026-10-19）

- 回答欄：重現長連續英文讓 textarea 橫向 scrollWidth 達 12,724px；中文原本可正常折行。
  共用輸入欄加入 `overflow-wrap: anywhere`、寬度限制，放大視窗使用可縮小的 grid 欄位。
  一般／放大模式都保留手動換行，中文、長英文與網址自動折行並以垂直捲動閱讀。
- 瀏覽器實測：1280px 視窗一般輸入欄 1114/1114px、放大欄 732/732px；
  390px 視窗一般欄 304/304px、放大欄 303/303px（clientWidth/scrollWidth），頁面寬度 390/390px。
  使用離線組件驗收頁輸入測試內容，沒有提交 dev 學生答案。
- Simulation：垂直 polar angle 增量由加改減，水平拖曳、角度上下限、雙指與滾輪縮放維持原行為。
  兩個 Node 測試先重現反向失敗，修正後通過；瀏覽器獨立場景頁亦以實際上下拖曳確認。
  `lab.js` 只改一個字元，來源紀錄保留前後雜湊，測試反向還原後與原稿雜湊一致。
  script 版本改為 `?v=4`，避免繼續使用先前快取。
- 移除學生可見的「剖開箱體…二次反射」段落；保留教材隱藏說明 metadata。
- 放大／縮回沿用教材共用 ExpandButton，以 Maximize2／Minimize2 圖示顯示，保留可及名稱、提示與 Escape 收回。
- 本機 typecheck（build 內）、完整 Vitest、Node、Python、lint、format、production build 通過。
  build 使用 `VITE_APP_MODE=dev` 與既有 dev API base；暫時驗收頁已移出 repository。
- 證據：`fix-answer-desktop.png`、`fix-answer-narrow.png`、`fix-simulation-desktop.png`、
  `fix-simulation-narrow-expanded.png`、`fix-drag-start.png`、`fix-drag-up.png`、`fix-drag-down.png`，皆在 repo 外的證據資料夾。
