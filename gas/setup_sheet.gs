/**
 * Setup Script สำหรับสร้างและอัพเดทตาราง Products และ Orders ใน Google Sheets อัตโนมัติ
 * แบรนด์เสื้อผ้า: GEONCE Official Store
 *
 * วิธีใช้งาน:
 * 1. เปิด Google Sheet ที่ต้องการใช้งาน
 * 2. ไปที่ Extensions (ส่วนขยาย) > Apps Script
 * 3. นำโค้ดนี้ไปวางแทนที่โค้ดเดิมทั้งหมดใน Code.gs
 * 4. กดปุ่มบันทึก 💾 (Save) แล้วกดปุ่ม "Run" (เรียกใช้) ด้านบนได้ทันที!
 *    (สามารถเลือกฟังก์ชัน updateSheetToGeonceStore หรือ myFunction แล้วกด Run)
 */

const SHEET_PRODUCTS = "Products";
const SHEET_ORDERS = "Orders";

/**
 * เพิ่มเมนูลัดบน Google Sheets อัตโนมัติเมื่อเปิดไฟล์
 * ทำให้สามารถกดอัพเดทตารางได้โดยตรงจากหน้าชีททันที
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("⚡ GEONCE Store")
      .addItem("🔄 อัพเดทตารางสินค้าและออเดอร์ (Reset & Update)", "updateSheetToGeonceStore")
      .addItem("➕ เพิ่มเฉพาะสินค้าจำลอง", "createSampleClothingProducts")
      .addToUi();
  } catch (e) {
    Logger.log("onOpen notice: " + e.message);
  }
}

/**
 * ฟังก์ชันหลัก: อัพเดทตาราง Google Sheet ทั้งหมดเป็นแบรนด์ GEONCE
 * - รีเซ็ตชีท Products: ล้างข้อมูลเก่า ใส่หัวตาราง และสินค้าเสื้อผ้า GEONCE 6 รายการ
 * - ตรวจสอบ/อัพเดทชีท Orders: ให้มีหัวตารางครบ 13 คอลัมน์ (รวม Payment Method & Status)
 * - จัดรูปแบบสีและขนาดคอลัมน์ให้อ่านง่าย สไตล์พรีเมียม
 */
function updateSheetToGeonceStore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("⚠️ ไม่พบ Google Sheet: กรุณาเปิด Apps Script จากเมนู 'ส่วนขยาย (Extensions) > Apps Script' ภายใน Google Sheet เพื่อให้สคริปต์ผูกกับชีทได้ถูกต้อง");
  }

  // ==========================================
  // 1. จัดการชีท: Products (สินค้าเสื้อผ้า GEONCE)
  // ==========================================
  let productsSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!productsSheet) {
    productsSheet = ss.insertSheet(SHEET_PRODUCTS);
  }

  // เคลียร์ข้อมูลเดิมทั้งหมดในชีท Products เพื่อลบข้อมูลคาเฟ่/สินค้าตัวอย่างเดิม
  productsSheet.clear();

  // กำหนด Header ของ Products
  const productHeaders = [
    ["id", "name", "category", "price", "description", "image_url", "stock", "status"]
  ];
  productsSheet.getRange(1, 1, 1, productHeaders[0].length).setValues(productHeaders);

  // ตกแต่ง Header ชีท Products (ธีม Streetwear ดำ-เทาเข้ม คมชัด)
  const pHeaderRange = productsSheet.getRange(1, 1, 1, productHeaders[0].length);
  pHeaderRange.setBackground("#0F172A") // Slate 900
              .setFontColor("#FFFFFF")
              .setFontWeight("bold")
              .setFontSize(11)
              .setHorizontalAlignment("center")
              .setVerticalAlignment("middle");
  productsSheet.setRowHeight(1, 38);
  productsSheet.setFrozenRows(1);

  // รายการสินค้าเสื้อผ้าแบรนด์ GEONCE คอลเลกชันสตรีทแวร์
  const geonceProducts = [
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

  // ใส่ข้อมูลสินค้าลงใน Products
  productsSheet.getRange(2, 1, geonceProducts.length, geonceProducts[0].length).setValues(geonceProducts);

  // ตกแต่ง Format คอลัมน์ให้ดูสวยงาม เป็นระเบียบ
  productsSheet.getRange(2, 1, geonceProducts.length, 1).setHorizontalAlignment("center"); // id
  productsSheet.getRange(2, 3, geonceProducts.length, 1).setHorizontalAlignment("center"); // category
  productsSheet.getRange(2, 4, geonceProducts.length, 1).setNumberFormat("#,##0").setHorizontalAlignment("right"); // price
  productsSheet.getRange(2, 7, geonceProducts.length, 1).setHorizontalAlignment("center"); // stock
  const statusRange = productsSheet.getRange(2, 8, geonceProducts.length, 1);
  statusRange.setHorizontalAlignment("center").setFontColor("#16A34A").setFontWeight("bold"); // status

  for (let r = 2; r <= geonceProducts.length + 1; r++) {
    productsSheet.setRowHeight(r, 32);
  }
  productsSheet.autoResizeColumns(1, productHeaders[0].length);
  productsSheet.setColumnWidth(2, 280); // name
  productsSheet.setColumnWidth(5, 340); // description
  productsSheet.setColumnWidth(6, 260); // image_url

  // ==========================================
  // 2. จัดการชีท: Orders (ออเดอร์คำสั่งซื้อ)
  // ==========================================
  let ordersSheet = ss.getSheetByName(SHEET_ORDERS);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(SHEET_ORDERS);
  }

  // กำหนด Header ครบ 13 คอลัมน์ สำหรับรองรับการโอนเงิน PromptPay & LIFF
  const orderHeaders = [
    ["order_id", "timestamp", "line_user_id", "customer_name", "phone", "address", "items_summary", "items_json", "total_amount", "payment_method", "payment_status", "status", "note"]
  ];
  ordersSheet.getRange(1, 1, 1, orderHeaders[0].length).setValues(orderHeaders);

  // ตกแต่ง Header ชีท Orders (ธีมน้ำเงินสุขุม Deep Royal Navy)
  const oHeaderRange = ordersSheet.getRange(1, 1, 1, orderHeaders[0].length);
  oHeaderRange.setBackground("#1E3A8A") // Blue 900
              .setFontColor("#FFFFFF")
              .setFontWeight("bold")
              .setFontSize(11)
              .setHorizontalAlignment("center")
              .setVerticalAlignment("middle");
  ordersSheet.setRowHeight(1, 38);
  ordersSheet.setFrozenRows(1);

  // Format Total Amount คอลัมน์ 9
  if (ordersSheet.getLastRow() > 1) {
    ordersSheet.getRange(2, 9, ordersSheet.getLastRow() - 1, 1).setNumberFormat("#,##0.00");
  }

  ordersSheet.autoResizeColumns(1, orderHeaders[0].length);
  ordersSheet.setColumnWidth(1, 180); // order_id
  ordersSheet.setColumnWidth(6, 280); // address
  ordersSheet.setColumnWidth(7, 300); // items_summary

  Logger.log("✅ อัพเดทตาราง Products และ Orders เป็นข้อมูลแบรนด์ GEONCE ครบถ้วนเรียบร้อยแล้ว!");
}

/**
 * ฟังก์ชันสร้างสินค้าจำลองแบรนด์เสื้อผ้า GEONCE เพิ่มเติม
 */
function createSampleClothingProducts() {
  updateSheetToGeonceStore();
}

/**
 * ฟังก์ชันเริ่มต้นในการ Setup โครงสร้างฐานข้อมูล
 */
function setupDatabase() {
  updateSheetToGeonceStore();
}

/**
 * ฟังก์ชันสำรอง: รองรับเมื่อกด Run โดยไม่ได้เปลี่ยนชื่อฟังก์ชัน (Apps Script จำ myFunction)
 */
function myFunction() {
  updateSheetToGeonceStore();
}
