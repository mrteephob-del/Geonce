/**
 * LINE LIFF Ordering System - Google Apps Script Backend
 * แบรนด์เสื้อผ้า: GEONCE Official Store
 * รองรับ: ดึงสินค้า, บันทึกออเดอร์, ติดตามสถานะคำสั่งซื้อ (Order Tracking), แจ้งเตือนร้านค้าผ่าน LINE Bot
 */

// ชื่อ Sheet ที่ใช้งาน
const SHEET_PRODUCTS = "Products";
const SHEET_ORDERS = "Orders";

/**
 * -------------------------------------------------------------
 * การตั้งค่าแจ้งเตือนร้านค้าผ่าน LINE Messaging API (Push Notification)
 * -------------------------------------------------------------
 * 1. ADMIN_LINE_USER_ID: นำ LINE User ID ของแอดมินมาใส่ (รูปแบบ: Uxxxxxxxxxxxx)
 * 2. LINE_CHANNEL_ACCESS_TOKEN: Channel Access Token จาก LINE Developers > Messaging API
 * (หากยังไม่ได้ใส่ ระบบจะบันทึกออเดอร์ลงชีทตามปกติโดยไม่ติด Error)
 */
const ADMIN_CONFIG = {
  ADMIN_LINE_USER_ID: "", 
  LINE_CHANNEL_ACCESS_TOKEN: ""
};

/**
 * เมนูลัดบน Google Sheets เมื่อเปิดไฟล์
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
 * 2. ติดตามออเดอร์: ?action=trackOrder&query=ORD-XXX (หรือเบอร์โทรศัพท์)
 * 3. อัพเดทตารางชีท: ?action=updateSheet
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getProducts";

    // 1. ดึงรายการสินค้า
    if (action === "getProducts") {
      const products = fetchProducts();
      return createJsonResponse({
        status: "success",
        data: products
      });
    }

    // 2. ติดตามสถานะคำสั่งซื้อ (Order Tracking)
    if (action === "trackOrder") {
      const query = (e && e.parameter && e.parameter.query) ? e.parameter.query.trim() : "";
      if (!query) {
        return createJsonResponse({
          status: "error",
          message: "กรุณาระบุเลข Order ID หรือเบอร์โทรศัพท์ที่ใช้สั่งซื้อ"
        });
      }

      const order = findOrder(query);
      if (!order) {
        return createJsonResponse({
          status: "error",
          message: "ไม่พบข้อมูลคำสั่งซื้อ กรุณาตรวจสอบ Order ID หรือเบอร์โทรศัพท์อีกครั้ง"
        });
      }

      return createJsonResponse({
        status: "success",
        data: order
      });
    }

    // 3. รีเซ็ต / อัพเดทตารางชีท
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
 * รองรับการบันทึกคำสั่งซื้อใหม่ พร้อมระบบ PromptPay QR และส่งแจ้งเตือนแอดมิน
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000);

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

    // 1. ตรวจสอบข้อมูลคำสั่งซื้อ
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

    // 3. สรุปรายการสินค้า
    const itemsSummary = payload.items.map(function(item) {
      const sizeTag = item.size ? " [" + item.size + "]" : "";
      return item.name + sizeTag + " (x" + item.quantity + ")";
    }).join(", ");

    const itemsJson = JSON.stringify(payload.items);

    // 4. บันทึกลง Sheet Orders (15 คอลัมน์)
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
      "'" + phone, // รักษาเลข 0 นำหน้า
      address,
      itemsSummary,
      itemsJson,
      totalAmount,
      paymentMethod,
      paymentStatus,
      "PENDING", // สถานะคำสั่งซื้อเริ่มต้น
      "", // tracking_number (เว้นว่างไว้ให้แอดมินกรอกในชีทเมื่อส่งของ)
      "", // shipping_carrier (เว้นว่างไว้ให้แอดมินกรอก เช่น Flash, Kerry)
      note
    ]);

    // 5. ปรับปรุงสต็อกสินค้าใน Sheet Products
    try {
      updateProductStock(ss, payload.items);
    } catch (stockErr) {
      Logger.log("Warning: Stock update error: " + stockErr.message);
    }

    // 6. ส่งแจ้งเตือนคำสั่งซื้อใหม่ไปยัง LINE ของแอดมินร้านค้า
    try {
      sendAdminLineAlert({
        orderId: orderId,
        timestamp: formattedTimestamp,
        customerName: customerName,
        phone: phone,
        address: address,
        itemsSummary: itemsSummary,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        note: note
      });
    } catch (alertErr) {
      Logger.log("Admin alert error: " + alertErr.message);
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
    lock.releaseLock();
  }
}

/**
 * ฟังก์ชันค้นหาคำสั่งซื้อ (Order Tracking)
 * รองรับการค้นหาด้วย Order ID (ตรงตัว) หรือเบอร์โทรศัพท์
 */
function findOrder(query) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ORDERS);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0];
  const cleanQuery = String(query).trim().toLowerCase();
  const cleanDigits = cleanQuery.replace(/\D/g, "");

  const idIdx = headers.indexOf("order_id");
  const phoneIdx = headers.indexOf("phone");

  // ค้นหาจากแถวล่างสุดขึ้นมาบน เพื่อให้ได้ออเดอร์ล่าสุด
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const orderId = String(row[idIdx] || "").trim().toLowerCase();
    const phoneRaw = String(row[phoneIdx] || "").replace(/\D/g, "");

    const matchId = orderId === cleanQuery || orderId.endsWith(cleanQuery);
    const matchPhone = cleanDigits.length >= 8 && phoneRaw.endsWith(cleanDigits);

    if (matchId || matchPhone) {
      const order = {};
      for (let j = 0; j < headers.length; j++) {
        order[headers[j]] = row[j];
      }

      let parsedItems = [];
      try {
        parsedItems = JSON.parse(order.items_json);
      } catch (e) {
        parsedItems = [];
      }

      return {
        order_id: String(order.order_id || ""),
        timestamp: String(order.timestamp || ""),
        customer_name: String(order.customer_name || ""),
        phone: String(order.phone || "").replace(/^'/, ""),
        address: String(order.address || ""),
        items_summary: String(order.items_summary || ""),
        items: parsedItems,
        total_amount: Number(order.total_amount) || 0,
        payment_method: String(order.payment_method || "PromptPay QR"),
        payment_status: String(order.payment_status || "WAITING_PAYMENT"),
        status: String(order.status || "PENDING"),
        tracking_number: String(order.tracking_number || ""),
        shipping_carrier: String(order.shipping_carrier || ""),
        note: String(order.note || "")
      };
    }
  }

  return null;
}

/**
 * ส่งข้อความแจ้งเตือนคำสั่งซื้อใหม่ไปยัง LINE แอดมินร้านค้า (LINE Messaging API)
 */
function sendAdminLineAlert(order) {
  if (!ADMIN_CONFIG.ADMIN_LINE_USER_ID || !ADMIN_CONFIG.LINE_CHANNEL_ACCESS_TOKEN) {
    Logger.log("Notice: Admin LINE alert skipped (Token or User ID not configured yet)");
    return;
  }

  const messageText = 
    "🚨 มีคำสั่งซื้อใหม่! [GEONCE Official Store]\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "🧾 เลขที่: " + order.orderId + "\n" +
    "👤 ลูกค้า: " + order.customerName + "\n" +
    "📞 โทร: " + order.phone + "\n" +
    "👕 รายการ: " + order.itemsSummary + "\n" +
    "💰 ยอดชำระ: ฿" + Number(order.totalAmount).toLocaleString() + " (" + order.paymentMethod + ")\n" +
    "📍 ที่อยู่: " + order.address + "\n" +
    (order.note ? "📝 หมายเหตุ: " + order.note + "\n" : "") +
    "⏱️ เวลา: " + order.timestamp + "\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "👉 ตรวจสอบสลิปและอัปเดตสถานะใน Google Sheets ได้ทันที";

  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    to: ADMIN_CONFIG.ADMIN_LINE_USER_ID,
    messages: [
      {
        type: "text",
        text: messageText
      }
    ]
  };

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ADMIN_CONFIG.LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * ดึงรายการสินค้าทั้งหมดที่มีสถานะ ACTIVE
 */
function fetchProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) return [];

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

  for (let k = 0; k < orderedItems.length; k++) {
    const ordered = orderedItems[k];
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idColIdx]) === String(ordered.id)) {
        const currentStock = Number(data[r][stockColIdx]) || 0;
        const newStock = Math.max(0, currentStock - Number(ordered.quantity));
        sheet.getRange(r + 1, stockColIdx + 1).setValue(newStock);

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
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
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
 * ฟังก์ชัน 1-Click อัพเดทตาราง Products และ Orders
 */
function updateSheetToGeonceStore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("กรุณาเปิดจากเมนู ส่วนขยาย > Apps Script ภายในชีท");

  // 1. ชีท Products
  let productsSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!productsSheet) {
    productsSheet = ss.insertSheet(SHEET_PRODUCTS);
  }

  // หากไม่มีข้อมูล ให้สร้างโครงสร้างพร้อมสินค้าเริ่มต้น
  if (productsSheet.getLastRow() <= 1) {
    productsSheet.clear();
    const productHeaders = [["id", "name", "category", "price", "description", "image_url", "stock", "status"]];
    productsSheet.getRange(1, 1, 1, productHeaders[0].length).setValues(productHeaders);
    productsSheet.getRange(1, 1, 1, productHeaders[0].length)
                 .setBackground("#0F172A")
                 .setFontColor("#FFFFFF")
                 .setFontWeight("bold")
                 .setFontSize(11)
                 .setHorizontalAlignment("center")
                 .setVerticalAlignment("middle");
    productsSheet.setRowHeight(1, 38);
    productsSheet.setFrozenRows(1);

    const geonceProducts = [
      ["G-TS01", "GEONCE Heavyweight Boxy Tee (Black)", "T-Shirts", 790, "เสื้อยืดผ้า Cotton Comb 100% สกรีนลาย GEONCE ทรง Boxy Oversized หนา 240 GSM", "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80", 50, "ACTIVE"],
      ["G-TS02", "GEONCE Vintage Acid Wash Tee", "T-Shirts", 850, "เสื้อยืดฟอกวินเทจ สไตล์สตรีท เนื้อผ้านุ่ม ระบายอากาศได้ดีเยี่ยม ลายซิกเนเจอร์", "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80", 40, "ACTIVE"],
      ["G-HD01", "GEONCE Cyberpunk Oversized Hoodie", "Hoodies", 1590, "เสื้อฮู้ดดี้ทรงหลวม ผ้าเฟรนช์เทอร์รี่หนานุ่ม ลายกราฟิกสตรีทแวร์ร่วมสมัย", "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80", 30, "ACTIVE"],
      ["G-PT01", "GEONCE Tactical Cargo Pants (Dark Slate)", "Pants", 1290, "กางเกงคาร์โก้สตรีทแวร์ กระเป๋าข้างมัลติฟังก์ชัน ผ้า Ripstop ทนทาน ทรงกระบอกตรง", "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80", 25, "ACTIVE"],
      ["G-AC01", "GEONCE Nylon Crossbody Bag", "Accessories", 690, "กระเป๋าสะพายข้างผ้าไนลอนกันน้ำ สายสะพายปรับระดับได้ สกรีนโลโก้ GEONCE", "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80", 35, "ACTIVE"],
      ["G-AC02", "GEONCE Embroidered Bucket Hat", "Accessories", 590, "หมวกบักเก็ตปักโลโก้ GEONCE มินิมอล ผ้าคอตตอนทวิลล์พรีเมียม สวมใส่สบาย", "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80", 45, "ACTIVE"]
    ];

    productsSheet.getRange(2, 1, geonceProducts.length, geonceProducts[0].length).setValues(geonceProducts);
    productsSheet.getRange(2, 1, geonceProducts.length, 1).setHorizontalAlignment("center");
    productsSheet.getRange(2, 3, geonceProducts.length, 1).setHorizontalAlignment("center");
    productsSheet.getRange(2, 4, geonceProducts.length, 1).setNumberFormat("#,##0").setHorizontalAlignment("right");
    productsSheet.getRange(2, 7, geonceProducts.length, 1).setHorizontalAlignment("center");
    productsSheet.getRange(2, 8, geonceProducts.length, 1).setHorizontalAlignment("center").setFontColor("#16A34A").setFontWeight("bold");

    for (let r = 2; r <= geonceProducts.length + 1; r++) productsSheet.setRowHeight(r, 32);
    productsSheet.autoResizeColumns(1, productHeaders[0].length);
  }

  // 2. ชีท Orders (15 คอลัมน์)
  let ordersSheet = ss.getSheetByName(SHEET_ORDERS);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(SHEET_ORDERS);
  }

  const orderHeaders = [
    ["order_id", "timestamp", "line_user_id", "customer_name", "phone", "address", "items_summary", "items_json", "total_amount", "payment_method", "payment_status", "status", "tracking_number", "shipping_carrier", "note"]
  ];
  ordersSheet.getRange(1, 1, 1, orderHeaders[0].length).setValues(orderHeaders);
  ordersSheet.getRange(1, 1, 1, orderHeaders[0].length)
             .setBackground("#1E3A8A")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontSize(11)
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  ordersSheet.setRowHeight(1, 38);
  ordersSheet.setFrozenRows(1);

  if (ordersSheet.getLastRow() > 1) {
    ordersSheet.getRange(2, 9, ordersSheet.getLastRow() - 1, 1).setNumberFormat("#,##0.00");
  }

  ordersSheet.autoResizeColumns(1, orderHeaders[0].length);
  ordersSheet.setColumnWidth(1, 180); // order_id
  ordersSheet.setColumnWidth(6, 280); // address
  ordersSheet.setColumnWidth(7, 300); // items_summary
  ordersSheet.setColumnWidth(13, 160); // tracking_number
  ordersSheet.setColumnWidth(14, 140); // shipping_carrier

  Logger.log("✅ อัพเดทตาราง Products และ Orders เป็น GEONCE Store สำเร็จเรียบร้อย!");
}

function createSampleClothingProducts() { updateSheetToGeonceStore(); }
function setupDatabase() { updateSheetToGeonceStore(); }
function myFunction() { updateSheetToGeonceStore(); }
