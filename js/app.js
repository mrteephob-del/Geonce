/**
 * Main Application Logic - GEONCE Official Store
 * จัดการ State สินค้า, ระบบเลือกไซส์ (Size), ตะกร้าสินค้า, และชำระเงินผ่าน PromptPay QR
 */

const App = {
  products: [],
  cart: [],
  selectedCategory: "All",
  searchKeyword: "",
  isLoading: false,
  
  // เก็บสินค้าชั่วคราวขณะเปิด Size Modal
  currentSelectingProduct: null,
  selectedSize: "M",
  
  // เก็บข้อมูลฟอร์มจัดส่งชั่วคราวระหว่างไปหน้าชำระเงิน
  pendingCheckoutData: null,

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

    // ปุ่มไปหน้ากรอกข้อมูลจัดส่ง (Checkout)
    const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");
    if (proceedCheckoutBtn) {
      proceedCheckoutBtn.addEventListener("click", () => this.openCheckoutModal());
    }

    // ปุ่มปิด Modal Checkout
    const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
    if (closeCheckoutBtn) {
      closeCheckoutBtn.addEventListener("click", () => this.closeCheckoutModal());
    }

    // ฟอร์มส่งข้อมูลจัดส่ง -> ไปยังหน้าชำระเงิน PromptPay QR
    const checkoutForm = document.getElementById("checkoutForm");
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.proceedToPaymentModal();
      });
    }

    // ปุ่มปิด Modal ชำระเงิน PromptPay
    const closePaymentBtn = document.getElementById("closePaymentBtn");
    if (closePaymentBtn) {
      closePaymentBtn.addEventListener("click", () => this.closePaymentModal());
    }

    // ปุ่มคัดลอกเลข PromptPay
    const copyPpBtn = document.getElementById("copyPpBtn");
    if (copyPpBtn) {
      copyPpBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(CONFIG.PROMPTPAY_NUMBER).then(() => {
          copyPpBtn.textContent = "✓ คัดลอกแล้ว";
          copyPpBtn.classList.add("copied");
          setTimeout(() => {
            copyPpBtn.textContent = "📋 คัดลอก";
            copyPpBtn.classList.remove("copied");
          }, 2000);
          showToast("คัดลอกเลขพร้อมเพย์เรียบร้อยแล้ว", "success");
        }).catch(() => {
          showToast(`เลขพร้อมเพย์: ${CONFIG.PROMPTPAY_NUMBER}`, "info");
        });
      });
    }

    // ปุ่มย้อนกลับไปแก้ไขข้อมูลจัดส่ง
    const backToDeliveryBtn = document.getElementById("backToDeliveryBtn");
    if (backToDeliveryBtn) {
      backToDeliveryBtn.addEventListener("click", () => {
        this.closePaymentModal();
        this.openCheckoutModal();
      });
    }

    // ปุ่มยืนยันการโอนเงิน (บันทึกออเดอร์และส่ง Flex Message)
    const confirmPaidBtn = document.getElementById("confirmPaidBtn");
    if (confirmPaidBtn) {
      confirmPaidBtn.addEventListener("click", () => this.handleOrderSubmission());
    }

    // ปุ่มปิด Modal สำเร็จ
    const closeSuccessBtn = document.getElementById("closeSuccessBtn");
    if (closeSuccessBtn) {
      closeSuccessBtn.addEventListener("click", () => this.closeSuccessModal());
    }

    // ปิด Size Modal
    const closeSizeBtn = document.getElementById("closeSizeBtn");
    if (closeSizeBtn) {
      closeSizeBtn.addEventListener("click", () => this.closeSizeModal());
    }

    // เลือกไซส์ใน Size Modal
    const sizePillGroup = document.getElementById("sizePillGroup");
    if (sizePillGroup) {
      sizePillGroup.querySelectorAll(".size-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          sizePillGroup.querySelectorAll(".size-pill").forEach(p => p.classList.remove("active"));
          pill.classList.add("active");
          this.selectedSize = pill.getAttribute("data-size");
        });
      });
    }

    // ปุ่มยืนยันเพิ่มลงตะกร้าจาก Size Modal
    const confirmAddToCartBtn = document.getElementById("confirmAddToCartBtn");
    if (confirmAddToCartBtn) {
      confirmAddToCartBtn.addEventListener("click", () => {
        if (this.currentSelectingProduct) {
          this.executeAddToCart(this.currentSelectingProduct, this.selectedSize);
          this.closeSizeModal();
        }
      });
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
          <p>กำลังโหลดคอลเลกชันสินค้า...</p>
        </div>
      `;
    }

    const isGasConfigured = CONFIG.GAS_API_URL && CONFIG.GAS_API_URL !== "YOUR_GAS_WEB_APP_URL";

    if (!isGasConfigured) {
      console.warn("⚠️ ยังไม่ได้กำหนด GAS_API_URL: ไม่มีสินค้าจาก API");
      this.products = [];
      this.renderCategories();
      this.renderProducts();
      return;
    }

    try {
      // เพิ่ม timestamp ป้องกัน Browser Cache ข้อมูลสินค้าเก่า
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`${CONFIG.GAS_API_URL}?action=getProducts${cacheBuster}`);
      const result = await response.json();

      if (result.status === "success" && Array.isArray(result.data) && result.data.length > 0) {
        this.products = result.data;
        console.log("✅ โหลดสินค้าเสื้อผ้า GEONCE สำเร็จ:", this.products);
      } else {
        console.log("ℹ️ ไม่พบสินค้าในชีท: แสดงสินค้าจำลอง GEONCE");
        this.products = (CONFIG.MOCK_PRODUCTS && CONFIG.MOCK_PRODUCTS.length > 0) ? CONFIG.MOCK_PRODUCTS : [];
      }
    } catch (err) {
      console.error("❌ ไม่สามารถดึงสินค้าจาก API ได้ (ติดสิทธิ์การเข้าถึงใน Apps Script):", err);
      this.products = (CONFIG.MOCK_PRODUCTS && CONFIG.MOCK_PRODUCTS.length > 0) ? CONFIG.MOCK_PRODUCTS : [];
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

    // หาหมวดหมู่ที่ไม่ซ้ำกันจากฐานข้อมูล
    const availableCategories = [...new Set(this.products.map(p => p.category).filter(Boolean))];
    const categories = availableCategories.length > 0 
      ? ["All", ...availableCategories] 
      : ["All", "T-Shirts", "Hoodies", "Pants", "Accessories"];

    categoryTabs.innerHTML = categories.map(cat => `
      <button class="cat-pill ${this.selectedCategory === cat ? 'active' : ''}" data-category="${cat}">
        ${cat === "All" ? "ทั้งหมด" : cat}
      </button>
    `).join("");

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
          <div class="empty-icon">👕</div>
          <h3>ยังไม่พบสินค้าในระบบ</h3>
          <p>กรุณาเพิ่มรายการสินค้าลงในแผ่นงาน Products บน Google Sheets นะครับ</p>
        </div>
      `;
      return;
    }

    productGrid.innerHTML = filtered.map(item => {
      const isOutOfStock = Number(item.stock) <= 0 || item.status === "OUT_OF_STOCK";

      return `
        <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}">
          <div class="product-image-wrap">
            <img src="${item.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'}" 
                 alt="${item.name}" 
                 class="product-image"
                 loading="lazy"
                 onerror="this.src='https://placehold.co/400x400?text=GEONCE'">
            <span class="product-category-tag">${item.category || 'Apparel'}</span>
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
                + เลือกไซส์
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    productGrid.querySelectorAll(".add-to-cart-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        this.openSizeModal(id);
      });
    });
  },

  /**
   * เปิด Modal สำหรับเลือกขนาดเสื้อผ้า (Size S, M, L, XL)
   */
  openSizeModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.currentSelectingProduct = product;
    this.selectedSize = "M"; // default

    const modal = document.getElementById("sizeModal");
    const thumb = document.getElementById("sizeModalImg");
    const nameEl = document.getElementById("sizeModalName");
    const priceEl = document.getElementById("sizeModalPrice");
    const sizePills = document.getElementById("sizePillGroup");

    if (thumb) thumb.src = product.image_url || "https://placehold.co/100?text=GEONCE";
    if (nameEl) nameEl.textContent = product.name;
    if (priceEl) priceEl.textContent = `฿${Number(product.price).toLocaleString()}`;

    if (sizePills) {
      sizePills.querySelectorAll(".size-pill").forEach(p => {
        p.classList.toggle("active", p.getAttribute("data-size") === "M");
      });
    }

    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  /**
   * ปิด Modal เลือกไซส์
   */
  closeSizeModal() {
    const modal = document.getElementById("sizeModal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  /**
   * เพิ่มสินค้าพร้อมขนาดลงตะกร้า
   */
  executeAddToCart(product, size) {
    const cartItemId = `${product.id}_${size}`;
    const existingIndex = this.cart.findIndex(c => c.cartItemId === cartItemId);

    if (existingIndex > -1) {
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
        cartItemId: cartItemId,
        id: product.id,
        name: product.name,
        size: size,
        price: Number(product.price),
        image_url: product.image_url,
        quantity: 1,
        stock: product.stock
      });
    }

    showToast(`เพิ่ม "${product.name} [Size ${size}]" ลงตะกร้าแล้ว`, "success");
    this.updateCartBadge();
  },

  /**
   * เปลี่ยนแปลงจำนวนสินค้าในตะกร้า
   */
  updateQuantity(cartItemId, delta) {
    const itemIndex = this.cart.findIndex(c => c.cartItemId === cartItemId);
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
  },

  /**
   * ลบสินค้าออกจากตะกร้า
   */
  removeFromCart(cartItemId) {
    this.cart = this.cart.filter(c => c.cartItemId !== cartItemId);
    this.updateCartBadge();
    this.renderCartItems();
  },

  /**
   * คำนวณยอดรวมสุทธิ
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

    const headerBadge = document.getElementById("headerCartCount");
    if (headerBadge) {
      headerBadge.textContent = totalItems;
      headerBadge.style.display = totalItems > 0 ? "inline-flex" : "none";
    }

    const floatingBar = document.getElementById("floatingCartBar");
    const floatingCount = document.getElementById("floatingCartCount");
    const floatingTotal = document.getElementById("floatingCartTotal");

    if (floatingBar) {
      if (totalItems > 0) {
        floatingBar.classList.add("visible");
        if (floatingCount) floatingCount.textContent = `${totalItems} ชิ้น`;
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
          <div class="empty-icon">🛍️</div>
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
        <img src="${item.image_url || 'https://placehold.co/100?text=GEONCE'}" 
             alt="${item.name}" 
             class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <span class="cart-item-size">Size: ${item.size}</span>
          <div class="cart-item-price">฿${(item.price * item.quantity).toLocaleString()}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="App.updateQuantity('${item.cartItemId}', -1)">−</button>
          <span class="qty-number">${item.quantity}</span>
          <button class="qty-btn" onclick="App.updateQuantity('${item.cartItemId}', 1)">+</button>
          <button class="remove-btn" onclick="App.removeFromCart('${item.cartItemId}')" title="ลบ">🗑️</button>
        </div>
      </div>
    `).join("");
  },

  /**
   * เปิด Modal กรอกข้อมูลจัดส่ง
   */
  openCheckoutModal() {
    if (this.cart.length === 0) {
      showToast("กรุณาเลือกสินค้าก่อนดำเนินการ", "warning");
      return;
    }

    this.closeCartModal();

    const checkoutModal = document.getElementById("checkoutModal");
    const checkoutSummary = document.getElementById("checkoutSummary");
    const customerNameInput = document.getElementById("customerNameInput");

    // ดึงชื่อลูกค้าอัตโนมัติจาก LINE Profile
    if (customerNameInput && LiffHandler.profile) {
      customerNameInput.value = LiffHandler.profile.displayName || "";
    }

    const { totalItems, totalAmount } = this.getCartTotals();
    if (checkoutSummary) {
      checkoutSummary.innerHTML = `
        <div class="summary-details">
          <div class="summary-row">
            <span class="summary-label">จำนวนสินค้าที่สั่งซื้อ</span>
            <span class="summary-value">${totalItems} ชิ้น</span>
          </div>
          <div class="summary-row total-row">
            <span class="summary-label">ยอดชำระสุทธิ</span>
            <span class="summary-value total-price">฿${totalAmount.toLocaleString()}</span>
          </div>
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
   * ดำเนินการไปยังหน้าชำระเงิน PromptPay QR (Step 2)
   */
  proceedToPaymentModal() {
    const customerName = document.getElementById("customerNameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();
    const address = document.getElementById("addressInput").value.trim();
    const note = document.getElementById("noteInput").value.trim();

    if (!phone || !address) {
      showToast("กรุณากรอกเบอร์โทรและที่อยู่จัดส่งให้ครบถ้วน", "warning");
      return;
    }

    const { totalAmount } = this.getCartTotals();

    // บันทึกข้อมูลฟอร์มไว้ชั่วคราว
    this.pendingCheckoutData = {
      customerName,
      phone,
      address,
      note,
      totalAmount
    };

    this.closeCheckoutModal();

    // เตรียมหน้าต่าง PromptPay QR Modal
    const paymentModal = document.getElementById("paymentModal");
    const promptpayAmount = document.getElementById("promptpayAmount");
    const promptpayQrImg = document.getElementById("promptpayQrImg");
    const promptpayNumberText = document.getElementById("promptpayNumberText");
    const promptpayNameText = document.getElementById("promptpayNameText");

    if (promptpayAmount) promptpayAmount.textContent = `฿${totalAmount.toLocaleString()}`;
    if (promptpayNumberText) promptpayNumberText.textContent = CONFIG.PROMPTPAY_NUMBER;
    if (promptpayNameText) promptpayNameText.textContent = CONFIG.PROMPTPAY_NAME;

    // สร้าง QR Code ผ่าน PromptPay API service ตามยอดสั่งซื้อจริง
    if (promptpayQrImg) {
      promptpayQrImg.src = `https://promptpay.io/${CONFIG.PROMPTPAY_NUMBER}/${totalAmount}.png`;
    }

    if (paymentModal) {
      paymentModal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  /**
   * ปิด Modal ชำระเงิน PromptPay
   */
  closePaymentModal() {
    const paymentModal = document.getElementById("paymentModal");
    if (paymentModal) {
      paymentModal.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  /**
   * ยืนยันการชำระเงินและส่งคำสั่งซื้อไปยัง Google Apps Script Web App
   */
  async handleOrderSubmission() {
    if (this.isLoading || !this.pendingCheckoutData) return;

    const { customerName, phone, address, note, totalAmount } = this.pendingCheckoutData;
    const lineUserId = LiffHandler.profile ? LiffHandler.profile.userId : "";

    const orderPayload = {
      line_user_id: lineUserId,
      customer_name: customerName || "Guest",
      phone: phone,
      address: address,
      note: note,
      items: this.cart,
      total_amount: totalAmount,
      payment_method: "PromptPay QR",
      payment_status: "WAITING_PAYMENT"
    };

    const confirmPaidBtn = document.getElementById("confirmPaidBtn");
    this.isLoading = true;
    if (confirmPaidBtn) {
      confirmPaidBtn.disabled = true;
      confirmPaidBtn.innerHTML = `<span class="spinner-small"></span> กำลังบันทึกคำสั่งซื้อ...`;
    }

    try {
      let orderResult;
      const isGasConfigured = CONFIG.GAS_API_URL && CONFIG.GAS_API_URL !== "YOUR_GAS_WEB_APP_URL";

      if (isGasConfigured) {
        // ใช้ text/plain ส่ง POST เพื่อข้าม CORS Preflight (OPTIONS) ของ Apps Script
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
          throw new Error(orderResult.message || "เกิดข้อผิดพลาดในการบันทึกออเดอร์");
        }
      } else {
        // Mock fallback กรณีทดสอบเครื่อง local
        await new Promise(r => setTimeout(r, 1200));
        orderResult = {
          status: "success",
          order_id: "ORD-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000),
          timestamp: new Date().toLocaleString("th-TH"),
          total_amount: totalAmount
        };
      }

      // ข้อมูลสำหรับส่ง Flex Message ใบเสร็จเข้าแชท LINE
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

      // ส่ง Flex Message ใบเสร็จเข้าแชท LINE
      await LiffHandler.sendOrderReceipt(confirmedOrderData);

      // ล้างตะกร้าและปิด Payment Modal
      this.cart = [];
      this.updateCartBadge();
      this.closePaymentModal();
      this.pendingCheckoutData = null;

      // เปิดหน้าจอสำเร็จ
      this.openSuccessModal(confirmedOrderData);

    } catch (err) {
      console.error("❌ Order Submission Error:", err);
      showToast("เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      this.isLoading = false;
      if (confirmPaidBtn) {
        confirmPaidBtn.disabled = false;
        confirmPaidBtn.innerHTML = `ฉันโอนเงินเรียบร้อยแล้ว (ยืนยันคำสั่งซื้อ)`;
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
