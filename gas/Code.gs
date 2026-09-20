/**
 * LINE LIFF Ordering System - Google Apps Script Backend
 * ทำหน้าที่เป็น REST API (doGet / doPost) เชื่อมต่อ Google Sheets
 * แบรนด์เสื้อผ้า: GEONCE Official Store
 */

// ชื่อ Sheet ที่ใช้งาน
const SHEET_PRODUCTS = "Products";
const SHEET_ORDERS = "Orders";

/**
 * เพิ่มเมนูลัดบน Google Sheets อัตโนมัติเมื่อเปิดไฟล์
 * ทำให้ผู้ดูแลสามารถกดอัพเดทตารางได้โดยตรงจากหน้าชีท โดยไม่ต้องเข้าหน้าโค้ด
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
 * จัดการ HTTP GET Requests
 * 1. ดึงรายการสินค้า: ?action=getProducts
 * 2. สั่งอัพเดทตารางผ่าน URL: ?action=updateSheet
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getProducts";

    // กรณีดึงรายการสินค้า
    if (action === "getProducts") {
      const products = fetchProducts();
      return createJsonResponse({
        status: "success",
        data: products
      });
    }

    // กรณีสั่ง Reset / Update ตารางผ่าน GET Request
    if (action === "updateSheet" || action === "setup" || action === "reset") {
      updateSheetToGeonceStore();
      return createJsonResponse({
        status: "success",
        message: "Google Sheet updated to GEONCE store successfully!",
        products_count: 6
      });
    }

    return createJsonResponse({
      status: "error",
      message: "Unknown action: " + action
    });
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * จัดการ HTTP POST Requests
 * รองรับการบันทึกคำสั่งซื้อใหม่ พร้อมช่องทางการชำระเงิน PromptPay QR
 */
function doPost(e) {
  // ใช้ LockService ป้องกันปัญหา Race Condition เมื่อมีการสั่งซื้อเข้ามาพร้อมกัน
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000); // รอ Lock สูงสุด 30 วินาที

  if (!hasLock) {
    return createJsonResponse({
      status: "error",
      message: "Server is busy. Please try again later."
    });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No payload provided in request.");
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. ตรวจสอบข้อมูลคำสั่งซื้อเบื้องต้น
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error("Invalid or empty items list.");
    }

    const customerName = payload.customer_name || "Anonymous";
    const lineUserId = payload.line_user_id || "";
    const phone = payload.phone || "";
    const address = payload.address || "";
    const note = payload.note || "";
    const totalAmount = Number(payload.total_amount) || 0;
    const paymentMethod = payload.payment_method || "PromptPay QR";
    const paymentStatus = payload.payment_status || "WAITING_PAYMENT";

    // 2. สร้าง Order ID (รูปแบบ: ORD-YYYYMMDD-XXXX)
    const orderId = generateOrderId();
    const formattedTimestamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

    // 3. สรุปรายการสินค้าเป็นข้อความอ่านง่าย (รวมข้อมูล Size สำหรับเสื้อผ้า)
    const itemsSummary = payload.items.map(function(item) {
      const sizeTag = item.size ? " [" + item.size + "]" : "";
      return item.name + sizeTag + " (x" + item.quantity + ")";
    }).join(", ");

    const itemsJson = JSON.stringify(payload.items);

    // 4. บันทึกลง Sheet Orders
    let ordersSheet = ss.getSheetByName(SHEET_ORDERS);
    if (!ordersSheet) {
      updateSheetToGeonceStore();
      ordersSheet = ss.getSheetByName(SHEET_ORDERS);
    }

    ordersSheet.appendRow([
      orderId,
      formattedTimestamp,
      lineUserId,
      customerName,
      "'" + phone, // ใส่ single quote เพื่อรักษาเลข 0 นำหน้า
      address,
      itemsSummary,
      itemsJson,
      totalAmount,
      paymentMethod,
      paymentStatus,
      "PENDING", // สถานะเริ่มต้นของออเดอร์
      note
    ]);

    // 5. ปรับปรุงสต็อกสินค้าใน Sheet Products (Decrement Stock)
    try {
      updateProductStock(ss, payload.items);
    } catch (stockErr) {
      Logger.log("Warning: Stock update error: " + stockErr.message);
    }

    return createJsonResponse({
      status: "success",
      message: "Order placed successfully",
      order_id: orderId,
      timestamp: formattedTimestamp,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: paymentStatus
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  } finally {
    // ปลด Lock เสมอ
    lock.releaseLock();
  }
}

/**
 * ดึงรายการสินค้าทั้งหมดที่มีสถานะ ACTIVE
 */
function fetchProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }

    // กรองเฉพาะสินค้าที่สถานะเป็น ACTIVE
    if (String(item.status).toUpperCase() === "ACTIVE") {
      products.push({
        id: String(item.id),
        name: String(item.name),
        category: String(item.category || "General"),
        price: Number(item.price) || 0,
        description: String(item.description || ""),
        image_url: String(item.image_url || ""),
        stock: Number(item.stock) || 0,
        status: String(item.status)
      });
    }
  }

  return products;
}

/**
 * ปรับปรุงจำนวนสต็อกสินค้าหลังมีคำสั่งซื้อ
 */
function updateProductStock(ss, orderedItems) {
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const headers = data[0];
  const idColIdx = headers.indexOf("id");
  const stockColIdx = headers.indexOf("stock");
  const statusColIdx = headers.indexOf("status");

  if (idColIdx === -1 || stockColIdx === -1) return;

  // วนเช็คและตัดสต็อก
  for (let k = 0; k < orderedItems.length; k++) {
    const ordered = orderedItems[k];
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idColIdx]) === String(ordered.id)) {
        const currentStock = Number(data[r][stockColIdx]) || 0;
        const newStock = Math.max(0, currentStock - Number(ordered.quantity));
        sheet.getRange(r + 1, stockColIdx + 1).setValue(newStock);

        // หากสต็อกหมด เปลี่ยนสถานะเป็น OUT_OF_STOCK
        if (newStock === 0 && statusColIdx !== -1) {
          sheet.getRange(r + 1, statusColIdx + 1).setValue("OUT_OF_STOCK");
        }
        break;
      }
    }
  }
}

/**
 * สร้าง Order ID ในรูปแบบ ORD-YYYYMMDD-XXXX
 */
function generateOrderId() {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Bangkok", "yyyyMMdd");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // ตัวเลขสุ่ม 4 หลัก
  return "ORD-" + dateStr + "-" + randomSuffix;
}

/**
 * Helper สร้าง JSON Response พร้อม Header ที่ถูกต้อง
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * -------------------------------------------------------------
 * ฟังก์ชันหลัก: อัพเดทตาราง Google Sheet ทั้งหมดเป็นแบรนด์ GEONCE
 * - รีเซ็ตชีท Products: ลบข้อมูลเก่า ใส่หัวตาราง และสินค้าเสื้อผ้า GEONCE 6 รายการ
 * - ตรวจสอบ/อัพเดทชีท Orders: ให้มีหัวตารางครบ 13 คอลัมน์ (รวม Payment Method & Status)
 * - จัดรูปแบบสีและขนาดคอลัมน์ให้อ่านง่าย สไตล์พรีเมียม
 * -------------------------------------------------------------
 */
function updateSheetToGeonceStore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("⚠️ ไม่พบ Google Sheet: กรุณาเปิด Apps Script จากเมนู 'ส่วนขยาย (Extensions) > Apps Script' ภายใน Google Sheet");
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
 * ฟังก์ชันเริ่มต้นในการ Setup ระบบ
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
