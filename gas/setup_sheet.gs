/**
 * Setup Script สำหรับสร้างตาราง Products และ Orders ใน Google Sheets อัตโนมัติ
 * วิธีใช้งาน:
 * 1. เปิด Google Sheet ที่ต้องการใช้งาน
 * 2. ไปที่ Extensions (ส่วนขยาย) > Apps Script
 * 3. นำโค้ดนี้ไปวาง แล้วกดปุ่ม "Run" (เรียกใช้) ได้ทันที
 */

/**
 * ฟังก์ชันหลักในการสร้างโครงสร้างฐานข้อมูล
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    throw new Error("⚠️ ไม่พบ Google Sheet: กรุณาเปิด Apps Script จากเมนู 'ส่วนขยาย (Extensions) > Apps Script' ภายใน Google Sheet เพื่อให้สคริปต์ผูกกับชีทได้ถูกต้อง");
  }
  
  // 1. ตั้งค่า Sheet: Products
  let productsSheet = ss.getSheetByName("Products");
  if (!productsSheet) {
    productsSheet = ss.insertSheet("Products");
  }
  
  // Headers สำหรับ Products
  const productHeaders = [
    ["id", "name", "category", "price", "description", "image_url", "stock", "status"]
  ];
  productsSheet.getRange(1, 1, 1, productHeaders[0].length).setValues(productHeaders);
  
  // ตกแต่ง Header
  const headerRange = productsSheet.getRange(1, 1, 1, productHeaders[0].length);
  headerRange.setBackground("#10B981")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setHorizontalAlignment("center");
  productsSheet.setFrozenRows(1);
  
  // ข้อมูลตัวอย่างสินค้า (Sample Products)
  const sampleProducts = [
    [
      "P001",
      "Espresso Signature Blend",
      "Coffee",
      95,
      "กาแฟเอสเพรสโซ่เข้มข้น เมล็ดอาราบิก้าแท้ 100% หอมละมุน กลมกล่อม",
      "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80",
      50,
      "ACTIVE"
    ],
    [
      "P002",
      "Matcha Green Tea Latte",
      "Tea",
      115,
      "มัทฉะแท้เกรดพรีเมียมจากเมืองอูจิ ประเทศญี่ปุ่น ชงกับนมสดหอมนุ่ม",
      "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
      35,
      "ACTIVE"
    ],
    [
      "P003",
      "Iced Caramel Macchiato",
      "Coffee",
      125,
      "กาแฟนมสลับชั้นราดด้วยซอสคาราเมลสูตรพิเศษ หวานมัน หอมชื่นใจ",
      "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
      40,
      "ACTIVE"
    ],
    [
      "P004",
      "Croissant Butter Premium",
      "Bakery",
      85,
      "ครัวซองต์เนยสดแท้นำเข้าจากฝรั่งเศส กรอบนอกนุ่มใน หอมฉ่ำเนย",
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
      25,
      "ACTIVE"
    ],
    [
      "P005",
      "Strawberry Shortcake",
      "Bakery",
      145,
      "เค้กเนื้อสปันจ์นุ่มเบา แทรกครีมสดแท้และสตรอว์เบอร์รีสดลูกโต",
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&auto=format&fit=crop&q=80",
      15,
      "ACTIVE"
    ]
  ];
  
  // เพิ่มสินค้าตัวอย่างหากยังไม่มีข้อมูล
  if (productsSheet.getLastRow() === 1) {
    productsSheet.getRange(2, 1, sampleProducts.length, sampleProducts[0].length).setValues(sampleProducts);
  }
  
  // 2. ตั้งค่า Sheet: Orders
  let ordersSheet = ss.getSheetByName("Orders");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("Orders");
  }
  
  // Headers สำหรับ Orders
  const orderHeaders = [
    ["order_id", "timestamp", "line_user_id", "customer_name", "phone", "address", "items_summary", "items_json", "total_amount", "status", "note"]
  ];
  ordersSheet.getRange(1, 1, 1, orderHeaders[0].length).setValues(orderHeaders);
  
  // ตกแต่ง Header
  const orderHeaderRange = ordersSheet.getRange(1, 1, 1, orderHeaders[0].length);
  orderHeaderRange.setBackground("#3B82F6")
                  .setFontColor("#FFFFFF")
                  .setFontWeight("bold")
                  .setHorizontalAlignment("center");
  ordersSheet.setFrozenRows(1);

  // ปรับขนาดคอลัมน์ให้อ่านง่าย
  productsSheet.autoResizeColumns(1, productHeaders[0].length);
  ordersSheet.autoResizeColumns(1, orderHeaders[0].length);
  
  Logger.log("✅ สร้างและตั้งค่าตาราง Products และ Orders เรียบร้อยแล้ว!");
}

/**
 * ฟังก์ชันสำรอง: ป้องกัน Error "Attempted to execute myFunction, but it was deleted"
 * กรณีที่ใน Apps Script ยังเลือก myFunction อยู่ เมื่อกด Run จะเรียก setupDatabase() ทันที
 */
function myFunction() {
  setupDatabase();
}
