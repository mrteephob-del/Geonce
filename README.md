# 🛒 ระบบสั่งซื้อสินค้าผ่าน LINE LIFF + Google Apps Script + Google Sheets

ระบบสั่งซื้อสินค้า E-Commerce แบบ Serverless สมบูรณ์แบบ พัฒนาด้วย **LINE LIFF SDK v2**, **Google Apps Script (GAS)**, และใช้ **Google Sheets** เป็นฐานข้อมูลหลัก ลูกค้าสามารถเลือกสินค้า ใส่ตะกร้า กรอกข้อมูลจัดส่ง และเมื่อยืนยัน ระบบจะบันทึกออเดอร์ลง Google Sheets พร้อมส่ง **ใบเสร็จรับเงินสุดพรีเมียม (LINE Flex Message)** กลับเข้าห้องแชท LINE ของลูกค้าโดยอัตโนมัติ

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
Geonce/
├── index.html            # หน้าเว็บแอปพลิเคชันหลัก (UI ร้านค้า, ตะกร้า, เช็คเอาต์, LIFF)
├── css/
│   └── style.css         # สไตล์ดีไซน์ระดับพรีเมียม (Mobile-first, Responsive, Animations)
├── js/
│   ├── config.js         # จุดตั้งค่า LIFF ID และ GAS Web App URL
│   ├── liff-handler.js   # โมดูลจัดการ LINE LIFF SDK และสร้าง Flex Message ใบเสร็จ
│   └── app.js            # ตรรกะของร้านค้า (โหลดสินค้า, จัดการตะกร้า, สั่งซื้อ)
├── gas/
│   ├── Code.gs           # โค้ด Backend API (doGet ดึงสินค้า, doPost บันทึกออเดอร์, ตัดสต็อก)
│   └── setup_sheet.gs    # ตัวช่วยสร้างตาราง Products และ Orders ใน Google Sheets อัตโนมัติใน 1 คลิก
├── README.md             # คู่มือการติดตั้งและใช้งานทีละขั้นตอน
└── .gitignore
```

---

## 🗄️ โครงสร้างฐานข้อมูล (Google Sheets Schema)

สร้าง Google Sheet ขึ้นมา 1 ไฟล์ ประกอบด้วย 2 แผ่นงาน (Tabs):

### 1. Sheet: `Products` (ข้อมูลสินค้า)
| คอลัมน์ | ชื่อ Header | ประเภท | รายละเอียด |
| :--- | :--- | :--- | :--- |
| **A** | `id` | ข้อความ | รหัสสินค้า เช่น `P001` |
| **B** | `name` | ข้อความ | ชื่อสินค้า เช่น `Espresso Signature Blend` |
| **C** | `category` | ข้อความ | หมวดหมู่ เช่น `Coffee`, `Tea`, `Bakery` |
| **D** | `price` | ตัวเลข | ราคาต่อชิ้น เช่น `95` |
| **E** | `description` | ข้อความ | คำอธิบายสินค้า |
| **F** | `image_url` | ข้อความ | ลิงก์ URL รูปภาพสินค้า |
| **G** | `stock` | ตัวเลข | จำนวนคงเหลือในสต็อก |
| **H** | `status` | ข้อความ | สถานะสินค้า (`ACTIVE` หรือ `OUT_OF_STOCK`) |

### 2. Sheet: `Orders` (ข้อมูลคำสั่งซื้อ)
| คอลัมน์ | ชื่อ Header | ประเภท | รายละเอียด |
| :--- | :--- | :--- | :--- |
| **A** | `order_id` | ข้อความ | รหัสคำสั่งซื้อ เช่น `ORD-20260920-1234` |
| **B** | `timestamp` | วันเวลา | วันที่และเวลาที่สั่งซื้อ |
| **C** | `line_user_id` | ข้อความ | LINE User ID ของผู้สั่ง |
| **D** | `customer_name` | ข้อความ | ชื่อลูกค้า (ดึงจาก LINE Profile) |
| **E** | `phone` | ข้อความ | เบอร์โทรศัพท์ติดต่อ |
| **F** | `address` | ข้อความ | ที่อยู่จัดส่ง หรือสาขาที่รับ |
| **G** | `items_summary` | ข้อความ | สรุปรายการสินค้า เช่น `Espresso (x2), Croissant (x1)` |
| **H** | `items_json` | JSON | ข้อมูลสินค้าโครงสร้าง Array เพื่อนำไปประมวลผลต่อ |
| **I** | `total_amount` | ตัวเลข | ยอดรวมเงินทั้งสิ้น (บาท) |
| **J** | `status` | ข้อความ | สถานะออเดอร์ (`PENDING`, `CONFIRMED`, `DELIVERED`, `CANCELLED`) |
| **K** | `note` | ข้อความ | หมายเหตุเพิ่มเติมจากลูกค้า |

---

## 🚀 คู่มือการติดตั้งทีละขั้นตอน (Step-by-Step Setup Guide)

### ขั้นตอนที่ 1: เตรียม Google Sheets และติดตั้ง Apps Script
1. ไปที่ [Google Sheets](https://sheets.new) และสร้าง Spreadsheet ใหม่ ตั้งชื่อเช่น `Geonce Database`
2. คลิกที่เมนูด้านบน **Extensions (ส่วนขยาย)** > **Apps Script**
3. คัดลอกโค้ดจากไฟล์ [`gas/setup_sheet.gs`](gas/setup_sheet.gs) ไปวางใน Apps Script
4. ที่แถบเมนูด้านบน เลือกฟังก์ชัน **`setupDatabase`** แล้วกด **Run (เรียกใช้)**
   - *หมายเหตุ: หากมีหน้าต่างขอสิทธิ์ ให้กดยืนยัน Advanced > Go to Untitled (unsafe) > Allow*
5. กลับมาดูที่ Google Sheet จะพบว่ามีแท็บ `Products` และ `Orders` พร้อมข้อมูลสินค้าตัวอย่างถูกสร้างขึ้นเรียบร้อยแล้ว
6. กลับมาที่ Apps Script ลบโค้ดเดิมออก แล้วนำโค้ดทั้งหมดจาก [`gas/Code.gs`](gas/Code.gs) ไปวางแทนที่ แล้วกด Save (Ctrl+S หรือ Cmd+S)

---

### ขั้นตอนที่ 2: Deploy Google Apps Script เป็น Web App (API)
1. ในหน้า Apps Script คลิกปุ่มสีน้ำเงินมุมขวาบน **Deploy (การทำให้ใช้งานได้)** > **New deployment (การทำให้ใช้งานได้ใหม่)**
2. คลิกไอคอนฟันเฟือง ⚙️ ด้านซ้าย เลือก **Web app (เว็บแอป)**
3. ตั้งค่าดังนี้:
   - **Description**: `LIFF API v1`
   - **Execute as (ดำเนินการในฐานะ)**: **Me (ฉัน - your_email@gmail.com)** *(สำคัญมาก! เพื่อให้บอทอ่านเขียนชีทได้)*
   - **Who has access (ผู้มีสิทธิ์เข้าถึง)**: **Anyone (ทุกคน)** *(สำคัญมาก! เพื่อให้ LIFF เรียก API ได้โดยไม่ต้องล็อกอินบัญชี Google)*
4. กด **Deploy**
5. คัดลอก **Web app URL** ที่ลงท้ายด้วย `/exec` เก็บไว้ (เช่น `https://script.google.com/macros/s/AKfycb.../exec`)

---

### ขั้นตอนที่ 3: สร้าง LINE Login & LINE LIFF App
1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/) แล้วเข้าสู่ระบบด้วยบัญชี LINE
2. สร้าง **Provider** (หรือเลือก Provider เดิมที่มี)
3. กด **Create a new channel** > เลือก **LINE Login**
4. กรอกข้อมูล Channel:
   - **Channel type**: LINE Login
   - **Provider**: เลือก Provider ของคุณ
   - **Channel name**: ชื่อร้านของคุณ เช่น `Geonce Store`
   - **App types**: เลือก **Web app**
   - กดยอมรับเงื่อนไขและกด **Create**
5. คลิกเข้าไปที่แท็บ **LIFF** ด้านบน > กด **Add**
6. กำหนดค่า LIFF App:
   - **LIFF app name**: `Geonce LIFF Order`
   - **Size**: **Full** (เต็มจอ) หรือ **Tall**
   - **Endpoint URL**: ใส่ URL เว็บของคุณ (เช่น GitHub Pages หรือใส่ `https://example.com` ไว้ชั่วคราวขณะพัฒนา)
   - **Scopes**: ติ๊กถูกเลือก 3 ค่า:
     - `profile`
     - `openid`
     - `chat_message.write` *(⚠️ สำคัญมาก! ต้องเลือกอันนี้เพื่อให้คำสั่ง `liff.sendMessages()` ส่งใบเสร็จเข้าห้องแชทได้)*
   - **Bot link feature**: Normal หรือ On (ตามต้องการ)
7. กด **Add** ระบบจะสร้าง **LIFF ID** ให้ (เช่น `200xxxxxxx-xxxxxxx`) ให้คัดลอกเก็บไว้

---

### ขั้นตอนที่ 4: นำค่ามาใส่ในไฟล์โค้ด
เปิดไฟล์ [`js/config.js`](js/config.js) แล้วนำค่าที่ได้มาแทนที่:

```javascript
const CONFIG = {
  // 1. นำ LIFF ID จากขั้นตอนที่ 3 มาใส่
  LIFF_ID: "200xxxxxxx-xxxxxxx",

  // 2. นำ Web App URL จากขั้นตอนที่ 2 มาใส่
  GAS_API_URL: "https://script.google.com/macros/s/AKfycb.../exec",

  SHOP_NAME: "Geonce Cafe & Bakery",
  CURRENCY_SYMBOL: "฿",
  ...
};
```

---

### ขั้นตอนที่ 5: นำขึ้น GitHub Pages เพื่อใช้งานจริง
1. Commit และ Push ไฟล์ขึ้น GitHub Repository:
   ```bash
   git add .
   git commit -m "Complete LINE LIFF ordering system"
   git push origin main
   ```
2. ไปที่ GitHub Repository ของคุณ > **Settings** > **Pages**
3. ในส่วน **Build and deployment**:
   - Source: เลือก **Deploy from a branch**
   - Branch: เลือก **main** / โฟลเดอร์ `/ (root)` แล้วกด **Save**
4. รอประมาณ 1-2 นาที คุณจะได้ URL ของ GitHub Pages (เช่น `https://mrteephob-del.github.io/Geonce/`)
5. นำ URL นี้กลับไปใส่ใน **Endpoint URL** ของ LIFF App ใน LINE Developers Console

---

## 📱 วิธีทดสอบใช้งาน
1. คัดลอก **LIFF URL** (เช่น `https://liff.line.me/200xxxxxxx-xxxxxxx`)
2. ส่งลิงก์นี้เข้าไปในห้องแชท LINE แล้วกดเปิดลิงก์บนสมาร์ทโฟน
3. ระบบจะขออนุญาตสิทธิ์การเข้าถึงข้อมูลโปรไฟล์และส่งข้อความ
4. เลือกสินค้าลงตะกร้า กดดูตะกร้า ปรับเพิ่มลดจำนวน และกดดำเนินการสั่งซื้อ
5. กรอกเบอร์โทรและที่อยู่จัดส่ง แล้วกดยืนยันการสั่งซื้อ
6. **ผลลัพธ์**:
   - บันทึกแถวใหม่ลงในแผ่นงาน `Orders` ของ Google Sheets ทันที
   - อัปเดตตัดจำนวนสต็อกในแผ่นงาน `Products`
   - ส่งข้อความ **LINE Flex Message (Receipt Bubble)** สรุปรายการคำสั่งซื้อพร้อมยอดเงินกลับเข้ามาในห้องแชท LINE ของคุณทันที!

---

## 💡 เทคนิคและข้อควรระวังสำคัญสำหรับนักพัฒนา (Developer Notes)

1. **การแก้ปัญหา CORS ใน Google Apps Script**:
   - Google Apps Script จะทำการ Redirect (HTTP 302) ไปยัง `script.googleusercontent.com` เมื่อเรียก API
   - บราวเซอร์ที่ส่งคำขอแบบ `application/json` จะยิง Preflight `OPTIONS` ล่วงหน้า ซึ่ง Apps Script ไม่รองรับและจะคืนค่า 405 Method Not Allowed
   - ในโปรเจกต์นี้แก้ปัญหาด้วยการส่ง Request POST เป็นแบบ `Content-Type: text/plain;charset=utf-8` พร้อมแปลง payload เป็น JSON string ทำให้ข้าม CORS preflight ได้อย่างราบรื่น 100%
2. **การป้องกัน Race Condition ด้วย `LockService`**:
   - ใน `Code.gs` ใช้ `LockService.getScriptLock()` เพื่อรอคิวการบันทึกข้อมูลสูงสุด 30 วินาที ป้องกันกรณีลูกค้าหลายท่านกดยืนยันออเดอร์พร้อมกันในเสี้ยววินาที
3. **การทดสอบในสภาพแวดล้อม Local / Mock Mode**:
   - ใน `js/config.js` และ `js/app.js` มีระบบ Mock Fallback อัตโนมัติ หากยังไม่ได้ระบุ LIFF ID หรือ API URL คุณยังคงสามารถเปิดไฟล์ `index.html` บนบราวเซอร์เพื่อทดสอบ UI และ Flow การทำงานได้ทันทีโดยที่โปรแกรมไม่ Error
