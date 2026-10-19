# 科學論證：黑暗房間中的玩偶

四頁取自 `論證_學生操作介面_20261013.pptx` 的投影片 2–5，封面不匯入。
前兩頁沿用同一張原始內嵌 JPEG；後兩頁使用 `dark-room-v1` simulation。
第一頁初始回答、第四頁最終回答各是一題 TEXT；最終回答包含來源的五項引導。
第二頁顯示本次初始回答；第二、三頁可以直接前進，不以聊天或操作 simulation 為條件。

## 來源與重建

```sh
python3 tools/argumentation/extract.py '/path/to/論證_學生操作介面_20261013.pptx'
python3 -m unittest discover -s tools/argumentation -p 'test_*.py' -v
node --test tools/argumentation/test_upload.mjs
```

`manifest.json` 記錄來源雜湊與投影片頁碼。抽取器保留來源題意，只組合段落與標籤，
第四頁另外補上「同一份回答中依序回應五項問題」的操作提示。
來源階段或引導問題不符時停止，不猜測其他版本的 shape 對應。
`simulation-source.json` 記錄原始資產 SHA-256；七個供應資產（含 Three.js 授權）維持原始 bytes。
`index.html` 只增加獨立 `bridge.js` 與 `embed.css`，不修改原始光學模型。

## 與現有 API 的契約

不新增 backend endpoint、migration 或公開 API 欄位。使用既有 TEXT／MEDIA／QUESTION PageBlock：

| 排序      | 用途                                        |
| --------- | ------------------------------------------- |
| 0         | 學生可見正文                                |
| 10        | 靜態預覽圖（第一、二頁）                    |
| 100 / 101 | 題目標籤 TEXT / 必填 QUESTION（第一、四頁） |
| 200       | 隱藏圖說、情境與 simulation 模型說明        |
| 201       | 版本化頁面設定 JSON                         |

設定包含 `version: 1`、`stage`、`chatEnabled`、選用 `preview`、`simulationId`、
`previousAnswerPageIndex`。已註冊 simulation 只有 `dark-room-v1`；不接受任意 URL。
201 解析失敗會阻擋教材載入，不把 JSON 當正文。200 只在已識別教材格式中作為隱藏資訊，
舊版純文字頁的排序 200 仍保留正文行為。這些資訊是 UI 隱藏，不是秘密，也尚未送入 LLM。

iframe 僅有 `sandbox="allow-scripts"`，沒有 same-origin 權限。父頁核對來源視窗與訊息格式；
bridge 核對 parent 與 referrer origin，只傳遞 LED／隔板兩個 boolean。
切離頁面卸載 iframe，中止動畫；兩頁共用這兩個控制項的狀態，旋轉／縮放不跨頁保存。
狀態使用既有 player session 的帳號／實驗／教材隔離及登出清理。

## 本機預覽（不會發布 dev）

```sh
pnpm install --frozen-lockfile
# 終端一：checkpoint 必須放 repo 外；fixture 僅為本機瀏覽器驗收 API
python3 tools/argumentation/serve.py --fixture --state /absolute/private/upload-state.json
# 終端二：本機測試資料，可完成兩次提交
VITE_APP_MODE=dev VITE_CHAT_MODE=real VITE_ADMIN_DEMO_MODE=false \
VITE_BACKEND_BASE_URL=http://localhost:3000 pnpm dev --host 127.0.0.1 --port 5175 --strictPort
```

開啟 `http://localhost:3000/tools/argumentation/preview.html`。
fixture 只模擬內容與文字提交；完成頁顯示提交給播放器完成回呼的兩筆紀錄，
不等同真實 backend 批改驗收。自動測試另覆蓋既有 Summary 的 PENDING 行為。

## dev 草稿上傳與唯讀預覽

開啟 `http://localhost:3000/`，透過頁面 Google 登入連結使用現有 dev 管理者。
先按「檢查登入與既有教材」，確認沒有同 code／title 的外部教材後，按「上傳並核對四頁草稿」。
工具只針對 manifest 中這一份教材，保留 DRAFT；不發布、不指派、不更新既有其他教材。

每次 POST 前先保存 pending，收到 ID 後再保存、GET 核對；checkpoint 綁定 dev origin、
使用者及 manifest／圖片指紋。瀏覽器 Web Lock 防止並行操作；30 秒逾時立即停止。
結果不明且沒有 ID 的 pending **不會重送**，需要人工查核；勿刪除 checkpoint 後重跑。
401 重新登入後沿用原 checkpoint；403／409 必須先釐清原因。已完成批次只允許遠端 GET。
沒有假設 dev 支援 Idempotency-Key，cookie 僅留在瀏覽器，不寫入檔案或命令列。

要以新版畫面讀取 dev 草稿，停止 Vite 後把 `VITE_BACKEND_BASE_URL` 換成
`https://dev.sciedu.sdc.nycu.club`，重新啟動同一個 Vite 指令，再開啟：
`http://localhost:3000/tools/argumentation/preview.html?course=COURSE_UUID`。
此模式為管理者唯讀預覽，不提交學生答案。確認跨來源 session 有效；必要時重走工具的登入連結。

兩個終端以 Ctrl-C 停止。不要刪除 dev 資源或 checkpoint 作為「重建」方式。
正式前端部署本 PR 之前，保持草稿；舊播放器尚不識別新的 simulation／201 設定。

## 本輪不包含

CCM 教材、教學模式切換、LLM context／專用 prompt、文字題正式批改、正式發布與指派。
