/**
 * BahtBridge — Core Application Logic
 * Role: Person 3 (Logic & Data Layer)
 * Compliant with DATA_MODEL.md and HTML_CONTRACT.md
 */

// ─── XSS Prevention ──────────────────────────────────────────────────────────
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Thai Date Formatter ──────────────────────────────────────────────────────
function formatThaiDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  const day = d.getDate();
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

// ─── Navigation & Screen Switching ───────────────────────────────────────────
function updateNavActive(screenId) {
  document.querySelectorAll('.bottom .nav').forEach((nav) => {
    nav.classList.remove('on');
    const label = nav.textContent.trim().toLowerCase();
    if (
      (screenId === 'dashboard' && label.includes('dashboard')) ||
      (screenId === 'orders' && label.includes('orders')) ||
      (screenId === 'profile' && label.includes('profile'))
    ) {
      nav.classList.add('on');
    }
  });
}

function show(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
  }
  updateNavActive(id);

  if (id === 'dashboard') renderDashboard();
  if (id === 'orders') renderOrdersList();
  if (id === 'profile') renderProfile();
}

// ─── Exchange Rates & Live API Integration ────────────────────────────────────
const FALLBACK_RATES = { USD: 33, JPY: 0.22, KRW: 0.025, CNY: 4.55, EUR: 36.2 };
let exchangeRates = { ...FALLBACK_RATES };
let ratesLastFetched = null;
let isUsingFallbackRates = false;

async function fetchExchangeRates() {
  setApiStatus('loading');
  try {
    const cached = localStorage.getItem('bb_rates_cache');
    if (cached) {
      const { ts, rates } = JSON.parse(cached);
      if (Date.now() - ts < 10 * 60 * 1000) {
        exchangeRates = rates;
        ratesLastFetched = new Date(ts);
        isUsingFallbackRates = false;
        setApiStatus('ok');
        return;
      }
    }

    const res = await fetch('https://api.exchangerate-api.com/v4/latest/THB');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const newRates = {};
    for (const cur of Object.keys(FALLBACK_RATES)) {
      newRates[cur] = data.rates[cur] ? Number((1 / data.rates[cur]).toFixed(4)) : FALLBACK_RATES[cur];
    }
    exchangeRates = newRates;
    ratesLastFetched = new Date();
    isUsingFallbackRates = false;
    localStorage.setItem('bb_rates_cache', JSON.stringify({ ts: Date.now(), rates: newRates }));
    setApiStatus('ok');
  } catch (err) {
    console.warn('Exchange rate API error, using fallback:', err);
    exchangeRates = { ...FALLBACK_RATES };
    isUsingFallbackRates = true;
    setApiStatus('error');
  }
}

function setApiStatus(state) {
  const el = document.getElementById('api-ok');
  if (!el) return;
  const time = ratesLastFetched
    ? ratesLastFetched.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : 'วันนี้';

  if (state === 'loading') {
    el.className = 'api loading';
    el.innerHTML = '<span class="spin"></span> กำลังดึงอัตราแลกเปลี่ยนจริง...';
  } else if (state === 'ok') {
    el.className = 'api';
    el.style.background = '';
    el.style.color = '';
    el.textContent = `● อัตราแลกเปลี่ยนอัปเดตล่าสุด: ${time} (Live API)`;
  } else {
    el.className = 'api';
    el.style.background = '#fff5f5';
    el.style.color = '#be3940';
    el.textContent = '⚠ ใช้อัตราแลกเปลี่ยนสำรอง (ออฟไลน์)';
  }
}

const countryInfo = {
  USD: ['🇺🇸', 'สหรัฐอเมริกา'],
  JPY: ['🇯🇵', 'ญี่ปุ่น'],
  KRW: ['🇰🇷', 'เกาหลีใต้'],
  CNY: ['🇨🇳', 'จีน'],
  EUR: ['🇪🇺', 'ยุโรป'],
};
const productIcons = ['👟', '🧸', '👕', '🎧', '⌚', '🎒', '🕶️', '💻'];

// ─── LocalStorage Persistence & Settings ──────────────────────────────────────
const ORDERS_STORAGE_KEY = 'bahtbridge_orders_data';
const SETTINGS_STORAGE_KEY = 'bahtbridge_settings';

const defaultOrders = [
  {
    id: '#BR001',
    customerName: 'คุณปิยะ วัฒนะ',
    customerPhone: '081-234-5678',
    customerAddress: 'LINE: @piya',
    createdAt: '2026-09-24T08:00:00.000Z',
    dateFormatted: '24 ก.ย. 2569',
    date: '24 ก.ย. 2569',
    status: 'กำลังดำเนินการ',
    orderStatus: 'pending',
    paymentStatus: 'unpaid',
    items: [
      { name: 'Shoes', currency: 'USD', amount: 50, originalPrice: 50, quantity: 1, exchangeRate: 33 },
      { name: 'Figure', currency: 'JPY', amount: 5000, originalPrice: 5000, quantity: 1, exchangeRate: 0.22 },
      { name: 'Shirt', currency: 'KRW', amount: 30000, originalPrice: 30000, quantity: 1, exchangeRate: 0.025 },
    ],
    shipping: 150,
    shippingFee: 150,
    fee: 100,
    serviceFee: 100,
  },
  {
    id: '#BR002',
    customerName: 'คุณนิดา เกียรติสกุล',
    customerPhone: '089-876-5432',
    customerAddress: 'IG: @nida_shop',
    createdAt: '2026-09-23T10:30:00.000Z',
    dateFormatted: '23 ก.ย. 2569',
    date: '23 ก.ย. 2569',
    status: 'ยืนยันแล้ว',
    orderStatus: 'completed',
    paymentStatus: 'paid',
    items: [
      { name: 'Headphone', currency: 'USD', amount: 60, originalPrice: 60, quantity: 1, exchangeRate: 33 },
    ],
    shipping: 110,
    shippingFee: 110,
    fee: 100,
    serviceFee: 100,
  },
];

function getStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading settings', e);
  }
  return { nextOrderNo: 3 };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

function getNextOrderId(orders) {
  const settings = getStoredSettings();
  let maxNum = 0;
  (orders || []).forEach((o) => {
    const m = o.id && String(o.id).match(/\d+/);
    if (m) {
      const num = parseInt(m[0], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  let nextNo = settings.nextOrderNo || (maxNum + 1) || 1;
  if (nextNo <= maxNum) {
    nextNo = maxNum + 1;
  }
  settings.nextOrderNo = nextNo + 1;
  saveSettings(settings);

  return `#BR${String(nextNo).padStart(3, '0')}`;
}

// Migration for existing/legacy orders
function migrateOrders(orders) {
  let hasChange = false;
  const nowIso = new Date().toISOString();

  orders.forEach((o) => {
    if (!o.createdAt) {
      o.createdAt = nowIso;
      hasChange = true;
    }
    if (!o.dateFormatted) {
      o.dateFormatted = o.date && !o.date.includes('วันนี้') && !o.date.includes('เมื่อวาน')
        ? o.date
        : formatThaiDate(o.createdAt);
      hasChange = true;
    }
    if (!o.date) {
      o.date = o.dateFormatted;
      hasChange = true;
    }
    if (Array.isArray(o.items)) {
      o.items.forEach((item) => {
        if (item.amount === undefined && item.originalPrice !== undefined) {
          item.amount = item.originalPrice;
          hasChange = true;
        }
        if (item.originalPrice === undefined && item.amount !== undefined) {
          item.originalPrice = item.amount;
          hasChange = true;
        }
      });
    }
  });

  if (hasChange) {
    saveOrdersToStorage(orders);
  }
  return orders;
}

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(defaultOrders));
      return defaultOrders;
    }
    const parsed = JSON.parse(raw);
    return migrateOrders(Array.isArray(parsed) ? parsed : defaultOrders);
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

// ─── Draft Products in Create Form (Starts Empty) ─────────────────────────────
let draftProducts = [];
let activeViewingOrder = null;

const money = (amount) => `฿ ${Math.round(amount).toLocaleString('th-TH')}`;
const productTotal = (p) => {
  const price = p.amount !== undefined ? p.amount : (p.originalPrice || 0);
  const rate = p.exchangeRate !== undefined ? p.exchangeRate : (exchangeRates[p.currency] || 1);
  return price * p.quantity * rate;
};
const calcTotalGoods = (items) => (items || []).reduce((sum, item) => sum + productTotal(item), 0);

// Render Draft Products in Create Screen
function renderCreateProducts() {
  const container = document.getElementById('mini-products-list');
  if (!container) return;
  container.innerHTML = '';

  draftProducts.forEach((product, index) => {
    const [flag] = countryInfo[product.currency] || ['🌐', ''];
    const rate = exchangeRates[product.currency] || 1;
    const card = document.createElement('div');
    card.className = 'mini-product';
    card.innerHTML = `
      <div class="row">
        <span class="product-title">${flag} ${esc(product.name)}</span>
        <div>
          <b>${product.amount.toLocaleString()} ${esc(product.currency)} × ${product.quantity}</b>
          <button class="del-btn" onclick="deleteDraftProduct(${index})" title="ลบสินค้านี้">🗑️</button>
        </div>
      </div>
      <div class="convert">
        อัตราแลกเปลี่ยน ${rate} <b>→ ${money(productTotal(product))}</b>
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

// ─── Setup Form (Direct Select, No outerHTML) ─────────────────────────────────
function setupOrderForm() {
  const countrySel = document.getElementById('country-select');
  const currencySel = document.getElementById('currency-select');

  if (countrySel && currencySel) {
    countrySel.onchange = () => {
      currencySel.value = countrySel.value;
    };
    currencySel.onchange = () => {
      countrySel.value = currencySel.value;
    };
  }

  const addBtn = document.getElementById('btn-add-product');
  if (addBtn) {
    addBtn.onclick = () => {
      const nameInput = document.getElementById('product-name');
      const priceInput = document.getElementById('product-price');
      const qtyInput = document.getElementById('product-qty');
      const currency = currencySel ? currencySel.value : 'USD';

      const name = nameInput.value.trim();
      const amount = Number(priceInput.value);
      const quantity = Number(qtyInput.value);

      const errors = [];
      if (!name) errors.push('• ชื่อสินค้า');
      if (!amount || amount <= 0) errors.push('• ราคาสินค้า (ต้องมากกว่า 0)');
      if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) errors.push('• จำนวนสินค้า (ต้องเป็นจำนวนเต็มอย่างน้อย 1)');

      if (errors.length > 0) {
        alert('กรุณากรอกข้อมูลสินค้าให้ถูกต้อง:\n' + errors.join('\n'));
        return;
      }

      draftProducts.push({
        name,
        currency,
        amount,
        originalPrice: amount,
        quantity,
        exchangeRate: exchangeRates[currency] || 1,
      });

      nameInput.value = '';
      priceInput.value = '';
      qtyInput.value = '1';
      renderCreateProducts();
    };
  }
}

// ─── Calculate & Prepare Order Detail ─────────────────────────────────────────
async function calculateOrder() {
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

  const calcBtn = document.querySelector('#create .sticky .primary');
  if (calcBtn) {
    calcBtn.disabled = true;
    calcBtn.textContent = 'กำลังคำนวณ...';
  }

  show('loading');

  try {
    await fetchExchangeRates();
  } catch (err) {
    console.error('Error fetching rates:', err);
  } finally {
    // Update rates in draft items to locked rate
    draftProducts.forEach((p) => {
      p.exchangeRate = exchangeRates[p.currency] || 1;
    });

    const goods = calcTotalGoods(draftProducts);
    const shipping = 150;
    const fee = 100;
    const total = goods + shipping + fee;
    const nowIso = new Date().toISOString();

    activeViewingOrder = {
      id: 'DRAFT',
      customerName: custName,
      customerPhone: custPhone || '-',
      customerAddress: custAddress || '-',
      createdAt: nowIso,
      dateFormatted: formatThaiDate(nowIso),
      date: 'วันนี้',
      status: 'กำลังดำเนินการ',
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      items: [...draftProducts],
      shipping,
      shippingFee: shipping,
      fee,
      serviceFee: fee,
      goodsTotal: goods,
      grandTotal: total,
      total: total,
      isDraft: true,
    };

    populateDetailScreen(activeViewingOrder);
    populateCustomerScreen(activeViewingOrder);
    show('detail');

    if (calcBtn) {
      calcBtn.disabled = false;
      calcBtn.textContent = 'คำนวณราคา & บันทึกออเดอร์';
    }
  }
}

// ─── Populate Detail Screen ───────────────────────────────────────────────────
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
    const displayDate = order.dateFormatted || order.date || formatThaiDate(order.createdAt);
    const statusText = order.status || (order.orderStatus === 'completed' ? 'ยืนยันแล้ว' : 'กำลังดำเนินการ');
    metaEl.innerHTML = `${esc(displayDate)} · <span style="color:${statusText === 'ยืนยันแล้ว' ? '#16a36a' : '#ffb020'}">● ${esc(statusText)}</span>`;
  }

  // Fallback Warning Banner
  const fallbackWarnEl = document.getElementById('detail-fallback-warning');
  if (fallbackWarnEl) {
    fallbackWarnEl.style.display = isUsingFallbackRates ? 'block' : 'none';
  }

  const listEl = document.getElementById('detail-items-list');
  if (listEl) {
    listEl.innerHTML = '';
    order.items.forEach((p) => {
      const [flag] = countryInfo[p.currency] || ['🌐'];
      const rate = p.exchangeRate !== undefined ? p.exchangeRate : (exchangeRates[p.currency] || 1);
      const itemPrice = p.amount !== undefined ? p.amount : (p.originalPrice || 0);
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="flag">${flag}</div>
        <div class="item-info">
          <strong>${esc(p.name)}</strong>
          <small>${itemPrice.toLocaleString()} ${esc(p.currency)} × ${p.quantity} · Rate ${rate}</small>
        </div>
        <div class="price">→ ${money(productTotal(p))}<small>แปลงแล้ว</small></div>
      `;
      listEl.appendChild(item);
    });
  }

  const goods = calcTotalGoods(order.items);
  const shipping = order.shipping || order.shippingFee || 150;
  const fee = order.fee || order.serviceFee || 100;
  const goodsEl = document.getElementById('detail-summary-goods');
  const totalEl = document.getElementById('detail-summary-total');
  if (goodsEl) goodsEl.textContent = money(goods);
  if (totalEl) totalEl.textContent = money(goods + shipping + fee);

  const confirmBtn = document.getElementById('btn-confirm-order');
  if (confirmBtn) {
    confirmBtn.textContent = order.isDraft ? 'บันทึก & ยืนยันออเดอร์' : 'อัปเดตสถานะเป็นยืนยันแล้ว';
  }
}

// ─── Populate Customer View Screen ────────────────────────────────────────────
function populateCustomerScreen(order) {
  const goods = calcTotalGoods(order.items);
  const shipping = order.shipping || order.shippingFee || 150;
  const fee = order.fee || order.serviceFee || 100;
  const total = goods + shipping + fee;

  const idEl = document.getElementById('cust-view-order-id');
  if (idEl) idEl.textContent = order.isDraft ? 'ออเดอร์ใหม่ของคุณ' : `Order ${order.id}`;

  const nameEl = document.getElementById('cust-view-name');
  if (nameEl) nameEl.textContent = order.customerName;

  const contactEl = document.getElementById('cust-view-contact');
  if (contactEl) contactEl.textContent = `📞 ${order.customerPhone}`;

  const dueEl = document.getElementById('cust-view-due');
  if (dueEl) dueEl.textContent = `${Math.round(total).toLocaleString('th-TH')} ฿`;

  const countEl = document.getElementById('cust-view-count');
  if (countEl) countEl.textContent = `${order.items.length} รายการ`;

  const listEl = document.getElementById('customer-items-list');
  if (listEl) {
    listEl.innerHTML = '';
    order.items.forEach((p, idx) => {
      const [flag, country] = countryInfo[p.currency] || ['🌐', 'ต่างประเทศ'];
      const itemPrice = p.amount !== undefined ? p.amount : (p.originalPrice || 0);
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div class="photo">${productIcons[idx % productIcons.length]}</div>
        <div class="item-info">
          <strong>${esc(p.name)}</strong>
          <small>${flag} ${country} · ${itemPrice.toLocaleString()} ${esc(p.currency)} (×${p.quantity})</small>
        </div>
        <div class="price">${money(productTotal(p))}</div>
      `;
      listEl.appendChild(item);
    });
  }

  const sumGoods = document.getElementById('cust-summary-goods');
  const sumTotal = document.getElementById('cust-summary-total');
  if (sumGoods) sumGoods.textContent = money(goods);
  if (sumTotal) sumTotal.textContent = money(total);
}

// ─── Confirm Order & Persist ──────────────────────────────────────────────────
function confirmCurrentOrder() {
  if (!activeViewingOrder) return;

  const orders = getStoredOrders();

  if (activeViewingOrder.isDraft) {
    const newId = getNextOrderId(orders);
    const nowIso = new Date().toISOString();
    const thaiDate = formatThaiDate(nowIso);

    const newOrder = {
      ...activeViewingOrder,
      id: newId,
      createdAt: nowIso,
      dateFormatted: thaiDate,
      date: thaiDate,
      status: 'กำลังดำเนินการ',
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      isDraft: false,
    };
    orders.unshift(newOrder);
    saveOrdersToStorage(orders);
    activeViewingOrder = newOrder;

    const idEl = document.getElementById('success-order-id');
    const nameEl = document.getElementById('success-customer-name');
    const phoneEl = document.getElementById('success-customer-phone');
    const totalEl = document.getElementById('success-order-total');

    if (idEl) idEl.textContent = newOrder.id;
    if (nameEl) nameEl.textContent = newOrder.customerName;
    if (phoneEl) phoneEl.textContent = newOrder.customerPhone;
    if (totalEl) totalEl.textContent = money(calcTotalGoods(newOrder.items) + 250);

    // Reset draft form
    draftProducts = [];
    const custName = document.getElementById('cust-name');
    const custPhone = document.getElementById('cust-phone');
    const custAddress = document.getElementById('cust-address');
    if (custName) custName.value = '';
    if (custPhone) custPhone.value = '';
    if (custAddress) custAddress.value = '';
    renderCreateProducts();
  } else {
    activeViewingOrder.status = 'ยืนยันแล้ว';
    activeViewingOrder.orderStatus = 'completed';
    const idx = orders.findIndex((o) => o.id === activeViewingOrder.id);
    if (idx !== -1) {
      orders[idx] = activeViewingOrder;
      saveOrdersToStorage(orders);
    }
  }

  renderDashboard();
  renderOrdersList();
  renderProfile();
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

// ─── Render Dashboard ─────────────────────────────────────────────────────────
function renderDashboard() {
  const orders = getStoredOrders();
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'กำลังดำเนินการ' || o.orderStatus === 'pending').length;
  const totalSales = orders.reduce((sum, o) => {
    const shipping = o.shipping || o.shippingFee || 150;
    const fee = o.fee || o.serviceFee || 100;
    return sum + calcTotalGoods(o.items) + shipping + fee;
  }, 0);

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
    const shipping = order.shipping || order.shippingFee || 150;
    const fee = order.fee || order.serviceFee || 100;
    const total = calcTotalGoods(order.items) + shipping + fee;
    const displayDate = order.dateFormatted || order.date || formatThaiDate(order.createdAt);
    const statusText = order.status || (order.orderStatus === 'completed' ? 'ยืนยันแล้ว' : 'กำลังดำเนินการ');

    const card = document.createElement('div');
    card.className = 'order';
    card.onclick = () => viewOrderDetail(order.id);
    card.innerHTML = `
      <div class="order-head">
        <strong>${esc(order.id)} · ${esc(order.customerName)}</strong>
        <span class="tag ${statusText === 'ยืนยันแล้ว' ? 'green' : ''}">${esc(statusText)}</span>
      </div>
      <div class="order-meta">
        ${order.items.length} สินค้า · ${esc(displayDate)}
        <span class="money" style="float:right">${money(total)}</span>
      </div>
    `;
    listEl.appendChild(card);
  });
}

// ─── Render Orders List ───────────────────────────────────────────────────────
function renderOrdersList() {
  const orders = getStoredOrders();
  const listEl = document.getElementById('orders-list');
  if (!listEl) return;

  const cards = listEl.querySelectorAll('.order');
  cards.forEach((c) => c.remove());

  orders.forEach((order) => {
    const shipping = order.shipping || order.shippingFee || 150;
    const fee = order.fee || order.serviceFee || 100;
    const total = calcTotalGoods(order.items) + shipping + fee;
    const statusText = order.status || (order.orderStatus === 'completed' ? 'ยืนยันแล้ว' : 'กำลังดำเนินการ');

    const card = document.createElement('div');
    card.className = 'order';
    card.dataset.search = `${order.id} ${order.customerName} ${order.customerPhone || ''}`.toLowerCase();
    card.onclick = () => viewOrderDetail(order.id);
    card.innerHTML = `
      <div class="order-head">
        <strong>${esc(order.id)} · ${esc(order.customerName)}</strong>
        <span class="tag ${statusText === 'ยืนยันแล้ว' ? 'green' : ''}">${esc(statusText)}</span>
      </div>
      <div class="order-meta">
        ${order.items.length} สินค้า · ${esc(order.customerPhone || '-')}
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

  const searchInput = document.getElementById('order-search');
  if (searchInput && searchInput.value) {
    filterOrders(searchInput.value);
  }
}

// ─── Render Profile Statistics ────────────────────────────────────────────────
function renderProfile() {
  const orders = getStoredOrders();
  const totalOrders = orders.length;
  const confirmedOrders = orders.filter((o) => o.status === 'ยืนยันแล้ว' || o.orderStatus === 'completed').length;
  const totalSales = orders.reduce((sum, o) => {
    const shipping = o.shipping || o.shippingFee || 150;
    const fee = o.fee || o.serviceFee || 100;
    return sum + calcTotalGoods(o.items) + shipping + fee;
  }, 0);

  const totalEl = document.getElementById('profile-total-orders');
  const confEl = document.getElementById('profile-confirmed-orders');
  const salesEl = document.getElementById('profile-total-sales');

  if (totalEl) totalEl.textContent = totalOrders;
  if (confEl) confEl.textContent = confirmedOrders;
  if (salesEl) salesEl.textContent = money(totalSales);
}

// ─── Check Capacitor Environment ──────────────────────────────────────────────
function checkCapacitorEnvironment() {
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
  const apkLink = document.querySelector('a[href$=".apk"]');
  if (apkLink && isNative) {
    apkLink.style.display = 'none';
  }
}

// ─── Search Filter ────────────────────────────────────────────────────────────
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

// ─── Share Summary ────────────────────────────────────────────────────────────
function shareOrderSummary() {
  if (!activeViewingOrder) return;
  const o = activeViewingOrder;
  const shipping = o.shipping || o.shippingFee || 150;
  const fee = o.fee || o.serviceFee || 100;
  const total = calcTotalGoods(o.items) + shipping + fee;
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

// ─── Backup & Restore ─────────────────────────────────────────────────────────
function exportOrdersData() {
  const orders = getStoredOrders();
  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    appName: 'BahtBridge',
    ordersCount: orders.length,
    orders: orders,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bahtbridge-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importOrdersData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || !Array.isArray(data.orders)) {
        alert('รูปแบบไฟล์ไม่ถูกต้อง: ต้องเป็นไฟล์สำรองข้อมูลของ BahtBridge (JSON)');
        return;
      }
      if (confirm(`พบข้อมูลออเดอร์ ${data.orders.length} รายการ คุณต้องการนำเข้าข้อมูลนี้ทับข้อมูลปัจจุบันหรือไม่?`)) {
        saveOrdersToStorage(data.orders);
        renderDashboard();
        renderOrdersList();
        renderProfile();
        alert(`นำเข้าข้อมูลสำเร็จ! โหลดออเดอร์แล้ว ${data.orders.length} รายการ`);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์สำรอง: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ─── Initialize Application (Only Once in DOMContentLoaded) ───────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupOrderForm();
  renderCreateProducts();
  renderDashboard();
  renderOrdersList();
  renderProfile();
  checkCapacitorEnvironment();

  fetchExchangeRates().then(() => {
    renderCreateProducts();
    renderDashboard();
    renderOrdersList();
    renderProfile();
  });
});
