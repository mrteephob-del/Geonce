/**
 * LINE LIFF Ordering System - Google Apps Script Backend
 * ทำหน้าที่เป็น REST API (doGet / doPost) เชื่อมต่อ Google Sheets
 */

// ชื่อ Sheet ที่ใช้งาน
const SHEET_PRODUCTS = "Products";
const SHEET_ORDERS = "Orders";

/**
 * จัดการ HTTP GET Requests
 * รองรับการดึงข้อมูลสินค้า: ?action=getProducts
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getProducts";

    if (action === "getProducts") {
      const products = fetchProducts();
      return createJsonResponse({
        status: "success",
        data: products
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
 * รองรับการบันทึกคำสั่งซื้อใหม่
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
      throw new Error("Sheet '" + SHEET_ORDERS + "' not found. Please run setupDatabase() first.");
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
 * ตัวช่วย Setup โครงสร้างตาราง Products และ Orders ใน Google Sheets
 * -------------------------------------------------------------
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    throw new Error("⚠️ ไม่พบ Google Sheet: กรุณาเปิด Apps Script จากเมนู 'ส่วนขยาย (Extensions) > Apps Script' ภายใน Google Sheet");
  }
  
  // 1. ตั้งค่า Sheet: Products
  let productsSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!productsSheet) {
    productsSheet = ss.insertSheet(SHEET_PRODUCTS);
  }
  
  const productHeaders = [
    ["id", "name", "category", "price", "description", "image_url", "stock", "status"]
  ];
  productsSheet.getRange(1, 1, 1, productHeaders[0].length).setValues(productHeaders);
  
  const headerRange = productsSheet.getRange(1, 1, 1, productHeaders[0].length);
  headerRange.setBackground("#10B981")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setHorizontalAlignment("center");
  productsSheet.setFrozenRows(1);
  
  // 2. ตั้งค่า Sheet: Orders
  let ordersSheet = ss.getSheetByName(SHEET_ORDERS);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(SHEET_ORDERS);
  }
  
  const orderHeaders = [
    ["order_id", "timestamp", "line_user_id", "customer_name", "phone", "address", "items_summary", "items_json", "total_amount", "payment_method", "payment_status", "status", "note"]
  ];
  ordersSheet.getRange(1, 1, 1, orderHeaders[0].length).setValues(orderHeaders);
  
  const orderHeaderRange = ordersSheet.getRange(1, 1, 1, orderHeaders[0].length);
  orderHeaderRange.setBackground("#3B82F6")
                  .setFontColor("#FFFFFF")
                  .setFontWeight("bold")
                  .setHorizontalAlignment("center");
  ordersSheet.setFrozenRows(1);

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

  let sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEET_PRODUCTS);
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

  // เพิ่มข้อมูลลงใน Sheet Products ต่อจากแถวเดิม (หรือเริ่มแถวที่ 2)
  const startRow = Math.max(2, sheet.getLastRow() + 1);
  sheet.getRange(startRow, 1, sampleProducts.length, sampleProducts[0].length).setValues(sampleProducts);
  sheet.autoResizeColumns(1, sampleProducts[0].length);
  
  Logger.log("✅ เพิ่มสินค้าเสื้อผ้าจำลองแบรนด์ GEONCE จำนวน " + sampleProducts.length + " รายการ เรียบร้อยแล้ว!");
}

/**
 * ฟังก์ชันสำรอง: ป้องกัน Error เมื่อกด Run โดยที่ Apps Script ยังจำชื่อ myFunction
 */
function myFunction() {
  createSampleClothingProducts();
}

