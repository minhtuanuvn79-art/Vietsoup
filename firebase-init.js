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

// Hàm tự động gắn mác chi nhánh vào tên CSDL
function getBranchDocName(docName) {
    // Các dữ liệu dùng chung toàn hệ thống (Bắt buộc không được chia)
    const globalDocs = ['branchesData', 'accountsData'];
    if (globalDocs.includes(docName)) {
        return docName;
    }
    
    // Đọc xem thiết bị này đang đăng nhập tài khoản của chi nhánh nào
    const currentBranch = localStorage.getItem('currentBranch');
    
    // Nếu có chi nhánh (và không phải tài khoản admin tổng), tiến hành tách data
    if (currentBranch && currentBranch !== 'Hệ thống') {
        return `${docName}_${currentBranch}`;
    }
    
    // Nếu không khớp, trả về mặc định
    return docName;
}

// Hàm LƯU dữ liệu lên mây (Đã nâng cấp cách ly)
window.saveToFirebase = function(docName, dataArray) {
    const finalDocName = getBranchDocName(docName);
    
    db.collection("pos_226").doc(finalDocName).set({ items: dataArray })
        .then(() => console.log(`[Firebase] Đã lưu ${finalDocName} thành công!`))
        .catch(error => console.error(`[Firebase] Lỗi lưu ${finalDocName}:`, error));
}

// Hàm LẮNG NGHE Real-time (Đã nâng cấp cách ly)
window.listenToFirebase = function(docName, callback) {
    const finalDocName = getBranchDocName(docName);
    
    db.collection("pos_226").doc(finalDocName).onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data().items);
        } else {
            callback(null); // Document chưa tồn tại
        }
    });
}