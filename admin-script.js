// =========================================
// CHỐT CHẶN BẢO MẬT: CHỈ QUẢN LÝ MỚI ĐƯỢC VÀO
// =========================================
(function checkAdminAuth() {
    const path = window.location.pathname;
    if (path.includes('login.html')) return; // Không chặn ở trang đăng nhập
    
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('currentRole');
    
    if (!isLoggedIn) {
        window.location.href = 'login.html';
    } else if (role === 'Thu ngân' || !role) {
        if(!role) {
            alert('Hệ thống vừa được nâng cấp bảo mật. Vui lòng đăng nhập lại!');
            localStorage.clear();
            window.location.href = 'login.html';
        } else {
            alert('CẢNH BÁO BẢO MẬT: Tài khoản nhân viên (Thu ngân) không có quyền truy cập vào Hệ thống Tổng!');
            window.location.href = 'index.html'; // Tự động đá về màn hình máy tính tiền
        }
    }
})();

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
    alert: function(msg, type = 'info', title = 'Thông báo', onOk = null) {
        this.show({ msg, type, title, onOk, showCancel: false });
    },
    confirm: function(msg, onOk, title = 'Xác nhận') {
        this.show({ msg, type: 'warning', title, onOk, showCancel: true, okText: 'Đồng ý', cancelText: 'Đóng' });
    }
};

// =========================================
// LOGIC CHÍNH CỦA ADMIN
// =========================================
let db_branches = [];
let db_accounts = [];

let editingBranchId = null;
let editingAccountIndex = null;

// Mã hóa mật khẩu cơ bản (Base64) để ẩn khỏi bộ nhớ trình duyệt
function encodePassword(pass) {
    return btoa(encodeURIComponent(pass));
}

// Xử lý sự kiện đăng nhập CÓ XÁC THỰC TỪ FIREBASE
async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    try {
        // Chủ động tải danh sách tài khoản từ Firebase Firestore để xác thực trực tiếp
        const doc = await db.collection("pos_226").doc("accountsData").get();
        let savedAccounts = [];
        if (doc.exists) {
            savedAccounts = doc.data().items || [];
        }

        const validAccount = savedAccounts.find(acc => acc.username === user && acc.password === encodePassword(pass));

        if (validAccount) {
            // Lưu trạng thái phiên làm việc cục bộ để đảm bảo tốc độ phản hồi điều hướng ổn định
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', validAccount.username);
            localStorage.setItem('currentBranch', validAccount.branch);
            localStorage.setItem('currentRole', validAccount.role); 
            
            document.getElementById('password').value = '';
            console.clear(); 
            window.location.href = "index.html";
        } else {
            alert("Tên đăng nhập hoặc mật khẩu không đúng!");
            console.clear();
        }
    } catch (error) {
        alert("Lỗi kết nối với cơ sở dữ liệu Cloud. Vui lòng kiểm tra mạng!");
        console.error("Login Error: ", error);
    }
}

function switchTab(tabId) {
    const menuItems = document.querySelectorAll('.admin-menu li');
    menuItems.forEach(li => li.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(tabId + '-tab').classList.add('active');
}

// Đóng Modal dùng chung
function closeEditModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    editingBranchId = null;
    editingAccountIndex = null;
}

/* =========================================
   XỬ LÝ CHI NHÁNH
========================================= */
function createBranch() {
    const name = document.getElementById('branch-name').value;
    const address = document.getElementById('branch-address').value;

    if(!name || !address) {
        AppModal.alert("Vui lòng nhập đầy đủ tên và địa chỉ chi nhánh!", "error", "Thiếu thông tin");
        return;
    }

    const newBranch = { id: "CN" + Date.now().toString().slice(-4), name: name, address: address };
    db_branches.push(newBranch);
    AppModal.alert("Đã tạo chi nhánh thành công!", "success", "Thành công");

    // Thay thế lưu cục bộ bằng hàm Firebase Cloud
    saveToFirebase('branchesData', db_branches);
    document.getElementById('branch-name').value = '';
    document.getElementById('branch-address').value = '';
    
    renderBranches();
    updateBranchSelects();
}

// Mở form Modal sửa Chi nhánh
function openEditBranch(id) {
    const branch = db_branches.find(b => b.id === id);
    if (!branch) return;

    editingBranchId = id;
    document.getElementById('edit-branch-name').value = branch.name;
    document.getElementById('edit-branch-address').value = branch.address;
    
    document.getElementById('edit-branch-modal').classList.add('active');
}

// Lưu dữ liệu sau khi sửa Chi nhánh
function saveBranchEdit() {
    const name = document.getElementById('edit-branch-name').value;
    const address = document.getElementById('edit-branch-address').value;

    if(!name || !address) {
        AppModal.alert("Vui lòng nhập đầy đủ tên và địa chỉ!", "error");
        return;
    }

    const index = db_branches.findIndex(b => b.id === editingBranchId);
    if (index > -1) {
        db_branches[index].name = name;
        db_branches[index].address = address;
        
        // Đồng bộ cập nhật lên đám mây
        saveToFirebase('branchesData', db_branches);
        AppModal.alert("Cập nhật chi nhánh thành công!", "success");
        
        closeEditModal('edit-branch-modal');
        renderBranches();
        updateBranchSelects();
    }
}

function renderBranches() {
    const tbody = document.getElementById('branch-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if(db_branches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Chưa có chi nhánh nào trong hệ thống</td></tr>';
        return;
    }

    db_branches.forEach(branch => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${branch.id}</strong></td>
            <td>${branch.name}</td>
            <td>${branch.address}</td>
            <td>
                <button onclick="openEditBranch('${branch.id}')" style="background:#0984e3; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button onclick="deleteBranch('${branch.id}')" style="background:#ff7675; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Xóa</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteBranch(id) {
    AppModal.confirm("Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa chi nhánh này?", () => {
        db_branches = db_branches.filter(b => b.id !== id);
        // Cập nhật cấu trúc mảng mới lên Cloud
        saveToFirebase('branchesData', db_branches);
        renderBranches();
        updateBranchSelects();
    }, "Xóa chi nhánh");
}

function updateBranchSelects() {
    const selectAdd = document.getElementById('acc-branch');
    const selectEdit = document.getElementById('edit-acc-branch');
    
    let optionsHtml = '<option value="">-- Gán vào chi nhánh --</option>';
    db_branches.forEach(branch => {
        optionsHtml += `<option value="${branch.name}">${branch.name}</option>`;
    });

    if(selectAdd) selectAdd.innerHTML = optionsHtml;
    if(selectEdit) selectEdit.innerHTML = optionsHtml;
}

/* =========================================
   XỬ LÝ TÀI KHOẢN
========================================= */
function createAccount() {
    const username = document.getElementById('acc-username').value;
    const passInput = document.getElementById('acc-password').value;
    const role = document.getElementById('acc-role').value;
    const branch = document.getElementById('acc-branch').value;

    if(!username || !passInput || !branch) {
        AppModal.alert("Vui lòng điền đủ thông tin và chọn chi nhánh trực thuộc!", "error", "Thiếu thông tin");
        return;
    }

    const newAccount = { 
        username: username, 
        password: encodePassword(passInput), 
        role: role === 'cashier' ? 'Thu ngân' : 'Quản lý', 
        branch: branch, 
        status: 'Hoạt động' 
    };
    db_accounts.push(newAccount);
    AppModal.alert("Đã cấp tài khoản thành công!", "success", "Thành công");

    // Đẩy thông tin tài khoản mới cấp phát lên cơ sở dữ liệu Firebase
    saveToFirebase('accountsData', db_accounts);
    document.getElementById('acc-username').value = '';
    document.getElementById('acc-password').value = '';
    
    renderAccounts();
}

// Mở form Modal sửa Tài khoản
function openEditAccount(index) {
    const acc = db_accounts[index];
    editingAccountIndex = index;

    document.getElementById('edit-acc-username').value = acc.username;
    document.getElementById('edit-acc-role').value = acc.role === 'Thu ngân' ? 'cashier' : 'manager';
    document.getElementById('edit-acc-branch').value = acc.branch;
    document.getElementById('edit-acc-password').value = ''; // Rỗng để người dùng nhập mới nếu muốn đổi
    
    document.getElementById('edit-account-modal').classList.add('active');
}

// Lưu dữ liệu sau khi sửa Tài khoản
function saveAccountEdit() {
    const username = document.getElementById('edit-acc-username').value;
    const role = document.getElementById('edit-acc-role').value;
    const branch = document.getElementById('edit-acc-branch').value;
    const newPass = document.getElementById('edit-acc-password').value;

    if(!username || !branch) {
        AppModal.alert("Tên đăng nhập và chi nhánh không được để trống!", "error");
        return;
    }

    db_accounts[editingAccountIndex].username = username;
    db_accounts[editingAccountIndex].role = role === 'cashier' ? 'Thu ngân' : 'Quản lý';
    db_accounts[editingAccountIndex].branch = branch;
    
    // Nếu có gõ mật khẩu mới vào ô thì mới tiến hành đổi
    if(newPass) {
        db_accounts[editingAccountIndex].password = encodePassword(newPass);
    }

    // Cập nhật cấu trúc dữ liệu lên Firebase Firestore
    saveToFirebase('accountsData', db_accounts);
    AppModal.alert("Cập nhật tài khoản thành công!", "success");
    
    closeEditModal('edit-account-modal');
    renderAccounts();
}

function renderAccounts() {
    const tbody = document.getElementById('account-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if(db_accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Chưa có tài khoản nào được tạo</td></tr>';
        return;
    }

    db_accounts.forEach((acc, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${acc.username}</strong></td>
            <td>${acc.role}</td>
            <td>${acc.branch}</td>
            <td><span style="color:#00b894; font-weight:bold;">${acc.status}</span></td>
            <td>
                <button onclick="openEditAccount(${index})" style="background:#0984e3; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button onclick="deleteAccount(${index})" style="background:#ff7675; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Xóa</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteAccount(index) {
    AppModal.confirm("Hành động này sẽ vô hiệu hóa quyền truy cập. Bạn chắc chắn muốn xóa tài khoản này?", () => {
        db_accounts.splice(index, 1);
        saveToFirebase('accountsData', db_accounts);
        renderAccounts();
    }, "Xóa tài khoản");
}

// Khởi tạo giao diện và liên kết lắng nghe Real-time đồng bộ đám mây
document.addEventListener('DOMContentLoaded', () => {
    // 1. Đồng bộ và lắng nghe danh sách Chi nhánh thời gian thực
    listenToFirebase('branchesData', (data) => {
        if (data) {
            db_branches = data;
        } else {
            // Khởi tạo dữ liệu gốc nếu Firestore trống
            db_branches = [{ id: "CN0001", name: "Chi nhánh 1", address: "Địa chỉ mặc định" }];
            saveToFirebase('branchesData', db_branches);
        }
        if(document.getElementById('branch-list-body')) {
            renderBranches();
            updateBranchSelects();
        }
    });

    // 2. Đồng bộ và lắng nghe danh sách Tài khoản hệ thống thời gian thực
    listenToFirebase('accountsData', (data) => {
        if (data) {
            db_accounts = data;
        } else {
            // Khởi tạo cặp tài khoản quản trị và nhân viên cơ bản nếu dữ liệu trống
            db_accounts = [
                { username: 'admin', password: encodePassword('admin'), role: 'Quản lý', branch: 'Hệ thống', status: 'Hoạt động' },
                { username: 'Thanh Ngân', password: encodePassword('1'), role: 'Thu ngân', branch: 'Chi nhánh 1', status: 'Hoạt động' }
            ];
            saveToFirebase('accountsData', db_accounts);
        }
        if(document.getElementById('account-list-body')) {
            renderAccounts();
        }
    });

    // Kích hoạt chế độ giữ sáng màn hình
    requestWakeLock();
});

/* =========================================
   BẢO MẬT: NGĂN CHẶN MỞ CONSOLE VÀ DEVTOOLS
========================================= */
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || 
       (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
       (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        console.clear();
    }
});

// =========================================
// CHẾ ĐỘ GIỮ MÀN HÌNH LUÔN SÁNG (WAKE LOCK)
// =========================================
let wakeLock = null;

const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Chế độ luôn sáng màn hình đã được bật.');
            
            wakeLock.addEventListener('release', () => {
                console.log('Chế độ luôn sáng đã bị hủy.');
            });
        }
    } catch (err) {
        console.error(`Không thể bật chế độ luôn sáng: ${err.name}, ${err.message}`);
    }
};

document.addEventListener('click', () => {
    if (!wakeLock || wakeLock.released) {
        requestWakeLock();
    }
}, { once: true });

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});