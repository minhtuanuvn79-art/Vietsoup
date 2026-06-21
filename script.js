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

        // Nếu là Thu Ngân -> Xóa các nút truy cập Quản trị trong Menu góc phải
        if (role === 'Thu ngân') {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) {
                dropdown.innerHTML = `
                    <div style="padding: 10px 20px; font-size: 0.9rem; color: #a4b0be; text-align: center; border-bottom: 1px solid #eee;">
                        Vai trò: Thu ngân
                    </div>
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

function loadCategoriesToPOS() {
    const savedCategories = localStorage.getItem('categoriesData');
    const catList = document.getElementById('category-list');
    
    if (savedCategories && catList) {
        const parsedCats = JSON.parse(savedCategories);
        catList.innerHTML = `<button class="active" onclick="filterCategory('all', this)">Tất cả</button>`;
        
        parsedCats.menu.forEach(cat => {
            catList.innerHTML += `<button onclick="filterCategory('${cat.name}', this)">${cat.name}</button>`;
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

function filterCategory(catName, btnElement) {
    currentCategoryFilter = catName;
    
    const buttons = document.querySelectorAll('.categories button');
    buttons.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    
    renderProducts();
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
    
    // === XỬ LÝ TỰ ĐỘNG TRỪ TỒN KHO ===
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
    // ===================================

    const totalPrice = document.getElementById('total-price').innerText;
    AppModal.alert(`Đã nhận: <b style="font-size:1.3em; color:#00b894;">${totalPrice}</b><br><br>Hóa đơn đã được ghi nhận vào hệ thống.<br><small style="color:#636e72;">Đã cập nhật tự động trừ kho nguyên liệu.</small>`, 'success', 'Thanh toán thành công', () => {
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