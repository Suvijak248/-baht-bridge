/** Interactive order builder with a mocked Currency Exchange API. */
function show(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // ซิงค์ nav active เบื้องต้น
  document.querySelectorAll('.bottom .nav').forEach((nav) => {
    const txt = nav.textContent.trim().toLowerCase();
    nav.classList.toggle('on', txt.includes(id));
  });
}

const FALLBACK_RATES = { USD: 33, JPY: 0.22, KRW: 0.025, CNY: 4.55, EUR: 36.2 };
let exchangeRates = { ...FALLBACK_RATES };
let ratesLastFetched = null;

async function fetchExchangeRates() {
  setApiStatus('loading');
  try {
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
    const newRates = {};
    for (const cur of Object.keys(FALLBACK_RATES)) {
      newRates[cur] = data.rates[cur] ? (1 / data.rates[cur]) : FALLBACK_RATES[cur];
    }
    exchangeRates = newRates;
    ratesLastFetched = new Date();
    localStorage.setItem('bb_rates', JSON.stringify({ ts: Date.now(), rates: newRates }));
    setApiStatus('ok');
  } catch (err) {
    console.warn('Exchange rate API error, using fallback:', err);
    exchangeRates = { ...FALLBACK_RATES };
    setApiStatus('error');
  }
}

function setApiStatus(state) {
  const el = document.getElementById('api-ok');
  if (!el) return;
  const time = ratesLastFetched ? ratesLastFetched.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  if (state === 'loading') {
    el.className = 'api loading';
    el.innerHTML = '<span class="spin"></span> กำลังดึงอัตราแลกเปลี่ยน...';
  } else if (state === 'ok') {
    el.className = 'api';
    el.style.cssText = '';
    el.textContent = `● อัตราแลกเปลี่ยนอัปเดตล่าสุด: ${time}`;
  } else {
    el.className = 'api';
    el.style.background = '#fff5f5';
    el.style.color = '#be3940';
    el.textContent = '⚠ ใช้อัตราสำรอง (ไม่มีอินเทอร์เน็ต)';
  }
}
const countryInfo = {
  USD: ['🇺🇸', 'สหรัฐอเมริกา'], JPY: ['🇯🇵', 'ญี่ปุ่น'], KRW: ['🇰🇷', 'เกาหลีใต้'],
  CNY: ['🇨🇳', 'จีน'], EUR: ['🇪🇺', 'ยุโรป'],
};
const productIcons = ['👟', '🧸', '👕', '🎧', '⌚'];
function loadProducts() {
  try {
    const s = localStorage.getItem('bb_products');
    if (s) return JSON.parse(s);
  } catch (_) {}
  return [
    { name: 'Shoes', currency: 'USD', amount: 50, quantity: 1 },
    { name: 'Figure', currency: 'JPY', amount: 5000, quantity: 1 },
    { name: 'Shirt', currency: 'KRW', amount: 30000, quantity: 1 },
  ];
}

function saveProducts() {
  try { localStorage.setItem('bb_products', JSON.stringify(products)); } catch (_) {}
}

let products = loadProducts();

const money = (amount) => `฿ ${Math.round(amount).toLocaleString('th-TH')}`;
const productTotal = (product) => product.amount * product.quantity * exchangeRates[product.currency];
const totalProducts = () => products.reduce((sum, product) => sum + productTotal(product), 0);

function removeProduct(index) {
  products.splice(index, 1);
  saveProducts();
  renderCreateProducts();
}

function renderCreateProducts() {
  const create = document.getElementById('create');
  create.querySelectorAll('.mini-product').forEach((card) => card.remove());
  const addButton = create.querySelector('.secondary');
  products.forEach((product) => {
    const [flag] = countryInfo[product.currency];
    const card = document.createElement('div');
    card.className = 'mini-product';
    card.innerHTML = `<div class="row"><span class="product-title">${flag} ${product.name}</span><b>${product.amount.toLocaleString()} ${product.currency} × ${product.quantity}</b><button onclick="removeProduct(${index})" style="background:#fff0f1;border:none;border-radius:8px;color:#df4c53;font-size:14px;cursor:pointer;padding:3px 8px;line-height:1" title="ลบสินค้านี้">✕</button></div><div class="convert">อัตราแลกเปลี่ยน ${exchangeRates[product.currency].toLocaleString()} <b>→ ${money(productTotal(product))}</b></div>`;
    addButton.insertAdjacentElement('afterend', card);
  });
  const values = create.querySelectorAll('.summary b');
  const goods = totalProducts();
  values[0].textContent = money(goods);
  values[3].textContent = money(goods + 250);
}

function renderDetail() {
  const detail = document.getElementById('detail');
  const customer = document.querySelector('#create input.input').value || 'ลูกค้า';
  detail.querySelector('.detail-head b').textContent = customer;
  detail.querySelectorAll('.item').forEach((item) => item.remove());
  const title = detail.querySelector('.section-title');
  products.forEach((product) => {
    const [flag] = countryInfo[product.currency];
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `<div class="flag">${flag}</div><div class="item-info"><strong>${product.name}</strong><small>${product.amount.toLocaleString()} ${product.currency} × ${product.quantity} · Rate ${exchangeRates[product.currency]}</small></div><div class="price">→ ${money(productTotal(product))}<small>แปลงแล้ว</small></div>`;
    title.insertAdjacentElement('afterend', item);
  });
  const values = detail.querySelectorAll('.summary b');
  const goods = totalProducts();
  values[0].textContent = money(goods);
  values[3].textContent = money(goods + 250);
}

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
    item.innerHTML = `<div class="photo">${productIcons[index % productIcons.length]}</div><div class="item-info"><strong>${product.name}</strong><small>${flag} ${country} · ${product.amount.toLocaleString()} ${product.currency}</small></div><div class="price">${money(productTotal(product))}</div>`;
    title.insertAdjacentElement('afterend', item);
  });
  const values = customerScreen.querySelectorAll('.summary b');
  values[0].textContent = money(goods);
  values[3].textContent = money(goods + 250);
}

function calculateOrder() {
  show('loading');
  window.setTimeout(() => {
    renderDetail();
    renderCustomer();
    show('detail');
  }, 1200);
}

function setupOrderForm() {
  const create = document.getElementById('create');
  const fieldDisplays = create.querySelectorAll('.field .input:not(input)');
  fieldDisplays[0].outerHTML = '<select class="input"><option value="USD">🇺🇸 สหรัฐอเมริกา</option><option value="JPY">🇯🇵 ญี่ปุ่น</option><option value="KRW">🇰🇷 เกาหลีใต้</option><option value="CNY">🇨🇳 จีน</option><option value="EUR">🇪🇺 ยุโรป</option></select>';
  fieldDisplays[1].outerHTML = '<select class="input"><option value="USD">USD</option><option value="JPY">JPY</option><option value="KRW">KRW</option><option value="CNY">CNY</option><option value="EUR">EUR</option></select>';
  const selects = create.querySelectorAll('select');
  selects[0].addEventListener('change', () => { selects[1].value = selects[0].value; });
  selects[1].addEventListener('change', () => { selects[0].value = selects[1].value; });

  function validateProductForm(inputs, selects) {
    const name = inputs[1].value.trim();
    const amount = Number(inputs[2].value);
    const quantity = Number(inputs[3].value);
    const errors = [];
    if (!name) errors.push('• ชื่อสินค้า');
    if (!amount || amount <= 0) errors.push('• ราคาสินค้า (ต้องมากกว่า 0)');
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) errors.push('• จำนวน (ต้องเป็นจำนวนเต็มมากกว่า 0)');
    if (!selects[1].value) errors.push('• สกุลเงิน');
    return errors;
  }

  create.querySelector('.secondary').addEventListener('click', () => {
    const inputs = create.querySelectorAll('input.input');
    const errors = validateProductForm(inputs, selects);
    if (errors.length) {
      window.alert('กรุณากรอกข้อมูลให้ครบ:\n' + errors.join('\n'));
      return;
    }
    const inputs = create.querySelectorAll('input.input');
    const name = inputs[1].value.trim();
    const amount = Number(inputs[2].value);
    const quantity = Number(inputs[3].value);
    products.push({ name, currency: selects[1].value, amount, quantity });
    saveProducts();
    inputs[1].value = '';
    inputs[2].value = '';
    inputs[3].value = '1';
    renderCreateProducts();
  });
  create.querySelector('.sticky .primary').onclick = calculateOrder;
}

setupOrderForm();
renderCreateProducts();

fetchExchangeRates().then(() => renderCreateProducts());
