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
const Icon = ({ name, size = 16, ...props }) => {
    useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [name, size, props]);
    return <i data-lucide={name} style={{ width: size, height: size }} {...props}></i>;
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
    const isInitialLoad = useRef(true);

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
            isInitialLoad.current = false;
        });
        return () => usersRef.off();
    }, []);

    useEffect(() => {
        if (!isSyncingFromCloud.current && !isInitialLoad.current && users.length > 0) {
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
                                    {['pos', 'preparing', 'inventory', 'menu', 'history'].map(perm => (
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
                                {['pos', 'preparing', 'inventory', 'menu', 'history'].map(perm => (
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

    // UI States
    const [cart, setCart] = useState([]);
    const [orders, setOrders] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [newCatInput, setNewCatInput] = useState('');
    const [notifications, setNotifications] = useState([]);
    
    // Report Filter States
    const [reportFilter, setReportFilter] = useState('today');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSeller, setSelectedSeller] = useState('Tất cả');
    
    // Modal States
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showIngModal, setShowIngModal] = useState(false);
    const [editingIng, setEditingIng] = useState(null);
    const [editingHistoryItem, setEditingHistoryItem] = useState(null);
    
    // CATEGORY Modal States
    const [showCatModal, setShowCatModal] = useState(false);
    const [editingCat, setEditingCat] = useState({ old: '', new: '' });

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
                permissions: ['pos','preparing','inventory','menu','history'], password: 'admin'
            };
            setUsers([defaultAdmin]);
        }
    }, [users]);

    useEffect(() => {
        if (currentUser) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }, [currentUser]);

    useEffect(() => {
        if (isSyncingFromCloud.current || isInitialLoad.current) return; 
        
        const data = { ingredients, products, history, orderCounter, categories };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        syncToCloud(data, users);
    }, [ingredients, products, history, orderCounter, categories, users]);

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

    const posItems = useMemo(() => {
        const processedProducts = products.flatMap(p => {
            if (p.variants && p.variants.length > 0) {
                return p.variants.map(v => ({
                    ...p, id: `${p.id}-${v.size}`, variantId: v.size, name: `${p.name} (${v.size})`, price: v.price, type: 'menu'
                }));
            }
            return [{ ...p, type: 'menu' }];
        });
        const retailItems = ingredients.filter(i => i.sellPrice > 0).map(i => ({ 
            id: `retail-${i.id}`, originalId: i.id, name: i.name, price: i.sellPrice, category: i.category || 'Chưa phân loại', image: '📦', type: 'retail' 
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

    const reportStats = useMemo(() => {
        const total = filteredHistory.reduce((sum, h) => sum + h.total, 0);
        return { total, count: filteredHistory.length };
    }, [filteredHistory]);

    const stats = useMemo(() => ({
        waiting: orders.length,
        lowStock: ingredients.filter(i => i.stock < 5).length
    }), [orders, ingredients]);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const addCategory = () => {
        if (newCatInput && !categories.includes(newCatInput)) {
            setCategories([...categories, newCatInput]);
            setNewCatInput('');
            showNotification('Thêm danh mục thành công', 'success');
        }
    };
    
    // --- HÀM XỬ LÝ XÓA / ĐỔI TÊN DANH MỤC ---
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

            // Cập nhật lại sản phẩm & nguyên liệu
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

        // Đổi tên đồng loạt trong sản phẩm & nguyên liệu
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

    const handleInstantOrder = () => {
        if (cart.length === 0) return;
        const newOrder = {
            id: `ORD${Date.now().toString().slice(-4)}`,
            token: orderCounter,
            customer: customerName || 'Khách lẻ',
            timestamp: new Date().toISOString(),
            items: [...cart],
            total: subtotal,
            seller: currentUser.name
        };
        setOrders([...orders, newOrder]);
        setCart([]);
        setCustomerName('');
        setOrderCounter(prev => (prev >= 99 ? 1 : prev + 1));
        setShowMobileCart(false);
        showNotification('Đơn hàng đã chuyển vào Hàng Đợi.', 'success');
    };

    const handlePayment = (orderId) => {
        const orderToPay = orders.find(o => o.id === orderId);
        if (!orderToPay) return;
        const updatedIngredients = [...ingredients];
        orderToPay.items.forEach(item => {
            if (item.type === 'retail') {
                const idx = updatedIngredients.findIndex(ing => ing.id === item.originalId);
                if (idx !== -1) updatedIngredients[idx].stock -= item.quantity;
            } else if (item.recipe) {
                item.recipe.forEach(r => {
                    const idx = updatedIngredients.findIndex(ing => ing.id === r.ingId);
                    if (idx !== -1) updatedIngredients[idx].stock -= (r.amount * item.quantity);
                });
            }
        });
        setIngredients(updatedIngredients);
        const finalizedOrder = { 
            ...orderToPay, 
            timestamp: new Date().toISOString(),
            payTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            seller: currentUser.name
        };
        setHistory([finalizedOrder, ...history]);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        showNotification(`Hoàn tất thanh toán đơn #${orderToPay.token}`, 'success');
    };

    const handleDeleteWaitingOrder = (orderId) => {
        if (!confirm('Xác nhận xóa đơn hàng đợi này?')) return;
        setOrders(prev => prev.filter(o => o.id !== orderId));
    };

    const handleUpdateHistory = () => {
        if (!editingHistoryItem) return;
        const newTotal = editingHistoryItem.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const updated = history.map(h => h.id === editingHistoryItem.id ? { ...editingHistoryItem, total: newTotal } : h);
        setHistory(updated);
        setEditingHistoryItem(null);
    };

    const handleIngSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const ingData = {
            name: fd.get('name'), unit: fd.get('unit'),
            lastPrice: parseInt(fd.get('costPrice')) || 0,
            sellPrice: parseInt(fd.get('sellPrice')) || 0,
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

    const [newProductForm, setNewProductForm] = useState({
        name: '', category: '', variants: [{ size: 'S', price: '' }, { size: 'M', price: '' }]
    });

    const updateVariant = (index, field, value) => { 
        setNewProductForm(prev => { 
            const newVariants = [...prev.variants]; 
            newVariants[index] = { ...newVariants[index], [field]: value }; 
            return { ...prev, variants: newVariants }; 
        }); 
    };

    const handleAddProduct = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        const validVariants = newProductForm.variants
            .filter(v => v.price && !isNaN(parseInt(v.price)))
            .map(v => ({...v, price: parseInt(v.price)}));

        const newP = {
            id: Date.now(),
            name: fd.get('name'),
            category: fd.get('category'),
            image: fd.get('image') || '🍵',
            variants: validVariants.length > 0 ? validVariants : [{size: 'Mặc định', price: 0}]
        };
        
        setProducts([...products, newP]);
        setShowAddMenu(false);
        setNewProductForm({ name: '', category: '', variants: [{ size: 'S', price: '' }, { size: 'M', price: '' }] });
        showNotification("Đã thêm món mới thành công!", "success");
    };

    // Lấy danh sách toàn bộ nhân viên (bao gồm đã xóa nhưng còn trong lịch sử)
    const allSellers = useMemo(() => {
        return Array.from(new Set([
            ...users.map(u => u.name), 
            ...history.map(h => h.seller).filter(Boolean)
        ]));
    }, [users, history]);

    // --- RENDER LOGIN ---
    if (!currentUser) {
        return (
            <div className="flex h-[100dvh] bg-[#F8FAFC] items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="bg-emerald-500 p-4 rounded-2xl"><Icon name="zap" size={40} fill="white" /></div>
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
                    <div className="bg-emerald-500 p-2 rounded-xl"><Icon name="zap" fill="white" /></div>
                    <span className="font-black text-lg hidden lg:block uppercase italic text-emerald-400">Smart POS</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {currentUser.permissions?.includes('pos') && <SidebarItem icon="layout-grid" label="Bán Hàng" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />}
                    {currentUser.permissions?.includes('preparing') && <SidebarItem icon="clipboard-list" label="Hàng Đợi" active={activeTab === 'preparing'} onClick={() => setActiveTab('preparing')} badge={stats.waiting} />}
                    {currentUser.permissions?.includes('inventory') && <SidebarItem icon="database" label="Kho Hàng" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} badge={stats.lowStock > 0 ? '!' : null} />}
                    {currentUser.permissions?.includes('menu') && <SidebarItem icon="settings" label="Thực Đơn" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />}
                    {currentUser.permissions?.includes('history') && <SidebarItem icon="history" label="Báo Cáo" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />}
                    {currentUser.role === 'admin' && <SidebarItem icon="users" label="Quản Trị" active={false} onClick={onNavigateAdmin} />}
                </nav>
                <div className="p-4 border-t border-white/10 text-center text-xs text-slate-400">
                    <button onClick={handleLogout} className="w-full py-3 bg-white/10 rounded-xl font-bold uppercase text-white"><Icon name="log-out" className="inline mr-2" /> Đăng xuất</button>
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
                            
                            <button onClick={() => setShowMobileCart(true)} className="md:hidden fixed bottom-24 right-4 bg-emerald-600 text-white w-14 h-14 rounded-full shadow-2xl z-[45] flex items-center justify-center relative">
                                <Icon name="shopping-cart" size={24} />
                                {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{cart.length}</span>}
                            </button>

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
                                    <button onClick={handleInstantOrder} disabled={cart.length === 0} className="w-full py-4 bg-emerald-500 rounded-xl font-black text-sm uppercase">Xác nhận</button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'preparing' && (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
                            {orders.map(order => (
                                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                                    <div className="flex justify-between mb-3 border-b pb-2">
                                        <h4 className="font-black text-md uppercase">{order.customer} <span className="text-slate-400 text-xs">#{order.token}</span></h4>
                                        <button onClick={() => handleDeleteWaitingOrder(order.id)} className="text-red-400"><Icon name="trash-2" size={18} /></button>
                                    </div>
                                    <div className="space-y-1 mb-3">
                                        {order.items.map((item, idx) => <div key={idx} className="flex justify-between text-xs font-bold text-slate-700"><span>{item.quantity}x {item.name}</span><span>{(item.price * item.quantity).toLocaleString()}đ</span></div>)}
                                    </div>
                                    <button onClick={() => handlePayment(order.id)} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase">Hoàn tất ({order.total.toLocaleString()}đ)</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => { setEditingIng(null); setShowIngModal(true); }} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase">Thêm hàng</button>
                                <div className="flex flex-1 max-w-[220px] gap-1">
                                    <input type="text" placeholder="Thêm danh mục..." value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} className="w-full px-3 text-xs bg-slate-100 rounded-lg outline-none border-none font-bold" />
                                    <button onClick={addCategory} className="bg-emerald-500 text-white px-3 rounded-lg"><Icon name="plus" size={16} /></button>
                                    <button onClick={() => setShowCatModal(true)} className="bg-slate-200 text-slate-600 px-3 rounded-lg hover:bg-slate-300 transition-colors"><Icon name="settings" size={16} /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {ingredients.map(ing => (
                                    <div key={ing.id} className="p-4 rounded-2xl bg-white border border-slate-200">
                                        <div className="flex justify-between mb-2">
                                            <p className="font-black text-xs uppercase">{ing.name}</p>
                                            <p className={`font-black ${ing.stock < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{ing.stock} {ing.unit}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-2">Giá vốn: {ing.lastPrice?.toLocaleString()}đ</p>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => { setEditingIng(ing); setShowIngModal(true); }} className="flex-1 py-2 bg-slate-100 rounded-lg text-xs font-black">Sửa</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'menu' && (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
                            <button onClick={() => setShowAddMenu(true)} className="w-full mb-4 bg-emerald-500 text-white py-3 rounded-xl font-black text-xs uppercase">Thêm món mới</button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {products.map(p => (
                                    <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 relative">
                                        <p className="font-black text-sm uppercase mb-2 pr-6">{p.name}</p>
                                        <span className="text-[10px] px-2 py-1 bg-slate-100 rounded text-slate-500 font-bold uppercase">{p.category}</span>
                                        <div className="mt-3 space-y-1">
                                            {p.variants?.map((v, i) => (
                                                <p key={i} className="text-xs font-bold text-emerald-600">{v.size}: {v.price.toLocaleString()}đ</p>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 border-t pt-2 mt-2">
                                            <button onClick={() => {if(confirm('Bạn muốn xoá món này?')) setProducts(products.filter(item => item.id !== p.id))}} className="w-full py-2 bg-red-50 text-red-500 rounded-lg text-[10px] font-black uppercase"><Icon name="trash-2" size={14} className="inline mr-1"/> Xóa món</button>
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

                            {/* BẢNG THỐNG KÊ TỔNG */}
                            <div className="bg-emerald-500 text-white p-5 rounded-2xl mb-4 shadow-md">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black uppercase opacity-80 mb-1">Tổng doanh thu</p>
                                        <h2 className="text-3xl font-black">{reportStats.total.toLocaleString()}đ</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase opacity-80 mb-1">Số đơn hàng</p>
                                        <h2 className="text-2xl font-black">{reportStats.count}</h2>
                                    </div>
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
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                                <span>{new Date(h.timestamp).toLocaleString('vi-VN')}</span>
                                                <span className="px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase"><Icon name="user" size={10} className="inline mr-1" />{h.seller}</span>
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
                <button onClick={() => setActiveTab('preparing')} className={`shrink-0 flex flex-col items-center gap-1 h-full justify-center relative ${activeTab === 'preparing' ? "text-emerald-400" : "text-slate-500"}`}>
                    <Icon name="clipboard-list" size={20} />
                    {stats.waiting > 0 && <span className="absolute top-1 right-0 bg-orange-500 w-3 h-3 rounded-full"></span>}
                    <span className="text-[9px] font-black uppercase mt-1">Đợi ({stats.waiting})</span>
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

                    <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] shrink-0 pb-safe">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500 font-black uppercase text-xs">Tổng cộng</span>
                            <span className="text-2xl font-black text-emerald-600">{subtotal.toLocaleString()}đ</span>
                        </div>
                        <button onClick={handleInstantOrder} disabled={cart.length === 0} className="w-full py-4 bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl font-black text-sm uppercase shadow-lg">Xác nhận đặt hàng</button>
                    </div>
                </div>
            )}

            {/* MODAL KHO HÀNG */}
            {showIngModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleIngSubmit} className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black uppercase italic mb-6">{editingIng ? 'Sửa hàng' : 'Nhập hàng mới'}</h3>
                        <div className="space-y-3">
                            <input name="name" defaultValue={editingIng?.name} placeholder="Tên hàng hóa (vd: Cà phê hạt)" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                            <div className="grid grid-cols-2 gap-2">
                                <input name="unit" defaultValue={editingIng?.unit} placeholder="Đơn vị (Kg, Lít)" className="p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                                <input name="stock" type="number" step="0.1" defaultValue={editingIng?.stock} placeholder="Số lượng" className="p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                            </div>
                            <input name="costPrice" type="number" defaultValue={editingIng?.lastPrice} placeholder="Giá vốn" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                            <input name="sellPrice" type="number" defaultValue={editingIng?.sellPrice} placeholder="Giá bán lẻ (Để trống nếu ko bán)" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" />
                            <select name="category" defaultValue={editingIng?.category || categories[0]} className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase shadow-xl text-xs">Lưu dữ liệu</button>
                        <button type="button" onClick={() => setShowIngModal(false)} className="w-full mt-2 text-slate-400 font-bold text-[10px] uppercase py-2">Hủy bỏ</button>
                    </form>
                </div>
            )}

            {/* MODAL THÊM MÓN VÀO THỰC ĐƠN */}
            {showAddMenu && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleAddProduct} className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black uppercase italic mb-6">Thêm món mới</h3>
                        <div className="space-y-3">
                            <input name="name" placeholder="Tên món (vd: Trà sữa trân châu)" className="w-full p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm" required />
                            <div className="flex gap-2">
                                <select name="category" className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-sm">
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input name="image" placeholder="Icon (🍵)" defaultValue="🍵" className="w-20 p-4 bg-slate-100 rounded-2xl font-bold border-none outline-none text-center text-xl" />
                            </div>
                            
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Biến thể (Size / Giá)</p>
                                {newProductForm.variants.map((v, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input value={v.size} onChange={(e) => updateVariant(idx, 'size', e.target.value)} placeholder="Tên Size (S, M...)" className="w-1/3 p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                                        <input value={v.price} type="number" onChange={(e) => updateVariant(idx, 'price', e.target.value)} placeholder="Giá bán" className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase shadow-xl text-xs">Tạo món</button>
                        <button type="button" onClick={() => setShowAddMenu(false)} className="w-full mt-2 text-slate-400 font-bold text-[10px] uppercase py-2">Hủy bỏ</button>
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