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

const exchangeRates = { USD: 33, JPY: 0.22, KRW: 0.025, CNY: 4.55, EUR: 36.2 };
const countryInfo = {
  USD: ['🇺🇸', 'สหรัฐอเมริกา'], JPY: ['🇯🇵', 'ญี่ปุ่น'], KRW: ['🇰🇷', 'เกาหลีใต้'],
  CNY: ['🇨🇳', 'จีน'], EUR: ['🇪🇺', 'ยุโรป'],
};
const productIcons = ['👟', '🧸', '👕', '🎧', '⌚'];
let products = [
  { name: 'Shoes', currency: 'USD', amount: 50, quantity: 1 },
  { name: 'Figure', currency: 'JPY', amount: 5000, quantity: 1 },
  { name: 'Shirt', currency: 'KRW', amount: 30000, quantity: 1 },
];

const money = (amount) => `฿ ${Math.round(amount).toLocaleString('th-TH')}`;
const productTotal = (product) => product.amount * product.quantity * exchangeRates[product.currency];
const totalProducts = () => products.reduce((sum, product) => sum + productTotal(product), 0);

function removeProduct(index) {
  products.splice(index, 1);
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

  create.querySelector('.secondary').addEventListener('click', () => {
    const inputs = create.querySelectorAll('input.input');
    const name = inputs[1].value.trim();
    const amount = Number(inputs[2].value);
    const quantity = Number(inputs[3].value);
    if (!name || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      window.alert('กรุณากรอกชื่อสินค้า ราคา และจำนวนให้ถูกต้อง');
      return;
    }
    products.push({ name, currency: selects[1].value, amount, quantity });
    inputs[1].value = '';
    inputs[2].value = '';
    inputs[3].value = '1';
    renderCreateProducts();
  });
  create.querySelector('.sticky .primary').onclick = calculateOrder;
}

setupOrderForm();
renderCreateProducts();
