// =========================================
// LÕI HỆ THỐNG THÔNG BÁO XỊN (AppModal)
// =========================================
const AppModal = {
    init: function() {
        if (document.getElementById('custom-modal-overlay')) return;
        const html = `
            <div id="custom-modal-overlay" class="custom-modal-overlay">
                <div class="custom-modal">
                    <div id="custom-modal-icon" class="custom-modal-icon"></div>
                    <h3 id="custom-modal-title" class="custom-modal-title"></h3>
                    <p id="custom-modal-msg" class="custom-modal-msg"></p>
                    <div class="custom-modal-actions">
                        <button id="custom-modal-cancel" class="custom-modal-btn modal-btn-cancel">Hủy</button>
                        <button id="custom-modal-ok" class="custom-modal-btn modal-btn-ok">Đồng ý</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },
    show: function(options) {
        this.init();
        const overlay = document.getElementById('custom-modal-overlay');
        const icon = document.getElementById('custom-modal-icon');
        const title = document.getElementById('custom-modal-title');
        const msg = document.getElementById('custom-modal-msg');
        const btnCancel = document.getElementById('custom-modal-cancel');
        const btnOk = document.getElementById('custom-modal-ok');

        title.innerText = options.title || 'Thông báo';
        msg.innerHTML = options.msg || '';

        let iconHtml = '', btnClass = '';
        switch(options.type) {
            case 'success':
                iconHtml = '<i class="fa-regular fa-circle-check"></i>';
                icon.className = 'custom-modal-icon success';
                btnClass = 'btn-success'; break;
            case 'error':
                iconHtml = '<i class="fa-regular fa-circle-xmark"></i>';
                icon.className = 'custom-modal-icon error';
                btnClass = 'btn-danger'; break;
            case 'warning':
                iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';
                icon.className = 'custom-modal-icon warning';
                btnClass = 'btn-danger'; break;
            default:
                iconHtml = '<i class="fa-solid fa-circle-info"></i>';
                icon.className = 'custom-modal-icon info';
                btnClass = '';
        }
        icon.innerHTML = iconHtml;
        btnOk.className = 'custom-modal-btn modal-btn-ok ' + btnClass;
        btnOk.innerText = options.okText || 'Đồng ý';

        if (options.showCancel) {
            btnCancel.classList.add('show');
            btnCancel.innerText = options.cancelText || 'Hủy';
        } else {
            btnCancel.classList.remove('show');
        }

        overlay.classList.add('active');
        btnOk.onclick = () => { overlay.classList.remove('active'); if (options.onOk) options.onOk(); };
        btnCancel.onclick = () => { overlay.classList.remove('active'); if (options.onCancel) options.onCancel(); };
    },
    alert: function(msg, type = 'info', title = 'Thông báo', onOk = null) { this.show({ msg, type, title, onOk, showCancel: false }); },
    confirm: function(msg, onOk, title = 'Xác nhận') { this.show({ msg, type: 'warning', title, onOk, showCancel: true, okText: 'Đồng ý', cancelText: 'Đóng' }); }
};

// =========================================
// XỬ LÝ MENU BA GẠCH & XÁC THỰC
// =========================================
function toggleUserMenu() {
    document.getElementById("user-dropdown").classList.toggle("show");
}
window.onclick = function(event) {
    if (!event.target.matches('.hamburger-btn') && !event.target.matches('.hamburger-btn i')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
        }
    }
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = "login.html";
    } else {
        const user = localStorage.getItem('currentUser');
        const branch = localStorage.getItem('currentBranch'); 
        const role = localStorage.getItem('currentRole');
        
        const userElement = document.getElementById('current-username');
        const branchElement = document.getElementById('current-branch-name');
        
        if(userElement && user) userElement.innerText = user;
        if(branchElement && branch) branchElement.innerText = branch; 

        // Nếu là Thu ngân, vẽ lại menu nhưng CÓ THÊM nút xem báo cáo
        if (role === 'Thu ngân') {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) {
                dropdown.innerHTML = `
                    <div style="padding: 10px 20px; font-size: 0.9rem; color: #a4b0be; text-align: center; border-bottom: 1px solid #eee;">
                        Vai trò: Thu ngân
                    </div>
                    <a href="manager.html"><i class="fa-solid fa-chart-pie" style="color: #0984e3;"></i> Quản lý cửa hàng</a>
                    
                    <!-- ĐÃ THÊM LẠI NÚT XEM BÁO CÁO CHO THU NGÂN -->
                    <a href="#" onclick="openPOSReportModal()"><i class="fa-solid fa-chart-line" style="color: #00b894;"></i> Xem báo cáo doanh thu</a>
                    
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="logout()" style="color: #d63031;"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</a>
                `;
            }
        }
    }
}

function logout() {
    AppModal.confirm("Bạn có muốn đăng xuất khỏi máy POS này?", () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentBranch');
        window.location.href = "login.html";
    }, "Đăng xuất");
}

checkAuth();

// =========================================
// LOGIC BÁN HÀNG VÀ ĐỒNG BỘ DỮ LIỆU
// =========================================
let products = []; 
let currentOrder = [];
let currentCategoryFilter = 'all';
let currentSearchQuery = ''; 

// Dữ liệu Cloud toàn cục cho thanh toán
let pos_goods = [];
let pos_invoices = [];
let posCategoriesList = ['all'];

function formatMoney(amount) {
    return amount.toLocaleString('vi-VN') + 'đ';
}

function removeAccents(str) {
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/Đ/g, 'D')
              .toLowerCase()
              .trim();
}

function handleSearch(event) {
    currentSearchQuery = event.target.value;
    renderProducts(); 
}

function filterCategory(catName, btnElement = null) {
    if (currentCategoryFilter === catName && !btnElement) return;
    
    currentCategoryFilter = catName;
    
    const buttons = document.querySelectorAll('.categories button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    let targetBtn = btnElement;
    if (!targetBtn) {
        targetBtn = document.querySelector(`.categories button[data-cat="${catName}"]`);
    }
    if (targetBtn) {
        targetBtn.classList.add('active');
        targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    const grid = document.getElementById('product-grid');
    if (grid) {
        grid.style.transition = 'opacity 0.15s ease-in-out';
        grid.style.opacity = 0;
        setTimeout(() => {
            renderProducts();
            grid.style.opacity = 1;
        }, 150);
    } else {
        renderProducts();
    }
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    let filteredProducts = products;
    
    // Lọc theo danh mục
    if (currentCategoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === currentCategoryFilter);
    }
    
    // Lọc theo từ khóa tìm kiếm
    if (currentSearchQuery.trim() !== '') {
        const normalizedQuery = removeAccents(currentSearchQuery);
        filteredProducts = filteredProducts.filter(p => {
            const normalizedProductName = removeAccents(p.name);
            return normalizedProductName.includes(normalizedQuery);
        });
    }
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; color: #adb5bd; text-align: center; margin-top: 40px; font-size: 1.1rem;"><i class="fa-regular fa-face-frown-open"></i> Không tìm thấy món ăn nào phù hợp.</p>';
        return;
    }

    filteredProducts.forEach(p => {
        // NẾU MÓN CÓ NHIỀU SIZE: Tách mỗi size thành 1 ô riêng biệt trên lưới
        if (p.hasSizes && p.sizes && p.sizes.length > 0) {
            p.sizes.forEach((size, index) => {
                const div = document.createElement('div');
                div.className = 'product-card';
                // Đưa tên size xuống dòng nhỏ để dễ nhìn
                div.innerHTML = `
                    <div class="product-name">${p.name} <br><small style="color: #636e72; font-size: 0.85em; font-weight: normal;">(Size ${size.name})</small></div>
                    <div class="product-price">${formatMoney(size.price)}</div>
                `;
                
                // Khi bấm vào sẽ thêm trực tiếp vào đơn hàng với giá và công thức của size đó
                div.onclick = () => {
                    let customizedProduct = { ...p };
                    customizedProduct.baseId = p.id; // Lưu lại ID gốc để hệ thống biết trừ kho chính xác
                    customizedProduct.id = `${p.id}-SZ${index}`;
                    customizedProduct.name = `${p.name} <br><small style="color: #636e72; font-size: 0.85em; font-weight: normal;">(Size ${size.name})</small>`;
                    customizedProduct.price = size.price;
                    customizedProduct.ingredients = size.ingredients || []; // Nạp công thức riêng của size
                    
                    addToOrder(customizedProduct);
                };
                grid.appendChild(div);
            });
        } 
        // NẾU MÓN KHÔNG CÓ SIZE: Giữ nguyên giao diện hiển thị 1 ô cũ
        else {
            const div = document.createElement('div');
            div.className = 'product-card';
            div.innerHTML = `<div class="product-name">${p.name}</div><div class="product-price">${formatMoney(p.price)}</div>`;
            div.onclick = () => {
                let directProduct = { ...p };
                directProduct.baseId = p.id;
                addToOrder(directProduct);
            };
            grid.appendChild(div);
        }
    });
}

function addToOrder(product) {
    const existingItem = currentOrder.find(item => item.id === product.id);
    if (existingItem) existingItem.qty++;
    else currentOrder.push({ ...product, qty: 1 });
    updateOrderUI();
}

function updateOrderUI() {
    const container = document.getElementById('order-items');
    if (!container) return;
    container.innerHTML = '';
    
    let totalAmount = 0, totalQty = 0;

    if (currentOrder.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #adb5bd; margin-top: 40px;">Đơn hàng trống</p>';
    }

    currentOrder.forEach(item => {
        totalAmount += item.price * item.qty;
        totalQty += item.qty;
        const div = document.createElement('div');
        div.className = 'order-item';
        
        // CẬP NHẬT: Thêm nút thùng rác màu đỏ bên cạnh Tổng tiền của món
        div.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${formatMoney(item.price)}</div>
            </div>
            <div class="item-qty-controls">
                <button onclick="changeQty('${item.id}', -1)">-</button>
                <span style="min-width: 20px; text-align: center; font-weight: bold;">${item.qty}</span>
                <button onclick="changeQty('${item.id}', 1)">+</button>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="item-total">${formatMoney(item.price * item.qty)}</div>
                <button onclick="removeOrderItem('${item.id}')" style="background: #ff7675; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#d63031'" onmouseout="this.style.background='#ff7675'">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('total-qty').innerText = totalQty;
    document.getElementById('sub-total').innerText = formatMoney(totalAmount);
    document.getElementById('total-price').innerText = formatMoney(totalAmount);
}

function changeQty(id, delta) {
    const item = currentOrder.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) currentOrder = currentOrder.filter(i => i.id !== id);
        updateOrderUI();
    }
}
// Hàm xóa thẳng món ăn khỏi hóa đơn
function removeOrderItem(id) {
    currentOrder = currentOrder.filter(item => item.id !== id);
    updateOrderUI();
}
function clearOrder() {
    if (currentOrder.length > 0) {
        AppModal.confirm('Tất cả các món đang chọn sẽ bị xóa. Bạn chắc chắn muốn hủy đơn này?', () => {
            currentOrder = [];
            updateOrderUI();
        }, 'Hủy đơn hàng');
    }
}





function checkout() {
    if (currentOrder.length === 0) {
        AppModal.alert('Vui lòng chọn ít nhất một món để thanh toán.', 'warning', 'Đơn hàng trống');
        return;
    }
    
    // === 1. XỬ LÝ TỰ ĐỘNG TRỪ TỒN KHO NGUYÊN LIỆU ===
    let goods = [...pos_goods]; 
    
    currentOrder.forEach(orderItem => {
        // Cách mới Tối ưu hóa: Dùng trực tiếp bộ "ingredients" đã được chốt (theo size) ngay lúc bấm thêm món
        if (orderItem.ingredients && orderItem.ingredients.length > 0) {
            orderItem.ingredients.forEach(ing => {
                const goodIndex = goods.findIndex(g => g.id === ing.id);
                if (goodIndex > -1) {
                    goods[goodIndex].stock -= (ing.qty * orderItem.qty);
                    goods[goodIndex].stock = Math.round(goods[goodIndex].stock * 100) / 100;
                }
            });
        } 
        // Xử lý các món hàng bán lẻ trực tiếp (Thuốc lá, chai nước...)
        else if (orderItem.id.startsWith("NL") || (orderItem.baseId && orderItem.baseId.startsWith("NL"))) {
            const searchId = orderItem.baseId || orderItem.id;
            const goodIndex = goods.findIndex(g => g.id === searchId);
            if (goodIndex > -1) {
                goods[goodIndex].stock -= orderItem.qty;
                goods[goodIndex].stock = Math.round(goods[goodIndex].stock * 100) / 100;
            }
        }
    });

    saveToFirebase('goodsData', goods);

    // === 2. LƯU HÓA ĐƠN VÀO CLOUD ===
    let rawTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let invoices = [...pos_invoices]; 
    
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const newInvoice = {
        id: "HĐ" + Date.now().toString().slice(-4),
        date: todayStr,
        time: timeStr,
        cashier: localStorage.getItem('currentUser') || 'Thu ngân',
        branch: localStorage.getItem('currentBranch') || 'Chi nhánh 1',
        total: rawTotal,
        items: [...currentOrder] 
    };
    
    invoices.push(newInvoice);
    saveToFirebase('invoicesData', invoices);

    // === 3. THÔNG BÁO ===
    const totalPrice = document.getElementById('total-price').innerText;
    AppModal.alert(`Đã nhận: <b style="font-size:1.3em; color:#00b894;">${totalPrice}</b><br><br>Hóa đơn đã được đồng bộ lên Cloud.<br><small style="color:#636e72;">Đã cập nhật tự động trừ kho nguyên liệu theo Size.</small>`, 'success', 'Thanh toán thành công', () => {
        currentOrder = [];
        updateOrderUI();
    });
}
document.addEventListener('keydown', function(e) {
    if (e.key === 'F9') { e.preventDefault(); checkout(); }
});

// =========================================
// KHỞI TẠO FIREBASE & LẮNG NGHE REAL-TIME
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    
// 1. Lắng nghe và cập nhật Nhóm món ăn THỜI GIAN THỰC
listenToFirebase('categoriesData', (data) => {
    const catList = document.getElementById('category-list');
    posCategoriesList = ['all'];

    if (catList) {
        // Luôn luôn xóa sạch và tạo nút "Tất cả" mặc định trước tiên
        catList.innerHTML = `<button class="active" data-cat="all" onclick="filterCategory('all', this)">Tất cả</button>`;
        
        // Sau đó mới kiểm tra, nếu có dữ liệu nhóm thì nạp tiếp vào
        if (data && data.menu) {
            data.menu.forEach(cat => {
                posCategoriesList.push(cat.name);
                catList.innerHTML += `<button data-cat="${cat.name}" onclick="filterCategory('${cat.name}', this)">${cat.name}</button>`;
            });
        }
    }
    filterCategory(currentCategoryFilter);
});

    // 2. Lắng nghe Thực đơn & Nguyên liệu THỜI GIAN THỰC
    listenToFirebase('menuData', (menuData) => {
        listenToFirebase('goodsData', (goodsData) => {
            pos_goods = goodsData || []; // Lưu dữ liệu kho vào biến toàn cục để checkout dùng
            products = menuData || [];

            if (goodsData) {
                const sellableGoods = goodsData.filter(g => g.isSellable === true);
                const mappedGoods = sellableGoods.map(g => ({
                    id: g.id,
                    name: g.name,
                    price: g.price,
                    category: g.posCategory
                }));
                products = products.concat(mappedGoods);
            }

            renderProducts();
        });
    });

    // 3. Lắng nghe Hóa đơn THỜI GIAN THỰC
    listenToFirebase('invoicesData', (data) => {
        pos_invoices = data || [];
    });

    updateOrderUI();
});



// =========================================
// XỬ LÝ TÙY CHỈNH MÓN (ĐÁ, ĐƯỜNG, TOPPING)
// =========================================
let currentCustomizingProduct = null;

function openMobileModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden'; 
}
function closeMobileModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}



// =========================================
// CHẾ ĐỘ GIỮ MÀN HÌNH LUÔN SÁNG (WAKE LOCK)
// =========================================
let wakeLock = null;

const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Chế độ luôn sáng đã bị hủy.');
            });
        }
    } catch (err) {
        console.error(`Không thể bật chế độ luôn sáng: ${err.name}, ${err.message}`);
    }
};

document.addEventListener('DOMContentLoaded', () => { requestWakeLock(); });
document.addEventListener('click', () => { if (!wakeLock || wakeLock.released) requestWakeLock(); }, { once: true });
document.addEventListener('visibilitychange', async () => { if (wakeLock !== null && document.visibilityState === 'visible') requestWakeLock(); });

// =========================================
// XỬ LÝ LỌC BÁO CÁO DOANH THU TẠI MÀN POS
// =========================================
function openPOSReportModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-select-date').value = today;
    
    renderPOSReport(today);
    openMobileModal('pos-report-modal');
}

function handleReportDateChange(event) {
    renderPOSReport(event.target.value);
}

let posReportCurrentPage = 1;
let posReportFilteredInvoices = [];
const POS_REPORT_PAGE_SIZE = 100;

function renderPOSReport(selectedDate) {
    const currentBranch = localStorage.getItem('currentBranch') || 'Chi nhánh 1';
    
    // Lấy hóa đơn từ Cloud thay vì LocalStorage
    posReportFilteredInvoices = pos_invoices.filter(inv => {
        let invDate = inv.date;
        if (invDate.includes('/')) {
            const parts = invDate.split('/');
            invDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return invDate === selectedDate && inv.branch === currentBranch;
    });

    let totalRevenue = posReportFilteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    document.getElementById('pos-report-revenue').innerText = totalRevenue.toLocaleString('vi-VN') + 'đ';
    document.getElementById('pos-report-orders').innerText = posReportFilteredInvoices.length;

    posReportCurrentPage = 1;
    displayPOSReportPage();
}

// =========================================
// TÍNH NĂNG VUỐT (SWIPE) CHUYỂN NHÓM TRÊN MOBILE
// =========================================
let touchStartX = 0; let touchEndX = 0; let touchStartY = 0; let touchEndY = 0;

function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }
function handleTouchEnd(e) { touchEndX = e.changedTouches[0].screenX; touchEndY = e.changedTouches[0].screenY; handleSwipeGesture(); }

function handleSwipeGesture() {
    const SWIPE_THRESHOLD_X = 60; 
    const SWIPE_THRESHOLD_Y = 50; 
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffY) < SWIPE_THRESHOLD_Y) {
        if (diffX < -SWIPE_THRESHOLD_X) switchCategoryBySwipe(1);
        if (diffX > SWIPE_THRESHOLD_X) switchCategoryBySwipe(-1);
    }
}

function switchCategoryBySwipe(direction) {
    let currentIndex = posCategoriesList.indexOf(currentCategoryFilter);
    if (currentIndex === -1) currentIndex = 0;

    let newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < posCategoriesList.length) {
        const nextCategory = posCategoriesList[newIndex];
        filterCategory(nextCategory);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        productGrid.addEventListener('touchstart', handleTouchStart, false);
        productGrid.addEventListener('touchend', handleTouchEnd, false);
    }
});

function displayPOSReportPage() {
    const listContainer = document.getElementById('pos-report-invoice-list');
    const paginationContainer = document.getElementById('pos-report-pagination');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    if (paginationContainer) paginationContainer.innerHTML = '';

    if (posReportFilteredInvoices.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #a4b0be; padding: 20px 0; font-style: italic;">Không có dữ liệu bán hàng cho ngày này.</p>';
        return;
    }

    const totalPages = Math.ceil(posReportFilteredInvoices.length / POS_REPORT_PAGE_SIZE);
    if (posReportCurrentPage > totalPages) posReportCurrentPage = totalPages;
    if (posReportCurrentPage < 1) posReportCurrentPage = 1;

    const startIndex = (posReportCurrentPage - 1) * POS_REPORT_PAGE_SIZE;
    const endIndex = startIndex + POS_REPORT_PAGE_SIZE;
    const pageItems = posReportFilteredInvoices.slice(startIndex, endIndex);

    pageItems.forEach(inv => {
        const timeDisplay = inv.time ? `[${inv.time}]` : '';
        const div = document.createElement('div');
        div.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #fff; border: 1px solid #edf2f7; border-radius: 8px; font-size: 0.95rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);";
        div.innerHTML = `
            <div>
                <strong style="color: #2d3436;">${inv.id}</strong> 
                <span style="color: #a4b0be; font-size: 0.85rem; margin-left: 5px;">${timeDisplay} - ${inv.cashier}</span>
            </div>
            <span style="font-weight: 700; color: #0984e3;">${inv.total.toLocaleString('vi-VN')}đ</span>
        `;
        listContainer.appendChild(div);
    });

    if (totalPages > 1 && paginationContainer) {
        paginationContainer.innerHTML = `
            <button onclick="goToPOSReportPage(1)" ${posReportCurrentPage === 1 ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #dfe6e9; background: #fff; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-angles-left"></i> Đầu</button>
            <button onclick="goToPOSReportPage(${posReportCurrentPage - 1})" ${posReportCurrentPage === 1 ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #dfe6e9; background: #fff; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-angle-left"></i> Trước</button>
            
            <span style="font-size: 0.95rem; color: #2d3436; display: flex; align-items: center; gap: 6px;">
                Trang 
                <input type="number" id="pos-page-input" value="${posReportCurrentPage}" min="1" max="${totalPages}" onchange="jumpToPOSReportPage(this.value, ${totalPages})" style="width: 55px; text-align: center; padding: 6px; border: 1px solid #dfe6e9; border-radius: 6px; outline: none; font-weight: bold;"> 
                / <b>${totalPages}</b>
            </span>

            <button onclick="goToPOSReportPage(${posReportCurrentPage + 1})" ${posReportCurrentPage === totalPages ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #dfe6e9; background: #fff; border-radius: 6px; cursor: pointer;">Sau <i class="fa-solid fa-angle-right"></i></button>
            <button onclick="goToPOSReportPage(${totalPages})" ${posReportCurrentPage === totalPages ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #dfe6e9; background: #fff; border-radius: 6px; cursor: pointer;">Cuối <i class="fa-solid fa-angles-right"></i></button>
        `;
    }
}

function goToPOSReportPage(page) { posReportCurrentPage = page; displayPOSReportPage(); }
function jumpToPOSReportPage(val, totalPages) {
    const page = parseInt(val);
    if (page >= 1 && page <= totalPages) { posReportCurrentPage = page; displayPOSReportPage(); } 
    else { document.getElementById('pos-page-input').value = posReportCurrentPage; }
}