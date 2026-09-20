/**
 * System Configuration
 * กำหนดค่า LIFF ID และ Google Apps Script Web App URL ที่นี่
 */
const CONFIG = {
  // 1. นำ LIFF ID ที่ได้จาก LINE Developers Console มาใส่ที่นี่ (รูปแบบ: 200xxxxxxx-xxxxxxx)
  LIFF_ID: "YOUR_LIFF_ID",

  // 2. นำ Web App URL ที่ได้จากการกด Deploy ใน Apps Script มาใส่ที่นี่ (ต้องลงท้ายด้วย /exec)
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbyQesQYj6FUG45kIVB6Lsv4ie7gEiQ1XGZSlWZhh_d5PDqLDSZU4Lwo80-pFtXqOQuiWA/exec",

  // ข้อมูลร้านค้าแบรนด์เสื้อผ้า GEONCE
  SHOP_NAME: "GEONCE",
  SHOP_TAGLINE: "Official Streetwear & Contemporary Apparel",
  CURRENCY_SYMBOL: "฿",

  // การตั้งค่าชำระเงินผ่าน PromptPay QR
  // สามารถเปลี่ยนเป็นเบอร์โทรศัพท์ (10 หลัก) หรือเลขประจำตัวประชาชน/นิติบุคคล (13 หลัก) ของร้าน
  PROMPTPAY_NUMBER: "0812345678",
  PROMPTPAY_NAME: "GEONCE OFFICIAL STORE",
  BANK_NAME: "พร้อมเพย์ (PromptPay)",

  // ตัวเลือกขนาดเสื้อผ้าเริ่มต้น
  DEFAULT_SIZES: ["S", "M", "L", "XL"],

  // รายการสินค้าสำรองแบรนด์เสื้อผ้า GEONCE (แสดงผลทันทีและใช้สำรองกรณีชีทยังไม่เปิดสิทธิ์ Anyone)
  MOCK_PRODUCTS: [
    {
      id: "G-TS01",
      name: "GEONCE Heavyweight Boxy Tee (Black)",
      category: "T-Shirts",
      price: 790,
      description: "เสื้อยืดผ้า Cotton Comb 100% สกรีนลาย GEONCE ทรง Boxy Oversized หนา 240 GSM",
      image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
      stock: 50,
      status: "ACTIVE"
    },
    {
      id: "G-TS02",
      name: "GEONCE Vintage Acid Wash Tee",
      category: "T-Shirts",
      price: 850,
      description: "เสื้อยืดฟอกวินเทจ สไตล์สตรีท เนื้อผ้านุ่ม ระบายอากาศได้ดีเยี่ยม ลายซิกเนเจอร์",
      image_url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80",
      stock: 40,
      status: "ACTIVE"
    },
    {
      id: "G-HD01",
      name: "GEONCE Cyberpunk Oversized Hoodie",
      category: "Hoodies",
      price: 1590,
      description: "เสื้อฮู้ดดี้ทรงหลวม ผ้าเฟรนช์เทอร์รี่หนานุ่ม ลายกราฟิกสตรีทแวร์ร่วมสมัย",
      image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
      stock: 30,
      status: "ACTIVE"
    },
    {
      id: "G-PT01",
      name: "GEONCE Tactical Cargo Pants (Dark Slate)",
      category: "Pants",
      price: 1290,
      description: "กางเกงคาร์โก้สตรีทแวร์ กระเป๋าข้างมัลติฟังก์ชัน ผ้า Ripstop ทนทาน ทรงกระบอกตรง",
      image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80",
      stock: 25,
      status: "ACTIVE"
    },
    {
      id: "G-AC01",
      name: "GEONCE Nylon Crossbody Bag",
      category: "Accessories",
      price: 690,
      description: "กระเป๋าสะพายข้างผ้าไนลอนกันน้ำ สายสะพายปรับระดับได้ สกรีนโลโก้ GEONCE",
      image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80",
      stock: 35,
      status: "ACTIVE"
    },
    {
      id: "G-AC02",
      name: "GEONCE Embroidered Bucket Hat",
      category: "Accessories",
      price: 590,
      description: "หมวกบักเก็ตปักโลโก้ GEONCE มินิมอล ผ้าคอตตอนทวิลล์พรีเมียม สวมใส่สบาย",
      image_url: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80",
      stock: 45,
      status: "ACTIVE"
    }
  ]
};
