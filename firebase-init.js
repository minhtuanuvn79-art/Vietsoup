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

window.listenToFirebase = function(docName, callback) {
    const finalDocName = getBranchDocName(docName);
    
    // Xử lý riêng cho Hóa Đơn, Phiếu Nhập và Phiếu Kiểm Kho (Tải từ Collection)
    if (docName === 'invoicesData' || docName === 'importsData' || docName === 'auditsData') {
        let collectionName = "pos_invoices";
        if (docName === 'importsData') collectionName = "pos_imports";
        if (docName === 'auditsData') collectionName = "pos_audits";

        db.collection(collectionName).onSnapshot((snapshot) => {
            let items = [];
            snapshot.forEach((doc) => {
                items.push(doc.data());
            });

            // Sắp xếp lại theo thời gian (Cũ -> Mới)
            items.sort((a, b) => {
                let dateA = a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date;
                let dateB = b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date;
                const timeA = a.time || "00:00";
                const timeB = b.time || "00:00";
                return (dateA + " " + timeA).localeCompare(dateB + " " + timeB);
            });

            callback(items);
        });
        return; 
    }

    // Phần còn lại giữ nguyên cho Thực đơn, Nhóm, Kho...
    db.collection("pos_226").doc(finalDocName).onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data().items);
        } else {
            callback(null);
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