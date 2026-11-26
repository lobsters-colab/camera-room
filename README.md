# 相機濾鏡暗房

手機用的修圖、拼貼與回顧影片 App（網頁版，可加到主畫面）。照片都在手機上處理，不會上傳。

- 濾鏡：富士、柯達、Canon G7X 等底片／相機風格，含智慧推薦模板
- AI 消除路人（MI-GAN）、AI 去背貼紙（U²-Net）、人物偵測（YOLOv8n-seg，AGPL-3.0）
- 拼貼：格狀、隨手疊、底片條、一週／月曆回顧
- 回顧影片：跟著音樂節拍切換，輸出 MP4

## 健身追蹤

手機健身紀錄 App：https://lobsters-colab.github.io/camera-room/fitness/

## 開發

`index.html` 是組出來的檔案，請改 `src/` 裡的原始碼，再執行：

```
python3 src/build.py
```

- `src/head.html`：頁面結構與樣式
- `src/app.js`：修圖模式（濾鏡、調整、消除、邊框、模板），內含 `/*CORE*/`、`/*EXIF*/` 兩個插入點
- `src/core2.js`、`gl.js`：調色核心（CPU／WebGL）
- `src/inpaint.js`、`detect.js`：基本消除、AI 模型（MI-GAN、YOLOv8n-seg、U²-Net）
- `src/recap.js`、`reel.js`、`modes.js`：拼貼、回顧影片、首頁與模式切換
- 更換 `model/` 或 `ort/` 的檔案時，要同時改 `sw.js` 的 `CACHE` 版本號，手機才會重新下載
