/**
 * System Configuration
 * กำหนดค่า LIFF ID และ Google Apps Script Web App URL ที่นี่
 */
const CONFIG = {
  // 1. นำ LIFF ID ที่ได้จาก LINE Developers Console มาใส่ที่นี่ (รูปแบบ: 200xxxxxxx-xxxxxxx)
  LIFF_ID: "YOUR_LIFF_ID",

  // 2. นำ Web App URL ที่ได้จากการกด Deploy ใน Apps Script มาใส่ที่นี่ (ต้องลงท้ายด้วย /exec)
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbzlFLfbHwSIBtBAjyi15BAp_OfVnNHLO18e-yrAH_ahNE6j5I5KR9ZJRIXl3fn9quISHw/exec",

  // ข้อมูลร้านค้าแบรนด์เสื้อผ้า GEONCE
  SHOP_NAME: "GEONCE",
  SHOP_TAGLINE: "Official Streetwear & Contemporary Apparel",
  CURRENCY_SYMBOL: "฿",

  // การตั้งค่าชำระเงินผ่าน PromptPay QR
  // สามารถเปลี่ยนเป็นเบอร์โทรศัพท์ (10 หลัก) หรือเลขประจำตัวประชาชน/นิติบุคคล (13 หลัก) ของร้าน
  PROMPTPAY_NUMBER: "0812345678",
  PROMPTPAY_NAME: "GEONCE OFFICIAL STORE",
  BANK_NAME: "พร้อมเพย์ (PromptPay)",

  // ตัวเลือกขนาดเสื้อผ้าเริ่มต้น
  DEFAULT_SIZES: ["S", "M", "L", "XL"],

  // ลบ Mock Data ออกแล้ว เพื่อดึงข้อมูลสินค้าจริงจาก Google Sheets 100%
  MOCK_PRODUCTS: []
};
