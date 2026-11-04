/**
 * BahtBridge — app.js
 * Features:
 *  1. อัตราแลกเปลี่ยนจริงจาก exchangerate-api (ฟรี, ไม่ต้อง key)
 *  2. ลบสินค้าออกจาก order ได้
 *  3. localStorage — ข้อมูลยังอยู่หลัง refresh
 */

// ─── ค่าเริ่มต้น (fallback เมื่อ API ล้มเหลว) ────────────────────────────────
const FALLBACK_RATES = { USD: 33, JPY: 0.22, KRW: 0.025, CNY: 4.55, EUR: 36.2 };

const countryInfo = {
  USD: ['🇺🇸', 'สหรัฐอเมริกา'],
  JPY: ['🇯🇵', 'ญี่ปุ่น'],
  KRW: ['🇰🇷', 'เกาหลีใต้'],
  CNY: ['🇨🇳', 'จีน'],
  EUR: ['🇪🇺', 'ยุโรป'],
};
const productIcons = ['👟', '🧸', '👕', '🎧', '⌚'];

// ─── State ────────────────────────────────────────────────────────────────────
let exchangeRates = { ...FALLBACK_RATES };
let ratesLastFetched = null; // timestamp ล่าสุดที่ดึง API

// โหลด products จาก localStorage (หรือใช้ค่าตัวอย่างถ้ายังไม่มี)
let products = loadProducts();

function loadProducts() {
  try {
    const saved = localStorage.getItem('bb_products');
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return [
    { name: 'Shoes',  currency: 'USD', amount: 50,    quantity: 1 },
    { name: 'Figure', currency: 'JPY', amount: 5000,  quantity: 1 },
    { name: 'Shirt',  currency: 'KRW', amount: 30000, quantity: 1 },
  ];
}

function saveProducts() {
  try {
    localStorage.setItem('bb_products', JSON.stringify(products));
  } catch (_) {}
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const money        = (n) => `฿ ${Math.round(n).toLocaleString('th-TH')}`;
const productTotal = (p) => p.amount * p.quantity * (exchangeRates[p.currency] ?? FALLBACK_RATES[p.currency] ?? 1);
const totalProducts = () => products.reduce((sum, p) => sum + productTotal(p), 0);

// ─── 1. ดึงอัตราแลกเปลี่ยนจริงจาก API ───────────────────────────────────────
/**
 * ใช้ exchangerate-api.com (endpoint ฟรี ไม่ต้อง API key)
 * ถ้า fetch ล้มเหลวจะ fallback ไปใช้ค่าตายตัว
 */
async function fetchExchangeRates() {
  setApiStatus('loading');
  try {
    // ตรวจว่าเพิ่งดึงมาแล้วภายใน 10 นาที → ไม่ต้องดึงซ้ำ
    const cached = localStorage.getItem('bb_rates');
    if (cached) {
      const { ts, rates } = JSON.parse(cached);
      if (Date.now() - ts < 10 * 60 * 1000) {
        exchangeRates = rates;
        ratesLastFetched = new Date(ts);
        setApiStatus('ok');
        return;
      }
    }

    const res = await fetch('https://api.exchangerate-api.com/v4/latest/THB');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // API ให้ 1 THB = X หน่วยต่างประเทศ → เราต้องการ 1 หน่วยต่างประเทศ = X THB
    // ดังนั้น rate = 1 / data.rates[currency]
    const newRates = {};
    for (const cur of Object.keys(FALLBACK_RATES)) {
      newRates[cur] = data.rates[cur] ? (1 / data.rates[cur]) : FALLBACK_RATES[cur];
    }
    exchangeRates = newRates;
    ratesLastFetched = new Date();

    localStorage.setItem('bb_rates', JSON.stringify({ ts: Date.now(), rates: newRates }));
    setApiStatus('ok');
  } catch (err) {
    console.warn('Exchange rate API failed, using fallback:', err);
    exchangeRates = { ...FALLBACK_RATES };
    setApiStatus('error');
  }
}

function setApiStatus(state) {
  const el = document.getElementById('api-ok');
  if (!el) return;
  const now = ratesLastFetched
    ? ratesLastFetched.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  if (state === 'loading') {
    el.className = 'api loading';
    el.innerHTML = '<span class="spin"></span> กำลังดึงอัตราแลกเปลี่ยน...';
  } else if (state === 'ok') {
    el.className = 'api';
    el.textContent = `● อัตราแลกเปลี่ยนอัปเดตล่าสุด: ${now}`;
  } else {
    el.className = 'api';
    el.style.background = '#fff5f5';
    el.style.color = '#be3940';
    el.textContent = '⚠ ใช้อัตราสำรอง (ไม่มีอินเทอร์เน็ต)';
  }
}

// ─── Screen navigation ────────────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── 2. Render Create — พร้อมปุ่มลบสินค้า ────────────────────────────────────
function renderCreateProducts() {
  const create = document.getElementById('create');
  create.querySelectorAll('.mini-product').forEach((c) => c.remove());
  const addButton = create.querySelector('.secondary');

  products.forEach((product, index) => {
    const [flag] = countryInfo[product.currency];
    const rate = exchangeRates[product.currency];
    const card = document.createElement('div');
    card.className = 'mini-product';
    card.innerHTML = `
      <div class="row">
        <span class="product-title">${flag} ${product.name}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <b>${product.amount.toLocaleString()} ${product.currency} × ${product.quantity}</b>
          <button
            onclick="removeProduct(${index})"
            style="background:#fff0f1;border:none;border-radius:8px;color:#df4c53;
                   font-size:14px;cursor:pointer;padding:3px 8px;line-height:1"
            title="ลบสินค้านี้">✕</button>
        </div>
      </div>
      <div class="convert">อัตราแลกเปลี่ยน ${rate.toFixed(4)} <b>→ ${money(productTotal(product))}</b></div>`;
    addButton.insertAdjacentElement('afterend', card);
  });

  const values = create.querySelectorAll('.summary b');
  const goods = totalProducts();
  values[0].textContent = money(goods);
  values[3].textContent = money(goods + 250);
}

// ─── 3. ลบสินค้าออกจาก order ─────────────────────────────────────────────────
function removeProduct(index) {
  products.splice(index, 1);
  saveProducts();         // บันทึกลง localStorage
  renderCreateProducts(); // re-render
}

// ─── Render Detail ────────────────────────────────────────────────────────────
function renderDetail() {
  const detail = document.getElementById('detail');
  const customer = document.querySelector('#create input.input').value || 'ลูกค้า';
  detail.querySelector('.detail-head b').textContent = customer;
  detail.querySelectorAll('.item').forEach((item) => item.remove());
  const title = detail.querySelector('.section-title');

  products.forEach((product) => {
    const [flag] = countryInfo[product.currency];
    const rate = exchangeRates[product.currency];
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="flag">${flag}</div>
      <div class="item-info">
        <strong>${product.name}</strong>
        <small>${product.amount.toLocaleString()} ${product.currency} × ${product.quantity} · Rate ${rate.toFixed(4)}</small>
      </div>
      <div class="price">→ ${money(productTotal(product))}<small>แปลงแล้ว</small></div>`;
    title.insertAdjacentElement('afterend', item);
  });

  const values = detail.querySelectorAll('.summary b');
  const goods = totalProducts();
  values[0].textContent = money(goods);
  values[3].textContent = money(goods + 250);
}

// ─── Render Customer ──────────────────────────────────────────────────────────
function renderCustomer() {
  const customerScreen = document.getElementById('customer');
  const customer = document.querySelector('#create input.input').value || 'ลูกค้า';
  const goods = totalProducts();
  customerScreen.querySelector('.customer-hero b').textContent = customer;
  customerScreen.querySelector('.due').textContent = `${Math.round(goods + 250).toLocaleString('th-TH')} ฿`;
  customerScreen.querySelector('.section-title .muted').textContent = `${products.length} รายการ`;
  customerScreen.querySelectorAll('.item').forEach((item) => item.remove());
  const title = customerScreen.querySelector('.section-title');

  products.forEach((product, index) => {
    const [flag, country] = countryInfo[product.currency];
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="photo">${productIcons[index % productIcons.length]}</div>
      <div class="item-info">
        <strong>${product.name}</strong>
        <small>${flag} ${country} · ${product.amount.toLocaleString()} ${product.currency}</small>
      </div>
      <div class="price">${money(productTotal(product))}</div>`;
    title.insertAdjacentElement('afterend', item);
  });

  const values = customerScreen.querySelectorAll('.summary b');
  values[0].textContent = money(goods);
  values[3].textContent = money(goods + 250);
}

// ─── คำนวณออเดอร์ (ดึง rate จริงก่อน แล้วค่อย render) ───────────────────────
async function calculateOrder() {
  show('loading');
  await fetchExchangeRates();
  renderDetail();
  renderCustomer();
  show('detail');
}

// ─── Setup form ───────────────────────────────────────────────────────────────
function setupOrderForm() {
  const create = document.getElementById('create');
  const fieldDisplays = create.querySelectorAll('.field .input:not(input)');

  fieldDisplays[0].outerHTML = `<select class="input">
    <option value="USD">🇺🇸 สหรัฐอเมริกา</option>
    <option value="JPY">🇯🇵 ญี่ปุ่น</option>
    <option value="KRW">🇰🇷 เกาหลีใต้</option>
    <option value="CNY">🇨🇳 จีน</option>
    <option value="EUR">🇪🇺 ยุโรป</option>
  </select>`;
  fieldDisplays[1].outerHTML = `<select class="input">
    <option value="USD">USD</option>
    <option value="JPY">JPY</option>
    <option value="KRW">KRW</option>
    <option value="CNY">CNY</option>
    <option value="EUR">EUR</option>
  </select>`;

  const selects = create.querySelectorAll('select');
  selects[0].addEventListener('change', () => { selects[1].value = selects[0].value; });
  selects[1].addEventListener('change', () => { selects[0].value = selects[1].value; });

  // ── ปุ่มเพิ่มสินค้า ──
  create.querySelector('.secondary').addEventListener('click', () => {
    const inputs = create.querySelectorAll('input.input');
    const name     = inputs[1].value.trim();
    const amount   = Number(inputs[2].value);
    const quantity = Number(inputs[3].value);
    if (!name || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      window.alert('กรุณากรอกชื่อสินค้า ราคา และจำนวนให้ถูกต้อง');
      return;
    }
    products.push({ name, currency: selects[1].value, amount, quantity });
    inputs[1].value = '';
    inputs[2].value = '';
    inputs[3].value = '1';
    saveProducts();         // บันทึกลง localStorage
    renderCreateProducts();
  });

  // ── ปุ่มคำนวณราคา ──
  create.querySelector('.sticky .primary').onclick = calculateOrder;
}

// ─── ค้นหาออเดอร์ใน Orders screen ───────────────────────────────────────────
function filterOrders(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#orders-list .order');
  let found = 0;
  cards.forEach((card) => {
    const text = (card.dataset.search || card.textContent).toLowerCase();
    const visible = !q || text.includes(q);
    card.style.display = visible ? '' : 'none';
    if (visible) found++;
  });
  const empty = document.getElementById('empty-orders');
  if (empty) empty.style.display = found === 0 ? 'block' : 'none';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
setupOrderForm();
renderCreateProducts();

// ดึง rate ทันทีตอนเปิดหน้า (background, ไม่บล็อก UI)
fetchExchangeRates().then(() => renderCreateProducts());
