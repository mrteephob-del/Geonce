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

  // ข้อมูลสินค้าสำรอง (Mock Data) สำหรับแสดงผลทันทีระหว่างที่ยังไม่ได้เชื่อมต่อ Google Sheets API
  MOCK_PRODUCTS: [
    {
      id: "P001",
      name: "Espresso Signature Blend",
      category: "Coffee",
      price: 95,
      description: "กาแฟเอสเพรสโซ่เข้มข้น เมล็ดอาราบิก้าแท้ 100% หอมละมุน กลมกล่อม",
      image_url: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80",
      stock: 50,
      status: "ACTIVE"
    },
    {
      id: "P002",
      name: "Matcha Green Tea Latte",
      category: "Tea",
      price: 115,
      description: "มัทฉะแท้เกรดพรีเมียมจากเมืองอูจิ ประเทศญี่ปุ่น ชงกับนมสดหอมนุ่ม",
      image_url: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
      stock: 35,
      status: "ACTIVE"
    },
    {
      id: "P003",
      name: "Iced Caramel Macchiato",
      category: "Coffee",
      price: 125,
      description: "กาแฟนมสลับชั้นราดด้วยซอสคาราเมลสูตรพิเศษ หวานมัน หอมชื่นใจ",
      image_url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
      stock: 40,
      status: "ACTIVE"
    },
    {
      id: "P004",
      name: "Croissant Butter Premium",
      category: "Bakery",
      price: 85,
      description: "ครัวซองต์เนยสดแท้นำเข้าจากฝรั่งเศส กรอบนอกนุ่มใน หอมฉ่ำเนย",
      image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
      stock: 25,
      status: "ACTIVE"
    },
    {
      id: "P005",
      name: "Strawberry Shortcake",
      category: "Bakery",
      price: 145,
      description: "เค้กเนื้อสปันจ์นุ่มเบา แทรกครีมสดแท้และสตรอว์เบอร์รีสดลูกโต",
      image_url: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&auto=format&fit=crop&q=80",
      stock: 15,
      status: "ACTIVE"
    }
  ]
};
