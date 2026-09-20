/**
 * System Configuration
 * กำหนดค่า LIFF ID และ Google Apps Script Web App URL ที่นี่
 */
const CONFIG = {
  // 1. นำ LIFF ID ที่ได้จาก LINE Developers Console มาใส่ที่นี่ (รูปแบบ: 200xxxxxxx-xxxxxxx)
  LIFF_ID: "YOUR_LIFF_ID",

  // 2. นำ Web App URL ที่ได้จากการกด Deploy ใน Apps Script มาใส่ที่นี่ (ต้องลงท้ายด้วย /exec)
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbyQesQYj6FUG45kIVB6Lsv4ie7gEiQ1XGZSlWZhh_d5PDqLDSZU4Lwo80-pFtXqOQuiWA/exec",

  // ข้อมูลร้านค้าเริ่มต้น
  SHOP_NAME: "Geonce Cafe & Bakery",
  CURRENCY_SYMBOL: "฿",

  // รายการสินค้าสำรอง (ไม่มี mock data - โหลดจาก Google Sheets เท่านั้น)
  MOCK_PRODUCTS: []
};
