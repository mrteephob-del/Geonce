/**
 * Setup Script สำหรับสร้างและอัพเดทตาราง Products และ Orders ใน Google Sheets อัตโนมัติ
 * แบรนด์เสื้อผ้า: GEONCE Official Store
 */

const SHEET_PRODUCTS = "Products";
const SHEET_ORDERS = "Orders";

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

function updateSheetToGeonceStore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("กรุณาเปิดจากเมนู ส่วนขยาย > Apps Script ภายในชีท");

  // 1. ชีท Products
  let productsSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!productsSheet) {
    productsSheet = ss.insertSheet(SHEET_PRODUCTS);
  }

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
    productsSheet.autoResizeColumns(1, productHeaders[0].length);
  }

  // 2. ชีท Orders (15 คอลัมน์ รองรับเลขพัสดุและขนส่ง)
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

  Logger.log("✅ อัพเดทตารางเรียบร้อยแล้ว!");
}

function createSampleClothingProducts() { updateSheetToGeonceStore(); }
function setupDatabase() { updateSheetToGeonceStore(); }
function myFunction() { updateSheetToGeonceStore(); }
