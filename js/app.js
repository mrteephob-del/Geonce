/**
 * Main Application Logic
 * จัดการ State ของสินค้า, ตะกร้าสินค้า, การค้นหา, และการส่งออเดอร์
 */

const App = {
  products: [],
  cart: [],
  selectedCategory: "All",
  searchKeyword: "",
  isLoading: false,

  /**
   * เริ่มต้นแอปพลิเคชัน
   */
  async init() {
    this.bindEvents();
    this.updateCartBadge();

    // เริ่มต้น LIFF SDK
    await LiffHandler.init();

    // ดึงรายการสินค้า
    await this.loadProducts();
  },

  /**
   * ผูก Event Listeners กับปุ่มและ Modal ต่างๆ
   */
  bindEvents() {
    // ช่องค้นหาสินค้า
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchKeyword = e.target.value.trim().toLowerCase();
        this.renderProducts();
      });
    }

    // ปุ่มเปิดตะกร้า
    const openCartBtn = document.getElementById("openCartBtn");
    if (openCartBtn) {
      openCartBtn.addEventListener("click", () => this.openCartModal());
    }

    const floatingCartBar = document.getElementById("floatingCartBar");
    if (floatingCartBar) {
      floatingCartBar.addEventListener("click", () => this.openCartModal());
    }

    // ปุ่มปิด Modal ตะกร้า
    const closeCartBtn = document.getElementById("closeCartBtn");
    if (closeCartBtn) {
      closeCartBtn.addEventListener("click", () => this.closeCartModal());
    }

    // ปุ่มไปหน้า Checkout
    const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");
    if (proceedCheckoutBtn) {
      proceedCheckoutBtn.addEventListener("click", () => this.openCheckoutModal());
    }

    // ปุ่มปิด Modal Checkout
    const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
    if (closeCheckoutBtn) {
      closeCheckoutBtn.addEventListener("click", () => this.closeCheckoutModal());
    }

    // ฟอร์มสั่งซื้อ
    const checkoutForm = document.getElementById("checkoutForm");
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCheckoutSubmit();
      });
    }

    // ปุ่มปิด Modal สำเร็จ
    const closeSuccessBtn = document.getElementById("closeSuccessBtn");
    if (closeSuccessBtn) {
      closeSuccessBtn.addEventListener("click", () => this.closeSuccessModal());
    }
  },

  /**
   * ดึงรายการสินค้าจาก Google Apps Script Web App
   */
  async loadProducts() {
    const productGrid = document.getElementById("productGrid");
    if (productGrid) {
      productGrid.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>กำลังโหลดรายการสินค้า...</p>
        </div>
      `;
    }

    // ตรวจสอบว่าได้ตั้งค่า GAS URL หรือไม่
    const isGasConfigured = CONFIG.GAS_API_URL && CONFIG.GAS_API_URL !== "YOUR_GAS_WEB_APP_URL";

    if (!isGasConfigured) {
      console.warn("⚠️ ยังไม่ได้กำหนด GAS_API_URL: ใช้งานข้อมูลสินค้าตัวอย่าง (Mock Data)");
      this.products = CONFIG.MOCK_PRODUCTS;
      this.renderCategories();
      this.renderProducts();
      return;
    }

    try {
      const response = await fetch(`${CONFIG.GAS_API_URL}?action=getProducts`);
      const result = await response.json();

      if (result.status === "success" && Array.isArray(result.data)) {
        this.products = result.data;
        console.log("✅ โหลดสินค้าจาก Google Sheets สำเร็จ:", this.products);
      } else {
        throw new Error(result.message || "Failed to load products");
      }
    } catch (err) {
      console.error("❌ ไม่สามารถดึงสินค้าจาก API ได้:", err);
      showToast("ไม่สามารถโหลดสินค้าจาก Sheet ได้ กำลังใช้ข้อมูลสำรอง", "warning");
      this.products = CONFIG.MOCK_PRODUCTS;
    }

    this.renderCategories();
    this.renderProducts();
  },

  /**
   * เรนเดอร์ปุ่มตัวกรองหมวดหมู่สินค้า
   */
  renderCategories() {
    const categoryTabs = document.getElementById("categoryTabs");
    if (!categoryTabs) return;

    // หาหมวดหมู่ที่ไม่ซ้ำกัน
    const categories = ["All", ...new Set(this.products.map(p => p.category).filter(Boolean))];

    categoryTabs.innerHTML = categories.map(cat => `
      <button class="cat-pill ${this.selectedCategory === cat ? 'active' : ''}" data-category="${cat}">
        ${cat === "All" ? "ทั้งหมด" : cat}
      </button>
    `).join("");

    // ผูก Event Click แต่ละปุ่ม
    categoryTabs.querySelectorAll(".cat-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        categoryTabs.querySelectorAll(".cat-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedCategory = btn.getAttribute("data-category");
        this.renderProducts();
      });
    });
  },

  /**
   * เรนเดอร์การ์ดแสดงรายการสินค้า
   */
  renderProducts() {
    const productGrid = document.getElementById("productGrid");
    if (!productGrid) return;

    // กรองสินค้าตามหมวดหมู่และคำค้นหา
    const filtered = this.products.filter(item => {
      const matchCat = this.selectedCategory === "All" || item.category === this.selectedCategory;
      const matchSearch = !this.searchKeyword || 
        item.name.toLowerCase().includes(this.searchKeyword) ||
        (item.description && item.description.toLowerCase().includes(this.searchKeyword));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>ไม่พบสินค้าที่คุณค้นหา</h3>
          <p>ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่นดูนะครับ</p>
        </div>
      `;
      return;
    }

    productGrid.innerHTML = filtered.map(item => {
      const isOutOfStock = Number(item.stock) <= 0 || item.status === "OUT_OF_STOCK";
      const cartItem = this.cart.find(c => c.id === item.id);
      const currentQty = cartItem ? cartItem.quantity : 0;

      return `
        <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
          <div class="product-image-wrap">
            <img src="${item.image_url || 'https://placehold.co/400x300?text=No+Image'}" 
                 alt="${item.name}" 
                 class="product-image"
                 loading="lazy"
                 onerror="this.src='https://placehold.co/400x300?text=No+Image'">
            <span class="product-category-tag">${item.category || 'General'}</span>
            ${isOutOfStock ? '<div class="out-of-stock-badge">สินค้าหมด</div>' : ''}
          </div>
          <div class="product-body">
            <h3 class="product-title">${item.name}</h3>
            <p class="product-desc">${item.description || ''}</p>
            <div class="product-footer">
              <div class="product-price">
                <span class="currency">${CONFIG.CURRENCY_SYMBOL}</span>
                <span class="amount">${Number(item.price).toLocaleString()}</span>
              </div>
              <button class="add-to-cart-btn" 
                      data-id="${item.id}" 
                      ${isOutOfStock ? 'disabled' : ''}>
                ${currentQty > 0 ? `เพิ่มอีก (${currentQty})` : '+ เพิ่ม'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // ผูก Event ปุ่มเพิ่มลงตะกร้า
    productGrid.querySelectorAll(".add-to-cart-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        this.addToCart(id);
      });
    });
  },

  /**
   * เพิ่มสินค้าลงตะกร้า
   */
  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = this.cart.findIndex(c => c.id === productId);

    if (existingIndex > -1) {
      // ตรวจสอบสต็อก
      if (this.cart[existingIndex].quantity + 1 > product.stock) {
        showToast("ขออภัย สินค้าในสต็อกมีไม่เพียงพอ", "warning");
        return;
      }
      this.cart[existingIndex].quantity += 1;
    } else {
      if (product.stock < 1) {
        showToast("ขออภัย สินค้านี้หมดแล้ว", "warning");
        return;
      }
      this.cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
        quantity: 1,
        stock: product.stock
      });
    }

    showToast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, "success");
    this.updateCartBadge();
    this.renderProducts();
  },

  /**
   * เปลี่ยนแปลงจำนวนสินค้าในตะกร้า
   */
  updateQuantity(productId, delta) {
    const itemIndex = this.cart.findIndex(c => c.id === productId);
    if (itemIndex === -1) return;

    const item = this.cart[itemIndex];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      this.cart.splice(itemIndex, 1);
    } else {
      if (newQty > item.stock) {
        showToast("จำนวนเกินสินค้าในสต็อกที่มี", "warning");
        return;
      }
      item.quantity = newQty;
    }

    this.updateCartBadge();
    this.renderCartItems();
    this.renderProducts();
  },

  /**
   * ลบสินค้าออกจากตะกร้า
   */
  removeFromCart(productId) {
    this.cart = this.cart.filter(c => c.id !== productId);
    this.updateCartBadge();
    this.renderCartItems();
    this.renderProducts();
  },

  /**
   * คำนวณยอดรวมทั้งสิ้น
   */
  getCartTotals() {
    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { totalItems, totalAmount };
  },

  /**
   * อัปเดตแสดงจำนวนชิ้นและแถบตะกร้าลอยด้านล่าง
   */
  updateCartBadge() {
    const { totalItems, totalAmount } = this.getCartTotals();

    // อัปเดตปุ่มหัวเว็บ
    const headerBadge = document.getElementById("headerCartCount");
    if (headerBadge) {
      headerBadge.textContent = totalItems;
      headerBadge.style.display = totalItems > 0 ? "inline-flex" : "none";
    }

    // อัปเดต Sticky Floating Bar
    const floatingBar = document.getElementById("floatingCartBar");
    const floatingCount = document.getElementById("floatingCartCount");
    const floatingTotal = document.getElementById("floatingCartTotal");

    if (floatingBar) {
      if (totalItems > 0) {
        floatingBar.classList.add("visible");
        if (floatingCount) floatingCount.textContent = `${totalItems} รายการ`;
        if (floatingTotal) floatingTotal.textContent = `${CONFIG.CURRENCY_SYMBOL}${totalAmount.toLocaleString()}`;
      } else {
        floatingBar.classList.remove("visible");
      }
    }
  },

  /**
   * เปิด Modal ตะกร้าสินค้า
   */
  openCartModal() {
    this.renderCartItems();
    const modal = document.getElementById("cartModal");
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  /**
   * ปิด Modal ตะกร้าสินค้า
   */
  closeCartModal() {
    const modal = document.getElementById("cartModal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  /**
   * เรนเดอร์รายการสินค้าในตะกร้า
   */
  renderCartItems() {
    const cartItemsList = document.getElementById("cartItemsList");
    const cartTotalPrice = document.getElementById("cartTotalPrice");
    const proceedBtn = document.getElementById("proceedCheckoutBtn");
    const { totalItems, totalAmount } = this.getCartTotals();

    if (!cartItemsList) return;

    if (this.cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="empty-cart">
          <div class="empty-icon">🛒</div>
          <p>ยังไม่มีสินค้าในตะกร้า</p>
        </div>
      `;
      if (cartTotalPrice) cartTotalPrice.textContent = "฿0";
      if (proceedBtn) proceedBtn.disabled = true;
      return;
    }

    if (proceedBtn) proceedBtn.disabled = false;
    if (cartTotalPrice) cartTotalPrice.textContent = `฿${totalAmount.toLocaleString()}`;

    cartItemsList.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <img src="${item.image_url || 'https://placehold.co/100?text=Item'}" 
             alt="${item.name}" 
             class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">฿${item.price.toLocaleString()}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="App.updateQuantity('${item.id}', -1)">−</button>
          <span class="qty-number">${item.quantity}</span>
          <button class="qty-btn" onclick="App.updateQuantity('${item.id}', 1)">+</button>
          <button class="remove-btn" onclick="App.removeFromCart('${item.id}')" title="ลบ">🗑️</button>
        </div>
      </div>
    `).join("");
  },

  /**
   * เปิด Modal กรอกข้อมูลจัดส่งและยืนยันออเดอร์
   */
  openCheckoutModal() {
    if (this.cart.length === 0) {
      showToast("กรุณาเลือกสินค้าก่อนทำการสั่งซื้อ", "warning");
      return;
    }

    this.closeCartModal();

    const checkoutModal = document.getElementById("checkoutModal");
    const checkoutSummary = document.getElementById("checkoutSummary");
    const customerNameInput = document.getElementById("customerNameInput");

    // เติมชื่อลูกค้าอัตโนมัติจาก LINE Profile
    if (customerNameInput && LiffHandler.profile) {
      customerNameInput.value = LiffHandler.profile.displayName || "";
    }

    const { totalItems, totalAmount } = this.getCartTotals();
    if (checkoutSummary) {
      checkoutSummary.innerHTML = `
        <div class="summary-row">
          <span>จำนวนสินค้า:</span>
          <span>${totalItems} รายการ</span>
        </div>
        <div class="summary-row total">
          <span>ยอดชำระทั้งสิ้น:</span>
          <span>฿${totalAmount.toLocaleString()}</span>
        </div>
      `;
    }

    if (checkoutModal) {
      checkoutModal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  /**
   * ปิด Modal Checkout
   */
  closeCheckoutModal() {
    const checkoutModal = document.getElementById("checkoutModal");
    if (checkoutModal) {
      checkoutModal.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  /**
   * จัดการส่งออเดอร์ไปยัง Google Apps Script Web App
   */
  async handleCheckoutSubmit() {
    if (this.isLoading) return;

    const customerName = document.getElementById("customerNameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();
    const address = document.getElementById("addressInput").value.trim();
    const note = document.getElementById("noteInput").value.trim();

    if (!phone) {
      showToast("กรุณากรอกเบอร์โทรศัพท์", "warning");
      return;
    }

    const { totalAmount } = this.getCartTotals();
    const lineUserId = LiffHandler.profile ? LiffHandler.profile.userId : "";

    const orderPayload = {
      line_user_id: lineUserId,
      customer_name: customerName || "Guest",
      phone: phone,
      address: address,
      note: note,
      items: this.cart,
      total_amount: totalAmount
    };

    const submitBtn = document.getElementById("submitOrderBtn");
    this.isLoading = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-small"></span> กำลังบันทึกออเดอร์...`;
    }

    try {
      let orderResult;
      const isGasConfigured = CONFIG.GAS_API_URL && CONFIG.GAS_API_URL !== "YOUR_GAS_WEB_APP_URL";

      if (isGasConfigured) {
        // ใช้ text/plain ในการยิง request เพื่อข้าม CORS Preflight (OPTIONS) ของ Google Apps Script
        const response = await fetch(CONFIG.GAS_API_URL, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(orderPayload)
        });

        orderResult = await response.json();

        if (orderResult.status !== "success") {
          throw new Error(orderResult.message || "เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ");
        }
      } else {
        // โหมดจำลอง (Mock Order) เมื่อยังไม่ได้ผูก Web App URL จริง
        await new Promise(r => setTimeout(r, 1200));
        orderResult = {
          status: "success",
          order_id: "ORD-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000),
          timestamp: new Date().toLocaleString("th-TH"),
          total_amount: totalAmount
        };
      }

      // เตรียมข้อมูลสรุปออเดอร์สำหรับ Flex Message
      const confirmedOrderData = {
        order_id: orderResult.order_id,
        timestamp: orderResult.timestamp || new Date().toLocaleString("th-TH"),
        customer_name: customerName,
        phone: phone,
        address: address,
        note: note,
        items: [...this.cart],
        total_amount: totalAmount
      };

      // ส่งข้อความ Flex Message เข้าห้องแชท LINE ผ่าน LIFF SDK
      await LiffHandler.sendOrderReceipt(confirmedOrderData);

      // ล้างตะกร้าสินค้า
      this.cart = [];
      this.updateCartBadge();
      this.closeCheckoutModal();

      // เปิดหน้าจอสำเร็จ
      this.openSuccessModal(confirmedOrderData);

    } catch (err) {
      console.error("❌ Checkout Error:", err);
      showToast("เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      this.isLoading = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `ยืนยันการสั่งซื้อ`;
      }
    }
  },

  /**
   * แสดงหน้าต่างสำเร็จ
   */
  openSuccessModal(orderData) {
    const successModal = document.getElementById("successModal");
    const orderIdDisplay = document.getElementById("successOrderId");
    const totalDisplay = document.getElementById("successTotal");

    if (orderIdDisplay) orderIdDisplay.textContent = orderData.order_id;
    if (totalDisplay) totalDisplay.textContent = `฿${orderData.total_amount.toLocaleString()}`;

    if (successModal) {
      successModal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  /**
   * ปิดหน้าต่างสำเร็จ
   */
  closeSuccessModal() {
    const successModal = document.getElementById("successModal");
    if (successModal) {
      successModal.classList.remove("active");
      document.body.style.overflow = "";
    }
    // หากเปิดใน LINE App ให้สามารถปิดหน้าต่าง LIFF ได้
    if (LiffHandler.isInitialized && liff.isInClient()) {
      liff.closeWindow();
    }
  }
};

/**
 * Toast Notification Utility
 */
function showToast(message, type = "info") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// เริ่มต้นแอปเมื่อโหลด DOM เสร็จสมบูรณ์
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
