// firebase-init.js

// 1. Cấu hình Firebase của bạn
const firebaseConfig = {
    apiKey: "AIzaSyCkdnpINyG_kxUz-5D-92W6jSZmbgCKjjA",
    authDomain: "vietsoup-670d2.firebaseapp.com",
    projectId: "vietsoup-670d2",
    storageBucket: "vietsoup-670d2.firebasestorage.app",
    messagingSenderId: "65399336972",
    appId: "1:65399336972:web:fc86d9cf656549219bbe29",
    measurementId: "G-Z5WMB9E3J0"
};

// 2. Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// HỆ THỐNG LÕI: TỰ ĐỘNG PHÂN LUỒNG CHI NHÁNH
// ==========================================

function getBranchDocName(docName) {
    // Hóa đơn, Tài khoản và Chi nhánh dùng chung để Quản lý Hệ thống có thể xem tổng quát
    const globalDocs = ['branchesData', 'accountsData', 'invoicesData'];
    if (globalDocs.includes(docName)) {
        return docName;
    }
    
    // Thực đơn, Kho hàng, Phiếu nhập/kiểm duy trì CÁCH LY ĐỘC LẬP theo từng chi nhánh
    const currentBranch = localStorage.getItem('currentBranch');
    
    if (currentBranch && currentBranch !== 'Hệ thống') {
        return `${docName}_${currentBranch}`;
    }
    
    return docName;
}


// Hàm LƯU dữ liệu lên mây (Đã thêm tính năng bắt lỗi chặn CSDL)
window.saveToFirebase = function(docName, dataArray) {
    const finalDocName = getBranchDocName(docName);
    
    db.collection("pos_226").doc(finalDocName).set({ items: dataArray })
        .then(() => console.log(`[Firebase] Đã lưu ${finalDocName} thành công!`))
        .catch(error => {
            // Ném thẳng bảng báo lỗi ra giữa màn hình điện thoại
            alert(`LỖI KHÔNG THỂ LƯU (${finalDocName}): \n\n${error.message}\n\nVui lòng chụp màn hình này lại!`);
            console.error(`[Firebase] Lỗi lưu ${finalDocName}:`, error);
        });
}

// Hàm LẮNG NGHE Real-time (Đã nâng cấp cách ly và Tách Hóa Đơn lẻ)
// Hàm LẮNG NGHE Real-time (Đã nâng cấp cách ly và Tách Hóa Đơn lẻ)
window.listenToFirebase = function(docName, callback) {
    const finalDocName = getBranchDocName(docName);
    
    // Xử lý riêng cho Hóa Đơn (Tải dữ liệu từ Collection)
    if (docName === 'invoicesData') {
        db.collection("pos_invoices").onSnapshot((snapshot) => {
            let items = [];
            snapshot.forEach((doc) => {
                items.push(doc.data());
            });

            // --- BỔ SUNG: TỰ ĐỘNG SẮP XẾP LẠI THEO THỜI GIAN (CŨ -> MỚI) ---
            items.sort((a, b) => {
                // Chuẩn hóa định dạng ngày (Xử lý cả HĐ cũ dùng DD/MM/YYYY và HĐ mới dùng YYYY-MM-DD)
                let dateA = a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date;
                let dateB = b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date;
                
                const timeA = a.time || "00:00";
                const timeB = b.time || "00:00";
                
                // Gộp thành chuỗi chuẩn "YYYY-MM-DD HH:MM" để so sánh thời gian chính xác
                return (dateA + " " + timeA).localeCompare(dateB + " " + timeB);
            });
            // ---------------------------------------------------------------

            callback(items);
        });
        return; 
    }

    // GIỮ NGUYÊN CODE CŨ: Cho các dữ liệu nhẹ như Thực đơn, Nhóm, Kho...
    db.collection("pos_226").doc(finalDocName).onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data().items);
        } else {
            callback(null); // Document chưa tồn tại
        }
    });
}

// HỆ THỐNG LƯU AN TOÀN TUYỆT ĐỐI (CHỐNG GHI ĐÈ ĐỒNG THỜI)
window.safeUpdateFirebase = async function(docName, updateLogicCallback) {
    const finalDocName = getBranchDocName(docName);
    const docRef = db.collection("pos_226").doc(finalDocName);

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            // Lấy mảng dữ liệu MỚI NHẤT từ Server (không dùng mảng dưới máy tính)
            let currentItems = doc.exists ? (doc.data().items || []) : [];

            // Chạy logic sửa/xóa/thêm của bạn trên mảng mới nhất này
            const updatedItems = updateLogicCallback(currentItems);

            // Ghi lại mảng đã cập nhật
            transaction.set(docRef, { items: updatedItems }, { merge: true });
        });
        console.log(`[Firebase] Đã lưu an toàn (Transaction) ${finalDocName}!`);
    } catch (error) {
        alert(`LỖI LƯU DỮ LIỆU ĐỒNG THỜI (${finalDocName}): \n\n${error.message}`);
        console.error("Transaction failed: ", error);
    }
}