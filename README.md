# 🛍️ GEONCE Official Store - ระบบสั่งซื้อเสื้อผ้าผ่าน LINE LIFF & PromptPay QR

ระบบ E-Commerce สั่งซื้อสินค้าแบรนด์เสื้อผ้าและสตรีทแวร์ **GEONCE** แบบ Serverless ผ่าน **LINE LIFF SDK v2**, **Google Apps Script (GAS)**, และใช้ **Google Sheets** เป็นฐานข้อมูล ลูกค้าสามารถเลือกไซส์เสื้อผ้า (S, M, L, XL), ใส่ตะกร้า, สแกนชำระเงินผ่าน **QR Code PromptPay แบบระบุยอดตรงอัตโนมัติ**, และรับ **ใบเสร็จรับเงินสุดพรีเมียม (LINE Flex Message)** ส่งตรงเข้าห้องแชท LINE ทันที

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
Geonce/
├── index.html            # หน้าเว็บแอปพลิเคชันหลัก (UI ร้านค้า GEONCE, ตะกร้า, เลือกรหัส/ไซส์, สแกน PromptPay QR)
├── css/
│   └── style.css         # สไตล์ดีไซน์สตรีทแวร์มินิมอล (Black & Slate Streetwear, Mobile-first, Responsive)
├── js/
│   ├── config.js         # จุดตั้งค่า LIFF ID, GAS API URL, เบอร์ PromptPay และชื่อบัญชี
│   ├── liff-handler.js   # โมดูล LINE LIFF SDK ดึง Profile และสร้าง Flex Message ใบเสร็จ GEONCE
│   └── app.js            # ตรรกะของร้าน (โหลดสินค้า, ระบบเลือกไซส์, ตะกร้า, คำนวณ QR PromptPay, สั่งซื้อ)
├── gas/
│   ├── Code.gs           # Backend Web App API (doGet ดึงสินค้า, doPost บันทึกออเดอร์พร้อมช่องทาง PromptPay, ตัดสต็อก)
│   └── setup_sheet.gs    # ตัวช่วยสร้างโครงสร้างตาราง Products และ Orders ใน Google Sheets อัตโนมัติ
├── README.md             # คู่มือการติดตั้งและใช้งานทีละขั้นตอน
└── .gitignore
```

---

## 🗄️ โครงสร้างฐานข้อมูล (Google Sheets Schema)

สร้าง Google Sheet 1 ไฟล์ ประกอบด้วย 2 แผ่นงาน (Tabs):

### 1. Sheet: `Products` (ข้อมูลสินค้าเสื้อผ้า)
| คอลัมน์ | ชื่อ Header | ประเภท | รายละเอียด |
| :--- | :--- | :--- | :--- |
| **A** | `id` | ข้อความ | รหัสสินค้า เช่น `G-TS01`, `G-HD02` |
| **B** | `name` | ข้อความ | ชื่อสินค้า เช่น `GEONCE Heavyweight Oversized Tee` |
| **C** | `category` | ข้อความ | หมวดหมู่ เช่น `T-Shirts`, `Hoodies`, `Pants`, `Accessories` |
| **D** | `price` | ตัวเลข | ราคาต่อชิ้น เช่น `790`, `1490` |
| **E** | `description` | ข้อความ | รายละเอียดเนื้อผ้า ขนาด และทรงเสื้อ |
| **F** | `image_url` | ข้อความ | ลิงก์ URL รูปภาพสินค้า |
| **G** | `stock` | ตัวเลข | จำนวนคงเหลือในสต็อก |
| **H** | `status` | ข้อความ | สถานะสินค้า (`ACTIVE` หรือ `OUT_OF_STOCK`) |

### 2. Sheet: `Orders` (ข้อมูลคำสั่งซื้อ)
| คอลัมน์ | ชื่อ Header | ประเภท | รายละเอียด |
| :--- | :--- | :--- | :--- |
| **A** | `order_id` | ข้อความ | รหัสคำสั่งซื้อ เช่น `ORD-20260920-1234` |
| **B** | `timestamp` | วันเวลา | วันที่และเวลาที่สั่งซื้อ |
| **C** | `line_user_id` | ข้อความ | LINE User ID ของผู้สั่ง |
| **D** | `customer_name` | ข้อความ | ชื่อลูกค้าผู้สั่งซื้อ |
| **E** | `phone` | ข้อความ | เบอร์โทรศัพท์ติดต่อ |
| **F** | `address` | ข้อความ | ที่อยู่จัดส่งพัสดุ |
| **G** | `items_summary` | ข้อความ | สรุปสินค้าและไซส์ เช่น `GEONCE Heavyweight Tee [Size: L] (x1)` |
| **H** | `items_json` | JSON | โครงสร้างข้อมูล JSON อาร์เรย์ของสินค้า |
| **I** | `total_amount` | ตัวเลข | ยอดรวมชำระทั้งสิ้น (บาท) |
| **J** | `payment_method` | ข้อความ | ช่องทางชำระเงิน (`PromptPay QR`) |
| **K** | `payment_status` | ข้อความ | สถานะการชำระเงิน (`WAITING_PAYMENT` รอตรวจสอบสลิป) |
| **L** | `status` | ข้อความ | สถานะออเดอร์ (`PENDING`, `CONFIRMED`, `SHIPPED`, `CANCELLED`) |
| **M** | `note` | ข้อความ | หมายเหตุเพิ่มเติมจากลูกค้า |

---

## 🚀 คู่มือการติดตั้งและตั้งค่าระบบ (Setup Guide)

### ขั้นตอนที่ 1: เตรียม Google Sheets และติดตั้ง Apps Script
1. ไปที่ [Google Sheets](https://sheets.new) และสร้าง Spreadsheet ใหม่ ตั้งชื่อเช่น `GEONCE Database`
2. คลิกที่เมนูด้านบน **Extensions (ส่วนขยาย)** > **Apps Script**
3. คัดลอกโค้ดจากไฟล์ [`gas/Code.gs`](gas/Code.gs) ทั้งหมดไปวางใน Apps Script (ไฟล์เดียวจบ ครบทั้ง Setup และ API)
4. ที่แถบด้านบน เลือกฟังก์ชัน **`setupDatabase`** แล้วกดปุ่ม **Run (เรียกใช้)**
   - *หมายเหตุ: หากมีหน้าต่างขอสิทธิ์ ให้กด Advanced > Go to Untitled project (unsafe) > Allow*
5. กลับมาดูที่ Google Sheets จะพบแท็บ `Products` และ `Orders` พร้อมหัวตารางถูกสร้างขึ้นเรียบร้อย
6. เพิ่มข้อมูลสินค้าเสื้อผ้าของคุณลงในชีท `Products` ได้ทันที

---

### ขั้นตอนที่ 2: Deploy Google Apps Script เป็น Web App (API)
1. ในหน้า Apps Script คลิกปุ่มสีน้ำเงินมุมขวาบน **Deploy (การทำให้ใช้งานได้)** > **New deployment (การทำให้ใช้งานได้ใหม่)**
2. คลิกไอคอนฟันเฟือง ⚙️ ด้านซ้าย เลือก **Web app (เว็บแอป)**
3. ตั้งค่าดังนี้:
   - **Description**: `GEONCE API v1`
   - **Execute as (ดำเนินการในฐานะ)**: **Me (ฉัน - your_email@gmail.com)**
   - **Who has access (ผู้มีสิทธิ์เข้าถึง)**: **Anyone (ทุกคน)** *(⚠️ สำคัญมาก! ต้องเลือก Anyone เพื่อให้ระบบเรียกได้โดยไม่ต้องล็อกอิน Google)*
4. กด **Deploy** แล้วคัดลอก **Web app URL** ที่ลงท้ายด้วย `/exec`

---

### ขั้นตอนที่ 3: ตั้งค่า LINE Developers & LINE LIFF
1. เข้าสู่ระบบที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Channel ชนิด **LINE Login**
3. คลิกแท็บ **LIFF** > กด **Add**
4. กำหนดค่า:
   - **LIFF app name**: `GEONCE Store`
   - **Size**: **Full** (เต็มจอ)
   - **Endpoint URL**: ใส่ URL ของ GitHub Pages เช่น `https://mrteephob-del.github.io/Geonce/`
   - **Scopes**: ติ๊กถูก 3 รายการ:
     - `profile`
     - `openid`
     - **`chat_message.write`** *(จำเป็นมากสำหรับการส่งใบเสร็จเข้าห้องแชท)*
5. กดปุ่ม **Add** แล้วคัดลอก **LIFF ID** (เช่น `200xxxxxxx-xxxxxxx`)

---

### ขั้นตอนที่ 4: กำหนดค่าในไฟล์ [`js/config.js`](js/config.js)
เปิดไฟล์ [`js/config.js`](js/config.js) แล้วนำค่าของคุณมาใส่:

```javascript
const CONFIG = {
  // 1. LIFF ID จาก LINE Developers Console
  LIFF_ID: "200xxxxxxx-xxxxxxx",

  // 2. Web App URL จาก Google Apps Script (ลงท้ายด้วย /exec)
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbyQesQYj6FUG45kIVB6Lsv4ie7gEiQ1XGZSlWZhh_d5PDqLDSZU4Lwo80-pFtXqOQuiWA/exec",

  SHOP_NAME: "GEONCE",
  SHOP_TAGLINE: "Official Streetwear & Contemporary Apparel",
  CURRENCY_SYMBOL: "฿",

  // 3. กำหนดเบอร์โทรศัพท์ (10 หลัก) หรือเลขบัตร ปชช./นิติบุคคล (13 หลัก) สำหรับสร้าง PromptPay QR
  PROMPTPAY_NUMBER: "0812345678",
  PROMPTPAY_NAME: "GEONCE OFFICIAL STORE",
  BANK_NAME: "พร้อมเพย์ (PromptPay)",

  DEFAULT_SIZES: ["S", "M", "L", "XL"],
  MOCK_PRODUCTS: []
};
```

---

### ขั้นตอนที่ 5: นำขึ้น GitHub Pages เพื่อใช้งานจริง
1. Commit และ Push ขึ้น GitHub:
   ```bash
   git add .
   git commit -m "feat: rebrand to GEONCE clothing with PromptPay QR payment"
   git push origin main
   ```
2. ไปที่ GitHub Repository > **Settings** > **Pages**
3. ใต้หัวข้อ *Branch* เลือก **`main`** โฟลเดอร์ **`/ (root)`** แล้วกด **Save**
4. นำ URL GitHub Pages ที่ได้ไปกรอกใน **Endpoint URL** ของ LIFF App ใน LINE Developers Console

---

## 💳 ขั้นตอนการสั่งซื้อและการชำระเงิน (Customer Flow)
1. ลูกค้าเปิดแอปผ่าน LINE LIFF (เช่น `https://liff.line.me/200xxxxxxx-xxxxxxx`)
2. เลือกสินค้าเสื้อผ้าที่ต้องการ แล้วเลือกขนาด (**Size: S, M, L, XL**) เพิ่มลงตะกร้า
3. เข้าสู่ตะกร้าสินค้า ตรวจสอบรายการ และกดยืนยันสั่งซื้อ
4. กรอกชื่อผู้รับ เบอร์โทรศัพท์ และที่อยู่จัดส่งพัสดุ
5. ระบบจะแสดงหน้าต่าง **PromptPay QR Code** พร้อมยอดเงินสุทธิตรงตามยอดสั่งซื้อ และมีปุ่มคัดลอกเลขพร้อมเพย์
6. ลูกค้าสแกนโอนเงินผ่านแอปธนาคาร แล้วกดปุ่ม **"ฉันโอนเงินเรียบร้อยแล้ว (ยืนยันคำสั่งซื้อ)"**
7. **ระบบทำงานอัตโนมัติ**:
   - บันทึกคำสั่งซื้อลงแผ่นงาน `Orders` พร้อมระบุสถานะ `WAITING_PAYMENT` (รอตรวจสอบสลิป)
   - ตัดสต็อกสินค้าในแผ่นงาน `Products`
   - ส่ง **LINE Flex Message** ใบเสร็จดีไซน์สตรีทแวร์สุดหรูเข้าห้องแชท LINE ของลูกค้า พร้อมข้อความแนะนำให้ส่งรูปสลิปเข้ามาในแชทเพื่อยืนยันออเดอร์!
