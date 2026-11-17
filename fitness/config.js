// ===== App 設定（只有要開 AI 功能時才需要修改）=====
window.APP_CONFIG = {
  // 選用：Firebase 專案設定（要登入、多裝置同步時才需要）。
  // 留空 = 不用登入，每個人的資料存在自己的手機上。
  firebase: null,

  // AI 功能（免費的 Gemini）：照 README「選用：開啟免費 AI」設定後，
  // 把 reCAPTCHA v3 的「網站金鑰」貼在下面引號裡。留空 = 不使用 AI，App 照常運作。
  recaptchaSiteKey: '',

  // 使用的 Gemini 模型（Google 若停用此模型，可改成新的名稱）
  aiModel: 'gemini-3.5-flash-lite',

  // 每人每天可以用 AI 的次數（避免把免費額度用完）
  aiDailyLimit: 20
};
