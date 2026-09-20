/**
 * LINE LIFF Handler
 * จัดการการเริ่มต้นทำงานของ LIFF SDK, การดึง Profile, และการส่งข้อความ Flex Message
 */

const LiffHandler = {
  profile: null,
  isInitialized: false,

  /**
   * เริ่มต้นการทำงานของ LIFF
   */
  async init() {
    // กรณีที่ผู้ใช้ยังไม่ได้กำหนด LIFF ID ให้เปิดใช้งาน Mock Mode เพื่อให้ทดสอบ UI ได้
    if (!CONFIG.LIFF_ID || CONFIG.LIFF_ID === "YOUR_LIFF_ID") {
      console.warn("⚠️ ยังไม่ได้ตั้งค่า LIFF ID: เข้าสู่โหมดจำลอง (Mock Profile Mode)");
      this.profile = {
        userId: "MOCK_USER_LINE_12345",
        displayName: "ลูกค้าทดสอบ (Mock User)",
        pictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
      };
      this.updateProfileUI();
      return this.profile;
    }

    try {
      await liff.init({ liffId: CONFIG.LIFF_ID });
      this.isInitialized = true;

      // ตรวจสอบการ Login
      if (!liff.isLoggedIn()) {
        console.log("🔒 ยังไม่ได้เข้าสู่ระบบ LINE: กำลังเปิดหน้า Login...");
        liff.login();
        return null;
      }

      // ดึงข้อมูล Profile ของผู้ใช้
      const profile = await liff.getProfile();
      this.profile = profile;
      console.log("✅ ดึงข้อมูล Profile LINE สำเร็จ:", profile);
      this.updateProfileUI();
      return profile;
    } catch (err) {
      console.error("❌ เกิดข้อผิดพลาดในการโหลด LIFF:", err);
      showToast("ไม่สามารถเชื่อมต่อ LINE LIFF ได้ (ทำงานในโหมดปกติ)", "warning");
      this.profile = {
        userId: "GUEST_" + Math.floor(Math.random() * 10000),
        displayName: "ลูกค้าทั่วไป",
        pictureUrl: ""
      };
      this.updateProfileUI();
      return this.profile;
    }
  },

  /**
   * อัปเดตข้อมูลผู้ใช้บน UI
   */
  updateProfileUI() {
    const avatarEl = document.getElementById("userAvatar");
    const nameEl = document.getElementById("userName");
    const statusBadge = document.getElementById("liffStatusBadge");

    if (this.profile) {
      if (nameEl) nameEl.textContent = this.profile.displayName || "ผู้ใช้ LINE";
      if (avatarEl && this.profile.pictureUrl) {
        avatarEl.src = this.profile.pictureUrl;
      }
      if (statusBadge) {
        if (this.isInitialized && liff.isInClient()) {
          statusBadge.innerHTML = `<span class="badge-dot green"></span> LINE App`;
        } else if (this.isInitialized) {
          statusBadge.innerHTML = `<span class="badge-dot blue"></span> Web Browser`;
        } else {
          statusBadge.innerHTML = `<span class="badge-dot orange"></span> Demo Mode`;
        }
      }
    }
  },

  /**
   * ส่งข้อความสรุปการสั่งซื้อ (Flex Message Receipt) เข้าสู่ห้องแชท LINE ของผู้ใช้
   */
  async sendOrderReceipt(orderData) {
    // 1. ตรวจสอบว่าเปิดผ่าน LINE Client หรือไม่
    if (!this.isInitialized || !liff.isInClient()) {
      console.log("ℹ️ เปิดอยู่นอก LINE หรือ Demo Mode: ข้ามการส่งข้อความเข้าห้องแชท liff.sendMessages");
      return { success: false, reason: "NOT_IN_LINE_CLIENT" };
    }

    // 2. สร้างโครงสร้าง LINE Flex Message (ใบเสร็จรับเงินสุดพรีเมียม)
    const flexMessage = this.createReceiptFlexMessage(orderData);

    try {
      await liff.sendMessages([flexMessage]);
      console.log("✅ ส่งใบเสร็จ Flex Message เข้าห้องแชท LINE สำเร็จ!");
      return { success: true };
    } catch (err) {
      console.error("❌ ไม่สามารถส่งข้อความเข้าห้องแชท LINE ได้:", err);
      return { success: false, error: err };
    }
  },

  /**
   * สร้าง JSON ของ LINE Flex Message สำหรับใบเสร็จ
   */
  createReceiptFlexMessage(orderData) {
    // สร้างแถวรายการสินค้าในใบเสร็จ
    const itemRows = orderData.items.map(item => ({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: `${item.name} x${item.quantity}`,
          size: "sm",
          color: "#555555",
          flex: 4,
          wrap: true
        },
        {
          type: "text",
          text: `฿${(item.price * item.quantity).toLocaleString()}`,
          size: "sm",
          color: "#111111",
          align: "end",
          flex: 2
        }
      ],
      margin: "md"
    }));

    return {
      type: "flex",
      altText: `ใบเสร็จคำสั่งซื้อ #${orderData.order_id} - ${CONFIG.SHOP_NAME}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#06C755",
          paddingAll: "20px",
          contents: [
            {
              type: "text",
              text: CONFIG.SHOP_NAME,
              color: "#FFFFFF",
              weight: "bold",
              size: "lg"
            },
            {
              type: "text",
              text: "ใบเสร็จคำสั่งซื้อ / Order Receipt",
              color: "#E8F8EE",
              size: "xs",
              margin: "xs"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "20px",
          contents: [
            // ส่วนข้อมูลคำสั่งซื้อ
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "เลขที่ออเดอร์",
                  size: "xs",
                  color: "#888888"
                },
                {
                  type: "text",
                  text: orderData.order_id,
                  size: "xs",
                  color: "#111111",
                  weight: "bold",
                  align: "end"
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "เวลาที่สั่งซื้อ",
                  size: "xs",
                  color: "#888888"
                },
                {
                  type: "text",
                  text: orderData.timestamp || new Date().toLocaleString("th-TH"),
                  size: "xs",
                  color: "#555555",
                  align: "end"
                }
              ],
              margin: "sm"
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "ลูกค้า",
                  size: "xs",
                  color: "#888888"
                },
                {
                  type: "text",
                  text: orderData.customer_name || "-",
                  size: "xs",
                  color: "#555555",
                  align: "end"
                }
              ],
              margin: "sm"
            },
            {
              type: "separator",
              margin: "lg"
            },
            // รายการสินค้า
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              contents: itemRows
            },
            {
              type: "separator",
              margin: "lg"
            },
            // ยอดรวม
            {
              type: "box",
              layout: "horizontal",
              margin: "lg",
              contents: [
                {
                  type: "text",
                  text: "ยอดรวมทั้งสิ้น",
                  size: "md",
                  weight: "bold",
                  color: "#111111"
                },
                {
                  type: "text",
                  text: `฿${Number(orderData.total_amount).toLocaleString()}`,
                  size: "xl",
                  weight: "bold",
                  color: "#06C755",
                  align: "end"
                }
              ]
            },
            // ข้อมูลการจัดส่ง
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              backgroundColor: "#F8FAFC",
              paddingAll: "12px",
              cornerRadius: "8px",
              contents: [
                {
                  type: "text",
                  text: "📍 ข้อมูลจัดส่ง / ติดต่อ",
                  size: "xs",
                  weight: "bold",
                  color: "#334155"
                },
                {
                  type: "text",
                  text: `โทร: ${orderData.phone || "-"}`,
                  size: "xs",
                  color: "#64748B",
                  margin: "xs"
                },
                {
                  type: "text",
                  text: `ที่อยู่: ${orderData.address || "-"}`,
                  size: "xs",
                  color: "#64748B",
                  wrap: true,
                  margin: "xs"
                },
                orderData.note ? {
                  type: "text",
                  text: `หมายเหตุ: ${orderData.note}`,
                  size: "xs",
                  color: "#F59E0B",
                  wrap: true,
                  margin: "xs"
                } : { type: "box", layout: "vertical", contents: [] }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          paddingAll: "15px",
          contents: [
            {
              type: "text",
              text: "ขอบคุณที่ใช้บริการครับ 🙏",
              size: "sm",
              color: "#888888",
              align: "center"
            }
          ]
        }
      }
    };
  }
};
