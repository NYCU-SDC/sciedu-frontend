# 科學論證教材驗收（2026-10-19）

## 版本與範圍

- Frontend 基底：`75614b6c4d4c3c52f58ba727832ef9529d70386d`（最新 main）。
- 分支：`feat/argumentation-simulation`。
- 既有 dev backend：`https://dev.sciedu.sdc.nycu.club`，本輪未修改／部署 backend 或 API spec。
- 來源版本：見 `manifest.json` 的原稿 SHA-256、每頁 sourceSlide，以及 `simulation-source.json`。
- 草稿課程 ID：`56d20d09-df27-44bf-91d5-220f5b29782c`。

## dev 資料核對：通過

使用既有 Google 管理帳號 session。曾短暫連線逾時，恢復後登入成功才開始上傳。
上傳前列表只有腦機介面與恐狼；不存在同 code／title 的科學論證教材。

建立並 GET 核對 **41 筆資源**：1 course、4 pages、14 TEXT、2 MEDIA、2 questions、18 PageBlocks。
兩筆 MEDIA 引用同一張原稿 JPEG，重新下載後 SHA-256 與 manifest 一致。
每筆 TEXT／QUESTION 內容、PageBlock 類型／排序／required、course／page 關係與頁數核對通過。
41 次 POST 均回傳 201；完整重跑 checkpoint 核對後仍只有 41 次 POST、41 個相同 ID，新增請求皆為 GET；未呼叫發布、指派或啟用 API。最終狀態 **DRAFT**。

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

- Frontend：33 個測試檔，132 個測試通過。
- 新抽取／來源雜湊：4 個 Python 測試通過；原始 deck 重複抽取與已提交 manifest 完全一致。
- 舊教材抽取／上傳回歸：22 個 Python 測試通過。
- 草稿上傳安全：4 個 Node 測試通過，涵蓋 pending 禁止重送、checkpoint 寫入順序、斷線停止、已發布父課程禁止新增。
- 型別、ESLint、Prettier、production build、git diff whitespace 檢查通過。原始 simulation 資產保留 CRLF／EOF，透過 .gitattributes 排除文字正規化與 whitespace 檢查。
- 新流程測試包含提交失敗留在原頁、成功後才前進、跨帳號與實驗狀態隔離、登出清理、未知 simulation／非法設定、iframe 訊息來源與格式及載入逾時恢復。
- 既有 Summary PENDING／FAILED 與其他教材測試隨完整測試套件通過。

## 尚未驗證／交付後步驟

- 尚未 merge／部署新版 frontend；目前 dev 網站仍使用既有播放器。草稿須等新版部署後才適合發布。
- 真實學生發布／指派後的提交與 PENDING 端到端流程尚未執行，因本輪限定 DRAFT；未將本機 fixture 當成真實批改通過。
- 3D 拖曳旋轉及滾輪縮放沿用原始 simulation；自動化瀏覽器的 iframe 座標檢查阻止拖曳操作，未宣稱已完成人工拖曳驗收。
- 文字題正式批改、LLM context、專用對話策略、CCM 與教學模式切換不在本輪範圍。

本機證據放在 repo 外的 `integration/argumentation-evidence/`：checkpoint 包含資源 ID 與 HTTP method/path/status，
不含 cookie。另附本機作答畫面、dev 草稿預覽的桌面與窄螢幕截圖。
