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

// 2. Khởi tạo Firebase (Sử dụng API Compat để phù hợp với thẻ script hiện tại)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// HỆ THỐNG HÀM ĐỒNG BỘ THAY THẾ LOCALSTORAGE
// ==========================================

// Hàm LƯU dữ liệu lên mây
window.saveToFirebase = function(docName, dataArray) {
    db.collection("pos_226").doc(docName).set({ items: dataArray })
        .then(() => console.log(`[Firebase] Đã lưu ${docName} thành công!`))
        .catch(error => console.error(`[Firebase] Lỗi lưu ${docName}:`, error));
}

// Hàm LẮNG NGHE Real-time (Thay thế localStorage.getItem lúc khởi động)
window.listenToFirebase = function(docName, callback) {
    db.collection("pos_226").doc(docName).onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data().items);
        } else {
            callback(null); // Document chưa tồn tại
        }
    });
}