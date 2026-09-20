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
  
  // 2. ตั้งค่า Sheet: Orders
  let ordersSheet = ss.getSheetByName("Orders");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("Orders");
  }
  
  // Headers สำหรับ Orders
  const orderHeaders = [
    ["order_id", "timestamp", "line_user_id", "customer_name", "phone", "address", "items_summary", "items_json", "total_amount", "payment_method", "payment_status", "status", "note"]
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
