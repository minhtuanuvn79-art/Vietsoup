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
        const role = localStorage.getItem('currentRole'); // Lấy quyền hạn của người đăng nhập
        
        const userElement = document.getElementById('current-username');
        const branchElement = document.getElementById('current-branch-name');
        
        if(userElement && user) userElement.innerText = user;
        if(branchElement && branch) branchElement.innerText = branch; 

// Nếu là Thu Ngân -> Ẩn nút "Hệ thống tổng" (Admin) nhưng vẫn giữ nút "Quản lý cửa hàng"
if (role === 'Thu ngân') {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.innerHTML = `
            <div style="padding: 10px 20px; font-size: 0.9rem; color: #a4b0be; text-align: center; border-bottom: 1px solid #eee;">
                Vai trò: Thu ngân
            </div>
            <a href="manager.html"><i class="fa-solid fa-chart-pie" style="color: #0984e3;"></i> Quản lý cửa hàng</a>
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

// THÊM BIẾN LƯU TỪ KHÓA TÌM KIẾM
let currentSearchQuery = ''; 

function formatMoney(amount) {
    return amount.toLocaleString('vi-VN') + 'đ';
}

// -----------------------------------------
// THUẬT TOÁN TÌM KIẾM THÔNG MINH
// -----------------------------------------
// Hàm xóa dấu tiếng Việt, chuyển chữ HOA thành chữ thường để tìm kiếm tuyệt đối
function removeAccents(str) {
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/Đ/g, 'D')
              .toLowerCase()
              .trim();
}

// Hàm được gọi mỗi khi người dùng gõ phím vào ô tìm kiếm
function handleSearch(event) {
    currentSearchQuery = event.target.value;
    renderProducts(); // Render lại danh sách sau mỗi ký tự được gõ
}
// -----------------------------------------

// Biến lưu danh sách thứ tự các nhóm (để phục vụ tính năng vuốt)
let posCategoriesList = ['all'];

function loadCategoriesToPOS() {
    const savedCategories = localStorage.getItem('categoriesData');
    const catList = document.getElementById('category-list');
    
    // Reset lại mảng mỗi lần tải
    posCategoriesList = ['all'];

    if (savedCategories && catList) {
        const parsedCats = JSON.parse(savedCategories);
        // Thêm data-cat để JS dễ dàng tìm và CSS active
        catList.innerHTML = `<button class="active" data-cat="all" onclick="filterCategory('all', this)">Tất cả</button>`;
        
        parsedCats.menu.forEach(cat => {
            posCategoriesList.push(cat.name); // Đẩy tên nhóm vào mảng thứ tự
            catList.innerHTML += `<button data-cat="${cat.name}" onclick="filterCategory('${cat.name}', this)">${cat.name}</button>`;
        });
    }
}

function loadMenuToPOS() {
    // 1. Đồng bộ danh mục món ăn từ thực đơn gốc trước
    const savedMenu = localStorage.getItem('menuData');
    if (savedMenu) {
        products = JSON.parse(savedMenu);
    } else {
        products = [];
    }
    
    // 2. Đồng bộ các mặt hàng đa năng vừa làm nguyên liệu vừa bán lẻ từ kho
    const savedGoods = localStorage.getItem('goodsData');
    if (savedGoods) {
        const goods = JSON.parse(savedGoods);
        const sellableGoods = goods.filter(g => g.isSellable === true);
        
        // Chuẩn hóa cấu trúc bản ghi kho khớp hoàn toàn với cấu trúc thực đơn ngoài POS
        const mappedGoods = sellableGoods.map(g => {
            return {
                id: g.id,
                name: g.name,
                price: g.price,
                category: g.posCategory // Áp dụng nhóm hiển thị tại POS để khớp bộ lọc danh mục
            };
        });
        
        // Gộp chung vào danh sách hiển thị bán hàng của POS
        products = products.concat(mappedGoods);
    }
}

function filterCategory(catName, btnElement = null) {
    // Tránh việc render lại nếu đang ở đúng tab đó
    if (currentCategoryFilter === catName && !btnElement) return;
    
    currentCategoryFilter = catName;
    
    // 1. Cập nhật giao diện thanh nút bấm
    const buttons = document.querySelectorAll('.categories button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    let targetBtn = btnElement;
    if (!targetBtn) {
        // Nếu chuyển tab bằng cách vuốt (không có btnElement truyền vào), tự động tìm nút tương ứng
        targetBtn = document.querySelector(`.categories button[data-cat="${catName}"]`);
    }
    if (targetBtn) {
        targetBtn.classList.add('active');
        // Tự động cuộn thanh menu ngang đến vị trí nút đang active
        targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    // 2. Tạo hiệu ứng mờ dần (Fade-out) trước khi đổi món
    const grid = document.getElementById('product-grid');
    if (grid) {
        grid.style.transition = 'opacity 0.15s ease-in-out';
        grid.style.opacity = 0;
        
        // Render lại danh sách sau khi đã làm mờ, rồi làm rõ dần (Fade-in)
        setTimeout(() => {
            renderProducts();
            grid.style.opacity = 1;
        }, 150);
    } else {
        renderProducts();
    }
}

// NÂNG CẤP HÀM RENDER ĐỂ TÍCH HỢP BỘ LỌC TÌM KIẾM KÉP
function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    let filteredProducts = products;
    
    // 1. Lọc theo Nhóm (Nếu có chọn)
    if (currentCategoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === currentCategoryFilter);
    }
    
    // 2. Lọc theo Từ khóa tìm kiếm (Thông minh không dấu)
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
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `<div class="product-name">${p.name}</div><div class="product-price">${formatMoney(p.price)}</div>`;
        div.onclick = () => openProductOptions(p); // <-- Đã sửa dòng này
        grid.appendChild(div);
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
        div.innerHTML = `
            <div class="item-info"><div class="item-name">${item.name}</div><div class="item-price">${formatMoney(item.price)}</div></div>
            <div class="item-qty-controls">
                <button onclick="changeQty('${item.id}', -1)">-</button>
                <span style="min-width: 20px; text-align: center;">${item.qty}</span>
                <button onclick="changeQty('${item.id}', 1)">+</button>
            </div>
            <div class="item-total">${formatMoney(item.price * item.qty)}</div>
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
    let goods = JSON.parse(localStorage.getItem('goodsData')) || [];
    
    currentOrder.forEach(orderItem => {
        // Lấy thông tin gốc của món ăn/mặt hàng từ mảng products
        const menuData = products.find(p => p.id === orderItem.id);

        if (menuData) {
            // Trường hợp 1: Là Món ăn có định lượng công thức
            if (menuData.ingredients && menuData.ingredients.length > 0) {
                menuData.ingredients.forEach(ing => {
                    const goodIndex = goods.findIndex(g => g.id === ing.id);
                    if (goodIndex > -1) {
                        // Trừ kho = (số lượng nguyên liệu của 1 món) x (số lượng món khách gọi)
                        goods[goodIndex].stock -= (ing.qty * orderItem.qty);
                        // Đảm bảo làm tròn 2 chữ số thập phân tránh lỗi JS (vd: 0.1 + 0.2 = 0.30000004)
                        goods[goodIndex].stock = Math.round(goods[goodIndex].stock * 100) / 100;
                    }
                });
            } 
            // Trường hợp 2: Là Mặt hàng bán lẻ trực tiếp (Lon nước, chai suối...)
            else if (menuData.id.startsWith("NL")) {
                const goodIndex = goods.findIndex(g => g.id === menuData.id);
                if (goodIndex > -1) {
                    goods[goodIndex].stock -= orderItem.qty;
                }
            }
        }
    });

    // Lưu lại dữ liệu kho mới
    localStorage.setItem('goodsData', JSON.stringify(goods));
    // ===============================================
    // === 2. LƯU HÓA ĐƠN VÀO HỆ THỐNG ĐỂ LÀM BÁO CÁO ===
    // Lấy tổng tiền số thô của đơn hàng hiện tại
    let rawTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Lấy mảng hóa đơn cũ hoặc khởi tạo mảng trống nếu chưa có đơn nào
    let invoices = JSON.parse(localStorage.getItem('invoicesData')) || [];
    
    // Định dạng ngày hiện tại chuẩn YYYY-MM-DD để dễ đối chiếu
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// Đảm bảo hóa đơn được gán đúng chi nhánh để chia tách dữ liệu
    const newInvoice = {
        id: "HĐ" + Date.now().toString().slice(-4),
        date: todayStr,
        time: timeStr,
        cashier: localStorage.getItem('currentUser') || 'Thu ngân',
        branch: localStorage.getItem('currentBranch') || 'Chi nhánh 1',
        total: rawTotal,
        // THÊM DÒNG DƯỚI ĐÂY ĐỂ LƯU DANH SÁCH MÓN ĂN VÀO HÓA ĐƠN
        items: [...currentOrder] 
    };
    
    invoices.push(newInvoice);
    localStorage.setItem('invoicesData', JSON.stringify(invoices));
    // =================================================

    // === 3. HIỂN THỊ THÔNG BÁO VÀ LÀM MỚI MÀN HÌNH ===
    const totalPrice = document.getElementById('total-price').innerText;
    AppModal.alert(`Đã nhận: <b style="font-size:1.3em; color:#00b894;">${totalPrice}</b><br><br>Hóa đơn đã được ghi nhận vào hệ thống.<br><small style="color:#636e72;">Đã cập nhật tự động trừ kho nguyên liệu.</small>`, 'success', 'Thanh toán thành công', () => {
        // Xóa sạch giỏ hàng và cập nhật lại giao diện sau khi thanh toán xong
        currentOrder = [];
        updateOrderUI();
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'F9') { e.preventDefault(); checkout(); }
});

// Chạy tự động đồng bộ khi mở màn hình Thu ngân
document.addEventListener('DOMContentLoaded', () => {
    loadCategoriesToPOS();
    loadMenuToPOS();
    renderProducts();
    updateOrderUI();
});

/* =========================================
   BẢO MẬT: NGĂN CHẶN MỞ CONSOLE VÀ DEVTOOLS
========================================= */
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || (e.ctrlKey && e.key === 'U')) {
        e.preventDefault(); console.clear();
    }
});
// =========================================
// XỬ LÝ TÙY CHỈNH MÓN (ĐÁ, ĐƯỜNG, TOPPING)
// =========================================
let currentCustomizingProduct = null;

// Hàm 1: Đóng/Mở Modal
function openMobileModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden'; 
}
function closeMobileModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

// Hàm 2: Gọi Modal hiện lên và điền thông tin món vừa chọn
function openProductOptions(product) {
    currentCustomizingProduct = product;
    
    // Đổi tiêu đề thành tên món
    document.getElementById('mobile-modal-product-name').innerText = product.name;
    
    // Trả các ô select về mặc định
    document.getElementById('option-sugar').value = '100%';
    document.getElementById('option-ice').value = '100%';
    document.getElementById('option-topping').value = 'Không';
    
    openMobileModal('product-options-modal');
}

// Hàm 3: Nhận thông tin, tính toán và thêm vào giỏ hàng (Đơn hàng)
function confirmAddCustomizedProduct() {
    if (!currentCustomizingProduct) return;
    
    const sugar = document.getElementById('option-sugar').value;
    const ice = document.getElementById('option-ice').value;
    const topping = document.getElementById('option-topping').value;
    
    // Tạo 1 bản sao của món ăn để chỉnh sửa, tránh làm lỗi giá gốc trên thực đơn
    let customizedProduct = { ...currentCustomizingProduct };
    
    // Tạo chuỗi ghi chú (VD: 50% Đường, 50% Đá)
    let optionsText = `(${sugar} Đường, ${ice} Đá`;
    
    // Nếu có chọn topping, tự động tính thêm 5.000đ vào giá bán
    if (topping !== 'Không') {
        optionsText += `, + ${topping}`;
        customizedProduct.price += 5000; 
    }
    optionsText += `)`;
    
    // Gắn phần ghi chú nhỏ màu xám ngay dưới tên món ăn trong Giỏ hàng
    customizedProduct.name = `${customizedProduct.name} <br><small style="color: #636e72; font-size: 0.85em; font-weight: normal;">${optionsText}</small>`;
    
    // Tạo mã ID độc nhất cho món ăn đi kèm tùy chỉnh này (để tránh bị gộp chung số lượng với ly bình thường)
    customizedProduct.id = `${customizedProduct.id}-${sugar}-${ice}-${topping}`;
    
    // Gọi hàm có sẵn của hệ thống để quăng vào Đơn hàng
    addToOrder(customizedProduct);
    
    // Đóng bảng lại
    closeMobileModal('product-options-modal');
}
// =========================================
// CHẾ ĐỘ GIỮ MÀN HÌNH LUÔN SÁNG (WAKE LOCK)
// =========================================
let wakeLock = null;

const requestWakeLock = async () => {
    try {
        // Kiểm tra xem trình duyệt có hỗ trợ tính năng này không
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Chế độ luôn sáng màn hình đã được bật.');
            
            // Lắng nghe sự kiện nếu hệ thống tự hủy Wake Lock (ví dụ pin yếu)
            wakeLock.addEventListener('release', () => {
                console.log('Chế độ luôn sáng đã bị hủy.');
            });
        }
    } catch (err) {
        console.error(`Không thể bật chế độ luôn sáng: ${err.name}, ${err.message}`);
    }
};

// 1. Cố gắng bật ngay khi trang vừa tải xong
document.addEventListener('DOMContentLoaded', () => {
    requestWakeLock();
});

// 2. Kích hoạt dự phòng: Đa số trình duyệt di động (như Safari, Chrome) 
// yêu cầu người dùng phải chạm vào màn hình ít nhất 1 lần thì mới cho phép chạy API này.
document.addEventListener('click', () => {
    if (!wakeLock || wakeLock.released) {
        requestWakeLock();
    }
}, { once: true }); // Tham số once: true giúp sự kiện này chỉ kích hoạt 1 lần duy nhất để tránh giật lag

// 3. Phục hồi: Trình duyệt sẽ tự động tắt tính năng này nếu nhân viên thu nhỏ trình duyệt 
// hoặc chuyển sang tab khác. Đoạn code này giúp bật lại khi họ quay lại tab POS.
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});
// =========================================
// XỬ LÝ LỌC BÁO CÁO DOANH THU TẠI MÀN POS
// =========================================
function openPOSReportModal() {
    // Tự động gán ngày hôm nay vào ô chọn lịch khi vừa mở bảng báo cáo lên
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-select-date').value = today;
    
    renderPOSReport(today);
    openMobileModal('pos-report-modal');
}

function handleReportDateChange(event) {
    renderPOSReport(event.target.value);
}

// Biến toàn cục kiểm soát phân trang màn hình POS
let posReportCurrentPage = 1;
let posReportFilteredInvoices = [];
const POS_REPORT_PAGE_SIZE = 100;

function renderPOSReport(selectedDate) {
    const currentBranch = localStorage.getItem('currentBranch') || 'Chi nhánh 1';
    const invoices = JSON.parse(localStorage.getItem('invoicesData')) || [];
    
    // Lọc hóa đơn theo ngày và đúng chi nhánh trực thuộc
    posReportFilteredInvoices = invoices.filter(inv => {
        let invDate = inv.date;
        if (invDate.includes('/')) {
            const parts = invDate.split('/');
            invDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return invDate === selectedDate && inv.branch === currentBranch;
    });

    // Tính tổng doanh thu và tổng số đơn dựa trên TOÀN BỘ hóa đơn của ngày đó
    let totalRevenue = posReportFilteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    document.getElementById('pos-report-revenue').innerText = totalRevenue.toLocaleString('vi-VN') + 'đ';
    document.getElementById('pos-report-orders').innerText = posReportFilteredInvoices.length;

    // Mỗi lần đổi ngày, reset về trang đầu tiên
    posReportCurrentPage = 1;
    displayPOSReportPage();
}
// =========================================
// TÍNH NĂNG VUỐT (SWIPE) CHUYỂN NHÓM TRÊN MOBILE
// =========================================
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

function handleTouchStart(e) {
    // Lấy tọa độ X và Y lúc ngón tay vừa chạm vào màn hình
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
    // Lấy tọa độ X và Y lúc ngón tay nhấc lên
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
}

function handleSwipeGesture() {
    const SWIPE_THRESHOLD_X = 60; // Khoảng cách vuốt ngang tối thiểu để tính là lướt qua trang
    const SWIPE_THRESHOLD_Y = 50; // Giới hạn vuốt dọc (tránh nhầm lẫn với việc khách đang cuộn menu xuống xem món)
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Chỉ xử lý chuyển tab nếu vuốt ngang dài hơn vuốt dọc (chắc chắn là hành động lướt qua lại)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffY) < SWIPE_THRESHOLD_Y) {
        
        // Vuốt sang TRÁI (ngón tay kéo từ phải qua trái) -> Chuyển sang nhóm TIẾP THEO
        if (diffX < -SWIPE_THRESHOLD_X) {
            switchCategoryBySwipe(1);
        }
        
        // Vuốt sang PHẢI (ngón tay kéo từ trái qua phải) -> Chuyển về nhóm TRƯỚC ĐÓ
        if (diffX > SWIPE_THRESHOLD_X) {
            switchCategoryBySwipe(-1);
        }
    }
}

function switchCategoryBySwipe(direction) {
    // Tìm vị trí của nhóm hàng hiện tại trong mảng
    let currentIndex = posCategoriesList.indexOf(currentCategoryFilter);
    if (currentIndex === -1) currentIndex = 0;

    // Tính vị trí trang tiếp theo
    let newIndex = currentIndex + direction;
    
    // Chặn không cho vượt quá giới hạn (Trang đầu tiên hoặc trang cuối cùng)
    if (newIndex >= 0 && newIndex < posCategoriesList.length) {
        const nextCategory = posCategoriesList[newIndex];
        filterCategory(nextCategory); // Gọi lại hàm lọc
    }
}

// Kích hoạt "cảm biến" trên khung danh sách món ăn khi trang web tải xong
document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        // Gắn sự kiện cảm ứng
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

    // Cắt mảng dữ liệu để chỉ hiển thị tối đa 100 hóa đơn của trang hiện tại
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

    // Render bộ điều hướng phân trang nếu tổng số trang > 1
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

function goToPOSReportPage(page) {
    posReportCurrentPage = page;
    displayPOSReportPage();
}

function jumpToPOSReportPage(val, totalPages) {
    const page = parseInt(val);
    if (page >= 1 && page <= totalPages) {
        posReportCurrentPage = page;
        displayPOSReportPage();
    } else {
        document.getElementById('pos-page-input').value = posReportCurrentPage;
    }
}