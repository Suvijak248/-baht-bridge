/**
 * BahtBridge — Order & Customer Management Logic
 */

// Screen Navigation & Bottom Bar State
function show(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
  }

  // Update bottom nav highlighting
  document.querySelectorAll('.bottom .nav').forEach((nav) => {
    nav.classList.remove('on');
    const label = nav.textContent.trim().toLowerCase();
    if (
      (id === 'dashboard' && label.includes('dashboard')) ||
      (id === 'orders' && label.includes('orders')) ||
      (id === 'profile' && label.includes('profile'))
    ) {
      nav.classList.add('on');
    }
  });

  // Re-render dashboard or orders list if navigated to
  if (id === 'dashboard') renderDashboard();
  if (id === 'orders') renderOrdersList();
}

const exchangeRates = { USD: 33, JPY: 0.22, KRW: 0.025, CNY: 4.55, EUR: 36.2 };
const countryInfo = {
  USD: ['🇺🇸', 'สหรัฐอเมริกา'],
  JPY: ['🇯🇵', 'ญี่ปุ่น'],
  KRW: ['🇰🇷', 'เกาหลีใต้'],
  CNY: ['🇨🇳', 'จีน'],
  EUR: ['🇪🇺', 'ยุโรป'],
};
const productIcons = ['👟', '🧸', '👕', '🎧', '⌚', '🎒', '🕶️', '💻'];

// LocalStorage Storage Keys
const ORDERS_STORAGE_KEY = 'bahtbridge_orders_data';

// Default initial orders if none exist in localStorage
const defaultOrders = [
  {
    id: '#BR001',
    customerName: 'คุณปิยะ วัฒนะ',
    customerPhone: '081-234-5678',
    customerAddress: 'LINE: @piya',
    date: '24 ก.ย. 2569',
    status: 'กำลังดำเนินการ',
    items: [
      { name: 'Shoes', currency: 'USD', amount: 50, quantity: 1 },
      { name: 'Figure', currency: 'JPY', amount: 5000, quantity: 1 },
      { name: 'Shirt', currency: 'KRW', amount: 30000, quantity: 1 },
    ],
    shipping: 150,
    fee: 100,
  },
  {
    id: '#BR002',
    customerName: 'คุณนิดา เกียรติสกุล',
    customerPhone: '089-876-5432',
    customerAddress: 'IG: @nida_shop',
    date: '23 ก.ย. 2569',
    status: 'ยืนยันแล้ว',
    items: [
      { name: 'Headphone', currency: 'USD', amount: 60, quantity: 1 },
    ],
    shipping: 110,
    fee: 100,
  },
];

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(defaultOrders));
      return defaultOrders;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading localStorage', e);
    return defaultOrders;
  }
}

function saveOrdersToStorage(orders) {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
}

// Current Draft in Create Form
let draftProducts = [
  { name: 'Shoes', currency: 'USD', amount: 50, quantity: 1 },
  { name: 'Figure', currency: 'JPY', amount: 5000, quantity: 1 },
];

let activeViewingOrder = null;

const money = (amount) => `฿ ${Math.round(amount).toLocaleString('th-TH')}`;
const productTotal = (p) => p.amount * p.quantity * (exchangeRates[p.currency] || 1);
const calcTotalGoods = (items) => items.reduce((sum, item) => sum + productTotal(item), 0);

// Render Draft Products in Create Screen
function renderCreateProducts() {
  const container = document.getElementById('mini-products-list');
  if (!container) return;
  container.innerHTML = '';

  draftProducts.forEach((product, index) => {
    const [flag] = countryInfo[product.currency] || ['🌐', ''];
    const card = document.createElement('div');
    card.className = 'mini-product';
    card.innerHTML = `
      <div class="row">
        <span class="product-title">${flag} ${product.name}</span>
        <div>
          <b>${product.amount.toLocaleString()} ${product.currency} × ${product.quantity}</b>
          <button class="del-btn" onclick="deleteDraftProduct(${index})" title="ลบสินค้านี้">🗑️</button>
        </div>
      </div>
      <div class="convert">
        อัตราแลกเปลี่ยน ${exchangeRates[product.currency]} <b>→ ${money(productTotal(product))}</b>
      </div>
    `;
    container.appendChild(card);
  });

  const goods = calcTotalGoods(draftProducts);
  const goodsEl = document.getElementById('summary-goods');
  const totalEl = document.getElementById('summary-total');
  if (goodsEl) goodsEl.textContent = money(goods);
  if (totalEl) totalEl.textContent = money(goods > 0 ? goods + 250 : 0);
}

function deleteDraftProduct(index) {
  draftProducts.splice(index, 1);
  renderCreateProducts();
}

// Setup Form for adding products & selects
function setupOrderForm() {
  const create = document.getElementById('create');
  if (!create) return;

  const fieldDisplays = create.querySelectorAll('.field .input:not(input)');
  if (fieldDisplays.length >= 2) {
    fieldDisplays[0].outerHTML = '<select class="input" id="country-select"><option value="USD">🇺🇸 สหรัฐอเมริกา</option><option value="JPY">🇯🇵 ญี่ปุ่น</option><option value="KRW">🇰🇷 เกาหลีใต้</option><option value="CNY">🇨🇳 จีน</option><option value="EUR">🇪🇺 ยุโรป</option></select>';
    fieldDisplays[1].outerHTML = '<select class="input" id="currency-select"><option value="USD">USD</option><option value="JPY">JPY</option><option value="KRW">KRW</option><option value="CNY">CNY</option><option value="EUR">EUR</option></select>';
  }

  const countrySel = document.getElementById('country-select');
  const currencySel = document.getElementById('currency-select');
  if (countrySel && currencySel) {
    countrySel.addEventListener('change', () => { currencySel.value = countrySel.value; });
    currencySel.addEventListener('change', () => { countrySel.value = currencySel.value; });
  }

  const addBtn = document.getElementById('btn-add-product');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('product-name');
      const priceInput = document.getElementById('product-price');
      const qtyInput = document.getElementById('product-qty');
      const currency = currencySel ? currencySel.value : 'USD';

      const name = nameInput.value.trim();
      const amount = Number(priceInput.value);
      const quantity = Number(qtyInput.value);

      if (!name) {
        alert('กรุณากรอกชื่อสินค้า');
        nameInput.focus();
        return;
      }
      if (!amount || amount <= 0) {
        alert('กรุณากรอกราคาสินค้าที่ถูกต้อง');
        priceInput.focus();
        return;
      }
      if (!quantity || quantity <= 0) {
        alert('กรุณากรอกจำนวนอย่างน้อย 1');
        qtyInput.focus();
        return;
      }

      draftProducts.push({ name, currency, amount, quantity });
      nameInput.value = '';
      priceInput.value = '';
      qtyInput.value = '1';
      renderCreateProducts();
    });
  }
}

// Calculate & Prepare Order Detail from Form Inputs
function calculateOrder() {
  const custName = (document.getElementById('cust-name')?.value || '').trim();
  const custPhone = (document.getElementById('cust-phone')?.value || '').trim();
  const custAddress = (document.getElementById('cust-address')?.value || '').trim();

  if (!custName) {
    alert('กรุณากรอกชื่อลูกค้าก่อนคำนวณราคา');
    document.getElementById('cust-name')?.focus();
    return;
  }

  if (draftProducts.length === 0) {
    alert('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
    return;
  }

  const goods = calcTotalGoods(draftProducts);
  const total = goods + 250;

  activeViewingOrder = {
    id: 'DRAFT',
    customerName: custName,
    customerPhone: custPhone || '-',
    customerAddress: custAddress || '-',
    date: 'วันนี้',
    status: 'กำลังดำเนินการ',
    items: [...draftProducts],
    shipping: 150,
    fee: 100,
    total: total,
    isDraft: true,
  };

  show('loading');
  setTimeout(() => {
    populateDetailScreen(activeViewingOrder);
    populateCustomerScreen(activeViewingOrder);
    show('detail');
  }, 1000);
}

// Populate Detail Screen
function populateDetailScreen(order) {
  const title = document.getElementById('detail-order-title');
  if (title) title.textContent = order.isDraft ? 'สรุปคำนวณออเดอร์ใหม่' : `รายละเอียดออเดอร์ ${order.id}`;

  const nameEl = document.getElementById('detail-customer-name');
  if (nameEl) nameEl.textContent = order.customerName;

  const contactEl = document.getElementById('detail-customer-contact');
  if (contactEl) {
    contactEl.textContent = `📞 ${order.customerPhone} · ${order.customerAddress}`;
  }

  const metaEl = document.getElementById('detail-order-meta');
  if (metaEl) {
    metaEl.innerHTML = `${order.date} · <span style="color:${order.status === 'ยืนยันแล้ว' ? '#16a36a' : '#ffb020'}">● ${order.status}</span>`;
  }

  const listEl = document.getElementById('detail-items-list');
  if (listEl) {
    listEl.innerHTML = '';
    order.items.forEach((p) => {
      const [flag] = countryInfo[p.currency] || ['🌐'];
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="flag">${flag}</div>
        <div class="item-info">
          <strong>${p.name}</strong>
          <small>${p.amount.toLocaleString()} ${p.currency} × ${p.quantity} · Rate ${exchangeRates[p.currency]}</small>
        </div>
        <div class="price">→ ${money(productTotal(p))}<small>แปลงแล้ว</small></div>
      `;
      listEl.appendChild(item);
    });
  }

  const goods = calcTotalGoods(order.items);
  const goodsEl = document.getElementById('detail-summary-goods');
  const totalEl = document.getElementById('detail-summary-total');
  if (goodsEl) goodsEl.textContent = money(goods);
  if (totalEl) totalEl.textContent = money(goods + order.shipping + order.fee);

  const confirmBtn = document.getElementById('btn-confirm-order');
  if (confirmBtn) {
    confirmBtn.textContent = order.isDraft ? 'บันทึก & ยืนยันออเดอร์' : 'อัปเดตสถานะเป็นยืนยันแล้ว';
  }
}

// Populate Customer View Screen
function populateCustomerScreen(order) {
  const goods = calcTotalGoods(order.items);
  const total = goods + order.shipping + order.fee;

  document.getElementById('cust-view-order-id').textContent = order.isDraft ? 'ออเดอร์ใหม่ของคุณ' : `Order ${order.id}`;
  document.getElementById('cust-view-name').textContent = order.customerName;
  document.getElementById('cust-view-contact').textContent = `📞 ${order.customerPhone}`;
  document.getElementById('cust-view-due').textContent = `${Math.round(total).toLocaleString('th-TH')} ฿`;
  document.getElementById('cust-view-count').textContent = `${order.items.length} รายการ`;

  const listEl = document.getElementById('customer-items-list');
  if (listEl) {
    listEl.innerHTML = '';
    order.items.forEach((p, idx) => {
      const [flag, country] = countryInfo[p.currency] || ['🌐', 'ต่างประเทศ'];
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="photo">${productIcons[idx % productIcons.length]}</div>
        <div class="item-info">
          <strong>${p.name}</strong>
          <small>${flag} ${country} · ${p.amount.toLocaleString()} ${p.currency} (×${p.quantity})</small>
        </div>
        <div class="price">${money(productTotal(p))}</div>
      `;
      listEl.appendChild(item);
    });
  }

  document.getElementById('cust-summary-goods').textContent = money(goods);
  document.getElementById('cust-summary-total').textContent = money(total);
}

// Confirm Order and Persist to LocalStorage
function confirmCurrentOrder() {
  if (!activeViewingOrder) return;

  const orders = getStoredOrders();

  if (activeViewingOrder.isDraft) {
    // Generate new Order ID (e.g., #BR003)
    const nextNumber = String(orders.length + 1).padStart(3, '0');
    const newOrder = {
      ...activeViewingOrder,
      id: `#BR${nextNumber}`,
      date: 'วันนี้',
      status: 'กำลังดำเนินการ',
      isDraft: false,
    };
    orders.unshift(newOrder);
    saveOrdersToStorage(orders);
    activeViewingOrder = newOrder;

    // Set success screen info
    document.getElementById('success-order-id').textContent = newOrder.id;
    document.getElementById('success-customer-name').textContent = newOrder.customerName;
    document.getElementById('success-customer-phone').textContent = newOrder.customerPhone;
    document.getElementById('success-order-total').textContent = money(calcTotalGoods(newOrder.items) + 250);

    // Reset create draft
    draftProducts = [];
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-address').value = '';
    renderCreateProducts();
  } else {
    // Mark existing order as confirmed
    activeViewingOrder.status = 'ยืนยันแล้ว';
    const idx = orders.findIndex((o) => o.id === activeViewingOrder.id);
    if (idx !== -1) {
      orders[idx] = activeViewingOrder;
      saveOrdersToStorage(orders);
    }
  }

  renderDashboard();
  renderOrdersList();
  show('success');
}

// View an Order from History
function viewOrderDetail(orderId) {
  const orders = getStoredOrders();
  const found = orders.find((o) => o.id === orderId);
  if (!found) return;

  activeViewingOrder = { ...found, isDraft: false };
  populateDetailScreen(activeViewingOrder);
  populateCustomerScreen(activeViewingOrder);
  show('detail');
}

// Render Dashboard Data dynamically from LocalStorage
function renderDashboard() {
  const orders = getStoredOrders();
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'กำลังดำเนินการ').length;
  const totalSales = orders.reduce((sum, o) => sum + calcTotalGoods(o.items) + (o.shipping || 150) + (o.fee || 100), 0);

  const totalEl = document.getElementById('stat-total-orders');
  const pendingEl = document.getElementById('stat-pending-orders');
  const salesEl = document.getElementById('stat-total-sales');

  if (totalEl) totalEl.textContent = totalCount;
  if (pendingEl) pendingEl.textContent = pendingCount;
  if (salesEl) salesEl.textContent = money(totalSales);

  const listEl = document.getElementById('dashboard-recent-orders');
  if (!listEl) return;
  listEl.innerHTML = '';

  const recents = orders.slice(0, 3);
  recents.forEach((order) => {
    const total = calcTotalGoods(order.items) + (order.shipping || 150) + (order.fee || 100);
    const card = document.createElement('div');
    card.className = 'order';
    card.onclick = () => viewOrderDetail(order.id);
    card.innerHTML = `
      <div class="order-head">
        <strong>${order.id} · ${order.customerName}</strong>
        <span class="tag ${order.status === 'ยืนยันแล้ว' ? 'green' : ''}">${order.status}</span>
      </div>
      <div class="order-meta">
        ${order.items.length} สินค้า · ${order.date}
        <span class="money" style="float:right">${money(total)}</span>
      </div>
    `;
    listEl.appendChild(card);
  });
}

// Render Orders List dynamically from LocalStorage
function renderOrdersList() {
  const orders = getStoredOrders();
  const listEl = document.getElementById('orders-list');
  if (!listEl) return;

  // Preserve search input if present
  const cards = listEl.querySelectorAll('.order');
  cards.forEach((c) => c.remove());

  orders.forEach((order) => {
    const total = calcTotalGoods(order.items) + (order.shipping || 150) + (order.fee || 100);
    const card = document.createElement('div');
    card.className = 'order';
    card.dataset.search = `${order.id} ${order.customerName} ${order.customerPhone || ''}`.toLowerCase();
    card.onclick = () => viewOrderDetail(order.id);
    card.innerHTML = `
      <div class="order-head">
        <strong>${order.id} · ${order.customerName}</strong>
        <span class="tag ${order.status === 'ยืนยันแล้ว' ? 'green' : ''}">${order.status}</span>
      </div>
      <div class="order-meta">
        ${order.items.length} สินค้า · ${order.customerPhone || '-'}
        <span class="money" style="float:right">${money(total)}</span>
      </div>
    `;
    const emptyEl = document.getElementById('empty-orders');
    if (emptyEl) {
      listEl.insertBefore(card, emptyEl);
    } else {
      listEl.appendChild(card);
    }
  });

  // Re-run search if query is in input
  const searchInput = document.getElementById('order-search');
  if (searchInput && searchInput.value) {
    filterOrders(searchInput.value);
  }
}

// Search Filter
function filterOrders(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#orders-list .order');
  let found = 0;
  cards.forEach((card) => {
    const text = (card.dataset.search || card.textContent).toLowerCase();
    const isMatch = !q || text.includes(q);
    card.style.display = isMatch ? '' : 'none';
    if (isMatch) found++;
  });
  const empty = document.getElementById('empty-orders');
  if (empty) empty.style.display = found === 0 ? 'block' : 'none';
}

// Share summary
function shareOrderSummary() {
  if (!activeViewingOrder) return;
  const o = activeViewingOrder;
  const total = calcTotalGoods(o.items) + (o.shipping || 150) + (o.fee || 100);
  const text = `🛍️ สรุปออเดอร์ ${o.id || ''}\nลูกค้า: ${o.customerName}\nเบอร์โทร: ${o.customerPhone}\nยอดชำระ: ${money(total)}\n(BahtBridge)`;

  if (navigator.share) {
    navigator.share({ title: 'BahtBridge Order', text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('คัดลอกสรุปออเดอร์ไปยัง Clipboard แล้ว!');
    });
  } else {
    alert(text);
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupOrderForm();
  renderCreateProducts();
  renderDashboard();
  renderOrdersList();
});

// Run once immediately
setupOrderForm();
renderCreateProducts();
renderDashboard();
renderOrdersList();
