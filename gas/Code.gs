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

    // 2. สร้าง Order ID (รูปแบบ: ORD-YYYYMMDD-XXXX)
    const orderId = generateOrderId();
    const formattedTimestamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

    // 3. สรุปรายการสินค้าเป็นข้อความอ่านง่าย
    const itemsSummary = payload.items.map(function(item) {
      return item.name + " (x" + item.quantity + ")";
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
      total_amount: totalAmount
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
    ["order_id", "timestamp", "line_user_id", "customer_name", "phone", "address", "items_summary", "items_json", "total_amount", "status", "note"]
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
 * ฟังก์ชันสำรอง: ป้องกัน Error เมื่อกด Run โดยที่ Apps Script ยังจำชื่อ myFunction
 */
function myFunction() {
  setupDatabase();
}

