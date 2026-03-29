const { useState, useMemo, useEffect, useRef } = React;
        
// ==========================================
// CẤU HÌNH FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB4X-zrIiXSB5kGPm0ohxZLpTq43BCIff8",
    authDomain: "ocganit-38680.firebaseapp.com",
    databaseURL: "https://ocganit-38680-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ocganit-38680",
    storageBucket: "ocganit-38680.firebasestorage.app",
    messagingSenderId: "15640532202",
    appId: "1:15640532202:web:d51e1378f2da5a2394b393",
    measurementId: "G-ZWCM87VC4F"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const STORAGE_KEY = 'SMART_POS_DATA_V5';
const USERS_KEY = 'SMART_POS_USERS';
const CURRENT_USER_KEY = 'SMART_POS_CURRENT_USER';

// --- SHARED COMPONENTS ---
const Icon = ({ name, size = 16, className = '', style, ...props }) => {
    const elRef = useRef(null);
    
    useEffect(() => {
        if (elRef.current && window.lucide) {
            elRef.current.innerHTML = `<i data-lucide="${name}" style="width: ${size}px; height: ${size}px;"></i>`;
            window.lucide.createIcons({ root: elRef.current });
        }
    }, [name, size]);

    return (
        <span 
            ref={elRef} 
            className={`inline-flex items-center justify-center shrink-0 ${className}`}
            style={{ width: size, height: size, ...style }} 
            {...props}
        />
    );
};

const SidebarItem = ({ icon, label, active, onClick, badge }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group ${active ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>
        <Icon name={icon} />
        <span className="font-black text-[10px] hidden lg:block uppercase tracking-widest flex-1 text-left">{label}</span>
        {badge && <span className={`hidden lg:flex w-6 h-6 items-center justify-center rounded-lg text-[10px] font-black ${active ? 'bg-white text-emerald-600' : 'bg-orange-500 text-white'}`}>{badge}</span>}
    </button>
);

const loadSavedData = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
};

// ==========================================
// COMPONENT: ADMIN PANEL
// ==========================================
const AppAdmin = ({ onNavigateBack }) => {
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem(USERS_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const isSyncingFromCloud = useRef(false);

    const syncToCloud = (currentUsers) => {
        if (isSyncingFromCloud.current) return;
        setIsSyncing(true);
        const posData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        db.ref('/').update({
            users: currentUsers,
            posData: posData,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).finally(() => setTimeout(() => setIsSyncing(false), 500));
    };

    useEffect(() => {
        const usersRef = db.ref('users');
        usersRef.on('value', (snapshot) => {
            const cloudUsers = snapshot.val();
            if (cloudUsers) {
                isSyncingFromCloud.current = true;
                setUsers(cloudUsers);
                localStorage.setItem(USERS_KEY, JSON.stringify(cloudUsers));
                setTimeout(() => { isSyncingFromCloud.current = false; }, 500);
            }
        });
        return () => usersRef.off();
    }, []);

    useEffect(() => {
        if (!isSyncingFromCloud.current && users.length > 0) {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            syncToCloud(users);
        }
    }, [users]);

    const addUser = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newUser = {
            id: Date.now(),
            name: fd.get('name'),
            username: fd.get('username'),
            password: fd.get('password'),
            role: fd.get('role'),
            permissions: fd.getAll('perms')
        };
        setUsers([...users, newUser]);
        setShowAddModal(false);
    };

    const deleteUser = (id) => {
        if (confirm('Xác nhận xóa tài khoản này?')) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    const saveEditedUser = () => {
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
        setEditingUser(null);
    };

    return (
        <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
            <aside className="hidden md:flex w-20 lg:w-64 bg-[#0F172A] text-white flex-col shrink-0">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <div className="bg-emerald-500 p-2 rounded-xl"><Icon name="shield-check" fill="white" /></div>
                    <span className="font-black text-lg tracking-tighter uppercase italic text-emerald-400 hidden lg:block">Admin Panel</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <SidebarItem icon="users" label="Nhân viên" active={true} />
                    <SidebarItem icon="arrow-left" label="Quay lại POS" onClick={onNavigateBack} />
                </nav>
                <div className="p-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {isSyncing ? 'Syncing...' : 'Realtime Active'}
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-24 md:pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase italic leading-tight">Tài khoản</h1>
                        <p className="text-slate-400 font-medium text-sm">Quản lý nhân viên</p>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl md:rounded-3xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all">
                        <Icon name="user-plus" /> Thêm nhân viên
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {users.map(user => (
                        <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${user.role === 'admin' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    <Icon name={user.role === 'admin' ? "shield" : "user"} size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingUser({...user})} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500"><Icon name="edit-3" /></button>
                                    <button onClick={() => deleteUser(user.id)} className="p-2 bg-red-50 rounded-xl text-red-300 hover:text-red-500"><Icon name="trash-2" /></button>
                                </div>
                            </div>
                            <h3 className="font-black text-slate-800 text-lg mb-1 truncate">{user.name}</h3>
                            <p className="text-slate-400 font-bold text-[10px] uppercase mb-4 tracking-wider">@{user.username}</p>
                            <div className="flex flex-wrap gap-2 mb-6 min-h-[50px] items-start">
                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${user.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {user.role}
                                </span>
                                {user.permissions?.map(p => (
                                    <span key={p} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase">{p}</span>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-300 uppercase italic">Pass: {user.password}</span>
                                <Icon name="lock" size={14} className="text-slate-200" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] text-white flex justify-around items-center h-[72px] border-t border-white/5 z-40 pb-2">
                <button className="text-emerald-400 flex flex-col items-center gap-1 w-full h-full justify-center">
                    <Icon name="users" size={20} />
                    <span className="text-[10px] font-black uppercase mt-1">Nhân viên</span>
                </button>
                <button onClick={onNavigateBack} className="text-slate-500 flex flex-col items-center gap-1 w-full h-full justify-center">
                    <Icon name="arrow-left" size={20} />
                    <span className="text-[10px] font-black uppercase mt-1">Quay lại</span>
                </button>
            </nav>

            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={addUser} className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black uppercase italic mb-6">Tạo tài khoản</h3>
                        <div className="space-y-3">
                            <input name="name" placeholder="Tên hiển thị" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                            <input name="username" placeholder="Tên đăng nhập" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                            <input name="password" placeholder="Mật khẩu" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                            <select name="role" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm">
                                <option value="staff">Nhân viên (Staff)</option>
                                <option value="admin">Quản trị viên (Admin)</option>
                            </select>
                            <div className="py-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-3 ml-2">Quyền truy cập</p>
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                                    {['pos', 'inventory', 'menu', 'history'].map(perm => (
                                        <label key={perm} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl">
                                            <input type="checkbox" name="perms" value={perm} defaultChecked className="w-4 h-4 accent-emerald-500" />
                                            <span className="capitalize">{perm}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-emerald-600 transition-all text-xs">Lưu</button>
                        <button type="button" onClick={() => setShowAddModal(false)} className="w-full mt-4 text-slate-400 font-bold text-[10px] uppercase py-2">Hủy</button>
                    </form>
                </div>
            )}

            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black uppercase italic mb-6">Sửa tài khoản</h3>
                        <div className="space-y-3">
                            <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="Tên hiển thị" className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-sm" />
                            <input value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="Mật khẩu" className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-sm" />
                            <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-sm">
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold py-2">
                                {['pos', 'inventory', 'menu', 'history'].map(perm => (
                                    <label key={perm} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl">
                                        <input 
                                            type="checkbox" 
                                            checked={editingUser.permissions?.includes(perm)}
                                            onChange={e => {
                                                const newPerms = e.target.checked 
                                                    ? [...(editingUser.permissions || []), perm]
                                                    : (editingUser.permissions || []).filter(p => p !== perm);
                                                setEditingUser({...editingUser, permissions: newPerms});
                                            }}
                                            className="w-4 h-4 accent-emerald-600"
                                        />
                                        <span className="capitalize">{perm}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button onClick={saveEditedUser} className="w-full mt-4 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg">Lưu</button>
                        <button onClick={() => setEditingUser(null)} className="w-full mt-3 py-2 text-slate-400 font-bold text-[10px] uppercase">Đóng</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPONENT: POS SYSTEM
// ==========================================
const AppPOS = ({ onNavigateAdmin }) => {
    const [activeTab, setActiveTab] = useState('pos');
    const [showMobileCart, setShowMobileCart] = useState(false);
    
    // Core States
    const [ingredients, setIngredients] = useState(() => loadSavedData()?.ingredients || []);
    const [products, setProducts] = useState(() => loadSavedData()?.products || []);
    const [history, setHistory] = useState(() => loadSavedData()?.history || []);
    const [orderCounter, setOrderCounter] = useState(() => loadSavedData()?.orderCounter || 1);
    const [categories, setCategories] = useState(() => loadSavedData()?.categories || ['Cà phê', 'Trà sữa', 'Đồ ăn', 'Khác']);
    const [stockTransactions, setStockTransactions] = useState(() => loadSavedData()?.stockTransactions || []);

    // UI States
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [newCatInput, setNewCatInput] = useState('');
    const [notifications, setNotifications] = useState([]);
    
    // Inventory Sub-tabs State
    const [inventoryTab, setInventoryTab] = useState('stock'); 
    const [importCart, setImportCart] = useState([]);
    const [importSearch, setImportSearch] = useState('');
    const [stocktakeList, setStocktakeList] = useState([]);
    
    // Report Filter States
    const [reportFilter, setReportFilter] = useState('today');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSeller, setSelectedSeller] = useState('Tất cả');
    
    // Modal States
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    
    const [showIngModal, setShowIngModal] = useState(false);
    const [editingIng, setEditingIng] = useState(null);
    
    const [editingHistoryItem, setEditingHistoryItem] = useState(null);
    const [showHistoryEditModal, setShowHistoryEditModal] = useState(false);
    
    const [showCatModal, setShowCatModal] = useState(false);
    const [editingCat, setEditingCat] = useState({ old: '', new: '' });
    
    const [editingStockTrans, setEditingStockTrans] = useState(null);
    const [showStockTransEditModal, setShowStockTransEditModal] = useState(false);

    // User States
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem(USERS_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem(CURRENT_USER_KEY);
        return saved ? JSON.parse(saved) : null;
    });
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    const isSyncingFromCloud = useRef(false);
    const isInitialLoad = useRef(true);

    const syncToCloud = (data, usersData) => {
        if (isSyncingFromCloud.current) return;
        db.ref('/').update({
            posData: data,
            users: usersData,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch(e => console.error("Firebase Sync Error", e));
    };

    // Firebase Lắng nghe Realtime
    useEffect(() => {
        const rootRef = db.ref('/');
        rootRef.on('value', (snapshot) => {
            const cloudData = snapshot.val();
            if (cloudData) {
                isSyncingFromCloud.current = true;
                
                if (cloudData.posData) {
                    setIngredients(cloudData.posData.ingredients || []);
                    setProducts(cloudData.posData.products || []);
                    setHistory(cloudData.posData.history || []);
                    setOrderCounter(cloudData.posData.orderCounter || 1);
                    setCategories(cloudData.posData.categories || ['Cà phê', 'Trà sữa', 'Đồ ăn', 'Khác']);
                    setStockTransactions(cloudData.posData.stockTransactions || []);
                }
                if (cloudData.users) {
                    setUsers(cloudData.users);
                    localStorage.setItem(USERS_KEY, JSON.stringify(cloudData.users));
                }
                
                setTimeout(() => { isSyncingFromCloud.current = false; }, 500);
            }
            isInitialLoad.current = false;
        });

        return () => rootRef.off();
    }, []);

    // Khởi tạo Admin mặc định nếu chưa có
    useEffect(() => {
        if (!isSyncingFromCloud.current && users.length === 0) {
            const defaultAdmin = {
                id: 1, username: 'admin', name: 'Quản trị viên', role: 'admin',
                permissions: ['pos','inventory','menu','history'], password: 'admin'
            };
            setUsers([defaultAdmin]);
        }
    }, [users]);

    useEffect(() => {
        if (currentUser) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }, [currentUser]);

    useEffect(() => {
        if (isSyncingFromCloud.current || isInitialLoad.current) return; 
        
        const data = { ingredients, products, history, orderCounter, categories, stockTransactions };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        syncToCloud(data, users);
    }, [ingredients, products, history, orderCounter, categories, stockTransactions, users]);

    const showNotification = (message, type = 'success') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        const found = users.find(u => u.username === loginUsername && u.password === loginPassword);
        if (found) {
            setCurrentUser(found);
            setLoginUsername('');
            setLoginPassword('');
            showNotification(`Chào mừng ${found.name}!`, 'success');
        } else {
            alert('❌ Đăng nhập thất bại!');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem(CURRENT_USER_KEY);
    };

    // Chuẩn bị dữ liệu POS hiển thị (Menu + Kho bán lẻ)
    // Cập nhật: mang theo công thức (recipe) để trừ kho
    const posItems = useMemo(() => {
        const processedProducts = products.flatMap(p => {
            if (p.variants && p.variants.length > 0) {
                return p.variants.map(v => ({
                    ...p, id: `${p.id}-${v.size}`, variantId: v.size, name: `${p.name} (${v.size})`, price: v.price, costPrice: v.costPrice || 0, recipe: v.recipe || [], type: 'menu'
                }));
            }
            return [{ ...p, type: 'menu', costPrice: 0, recipe: [] }];
        });
        const retailItems = ingredients.filter(i => i.sellPrice > 0).map(i => ({ 
            id: `retail-${i.id}`, originalId: i.id, name: i.name, price: i.sellPrice, costPrice: i.lastPrice || 0, category: i.category || 'Chưa phân loại', image: '📦', type: 'retail', recipe: [] 
        }));
        
        return [...processedProducts, ...retailItems].filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCat = selectedCategory === 'Tất cả' || item.category === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [products, ingredients, searchTerm, selectedCategory]);

    const filteredHistory = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayStart = todayStart - 86400000;
        const lastWeekStart = todayStart - 7 * 86400000;
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();
        const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();

        return history.filter(h => {
            const hTime = new Date(h.timestamp).getTime();
            let matchesTime = true;
            if (reportFilter === 'today') matchesTime = hTime >= todayStart;
            if (reportFilter === 'yesterday') matchesTime = hTime >= yesterdayStart && hTime < todayStart;
            if (reportFilter === 'week') matchesTime = hTime >= lastWeekStart;
            if (reportFilter === 'month') matchesTime = hTime >= lastMonthStart;
            if (reportFilter === 'year') matchesTime = hTime >= lastYearStart;
            if (reportFilter === 'custom') {
                const start = new Date(startDate).setHours(0,0,0,0);
                const end = new Date(endDate).setHours(23,59,59,999);
                matchesTime = hTime >= start && hTime <= end;
            }
            const matchesSeller = selectedSeller === 'Tất cả' || (h.seller || 'Không rõ') === selectedSeller;
            return matchesTime && matchesSeller;
        });
    }, [history, reportFilter, startDate, endDate, selectedSeller]);

    // Báo cáo tính Lợi nhuận = Doanh thu - Giá vốn
    const reportStats = useMemo(() => {
        let totalRevenue = 0;
        let totalCost = 0;
        filteredHistory.forEach(h => {
            totalRevenue += h.total;
            h.items.forEach(item => {
                totalCost += (item.costPrice || 0) * item.quantity;
            });
        });
        return { total: totalRevenue, profit: totalRevenue - totalCost, count: filteredHistory.length };
    }, [filteredHistory]);

    const stats = useMemo(() => ({
        lowStock: ingredients.filter(i => i.stock < 5).length
    }), [ingredients]);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const addCategory = () => {
        if (newCatInput && !categories.includes(newCatInput)) {
            setCategories([...categories, newCatInput]);
            setNewCatInput('');
            showNotification('Thêm danh mục thành công', 'success');
        }
    };
    
    const handleDeleteCategory = (catToDelete) => {
        if (categories.length <= 1) {
            showNotification("Phải giữ lại ít nhất 1 danh mục!", "error");
            return;
        }
        if (confirm(`Bạn có chắc muốn xóa danh mục "${catToDelete}"? Các món thuộc danh mục này sẽ tự động chuyển sang danh mục "Khác".`)) {
            let newCategories = categories.filter(c => c !== catToDelete);
            if (!newCategories.includes('Khác')) newCategories.push('Khác');
            
            setCategories(newCategories);
            if (selectedCategory === catToDelete) setSelectedCategory('Tất cả');

            setIngredients(prev => prev.map(ing => ing.category === catToDelete ? { ...ing, category: 'Khác' } : ing));
            setProducts(prev => prev.map(p => p.category === catToDelete ? { ...p, category: 'Khác' } : p));
            
            showNotification(`Đã xóa danh mục ${catToDelete}`, 'success');
        }
    };

    const handleEditCategory = (oldCat, newCat) => {
        const trimmedNew = newCat.trim();
        if (!trimmedNew || trimmedNew === oldCat) {
            setEditingCat({old: '', new: ''});
            return;
        }
        if (categories.includes(trimmedNew)) {
            showNotification("Tên danh mục đã tồn tại!", "error");
            return;
        }
        
        setCategories(categories.map(c => c === oldCat ? trimmedNew : c));
        if (selectedCategory === oldCat) setSelectedCategory(trimmedNew);

        setIngredients(prev => prev.map(ing => ing.category === oldCat ? { ...ing, category: trimmedNew } : ing));
        setProducts(prev => prev.map(p => p.category === oldCat ? { ...p, category: trimmedNew } : p));
        
        setEditingCat({old: '', new: ''});
        showNotification(`Đã đổi tên thành ${trimmedNew}`, 'success');
    };

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...item, quantity: 1 }];
        });
        showNotification(`Đã thêm ${item.name}`, 'success');
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        ).filter(item => item.quantity > 0));
    };

    // Hàm in Bill (Tạo iframe ẩn để in)
    const printBill = (order) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        const content = `
            <html>
            <head>
                <title>Bill #${order.token}</title>
                <style>
                    body { font-family: monospace; font-size: 12px; color: #000; margin: 0; padding: 10px; width: 100%; max-width: 300px; }
                    .header { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 5px; }
                    .text-center { text-align: center; }
                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 4px 0; text-align: left; }
                    .right { text-align: right; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">SMART POS</div>
                <div class="text-center" style="margin-bottom: 10px;">Hóa Đơn Bán Hàng</div>
                <div>Mã đơn: #${order.token}</div>
                <div>Khách: ${order.customer}</div>
                <div>Ngày: ${new Date(order.timestamp).toLocaleString('vi-VN')}</div>
                <div>Thu ngân: ${order.seller}</div>
                <div class="divider"></div>
                <table>
                    <tr>
                        <th>Món</th>
                        <th class="center" style="width: 30px;">SL</th>
                        <th class="right">TT</th>
                    </tr>
                    ${order.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td class="center">${item.quantity}</td>
                        <td class="right">${(item.price * item.quantity).toLocaleString()}</td>
                    </tr>`).join('')}
                </table>
                <div class="divider"></div>
                <table>
                    <tr class="bold" style="font-size: 14px;">
                        <td>TỔNG CỘNG:</td>
                        <td class="right">${order.total.toLocaleString()}đ</td>
                    </tr>
                </table>
                <div class="divider"></div>
                <div class="text-center">Cảm ơn & Hẹn gặp lại!</div>
            </body>
            </html>
        `;
        
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(content);
        iframe.contentWindow.document.close();
        
        iframe.onload = function() {
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 500);
            }, 200);
        };
    };

    // Hàm xử lý Thanh toán ngay lập tức
    const handleCheckout = (isPrint = false) => {
        if (cart.length === 0) return;

        // Trừ tồn kho tự động theo định mức nguyên liệu (KiotViet style)
        const updatedIngredients = [...ingredients];
        cart.forEach(item => {
            if (item.type === 'retail') {
                const idx = updatedIngredients.findIndex(ing => ing.id === item.originalId);
                if (idx !== -1) updatedIngredients[idx].stock -= item.quantity;
            } else if (item.recipe && item.recipe.length > 0) {
                // Trừ theo công thức
                item.recipe.forEach(r => {
                    const idx = updatedIngredients.findIndex(ing => ing.id === r.ingId);
                    if (idx !== -1) {
                        updatedIngredients[idx].stock -= (r.amount * item.quantity);
                    }
                });
            }
        });
        setIngredients(updatedIngredients);

        // Tạo hóa đơn mới
        const finalizedOrder = {
            id: `ORD${Date.now().toString().slice(-4)}`,
            token: orderCounter,
            customer: customerName || 'Khách lẻ',
            timestamp: new Date().toISOString(),
            payTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            items: [...cart], 
            total: subtotal,
            seller: currentUser.name
        };

        // Lưu vào lịch sử (Báo cáo)
        setHistory([finalizedOrder, ...history]);
        
        // In bill nếu được yêu cầu
        if (isPrint) {
            printBill(finalizedOrder);
        }

        // Reset Giỏ hàng
        setCart([]);
        setCustomerName('');
        setOrderCounter(prev => (prev >= 99 ? 1 : prev + 1));
        setShowMobileCart(false);
        showNotification(`Thanh toán thành công đơn #${finalizedOrder.token}`, 'success');
    };

    // --- SỬA VÀ XÓA HÓA ĐƠN BÁN HÀNG ---
    const handleDeleteHistoryItem = (id) => {
        if (!confirm('Bạn có chắc muốn xóa hóa đơn này? Số lượng hàng hóa đã bán sẽ được hoàn lại vào kho.')) return;
        const itemToDelete = history.find(h => h.id === id);
        if (!itemToDelete) return;

        // Hoàn lại kho
        let updatedIngredients = [...ingredients];
        itemToDelete.items.forEach(item => {
            if (item.type === 'retail') {
                const idx = updatedIngredients.findIndex(ing => ing.id === item.originalId);
                if (idx !== -1) updatedIngredients[idx].stock += item.quantity;
            } else if (item.recipe && item.recipe.length > 0) {
                item.recipe.forEach(r => {
                    const idx = updatedIngredients.findIndex(ing => Number(ing.id) === Number(r.ingId));
                    if (idx !== -1) updatedIngredients[idx].stock += (r.amount * item.quantity);
                });
            }
        });
        
        setIngredients(updatedIngredients);
        setHistory(prev => prev.filter(h => h.id !== id));
        showNotification('Đã xóa hóa đơn và hoàn lại kho', 'success');
    };

    const saveHistoryEdit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newTotal = parseFloat(fd.get('total')) || 0;
        const newCustomer = fd.get('customer');
        
        setHistory(prev => prev.map(h => h.id === editingHistoryItem.id ? {...h, customer: newCustomer, total: newTotal} : h));
        setShowHistoryEditModal(false);
        setEditingHistoryItem(null);
        showNotification('Cập nhật hóa đơn thành công', 'success');
    };

    const handleDeleteIngredient = (id) => {
        if (confirm('Bạn có chắc chắn muốn xoá mặt hàng này khỏi hệ thống?')) {
            setIngredients(prev => prev.filter(i => i.id !== id));
            showNotification("Đã xoá mặt hàng", "success");
        }
    };

    const handleIngSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const ingData = {
            name: fd.get('name'), unit: fd.get('unit'),
            lastPrice: parseFloat(fd.get('costPrice')) || 0,
            sellPrice: parseFloat(fd.get('sellPrice')) || 0,
            category: fd.get('category'), stock: parseFloat(fd.get('stock')) || 0
        };
        if (editingIng) {
            setIngredients(ingredients.map(i => i.id === editingIng.id ? { ...i, ...ingData } : i));
            showNotification("Đã cập nhật hàng hóa", "success");
        } else {
            setIngredients([...ingredients, { id: Date.now(), ...ingData }]);
            showNotification("Đã thêm hàng mới", "success");
        }
        setShowIngModal(false);
    };

    // ==========================================
    // LOGIC THÊM & SỬA MÓN BÁN (THỰC ĐƠN) CÓ RECIPE
    // ==========================================
    const [newProductForm, setNewProductForm] = useState({
        name: '', category: '', image: '🍵', variants: [{ size: 'Mặc định', costPrice: '', price: '', recipe: [] }]
    });

    const openAddProductModal = () => {
        setEditingProduct(null);
        setNewProductForm({ name: '', category: categories[0] || '', image: '🍵', variants: [{ size: 'Mặc định', costPrice: '', price: '', recipe: [] }] });
        setShowAddMenu(true);
    };

    const openEditProductModal = (p) => {
        setEditingProduct(p);
        setNewProductForm({
            name: p.name,
            category: p.category,
            image: p.image || '🍵',
            variants: p.variants ? p.variants.map(v => ({...v, costPrice: v.costPrice || '', recipe: v.recipe || []})) : [{ size: 'Mặc định', costPrice: '', price: '', recipe: [] }]
        });
        setShowAddMenu(true);
    };

    const updateVariant = (index, field, value) => { 
        setNewProductForm(prev => { 
            const newVariants = [...prev.variants]; 
            newVariants[index] = { ...newVariants[index], [field]: value }; 
            return { ...prev, variants: newVariants }; 
        }); 
    };

    const addVariant = () => {
        setNewProductForm(prev => ({
            ...prev,
            variants: [...prev.variants, { size: '', costPrice: '', price: '', recipe: [] }]
        }));
    };

    const removeVariant = (index) => {
        setNewProductForm(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    };

    // Quản lý định mức nguyên liệu (Recipe)
    const addRecipeItem = (variantIndex) => {
        if (ingredients.length === 0) {
            showNotification("Bạn cần thêm hàng hóa vào Kho trước!", "error");
            return;
        }
        setNewProductForm(prev => {
            const newVariants = [...prev.variants];
            newVariants[variantIndex].recipe = [...(newVariants[variantIndex].recipe || []), { ingId: ingredients[0].id, amount: 1 }];
            return { ...prev, variants: newVariants };
        });
    };

    const updateRecipeItem = (variantIndex, recipeIndex, field, value) => {
        setNewProductForm(prev => {
            const newVariants = [...prev.variants];
            const newRecipe = [...newVariants[variantIndex].recipe];
            newRecipe[recipeIndex] = { ...newRecipe[recipeIndex], [field]: field === 'amount' ? (parseFloat(value) || 0) : value };
            newVariants[variantIndex].recipe = newRecipe;
            
            // Tính toán tự động giá vốn dựa trên công thức
            let autoCost = 0;
            newRecipe.forEach(r => {
                const ing = ingredients.find(i => Number(i.id) === Number(r.ingId));
                if (ing) autoCost += ((ing.lastPrice || 0) * r.amount);
            });
            newVariants[variantIndex].costPrice = autoCost;

            return { ...prev, variants: newVariants };
        });
    };

    const removeRecipeItem = (variantIndex, recipeIndex) => {
        setNewProductForm(prev => {
            const newVariants = [...prev.variants];
            const newRecipe = newVariants[variantIndex].recipe.filter((_, i) => i !== recipeIndex);
            newVariants[variantIndex].recipe = newRecipe;

            // Tính lại giá vốn sau khi xóa
            let autoCost = 0;
            newRecipe.forEach(r => {
                const ing = ingredients.find(i => Number(i.id) === Number(r.ingId));
                if (ing) autoCost += ((ing.lastPrice || 0) * r.amount);
            });
            newVariants[variantIndex].costPrice = autoCost;

            return { ...prev, variants: newVariants };
        });
    };

    const handleProductSubmit = (e) => {
        e.preventDefault();
        const validVariants = newProductForm.variants
            .filter(v => v.price !== '' && !isNaN(parseFloat(v.price)))
            .map(v => ({
                ...v, 
                price: parseFloat(v.price), 
                costPrice: parseFloat(v.costPrice) || 0,
                recipe: v.recipe || []
            }));

        if (editingProduct) {
            const updatedP = {
                ...editingProduct,
                name: newProductForm.name,
                category: newProductForm.category,
                image: newProductForm.image,
                variants: validVariants.length > 0 ? validVariants : [{size: 'Mặc định', costPrice: 0, price: 0, recipe: []}]
            };
            setProducts(products.map(p => p.id === editingProduct.id ? updatedP : p));
            showNotification("Đã cập nhật món thành công!", "success");
        } else {
            const newP = {
                id: Date.now(),
                name: newProductForm.name,
                category: newProductForm.category,
                image: newProductForm.image || '🍵',
                variants: validVariants.length > 0 ? validVariants : [{size: 'Mặc định', costPrice: 0, price: 0, recipe: []}]
            };
            setProducts([...products, newP]);
            showNotification("Đã thêm món mới thành công!", "success");
        }
        setShowAddMenu(false);
        setEditingProduct(null);
    };

    const allSellers = useMemo(() => {
        return Array.from(new Set([
            ...users.map(u => u.name), 
            ...history.map(h => h.seller).filter(Boolean)
        ]));
    }, [users, history]);

    // ==========================================
    // LOGIC NHẬP HÀNG & KIỂM KHO
    // ==========================================
    
    const addToImport = (ing) => {
        if (!importCart.find(i => i.id === ing.id)) {
            setImportCart([{ ...ing, importQty: '1', importPrice: String(ing.lastPrice || 0) }, ...importCart]);
        }
        setImportSearch('');
    };

    const updateImportCart = (id, field, value) => {
        setImportCart(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeFromImport = (id) => {
        setImportCart(prev => prev.filter(item => item.id !== id));
    };

    const handleCompleteImport = () => {
        if (importCart.length === 0) return;
        
        const processedImport = importCart.map(item => ({
            ...item,
            finalQty: parseFloat(item.importQty) || 0,
            finalPrice: parseFloat(item.importPrice) || 0
        }));
        
        const updatedIngredients = ingredients.map(ing => {
            const importedItem = processedImport.find(item => item.id === ing.id);
            if (importedItem) {
                return { ...ing, stock: ing.stock + importedItem.finalQty, lastPrice: importedItem.finalPrice };
            }
            return ing;
        });
        setIngredients(updatedIngredients);

        const totalCost = processedImport.reduce((sum, item) => sum + (item.finalQty * item.finalPrice), 0);
        const transaction = {
            id: `IMP${Date.now()}`,
            type: 'import',
            timestamp: new Date().toISOString(),
            items: processedImport.map(i => ({ id: i.id, name: i.name, qty: i.finalQty, price: i.finalPrice })),
            total: totalCost,
            seller: currentUser.name
        };
        
        setStockTransactions([transaction, ...stockTransactions]);
        setImportCart([]);
        setInventoryTab('stock');
        showNotification(`Nhập hàng thành công! Tổng: ${totalCost.toLocaleString()}đ`, 'success');
    };

    const startStocktake = () => {
        if (ingredients.length === 0) {
            showNotification("Kho đang trống, không có hàng hóa để kiểm!", "error");
            return;
        }
        setStocktakeList(ingredients.map(i => ({ ...i, actualStockInput: String(i.stock) })));
    };

    const updateStocktake = (id, rawValue) => {
        setStocktakeList(prev => prev.map(item => item.id === id ? { ...item, actualStockInput: rawValue } : item));
    };

    const handleCompleteStocktake = () => {
        if (stocktakeList.length === 0) return;

        const processedList = stocktakeList.map(item => ({
            ...item,
            finalActual: parseFloat(item.actualStockInput) || 0
        }));

        const changedItems = processedList.filter(item => item.stock !== item.finalActual);
        
        const updatedIngredients = ingredients.map(ing => {
            const stItem = processedList.find(item => item.id === ing.id);
            return stItem ? { ...ing, stock: stItem.finalActual } : ing;
        });
        
        setIngredients(updatedIngredients);

        if (changedItems.length > 0) {
            const transaction = {
                id: `STK${Date.now()}`,
                type: 'stocktake',
                timestamp: new Date().toISOString(),
                items: changedItems.map(i => ({ id: i.id, name: i.name, oldStock: i.stock, newStock: i.finalActual, diff: parseFloat((i.finalActual - i.stock).toFixed(2)) })),
                total: 0,
                seller: currentUser.name
            };
            setStockTransactions([transaction, ...stockTransactions]);
        }

        setStocktakeList([]);
        setInventoryTab('stock');
        showNotification('Cân bằng kho thành công!', 'success');
    };

    // --- SỬA VÀ XÓA LỊCH SỬ KHO ---
    const handleDeleteStockTrans = (id) => {
        if (!confirm('Xóa phiếu này sẽ tự động hoàn tác lại số lượng tồn kho. Bạn có chắc chắn?')) return;
        const trans = stockTransactions.find(t => t.id === id);
        if (!trans) return;

        let updatedIngredients = [...ingredients];
        trans.items.forEach(item => {
            const idx = updatedIngredients.findIndex(ing => ing.id === item.id || ing.name === item.name);
            if (idx !== -1) {
                if (trans.type === 'import') {
                    updatedIngredients[idx].stock -= item.qty;
                } else if (trans.type === 'stocktake') {
                    updatedIngredients[idx].stock -= item.diff; // diff = new - old
                }
            }
        });
        
        setIngredients(updatedIngredients);
        setStockTransactions(prev => prev.filter(t => t.id !== id));
        showNotification('Đã xóa phiếu và hoàn tác kho', 'success');
    };

    const saveStockTransEdit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newTotal = parseFloat(fd.get('total')) || 0;
        
        setStockTransactions(prev => prev.map(t => t.id === editingStockTrans.id ? {...t, total: newTotal} : t));
        setShowStockTransEditModal(false);
        setEditingStockTrans(null);
        showNotification('Cập nhật phiếu thành công', 'success');
    };

    // --- RENDER LOGIN ---
    if (!currentUser) {
        return (
            <div className="flex h-[100dvh] bg-[#F8FAFC] items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="bg-emerald-500 p-4 rounded-2xl"><Icon name="zap" size={40} className="text-white" /></div>
                    </div>
                    <h1 className="text-2xl font-black uppercase italic text-center mb-2">SMART POS</h1>
                    <p className="text-center text-slate-500 mb-8 text-sm">Đăng nhập để tiếp tục</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full p-4 bg-slate-100 rounded-xl text-md font-bold outline-none" placeholder="Tên đăng nhập" required />
                        <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full p-4 bg-slate-100 rounded-xl text-md font-bold outline-none" placeholder="Mật khẩu" required />
                        <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase shadow-xl">Đăng nhập</button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER MAIN POS ---
    return (
        <div className="flex h-[100dvh] w-full bg-[#F8FAFC] overflow-hidden flex-col md:flex-row text-slate-900 font-sans">
            <aside className="hidden md:flex w-24 lg:w-64 bg-[#0F172A] text-white flex-col shrink-0">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <div className="bg-emerald-500 p-2 rounded-xl"><Icon name="zap" className="text-white" /></div>
                    <span className="font-black text-lg hidden lg:block uppercase italic text-emerald-400">Smart POS</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {currentUser.permissions?.includes('pos') && <SidebarItem icon="layout-grid" label="Bán Hàng" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />}
                    {currentUser.permissions?.includes('inventory') && <SidebarItem icon="database" label="Kho Hàng" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} badge={stats.lowStock > 0 ? '!' : null} />}
                    {currentUser.permissions?.includes('menu') && <SidebarItem icon="settings" label="Thực Đơn" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />}
                    {currentUser.permissions?.includes('history') && <SidebarItem icon="history" label="Báo Cáo" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />}
                    {currentUser.role === 'admin' && <SidebarItem icon="users" label="Quản Trị" active={false} onClick={onNavigateAdmin} />}
                </nav>
                <div className="p-4 border-t border-white/10 text-center text-xs text-slate-400">
                    <button onClick={handleLogout} className="w-full py-3 bg-white/10 rounded-xl font-bold uppercase text-white"><Icon name="log-out" className="mr-2" /> Đăng xuất</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden relative pb-[72px] md:pb-0">
                <header className="md:hidden h-14 bg-white border-b flex items-center justify-between px-4 shrink-0">
                    <div className="font-black text-emerald-600 text-sm">Xin chào, {currentUser.name}</div>
                    <button onClick={handleLogout} className="text-slate-400"><Icon name="log-out" size={20}/></button>
                </header>

                <header className="hidden md:flex h-16 bg-white border-b items-center justify-between px-6 shrink-0 z-10">
                    <div className="font-black text-emerald-600">Xin chào, {currentUser.name}</div>
                    {activeTab === 'pos' && (
                        <div className="flex-1 max-w-md mx-6 relative">
                            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Tìm sản phẩm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2 bg-slate-100 rounded-xl font-bold border-none" />
                        </div>
                    )}
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {activeTab === 'pos' && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 pb-24 md:pb-6">
                                <div className="md:hidden mb-4 relative">
                                    <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Tìm món..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                
                                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                                    <button onClick={() => setSelectedCategory('Tất cả')} className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${selectedCategory === 'Tất cả' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>Tất cả</button>
                                    {categories.map(cat => (
                                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap ${selectedCategory === cat ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>{cat}</button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-2">
                                    {posItems.map(item => (
                                        <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 text-left relative overflow-hidden">
                                            {item.type === 'retail' && <span className="absolute top-2 right-2 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Lẻ</span>}
                                            <div className="aspect-square mb-2 bg-slate-50 rounded-xl flex items-center justify-center text-3xl">{item.image || '🍵'}</div>
                                            <span className="font-black text-slate-800 text-[10px] md:text-xs uppercase truncate block">{item.name}</span>
                                            <span className="text-emerald-600 font-black text-xs md:text-sm">{item.price.toLocaleString()}đ</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* THANH GIỎ HÀNG MOBILE */}
                            {cart.length > 0 && (
                                <div className="md:hidden fixed bottom-[84px] left-4 right-4 z-[45]">
                                    <button onClick={() => setShowMobileCart(true)} className="w-full bg-emerald-600 text-white p-3 rounded-2xl shadow-[0_10px_25px_rgba(5,150,105,0.4)] flex items-center justify-between transition-transform active:scale-95">
                                        <div className="flex items-center gap-3">
                                            <div className="relative bg-white/20 p-2 rounded-xl">
                                                <Icon name="shopping-cart" size={24} />
                                                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-emerald-600">{cart.length}</span>
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="font-black text-sm uppercase">Giỏ hàng</span>
                                                <span className="text-[10px] font-medium opacity-90">Nhấn để chốt đơn</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-lg">{subtotal.toLocaleString()}đ</span>
                                            <Icon name="chevron-right" size={20} className="opacity-70" />
                                        </div>
                                    </button>
                                </div>
                            )}

                            <div className="hidden md:flex w-80 lg:w-96 bg-white border-l border-slate-200 flex-col">
                                <div className="p-4 border-b font-black text-[10px] uppercase text-slate-400 bg-slate-50">Đơn hàng #{orderCounter}</div>
                                <div className="p-4 border-b"><input type="text" placeholder="Tên khách hàng..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold border-none" /></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                                            <div className="flex-1 min-w-0 ml-2">
                                                <h4 className="text-[11px] font-black truncate uppercase">{item.name}</h4>
                                                <p className="text-[10px] text-emerald-600 font-bold">{item.price.toLocaleString()}đ</p>
                                            </div>
                                            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-100 p-1">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1"><Icon name="minus" size={14}/></button>
                                                <span className="w-5 text-center text-xs font-black">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1"><Icon name="plus" size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-slate-900 text-white rounded-t-3xl">
                                    <div className="flex justify-between items-center mb-4"><span className="text-slate-400 text-xs font-black uppercase">Thanh toán</span><span className="text-xl font-black text-emerald-400">{subtotal.toLocaleString()}đ</span></div>
                                    
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCheckout(false)} disabled={cart.length === 0} className="flex-1 py-3 bg-emerald-500 disabled:bg-slate-700 rounded-xl font-black text-xs uppercase hover:bg-emerald-600 transition-colors shadow-lg">Thanh toán</button>
                                        <button onClick={() => handleCheckout(true)} disabled={cart.length === 0} className="flex-1 py-3 bg-blue-500 disabled:bg-slate-700 rounded-xl font-black text-xs uppercase hover:bg-blue-600 transition-colors flex justify-center items-center gap-2 shadow-lg"><Icon name="printer" size={16}/> In Bill</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden pb-24 md:pb-6">
                            {/* MENU QUẢN LÝ KHO */}
                            <div className="flex gap-2 mb-4 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar shrink-0">
                                <button onClick={() => setInventoryTab('stock')} className={`px-4 py-2 font-black text-[10px] uppercase rounded-xl whitespace-nowrap transition-all ${inventoryTab === 'stock' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}><Icon name="database" size={14} className="mr-1 -mt-1"/>Tồn kho</button>
                                <button onClick={() => setInventoryTab('import')} className={`px-4 py-2 font-black text-[10px] uppercase rounded-xl whitespace-nowrap transition-all ${inventoryTab === 'import' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}><Icon name="package-plus" size={14} className="mr-1 -mt-1"/>Nhập hàng</button>
                                <button onClick={() => setInventoryTab('stocktake')} className={`px-4 py-2 font-black text-[10px] uppercase rounded-xl whitespace-nowrap transition-all ${inventoryTab === 'stocktake' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}><Icon name="clipboard-check" size={14} className="mr-1 -mt-1"/>Kiểm kho</button>
                                <button onClick={() => setInventoryTab('history')} className={`px-4 py-2 font-black text-[10px] uppercase rounded-xl whitespace-nowrap transition-all ${inventoryTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}><Icon name="history" size={14} className="mr-1 -mt-1"/>Lịch sử kho</button>
                            </div>

                            {/* TAB: TỒN KHO */}
                            {inventoryTab === 'stock' && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <div className="flex gap-2 mb-4">
                                        <button onClick={() => { setEditingIng(null); setShowIngModal(true); }} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase">Thêm hàng hóa</button>
                                        <div className="flex flex-1 max-w-[220px] gap-1">
                                            <input type="text" placeholder="Thêm danh mục..." value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} className="w-full px-3 text-xs bg-slate-100 rounded-lg outline-none border-none font-bold" />
                                            <button onClick={addCategory} className="bg-emerald-500 text-white px-3 rounded-lg"><Icon name="plus" size={16} /></button>
                                            <button onClick={() => setShowCatModal(true)} className="bg-slate-200 text-slate-600 px-3 rounded-lg hover:bg-slate-300 transition-colors"><Icon name="settings" size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {ingredients.map(ing => (
                                            <div key={ing.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                                                <div className="flex justify-between mb-2">
                                                    <p className="font-black text-xs uppercase truncate pr-4">{ing.name}</p>
                                                    <p className={`font-black whitespace-nowrap ${ing.stock < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{ing.stock} {ing.unit}</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 mb-2">Giá vốn: {ing.lastPrice?.toLocaleString()}đ</p>
                                                <div className="flex gap-2 mt-3 border-t border-slate-50 pt-3">
                                                    <button onClick={() => { setEditingIng(ing); setShowIngModal(true); }} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-[10px] uppercase font-black transition-colors hover:bg-slate-200"><Icon name="edit-3" size={14} className="mr-1 inline"/>Sửa</button>
                                                    <button onClick={() => handleDeleteIngredient(ing.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] uppercase font-black transition-colors hover:bg-red-100"><Icon name="trash-2" size={14} className="mr-1 inline"/> Xóa</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB: NHẬP HÀNG */}
                            {inventoryTab === 'import' && (
                                <div className="flex flex-col h-full gap-4 relative">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0 z-10">
                                        <div className="relative">
                                            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Tìm nguyên liệu / hàng hóa để nhập..." 
                                                value={importSearch} 
                                                onChange={(e) => setImportSearch(e.target.value)} 
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500" 
                                            />
                                            {importSearch && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto">
                                                    {ingredients.filter(i => i.name.toLowerCase().includes(importSearch.toLowerCase())).map(ing => (
                                                        <button 
                                                            key={ing.id} 
                                                            onClick={() => addToImport(ing)}
                                                            className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex justify-between items-center font-bold text-sm"
                                                        >
                                                            <span>{ing.name} <span className="text-[10px] text-slate-400 ml-2">({ing.unit})</span></span>
                                                            <span className="text-blue-500 text-xs"><Icon name="plus-circle" size={16}/></span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                            <h3 className="font-black text-xs uppercase text-slate-600">Phiếu nhập hàng</h3>
                                            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-black">{importCart.length} món</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                            {importCart.length === 0 ? (
                                                <p className="text-center text-slate-400 font-bold text-xs mt-10">Chưa chọn hàng hóa nào</p>
                                            ) : (
                                                importCart.map(item => {
                                                    const currentQty = parseFloat(item.importQty) || 0;
                                                    const currentPrice = parseFloat(item.importPrice) || 0;
                                                    return (
                                                    <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-black text-xs uppercase">{item.name}</h4>
                                                            <button onClick={() => removeFromImport(item.id)} className="text-red-400 hover:text-red-600"><Icon name="x" size={16}/></button>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">SL nhập ({item.unit})</label>
                                                                <input type="number" step="0.1" value={item.importQty} onChange={(e) => updateImportCart(item.id, 'importQty', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold outline-none focus:border-blue-500" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Đơn giá (đ)</label>
                                                                <input type="number" value={item.importPrice} onChange={(e) => updateImportCart(item.id, 'importPrice', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold outline-none focus:border-blue-500" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Thành tiền</label>
                                                                <div className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-emerald-600 text-right overflow-hidden text-ellipsis">
                                                                    {(currentQty * currentPrice).toLocaleString()}đ
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )})
                                            )}
                                        </div>
                                        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="font-black text-xs uppercase text-slate-500">Tổng tiền nhập</span>
                                                <span className="font-black text-xl text-blue-600">{importCart.reduce((sum, item) => sum + ((parseFloat(item.importQty)||0) * (parseFloat(item.importPrice)||0)), 0).toLocaleString()}đ</span>
                                            </div>
                                            <button onClick={handleCompleteImport} disabled={importCart.length === 0} className="w-full py-3 bg-blue-600 disabled:bg-slate-300 text-white font-black text-xs uppercase rounded-xl shadow-lg">Hoàn thành nhập hàng</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: KIỂM KHO */}
                            {inventoryTab === 'stocktake' && (
                                <div className="flex flex-col h-full">
                                    {stocktakeList.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
                                            <Icon name="clipboard-check" size={48} className="text-slate-300 mb-4" />
                                            <p className="text-slate-500 font-bold text-sm mb-6 text-center px-4">Kiểm kho giúp đồng bộ số lượng hàng trên hệ thống khớp với số lượng thực tế ngoài quán.</p>
                                            <button onClick={startStocktake} className="px-6 py-3 bg-orange-500 text-white font-black uppercase text-xs rounded-xl shadow-lg hover:bg-orange-600 transition-all">Bắt đầu phiếu kiểm kho</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                                <h3 className="font-black text-xs uppercase text-slate-600">Phiếu kiểm kho</h3>
                                                <button onClick={() => setStocktakeList([])} className="text-[10px] font-bold text-red-500 uppercase px-2 py-1 bg-red-50 rounded">Hủy phiếu</button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                                {stocktakeList.map(item => {
                                                    const actualNum = parseFloat(item.actualStockInput) || 0;
                                                    const diff = parseFloat((actualNum - item.stock).toFixed(2));
                                                    return (
                                                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                                            <div className="flex-1 mb-2 md:mb-0">
                                                                <h4 className="font-black text-xs uppercase text-slate-800">{item.name}</h4>
                                                                <p className="text-[10px] font-bold text-slate-500">Tồn hệ thống: <span className="text-slate-800">{item.stock} {item.unit}</span></p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-24">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Kiểm thực tế</label>
                                                                    <input type="number" step="0.1" value={item.actualStockInput} onChange={(e) => updateStocktake(item.id, e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-center outline-none focus:border-orange-500" />
                                                                </div>
                                                                <div className="w-20 text-right">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Độ lệch</label>
                                                                    <span className={`font-black text-sm ${diff > 0 ? 'text-blue-500' : diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                        {diff > 0 ? '+' : ''}{diff}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                                                <button onClick={handleCompleteStocktake} className="w-full py-3 bg-orange-500 text-white font-black text-xs uppercase rounded-xl shadow-lg">Cân bằng kho</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: LỊCH SỬ KHO */}
                            {inventoryTab === 'history' && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {stockTransactions.length === 0 ? (
                                        <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold text-sm">Chưa có giao dịch kho nào.</div>
                                    ) : (
                                        stockTransactions.map(trans => (
                                            <div key={trans.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3">
                                                <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                                                    <div>
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase text-white mr-2 ${trans.type === 'import' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                                                            {trans.type === 'import' ? 'Nhập hàng' : 'Kiểm kho'}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400">#{trans.id}</span>
                                                    </div>
                                                    {trans.type === 'import' && <span className="font-black text-blue-600">{trans.total?.toLocaleString()}đ</span>}
                                                </div>
                                                <div className="space-y-1 mb-3 bg-slate-50 p-3 rounded-xl">
                                                    {trans.items.map((i, idx) => (
                                                        <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-600">
                                                            <span>{i.name}</span>
                                                            {trans.type === 'import' ? (
                                                                <span>+{i.qty} <span className="text-slate-400">({i.price.toLocaleString()}đ/đv)</span></span>
                                                            ) : (
                                                                <span className={i.diff > 0 ? 'text-blue-500' : 'text-red-500'}>
                                                                    Cũ: {i.oldStock} ➔ Mới: {i.newStock} ({i.diff > 0 ? '+' : ''}{i.diff})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-slate-50 pb-3 mb-3">
                                                    <span>{new Date(trans.timestamp).toLocaleString('vi-VN')}</span>
                                                    <span className="uppercase"><Icon name="user" size={10} className="mr-1 inline" />{trans.seller}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {trans.type === 'import' && (
                                                        <button onClick={() => { setEditingStockTrans(trans); setShowStockTransEditModal(true); }} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-[10px] uppercase font-black transition-colors hover:bg-slate-200"><Icon name="edit-3" size={14} className="mr-1 inline"/>Sửa tổng tiền</button>
                                                    )}
                                                    <button onClick={() => handleDeleteStockTrans(trans.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] uppercase font-black transition-colors hover:bg-red-100"><Icon name="trash-2" size={14} className="mr-1 inline"/>Xóa phiếu</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'menu' && (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
                            <button onClick={openAddProductModal} className="w-full mb-4 bg-emerald-500 text-white py-3 rounded-xl font-black text-xs uppercase shadow-md">+ Thêm món mới</button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {products.map(p => (
                                    <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 relative shadow-sm flex flex-col">
                                        <p className="font-black text-sm uppercase mb-2 pr-6">{p.name}</p>
                                        <div><span className="text-[10px] px-2 py-1 bg-slate-100 rounded text-slate-500 font-bold uppercase">{p.category}</span></div>
                                        <div className="mt-3 space-y-2 bg-slate-50 p-2 rounded-xl flex-1">
                                            {p.variants?.map((v, i) => (
                                                <div key={i} className="flex flex-col border-b border-white last:border-0 pb-2 last:pb-0 mb-1 last:mb-0">
                                                    <div className="flex justify-between items-center text-xs font-bold text-emerald-600 mb-1">
                                                        <span className="text-slate-600">Size {v.size}</span>
                                                        <div className="text-right">
                                                            <span className="text-[9px] text-slate-400 mr-2">Vốn: {v.costPrice?.toLocaleString() || 0}đ</span>
                                                            <span>Bán: {v.price.toLocaleString()}đ</span>
                                                        </div>
                                                    </div>
                                                    {v.recipe && v.recipe.length > 0 && (
                                                        <div className="text-[9px] text-slate-500 ml-2 border-l-2 border-slate-200 pl-2">
                                                            {v.recipe.map((r, rIdx) => {
                                                                const ing = ingredients.find(i => Number(i.id) === Number(r.ingId));
                                                                return <div key={rIdx}>- Trừ {r.amount} {ing?.unit} {ing?.name}</div>
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 border-t border-slate-100 pt-3 mt-3 shrink-0">
                                            <button onClick={() => openEditProductModal(p)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase transition-colors"><Icon name="edit-3" size={14} className="mr-1 inline"/> Sửa món</button>
                                            <button onClick={() => {if(confirm('Bạn có chắc chắn muốn xoá món này khỏi thực đơn?')) setProducts(products.filter(item => item.id !== p.id))}} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-[10px] font-black uppercase transition-colors"><Icon name="trash-2" size={14} className="mr-1 inline"/> Xóa món</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
                            {/* KHU VỰC BỘ LỌC */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-4 shadow-sm">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Thời gian</label>
                                        <select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-700">
                                            <option value="today">Hôm nay</option>
                                            <option value="yesterday">Hôm qua</option>
                                            <option value="week">1 tuần qua</option>
                                            <option value="month">1 tháng qua</option>
                                            <option value="year">1 năm qua</option>
                                            <option value="custom">Tùy chỉnh khoảng thời gian...</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nhân viên bán</label>
                                        <select value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-700">
                                            <option value="Tất cả">Tất cả nhân viên</option>
                                            {allSellers.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Tùy chọn Ngày cụ thể */}
                                {reportFilter === 'custom' && (
                                    <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Từ ngày</label>
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-700" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Đến ngày</label>
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-700" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* BẢNG THỐNG KÊ TỔNG - KIOTVIET STYLE */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                <div className="bg-emerald-500 text-white p-5 rounded-2xl shadow-md">
                                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng Doanh thu</p>
                                    <h2 className="text-xl md:text-2xl font-black">{reportStats.total.toLocaleString()}đ</h2>
                                </div>
                                <div className="bg-blue-500 text-white p-5 rounded-2xl shadow-md">
                                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">Lợi nhuận (Lãi)</p>
                                    <h2 className="text-xl md:text-2xl font-black">{reportStats.profit.toLocaleString()}đ</h2>
                                </div>
                                <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-md col-span-2 md:col-span-1">
                                    <p className="text-[10px] font-black uppercase opacity-80 mb-1">Số hóa đơn</p>
                                    <h2 className="text-xl md:text-2xl font-black">{reportStats.count}</h2>
                                </div>
                            </div>

                            {/* DANH SÁCH LỊCH SỬ ĐƠN */}
                            <div className="space-y-3">
                                {filteredHistory.length === 0 ? (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold text-sm">
                                        Chưa có dữ liệu nào trong khoảng thời gian này!
                                    </div>
                                ) : (
                                    filteredHistory.map((h) => (
                                        <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-sm">
                                            <div className="flex justify-between font-black uppercase mb-3 border-b border-slate-50 pb-2">
                                                <span className="text-slate-700">{h.customer} <span className="text-slate-400 text-[10px] font-bold ml-1">#{h.token}</span></span>
                                                <span className="text-emerald-600">{h.total.toLocaleString()}đ</span>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded-lg font-medium">{h.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-slate-50 pb-3 mb-3">
                                                <span>{new Date(h.timestamp).toLocaleString('vi-VN')}</span>
                                                <span className="px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase"><Icon name="user" size={10} className="mr-1 inline" />{h.seller}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingHistoryItem(h); setShowHistoryEditModal(true); }} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-[10px] uppercase font-black transition-colors hover:bg-slate-200"><Icon name="edit-3" size={14} className="mr-1 inline"/>Sửa</button>
                                                <button onClick={() => handleDeleteHistoryItem(h.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] uppercase font-black transition-colors hover:bg-red-100"><Icon name="trash-2" size={14} className="mr-1 inline"/>Xóa hóa đơn</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] text-white flex items-center h-[72px] border-t border-white/5 z-40 pb-2 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] overflow-x-auto no-scrollbar px-4 gap-6 justify-start">
                <button onClick={() => setActiveTab('pos')} className={`shrink-0 flex flex-col items-center gap-1 h-full justify-center ${activeTab === 'pos' ? "text-emerald-400" : "text-slate-500"}`}>
                    <Icon name="layout-grid" size={20} />
                    <span className="text-[9px] font-black uppercase mt-1">Bán hàng</span>
                </button>
                {currentUser.permissions?.includes('inventory') && (
                    <button onClick={() => setActiveTab('inventory')} className={`shrink-0 flex flex-col items-center gap-1 h-full justify-center ${activeTab === 'inventory' ? "text-emerald-400" : "text-slate-500"}`}>
                        <Icon name="database" size={20} />
                        <span className="text-[9px] font-black uppercase mt-1">Kho</span>
                    </button>
                )}
                {currentUser.permissions?.includes('menu') && (
                    <button onClick={() => setActiveTab('menu')} className={`shrink-0 flex flex-col items-center gap-1 h-full justify-center ${activeTab === 'menu' ? "text-emerald-400" : "text-slate-500"}`}>
                        <Icon name="settings" size={20} />
                        <span className="text-[9px] font-black uppercase mt-1">Thực đơn</span>
                    </button>
                )}
                {currentUser.permissions?.includes('history') && (
                    <button onClick={() => setActiveTab('history')} className={`shrink-0 flex flex-col items-center gap-1 h-full justify-center ${activeTab === 'history' ? "text-emerald-400" : "text-slate-500"}`}>
                        <Icon name="history" size={20} />
                        <span className="text-[9px] font-black uppercase mt-1">Báo cáo</span>
                    </button>
                )}
                {currentUser.role === 'admin' && (
                    <button onClick={onNavigateAdmin} className="shrink-0 flex flex-col items-center gap-1 h-full justify-center text-slate-500">
                        <Icon name="users" size={20} />
                        <span className="text-[9px] font-black uppercase mt-1">Admin</span>
                    </button>
                )}
            </nav>

            {showMobileCart && (
                <div className="md:hidden fixed inset-0 bg-white z-[100] flex flex-col slide-up-anim">
                    <div className="p-4 bg-[#0F172A] text-white flex justify-between items-center shrink-0 pt-safe">
                        <h2 className="font-black text-sm uppercase">Giỏ hàng ({cart.length})</h2>
                        <button onClick={() => setShowMobileCart(false)} className="p-2 bg-white/10 rounded-full"><Icon name="x" size={20}/></button>
                    </div>
                    
                    <div className="p-4 border-b bg-slate-50 shrink-0">
                        <input type="text" placeholder="Tên khách (Không bắt buộc)..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? <p className="text-center text-slate-400 font-bold mt-10">Chưa có món nào</p> : 
                        cart.map(item => (
                            <div key={item.id} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-black truncate uppercase">{item.name}</h4>
                                    <p className="text-xs text-emerald-600 font-bold">{item.price.toLocaleString()}đ</p>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="p-2 bg-white rounded shadow-sm"><Icon name="minus" size={16}/></button>
                                    <span className="w-6 text-center text-sm font-black">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="p-2 bg-white rounded shadow-sm"><Icon name="plus" size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] shrink-0 pb-safe">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500 font-black uppercase text-xs">Tổng cộng</span>
                            <span className="text-2xl font-black text-emerald-600">{subtotal.toLocaleString()}đ</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleCheckout(false)} disabled={cart.length === 0} className="w-full py-4 bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl font-black text-sm uppercase shadow-lg">Thanh toán</button>
                            <button onClick={() => handleCheckout(true)} disabled={cart.length === 0} className="w-full py-4 bg-blue-500 disabled:bg-slate-300 text-white rounded-xl font-black text-sm uppercase shadow-lg flex items-center justify-center gap-2"><Icon name="printer" size={20}/> In Bill</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL THÔNG TIN HÀNG HÓA KHO */}
            {showIngModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleIngSubmit} className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-black uppercase italic mb-6">{editingIng ? 'Sửa thông tin mặt hàng' : 'Tạo hàng hóa mới'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tên mặt hàng</label>
                                <input name="name" defaultValue={editingIng?.name} placeholder="vd: Cà phê hạt" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Đơn vị tính</label>
                                    <input name="unit" defaultValue={editingIng?.unit} placeholder="Kg, Lít, Ly..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tồn kho ban đầu</label>
                                    <input name="stock" type="number" step="0.1" defaultValue={editingIng?.stock || 0} placeholder="0" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Giá vốn (Giá nhập/đơn vị)</label>
                                <div className="relative">
                                    <input name="costPrice" type="number" defaultValue={editingIng?.lastPrice || 0} placeholder="0" className="w-full p-4 pr-10 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">đ</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Giá bán lẻ (Để 0 nếu chỉ dùng để chế biến)</label>
                                <div className="relative">
                                    <input name="sellPrice" type="number" defaultValue={editingIng?.sellPrice || 0} placeholder="0" className="w-full p-4 pr-10 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">đ</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Danh mục</label>
                                <select name="category" defaultValue={editingIng?.category || categories[0]} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm">
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase shadow-lg text-xs">Lưu mặt hàng</button>
                        <button type="button" onClick={() => setShowIngModal(false)} className="w-full mt-2 text-slate-400 font-bold text-[10px] uppercase py-3 rounded-xl hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                    </form>
                </div>
            )}

            {/* MODAL THÊM/SỬA MÓN THỰC ĐƠN KÈM RECIPE */}
            {showAddMenu && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleProductSubmit} className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-black uppercase italic mb-6">{editingProduct ? 'Sửa thông tin món' : 'Thêm món mới'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tên Món</label>
                                <input value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} placeholder="vd: Trà sữa trân châu" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Danh mục</label>
                                    <select value={newProductForm.category} onChange={e => setNewProductForm({...newProductForm, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm">
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Icon</label>
                                    <input value={newProductForm.image} onChange={e => setNewProductForm({...newProductForm, image: e.target.value})} placeholder="🍵" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-center text-xl" />
                                </div>
                            </div>
                            
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Các Biến thể (Size / Giá)</p>
                                    <button type="button" onClick={addVariant} className="text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors">+ Thêm Size</button>
                                </div>
                                
                                {newProductForm.variants.map((v, idx) => (
                                    <div key={idx} className="mb-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0 last:mb-0">
                                        <div className="flex gap-2 mb-2 items-end">
                                            <div className="w-1/4">
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Size</label>
                                                <input value={v.size} onChange={(e) => updateVariant(idx, 'size', e.target.value)} placeholder="M..." className="w-full p-3 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-emerald-500" required />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Giá vốn</label>
                                                <div className="relative">
                                                    <input value={v.costPrice} type="number" onChange={(e) => updateVariant(idx, 'costPrice', e.target.value)} placeholder="0" className="w-full p-3 pr-6 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-emerald-500" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">đ</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Giá bán</label>
                                                <div className="relative">
                                                    <input value={v.price} type="number" onChange={(e) => updateVariant(idx, 'price', e.target.value)} placeholder="0" className="w-full p-3 pr-6 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-emerald-500" required />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">đ</span>
                                                </div>
                                            </div>
                                            {newProductForm.variants.length > 1 && (
                                                <button type="button" onClick={() => removeVariant(idx)} className="p-3 mb-0.5 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100"><Icon name="trash-2" size={16}/></button>
                                            )}
                                        </div>

                                        {/* PHẦN ĐỊNH MỨC NGUYÊN LIỆU CHO TỪNG SIZE */}
                                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-black uppercase text-emerald-600"><Icon name="database" size={10} className="mr-1 inline"/> Định mức kho (Trừ nguyên liệu)</span>
                                                <button type="button" onClick={() => addRecipeItem(idx)} className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg font-bold">+ Thêm NL</button>
                                            </div>
                                            
                                            {v.recipe && v.recipe.length > 0 ? (
                                                v.recipe.map((r, rIdx) => {
                                                    const selectedIng = ingredients.find(i => Number(i.id) === Number(r.ingId));
                                                    return (
                                                        <div key={rIdx} className="flex gap-2 items-center mb-2 last:mb-0">
                                                            <select value={r.ingId} onChange={e => updateRecipeItem(idx, rIdx, 'ingId', e.target.value)} className="flex-1 p-2 text-xs font-bold border border-slate-200 bg-slate-50 rounded-lg outline-none">
                                                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                                                            </select>
                                                            <div className="w-24 relative">
                                                                <input type="number" step="0.1" value={r.amount} onChange={e => updateRecipeItem(idx, rIdx, 'amount', e.target.value)} className="w-full p-2 pr-8 text-xs font-bold border border-slate-200 bg-slate-50 rounded-lg outline-none" placeholder="SL"/>
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{selectedIng?.unit || ''}</span>
                                                            </div>
                                                            <button type="button" onClick={() => removeRecipeItem(idx, rIdx)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Icon name="x" size={14}/></button>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <p className="text-[9px] text-slate-400 italic">Chưa cài đặt định mức kho cho size này.</p>
                                            )}
                                            
                                            {/* HIỂN THỊ TỔNG GIÁ VỐN DỰ TÍNH */}
                                            {v.recipe && v.recipe.length > 0 && (
                                                <div className="text-[9px] font-black text-slate-500 mt-2 text-right border-t border-slate-50 pt-2">
                                                    Vốn NL dự tính: <span className="text-orange-500 text-xs">{(v.recipe.reduce((sum, r) => {
                                                        const ing = ingredients.find(i => Number(i.id) === Number(r.ingId));
                                                        return sum + (ing ? (ing.lastPrice || 0) * r.amount : 0);
                                                    }, 0)).toLocaleString()}đ</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase shadow-lg text-xs">Lưu Món</button>
                        <button type="button" onClick={() => setShowAddMenu(false)} className="w-full mt-2 text-slate-400 font-bold text-[10px] uppercase py-3 rounded-xl hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                    </form>
                </div>
            )}

            {/* MODAL SỬA LỊCH SỬ BÁN HÀNG */}
            {showHistoryEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={saveHistoryEdit} className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-black uppercase italic mb-6">Sửa Hóa Đơn</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tên Khách Hàng</label>
                                <input name="customer" defaultValue={editingHistoryItem?.customer} placeholder="Tên khách" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tổng Số Tiền</label>
                                <div className="relative">
                                    <input name="total" type="number" defaultValue={editingHistoryItem?.total} placeholder="0" className="w-full p-4 pr-10 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">đ</span>
                                </div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-orange-600 leading-relaxed"><Icon name="alert-circle" size={12} className="inline mr-1" />Lưu ý: Nếu hóa đơn sai số lượng mặt hàng, vui lòng XÓA hóa đơn (để hệ thống tự hoàn lại kho) và tạo đơn mới.</p>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase shadow-lg text-xs">Cập nhật hóa đơn</button>
                        <button type="button" onClick={() => setShowHistoryEditModal(false)} className="w-full mt-2 text-slate-400 font-bold text-[10px] uppercase py-3 rounded-xl hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                    </form>
                </div>
            )}

            {/* MODAL SỬA PHIẾU KHO */}
            {showStockTransEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={saveStockTransEdit} className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-black uppercase italic mb-6">Sửa Phiếu Kho</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tổng Số Tiền Nhập</label>
                                <div className="relative">
                                    <input name="total" type="number" defaultValue={editingStockTrans?.total} placeholder="0" className="w-full p-4 pr-10 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" required />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">đ</span>
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase shadow-lg text-xs">Lưu thay đổi</button>
                        <button type="button" onClick={() => setShowStockTransEditModal(false)} className="w-full mt-2 text-slate-400 font-bold text-[10px] uppercase py-3 rounded-xl hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                    </form>
                </div>
            )}

            {/* MODAL QUẢN LÝ DANH MỤC */}
            {showCatModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black uppercase italic mb-6">Quản lý danh mục</h3>
                        
                        <div className="space-y-3 mb-6">
                            {categories.map(cat => (
                                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    {editingCat.old === cat ? (
                                        <div className="flex flex-1 gap-2">
                                            <input 
                                                autoFocus
                                                value={editingCat.new} 
                                                onChange={(e) => setEditingCat({...editingCat, new: e.target.value})}
                                                className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-bold outline-none"
                                            />
                                            <button onClick={() => handleEditCategory(editingCat.old, editingCat.new)} className="p-2 bg-emerald-500 text-white rounded-lg"><Icon name="check" size={16}/></button>
                                            <button onClick={() => setEditingCat({old: '', new: ''})} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><Icon name="x" size={16}/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-bold text-sm text-slate-700 flex-1">{cat}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingCat({old: cat, new: cat})} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Icon name="edit-3" size={16}/></button>
                                                <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Icon name="trash-2" size={16}/></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setShowCatModal(false)} className="w-full mt-2 text-slate-400 font-bold text-[10px] uppercase py-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">Đóng</button>
                    </div>
                </div>
            )}

            {/* THÔNG BÁO FLOAT */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 pointer-events-none w-[90%] md:w-auto">
                {notifications.map((notif) => (
                    <div key={notif.id} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full shadow-2xl text-xs font-bold transition-all duration-300 ${notif.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        <Icon name={notif.type === 'success' ? "check-circle" : "alert-triangle"} size={16} />
                        <span>{notif.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SmartPOSSystem = () => {
    const [currentRoute, setCurrentRoute] = useState('pos');
    if (currentRoute === 'admin') return <AppAdmin onNavigateBack={() => setCurrentRoute('pos')} />;
    return <AppPOS onNavigateAdmin={() => setCurrentRoute('admin')} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SmartPOSSystem />);