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
 * ฟังก์ชันสร้างสินค้าจำลองแบรนด์เสื้อผ้า GEONCE ลงใน Google Sheet Products
 * วิธีใช้: เลือกฟังก์ชัน "createSampleClothingProducts" จากเมนูด้านบน แล้วกด Run
 */
function createSampleClothingProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("⚠️ กรุณาเปิด Apps Script จากเมนู 'ส่วนขยาย > Apps Script' ใน Google Sheet");
  }

  let sheet = ss.getSheetByName("Products");
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName("Products");
  }

  const sampleProducts = [
    [
      "G-TS01",
      "GEONCE Heavyweight Boxy Tee (Black)",
      "T-Shirts",
      790,
      "เสื้อยืดผ้า Cotton Comb 100% สกรีนลาย GEONCE ทรง Boxy Oversized หนา 240 GSM",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
      50,
      "ACTIVE"
    ],
    [
      "G-TS02",
      "GEONCE Vintage Acid Wash Tee",
      "T-Shirts",
      850,
      "เสื้อยืดฟอกวินเทจ สไตล์สตรีท เนื้อผ้านุ่ม ระบายอากาศได้ดีเยี่ยม ลายซิกเนเจอร์",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80",
      40,
      "ACTIVE"
    ],
    [
      "G-HD01",
      "GEONCE Cyberpunk Oversized Hoodie",
      "Hoodies",
      1590,
      "เสื้อฮู้ดดี้ทรงหลวม ผ้าเฟรนช์เทอร์รี่หนานุ่ม ลายกราฟิกสตรีทแวร์ร่วมสมัย",
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
      30,
      "ACTIVE"
    ],
    [
      "G-PT01",
      "GEONCE Tactical Cargo Pants (Dark Slate)",
      "Pants",
      1290,
      "กางเกงคาร์โก้สตรีทแวร์ กระเป๋าข้างมัลติฟังก์ชัน ผ้า Ripstop ทนทาน ทรงกระบอกตรง",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80",
      25,
      "ACTIVE"
    ],
    [
      "G-AC01",
      "GEONCE Nylon Crossbody Bag",
      "Accessories",
      690,
      "กระเป๋าสะพายข้างผ้าไนลอนกันน้ำ สายสะพายปรับระดับได้ สกรีนโลโก้ GEONCE",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80",
      35,
      "ACTIVE"
    ],
    [
      "G-AC02",
      "GEONCE Embroidered Bucket Hat",
      "Accessories",
      590,
      "หมวกบักเก็ตปักโลโก้ GEONCE มินิมอล ผ้าคอตตอนทวิลล์พรีเมียม สวมใส่สบาย",
      "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80",
      45,
      "ACTIVE"
    ]
  ];

  const startRow = Math.max(2, sheet.getLastRow() + 1);
  sheet.getRange(startRow, 1, sampleProducts.length, sampleProducts[0].length).setValues(sampleProducts);
  sheet.autoResizeColumns(1, sampleProducts[0].length);
  
  Logger.log("✅ เพิ่มสินค้าเสื้อผ้าจำลองแบรนด์ GEONCE จำนวน " + sampleProducts.length + " รายการ เรียบร้อยแล้ว!");
}

/**
 * ฟังก์ชันสำรอง: ป้องกัน Error "Attempted to execute myFunction, but it was deleted"
 */
function myFunction() {
  createSampleClothingProducts();
}
