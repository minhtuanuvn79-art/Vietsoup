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
// KHỞI TẠO BIẾN DỮ LIỆU CỤC BỘ
// =========================================
let db_categories = { menu: [], goods: [] };
let db_menu = [];
let db_goods = [];
let db_invoices = [];
let db_imports = [];
let db_audits = [];

// Biến lưu trữ từ khóa tìm kiếm
let currentSearchMenu = '';
let currentSearchGood = '';

// Biến theo dõi trạng thái Sửa (Edit)
let editingCategoryType = null;
let editingCategoryId = null;
let editingMenuId = null;
let editingGoodId = null;

// Hàm chuẩn hóa tiếng Việt không dấu để tìm kiếm thông minh
function removeAccents(str) {
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/Đ/g, 'D')
              .toLowerCase()
              .trim();
}

function formatMoney(amount) {
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}

function getCurrentDate() {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

// Cập nhật hàm đổi Tab để tương thích với Menu lồng nhau
function switchManagerTab(tabId, element = null) {
    // 1. Gỡ viền xanh ở tất cả các tab (Bỏ qua thẻ chứa menu cha)
    const menuItems = document.querySelectorAll('.admin-menu li:not(.menu-group)');
    menuItems.forEach(li => li.classList.remove('active'));
    
    // 2. Kích hoạt viền xanh cho tab vừa bấm
    if (element) {
        element.classList.add('active');
    } else if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // 3. Chuyển đổi khung nội dung
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(tabId + '-tab').classList.add('active');
}

// Bổ sung hàm Đóng/Mở Dropdown Danh sách hàng hóa
function toggleSubMenu(headerElement) {
    const submenu = headerElement.nextElementSibling;
    const icon = headerElement.querySelector('.transition-icon');
    
    if (submenu.classList.contains('open')) {
        submenu.classList.remove('open');
        icon.style.transform = 'rotate(0deg)'; // Mũi tên chỉ xuống
    } else {
        submenu.classList.add('open');
        icon.style.transform = 'rotate(180deg)'; // Mũi tên lật lên
    }
}

function closeManagerModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    editingMenuId = null;
    editingGoodId = null;
}

/* =========================================
   0. QUẢN LÝ NHÓM HÀNG (CÓ CHỨC NĂNG SỬA)
========================================= */
function createCategory() {
    const type = document.getElementById('cat-type').value;
    const name = document.getElementById('cat-name').value;

    if(!name) return AppModal.alert("Vui lòng nhập tên nhóm!", "error");

    if (editingCategoryId) {
        // CẬP NHẬT NHÓM
        const index = db_categories[editingCategoryType].findIndex(c => c.id === editingCategoryId);
        if (index > -1) {
            const oldName = db_categories[editingCategoryType][index].name;
            db_categories[editingCategoryType][index].name = name;
            
            // Cập nhật tên nhóm mới cho tất cả các món ăn/nguyên liệu đang dùng nhóm cũ này
            if (editingCategoryType === 'menu') {
                db_menu.forEach(m => { if(m.category === oldName) m.category = name; });
                localStorage.setItem('menuData', JSON.stringify(db_menu));
                renderMenu();
            } else {
                db_goods.forEach(g => { if(g.category === oldName) g.category = name; });
                localStorage.setItem('goodsData', JSON.stringify(db_goods));
                renderGoods();
            }
        }
        editingCategoryId = null;
        editingCategoryType = null;
        AppModal.alert("Đã cập nhật nhóm hàng thành công!", "success");

        // Trả lại nút "Tạo mới"
        const btn = document.querySelector('#categories-tab .btn-add');
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Tạo nhóm';
        btn.style.background = '#00b894';

    } else {
        // TẠO MỚI NHÓM
        const newCat = { id: "C" + Date.now().toString().slice(-4), name: name };
        db_categories[type].push(newCat);
        AppModal.alert("Đã thêm nhóm hàng thành công!", "success");
    }
    
    localStorage.setItem('categoriesData', JSON.stringify(db_categories));
    document.getElementById('cat-name').value = '';
    
    renderCategories();
    updateCategorySelects();
}

function editCategory(type, id) {
    const cat = db_categories[type].find(c => c.id === id);
    if (!cat) return;

    editingCategoryType = type;
    editingCategoryId = id;

    document.getElementById('cat-type').value = type;
    document.getElementById('cat-name').value = cat.name;

    const btn = document.querySelector('#categories-tab .btn-add');
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cập nhật nhóm';
    btn.style.background = '#0984e3';
}

function renderCategories() {
    const menuTbody = document.getElementById('menu-cat-list');
    const goodsTbody = document.getElementById('goods-cat-list');
    
    if(menuTbody) {
        menuTbody.innerHTML = '';
        if(db_categories.menu.length === 0) menuTbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">Chưa có nhóm</td></tr>';
        else db_categories.menu.forEach(c => {
            menuTbody.innerHTML += `<tr><td>${c.name}</td><td style="width: 140px;">
                <button onclick="editCategory('menu', '${c.id}')" style="background:#0984e3; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteCategory('menu', '${c.id}')" style="background:#ff7675; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`;
        });
    }

    if(goodsTbody) {
        goodsTbody.innerHTML = '';
        if(db_categories.goods.length === 0) goodsTbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">Chưa có nhóm</td></tr>';
        else db_categories.goods.forEach(c => {
            goodsTbody.innerHTML += `<tr><td>${c.name}</td><td style="width: 140px;">
                <button onclick="editCategory('goods', '${c.id}')" style="background:#0984e3; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteCategory('goods', '${c.id}')" style="background:#ff7675; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`;
        });
    }
}

function deleteCategory(type, id) {
    AppModal.confirm("Bạn có chắc muốn xóa nhóm hàng này không?", () => {
        db_categories[type] = db_categories[type].filter(c => c.id !== id);
        localStorage.setItem('categoriesData', JSON.stringify(db_categories));
        renderCategories();
        updateCategorySelects();
    });
}

function updateCategorySelects() {
    const menuSel = document.getElementById('menu-category');
    if(menuSel) {
        menuSel.innerHTML = '<option value="">-- Chọn nhóm món --</option>';
        db_categories.menu.forEach(c => menuSel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }

    const goodsSel = document.getElementById('good-category');
    if(goodsSel) {
        goodsSel.innerHTML = '<option value="">-- Chọn nhóm NL --</option>';
        db_categories.goods.forEach(c => goodsSel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }
}


/* =========================================
   1. QUẢN LÝ THỰC ĐƠN (CÓ CHỨC NĂNG SỬA)
========================================= */
function handleSearchMenu(e) {
    currentSearchMenu = e.target.value;
    renderMenu();
}
// Thêm 1 dòng nguyên liệu vào form
function addRecipeRow(goodId = '', qty = '') {
    const container = document.getElementById('recipe-container');
    
    // Lấy danh sách nguyên liệu thả vào select
    let options = '<option value="">-- Chọn NL --</option>';
    db_goods.forEach(g => {
        const selected = g.id === goodId ? 'selected' : '';
        options += `<option value="${g.id}" ${selected}>${g.name} (${g.unit})</option>`;
    });

    const row = document.createElement('div');
    row.style = "display: flex; gap: 10px; align-items: center;";
    row.innerHTML = `
        <select class="recipe-good-id" style="flex: 2; padding: 8px; border: 1px solid #dfe6e9; border-radius: 4px; outline: none;">
            ${options}
        </select>
        <input type="number" step="0.01" class="recipe-qty" placeholder="SL dùng..." value="${qty}" style="flex: 1; padding: 8px; border: 1px solid #dfe6e9; border-radius: 4px; outline: none;">
        <button type="button" onclick="this.parentElement.remove()" style="background: #ff7675; color: white; border: none; padding: 8px; width: 35px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(row);
}

// Lấy dữ liệu công thức từ form
function getRecipeData() {
    const recipe = [];
    const rows = document.querySelectorAll('#recipe-container > div');
    rows.forEach(row => {
        const goodId = row.querySelector('.recipe-good-id').value;
        const qty = Number(row.querySelector('.recipe-qty').value);
        if (goodId && qty > 0) {
            recipe.push({ id: goodId, qty: qty });
        }
    });
    return recipe;
}
function handleSearchGood(e) {
    currentSearchGood = e.target.value;
    renderGoods();
}
function openCreateMenuModal() {
    editingMenuId = null;
    document.getElementById('menu-name').value = '';
    document.getElementById('menu-price').value = '';
    document.getElementById('menu-category').value = '';
    
    // Xóa sạch list nguyên liệu cũ
    document.getElementById('recipe-container').innerHTML = '';

    document.querySelector('#create-menu-modal h3').innerHTML = '<i class="fa-solid fa-burger"></i> Thêm món ăn / thức uống';
    const btn = document.querySelector('#create-menu-modal .custom-modal-btn:last-child');
    btn.innerHTML = 'Tạo món';
    btn.style.background = '#0984e3';

    document.getElementById('create-menu-modal').classList.add('active');
}

function editMenuItem(id) {
    const item = db_menu.find(m => m.id === id);
    if (!item) return;

    editingMenuId = id;
    document.getElementById('menu-name').value = item.name;
    document.getElementById('menu-price').value = item.price;
    document.getElementById('menu-category').value = item.category;

    // Đổ dữ liệu công thức cũ ra form
    document.getElementById('recipe-container').innerHTML = '';
    if (item.ingredients && item.ingredients.length > 0) {
        item.ingredients.forEach(ing => addRecipeRow(ing.id, ing.qty));
    }

    document.querySelector('#create-menu-modal h3').innerHTML = '<i class="fa-solid fa-pen"></i> Cập nhật thông tin món';
    const btn = document.querySelector('#create-menu-modal .custom-modal-btn:last-child');
    btn.innerHTML = 'Lưu thay đổi';
    btn.style.background = '#00b894';

    document.getElementById('create-menu-modal').classList.add('active');
}
function createMenuItem() {
    const name = document.getElementById('menu-name').value;
    const price = document.getElementById('menu-price').value;
    const category = document.getElementById('menu-category').value;
    
    // Lấy mảng công thức nguyên liệu
    const ingredients = getRecipeData();

    if(!name || !price || !category) return AppModal.alert("Vui lòng nhập tên, giá và chọn nhóm món ăn!", "error");

    if (editingMenuId) {
        const index = db_menu.findIndex(m => m.id === editingMenuId);
        if (index > -1) {
            db_menu[index].name = name;
            db_menu[index].price = Number(price);
            db_menu[index].category = category;
            db_menu[index].ingredients = ingredients; // Lưu công thức
        }
        AppModal.alert("Đã cập nhật món ăn thành công!", "success");
    } else {
        const newItem = { id: "M" + Date.now().toString().slice(-4), name, price: Number(price), category, ingredients }; // Kèm công thức
        db_menu.push(newItem);
        AppModal.alert("Đã thêm món vào thực đơn!", "success");
    }

    localStorage.setItem('menuData', JSON.stringify(db_menu));
    closeManagerModal('create-menu-modal'); 
    renderMenu();
}

function renderMenu() {
    const tbody = document.getElementById('menu-list-body');
    if(!tbody) return; tbody.innerHTML = '';
    
    // Thuật toán lọc
    let filteredMenu = db_menu;
    if(currentSearchMenu.trim() !== '') {
        const query = removeAccents(currentSearchMenu);
        filteredMenu = filteredMenu.filter(item => removeAccents(item.name).includes(query));
    }

    if(filteredMenu.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Không tìm thấy món ăn phù hợp</td></tr>'; return;
    }

    filteredMenu.forEach(item => {
        tbody.innerHTML += `
            <tr><td><strong>${item.id}</strong></td><td>${item.name}</td><td>${item.category}</td>
            <td style="color:#0984e3; font-weight:bold;">${formatMoney(item.price)}</td>
            <td>
                <button onclick="editMenuItem('${item.id}')" style="background:#0984e3; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button onclick="deleteMenuItem('${item.id}')" style="background:#ff7675; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Xóa</button>
            </td></tr>`;
    });
}

function deleteMenuItem(id) {
    AppModal.confirm("Bạn muốn xóa món này khỏi thực đơn?", () => {
        db_menu = db_menu.filter(m => m.id !== id);
        localStorage.setItem('menuData', JSON.stringify(db_menu));
        renderMenu();
    });
}


// Hàm ẩn/hiện hộp cấu hình bán lẻ lẻ
function toggleGoodPriceInput() {
    const isChecked = document.getElementById('good-is-sellable').checked;
    document.getElementById('good-sell-fields').style.display = isChecked ? 'block' : 'none';
}

// Cập nhật lại các bộ chọn danh mục nhóm hàng
function updateCategorySelects() {
    const menuSel = document.getElementById('menu-category');
    const goodPosSel = document.getElementById('good-pos-category'); 
    
    if(menuSel) {
        menuSel.innerHTML = '<option value="">-- Chọn nhóm món --</option>';
        db_categories.menu.forEach(c => menuSel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }
    if(goodPosSel) {
        goodPosSel.innerHTML = '<option value="">-- Chọn nhóm phân loại tại POS --</option>';
        db_categories.menu.forEach(c => goodPosSel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }

    const goodsSel = document.getElementById('good-category');
    if(goodsSel) {
        goodsSel.innerHTML = '<option value="">-- Chọn nhóm NL --</option>';
        db_categories.goods.forEach(c => goodsSel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    }
}

function openCreateGoodModal() {
    editingGoodId = null;
    document.getElementById('good-name').value = '';
    document.getElementById('good-unit').value = '';
    document.getElementById('good-cost').value = '';
    
    document.getElementById('good-is-sellable').checked = false;
    document.getElementById('good-price').value = '';
    document.getElementById('good-pos-category').value = '';
    toggleGoodPriceInput();
    
    document.getElementById('good-category').value = '';

    document.querySelector('#create-good-modal h3').innerHTML = '<i class="fa-solid fa-boxes-stacked"></i> Thêm hàng hóa / nguyên liệu';
    const btn = document.querySelector('#create-good-modal .custom-modal-btn:last-child');
    btn.innerHTML = 'Thêm danh mục';
    btn.style.background = '#0984e3';

    document.getElementById('create-good-modal').classList.add('active');
}

function editGoodItem(id) {
    const item = db_goods.find(g => g.id === id);
    if (!item) return;

    editingGoodId = id;
    document.getElementById('good-name').value = item.name;
    document.getElementById('good-unit').value = item.unit;
    document.getElementById('good-cost').value = item.cost || '';
    
    document.getElementById('good-is-sellable').checked = !!item.isSellable;
    document.getElementById('good-price').value = item.price || '';
    document.getElementById('good-pos-category').value = item.posCategory || '';
    toggleGoodPriceInput();
    
    document.getElementById('good-category').value = item.category;

    document.querySelector('#create-good-modal h3').innerHTML = '<i class="fa-solid fa-pen"></i> Cập nhật thông tin hàng hóa';
    const btn = document.querySelector('#create-good-modal .custom-modal-btn:last-child');
    btn.innerHTML = 'Lưu thay đổi';
    btn.style.background = '#00b894';

    document.getElementById('create-good-modal').classList.add('active');
}

function createGoodItem() {
    const name = document.getElementById('good-name').value;
    const unit = document.getElementById('good-unit').value;
    const cost = document.getElementById('good-cost').value;
    const isSellable = document.getElementById('good-is-sellable').checked;
    const price = document.getElementById('good-price').value;
    const posCategory = document.getElementById('good-pos-category').value;
    const category = document.getElementById('good-category').value;
    
    if(!name || !unit || !cost || !category) return AppModal.alert("Nhập đủ tên, đơn vị, giá vốn và chọn nhóm quản lý kho!", "error");
    if(isSellable && (!price || !posCategory)) return AppModal.alert("Vui lòng nhập giá bán lẻ và chọn nhóm hiển thị ngoài POS!", "error");

    if (editingGoodId) {
        const index = db_goods.findIndex(g => g.id === editingGoodId);
        if (index > -1) {
            db_goods[index].name = name;
            db_goods[index].unit = unit;
            db_goods[index].cost = Number(cost);
            db_goods[index].isSellable = isSellable;
            db_goods[index].price = isSellable ? Number(price) : null;
            db_goods[index].posCategory = isSellable ? posCategory : null;
            db_goods[index].category = category;
        }
        AppModal.alert("Đã cập nhật thông tin thành công!", "success");
    } else {
        db_goods.push({ 
            id: "NL" + Date.now().toString().slice(-4), 
            name, 
            category, 
            unit, 
            cost: Number(cost), 
            isSellable, 
            price: isSellable ? Number(price) : null, 
            posCategory: isSellable ? posCategory : null,
            stock: 0 
        });
        AppModal.alert("Đã lưu vào danh mục kho thành công!", "success");
    }

    localStorage.setItem('goodsData', JSON.stringify(db_goods));
    closeManagerModal('create-good-modal'); 
    renderGoods();
}

function renderGoods() {
    const tbody = document.getElementById('goods-list-body');
    if(!tbody) return; tbody.innerHTML = '';
    
    let filteredGoods = db_goods;
    if(currentSearchGood.trim() !== '') {
        const query = removeAccents(currentSearchGood);
        filteredGoods = filteredGoods.filter(item => removeAccents(item.name).includes(query));
    }

    // Đảm bảo colspan đúng bằng 8 tương ứng với cấu trúc cột trên header giao diện
    if(filteredGoods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">Không tìm thấy hàng hóa / nguyên liệu phù hợp</td></tr>'; return;
    }

    filteredGoods.forEach(item => {
        const formattedCost = item.cost ? formatMoney(item.cost) : '0đ'; 
        const formattedPrice = item.isSellable 
            ? `${formatMoney(item.price)} <small style="color:#74b9ff; display:block;">(${item.posCategory})</small>`
            : '<span style="color:#a4b0be; font-style:italic; font-size:0.9rem;">Chỉ làm nguyên liệu</span>';
        
        tbody.innerHTML += `
            <tr><td><strong>${item.id}</strong></td><td>${item.name}</td><td>${item.category}</td><td>${item.unit}</td>
            <td style="color:#d63031; font-weight:bold;">${formattedCost}</td>
            <td style="color:#00b894; font-weight:bold;">${formattedPrice}</td>
            <td><span style="background:#e3f2fd; padding:3px 8px; border-radius:4px; font-weight:bold;">${item.stock}</span></td>
            <td>
                <button onclick="editGoodItem('${item.id}')" style="background:#0984e3; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button onclick="deleteGoodItem('${item.id}')" style="background:#ff7675; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Xóa</button>
            </td></tr>`;
    });
}

function deleteGoodItem(id) {
    AppModal.confirm("Xóa nguyên liệu này khỏi kho?", () => {
        db_goods = db_goods.filter(g => g.id !== id);
        localStorage.setItem('goodsData', JSON.stringify(db_goods));
        renderGoods();
    });
}

/* =========================================
   3, 4, 5. XỬ LÝ PHIẾU VÀ HÓA ĐƠN
========================================= */
function createImportReceipt() {
    const supplier = document.getElementById('import-supplier').value;
    const total = document.getElementById('import-total').value;
    if(!supplier || !total) return AppModal.alert("Nhập đủ thông tin phiếu nhập!", "error");

    db_imports.push({ id: "PN" + Date.now().toString().slice(-4), date: getCurrentDate(), supplier, total: Number(total) });
    localStorage.setItem('importsData', JSON.stringify(db_imports));
    AppModal.alert("Đã lưu phiếu nhập hàng!", "success");
    renderImports();
}

function renderImports() {
    const tbody = document.getElementById('imports-list-body');
    if(!tbody) return; tbody.innerHTML = '';
    if(db_imports.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Chưa có phiếu nhập</td></tr>'; return; }
    db_imports.forEach(item => {
        tbody.innerHTML += `<tr><td><strong>${item.id}</strong></td><td>${item.date}</td><td>${item.supplier}</td>
            <td style="color:#d63031; font-weight:bold;">${formatMoney(item.total)}</td>
            <td><button style="background:#b2bec3; color:#fff; border:none; padding:5px 10px; border-radius:4px;"><i class="fa-solid fa-eye"></i> Xem</button></td></tr>`;
    });
}

function createAuditReceipt() {
    const note = document.getElementById('audit-note').value;
    if(!note) return AppModal.alert("Vui lòng nhập ghi chú kiểm kho!", "error");

    db_audits.push({ id: "PK" + Date.now().toString().slice(-4), date: getCurrentDate(), checker: "Quản lý viên", note });
    localStorage.setItem('auditsData', JSON.stringify(db_audits));
    AppModal.alert("Đã lưu biên bản kiểm kê!", "success");
    renderAudits();
}

function renderAudits() {
    const tbody = document.getElementById('audits-list-body');
    if(!tbody) return; tbody.innerHTML = '';
    if(db_audits.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Chưa có phiếu kiểm hàng</td></tr>'; return; }
    db_audits.forEach(item => {
        tbody.innerHTML += `<tr><td><strong>${item.id}</strong></td><td>${item.date}</td><td>${item.checker}</td><td>${item.note}</td>
            <td><button style="background:#b2bec3; color:#fff; border:none; padding:5px 10px; border-radius:4px;"><i class="fa-solid fa-eye"></i> Xem</button></td></tr>`;
    });
}

// Tải dữ liệu khi mở trang Manager
document.addEventListener('DOMContentLoaded', () => {
    const savedCategories = localStorage.getItem('categoriesData'); 
    if (savedCategories) {
        db_categories = JSON.parse(savedCategories);
    } else {
        db_categories = {
            menu: [{id: "CM1", name: "Đồ ăn"}, {id: "CM2", name: "Thức uống"}],
            goods: [{id: "CG1", name: "Nguyên liệu tươi"}, {id: "CG2", name: "Gia vị"}]
        };
        localStorage.setItem('categoriesData', JSON.stringify(db_categories));
    }

    const savedMenu = localStorage.getItem('menuData'); if (savedMenu) db_menu = JSON.parse(savedMenu);
    const savedGoods = localStorage.getItem('goodsData'); if (savedGoods) db_goods = JSON.parse(savedGoods);
    const savedImports = localStorage.getItem('importsData'); if (savedImports) db_imports = JSON.parse(savedImports);
    const savedAudits = localStorage.getItem('auditsData'); if (savedAudits) db_audits = JSON.parse(savedAudits);
    
    renderCategories();
    updateCategorySelects();
    renderMenu();
    renderGoods();
    renderImports();
    renderAudits();
    
    const invoicesBody = document.getElementById('invoices-list-body');
    if(invoicesBody) invoicesBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Chưa có dữ liệu đồng bộ từ máy POS</td></tr>';
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
// Hàm dọn dẹp rác dữ liệu cũ của Kho hàng
function resetGoodsData() {
    AppModal.confirm("Hành động này sẽ XÓA SẠCH toàn bộ hàng hóa / nguyên liệu bị kẹt và đưa kho về số 0. Bạn có chắc chắn?", () => {
        localStorage.removeItem('goodsData'); // Xóa sạch dữ liệu kẹt
        db_goods = []; // Trả mảng về trống
        renderGoods(); // Tải lại bảng
        AppModal.alert("Đã dọn dẹp sạch kho nguyên liệu!", "success");
    }, "Dọn dẹp Kho");
}
// Mở Mobile Modal
function openMobileModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    // Khóa cuộn màn hình nền đằng sau để tránh lỗi giao diện trên điện thoại
    document.body.style.overflow = 'hidden'; 
}

// Đóng Mobile Modal
function closeMobileModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // Khôi phục lại trạng thái cuộn trang
    document.body.style.overflow = '';
}