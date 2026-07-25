// session.js - نظام إدارة الجلسة الموحد (24 ساعة)
// ============================================================

const CONFIG = {
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 ساعة
    DASHBOARD_PAGES: {
        'Admin': 'index.html',
        'Accountant': 'ManageSupplierCustomers.html',
        'Executive': 'ExecutiveDashboard.html'
    }
};

const Session = {
    // ✅ حفظ بيانات المستخدم (نسخة واحدة موحدة)
    save(user) {
        if (!user) {
            console.warn('⚠️ محاولة حفظ مستخدم فارغ');
            return;
        }

        try {
            // ✅ تخزين موحد في localStorage فقط (المصدر الرئيسي)
            const dataToStore = {
                user: user,
                expiry: Date.now() + CONFIG.SESSION_DURATION
            };
            localStorage.setItem('currentUser', JSON.stringify(dataToStore));

            // ✅ نسخة احتياطية في sessionStorage (للمستخدم الحالي فقط)
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            // ✅ تخزين معلومات أساسية للرجوع السريع
            sessionStorage.setItem('userType', user.type || '');
            sessionStorage.setItem('userId', user.id || '');
            sessionStorage.setItem('userName', user.name || '');
            
            // ✅ ✅ ✅ حفظ الصلاحيات بشكل منفصل
            if (user.permissions) {
                sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions));
                localStorage.setItem('userPermissions', JSON.stringify(user.permissions));
            }

            console.log('✅ Session.save() - تم حفظ المستخدم:', user.name);
            console.log('📋 الصلاحيات المحفوظة:', user.permissions?.length || 0);
        } catch(e) {
            console.error('❌ Session.save() error:', e);
        }
    },

    // ✅ جلب بيانات المستخدم الحالي (من مصدر موحد)
    getUser() {
        try {
            // 1️⃣ محاولة جلب من localStorage (المصدر الرئيسي)
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.expiry && Date.now() < data.expiry) {
                    // ✅ التحقق من وجود الصلاحيات
                    const user = data.user || {};
                    
                    // ✅ محاولة استعادة الصلاحيات إذا كانت مفقودة
                    if (!user.permissions || user.permissions.length === 0) {
                        const permStored = localStorage.getItem('userPermissions');
                        if (permStored) {
                            try {
                                user.permissions = JSON.parse(permStored);
                                console.log('✅ تم استعادة الصلاحيات من localStorage');
                            } catch(e) {}
                        }
                    }
                    
                    return user;
                } else {
                    // انتهت الجلسة
                    this.clear();
                }
            }

            // 2️⃣ محاولة جلب من sessionStorage (نسخة احتياطية)
            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                try {
                    const user = JSON.parse(sessionUser);
                    
                    // ✅ استعادة الصلاحيات من sessionStorage
                    const permStored = sessionStorage.getItem('userPermissions');
                    if (permStored && (!user.permissions || user.permissions.length === 0)) {
                        try {
                            user.permissions = JSON.parse(permStored);
                        } catch(e) {}
                    }
                    
                    // ✅ حفظ في localStorage لتحديث المصدر الرئيسي
                    if (user && user.type) {
                        this.save(user);
                    }
                    
                    return user;
                } catch(e) {}
            }

            // 3️⃣ محاولة استعادة من sessionStorage (طوارئ)
            return this._restoreFromSession();
        } catch(e) {
            console.error('❌ Session.getUser() error:', e);
            return this._restoreFromSession();
        }
    },

    // ✅ دالة مساعدة لاستعادة المستخدم من sessionStorage (حالة طوارئ)
    _restoreFromSession() {
        try {
            const userType = sessionStorage.getItem('userType');
            const userId = sessionStorage.getItem('userId');
            const userName = sessionStorage.getItem('userName');
            const userPermissions = sessionStorage.getItem('userPermissions');

            if (userType && userId) {
                const tempUser = {
                    id: userId,
                    type: userType,
                    name: userName || 'مستخدم',
                    permissions: userPermissions ? JSON.parse(userPermissions) : []
                };
                
                console.log('⚠️ تم استعادة المستخدم من sessionStorage (حالة طوارئ)');
                return tempUser;
            }
            return null;
        } catch(e) {
            console.error('❌ _restoreFromSession() error:', e);
            return null;
        }
    },

    // ✅ التحقق من صحة الجلسة (مع توجيه تلقائي إذا انتهت)
    checkValidity(redirectOnFail = true) {
        const user = this.getUser();
        if (user && user.type) {
            this.refresh();
            return true;
        } else {
            if (redirectOnFail) {
                this.clear();
                sessionStorage.setItem('intendedPage', window.location.pathname);
                window.location.href = 'index.html';
            }
            return false;
        }
    },

    // ✅ التحقق من أن نوع المستخدم مسموح له بالدخول
    checkPermission(allowedTypes, redirectOnFail = true) {
        const user = this.getUser();
        if (!user || !user.type) {
            if (redirectOnFail) {
                sessionStorage.setItem('intendedPage', window.location.pathname);
                window.location.href = 'index.html';
            }
            return false;
        }

        // ✅ إذا كان المستخدم Admin، يسمح له بكل شيء
        if (user.type === 'Admin') {
            return true;
        }

        if (allowedTypes.includes(user.type)) {
            return true;
        } else {
            if (redirectOnFail) {
                const targetPage = CONFIG.DASHBOARD_PAGES?.[user.type] || 'index.html';
                window.location.href = targetPage;
            }
            return false;
        }
    },

    // ✅ الحصول على المستخدم الحالي مع صلاحياته
    getCurrentUser() {
        return this.getUser();
    },

    // ✅ الحصول على الصلاحيات فقط
    getUserPermissions() {
        const user = this.getUser();
        if (!user) return [];
        if (user.type === 'Admin') return ['*']; // Admin لديه كل الصلاحيات
        return user.permissions || [];
    },

    // ✅ تسجيل الخروج
    logout() {
        this.clear();
        sessionStorage.clear();
        localStorage.removeItem('userPermissions');
        window.location.href = 'index.html';
    },

    // ✅ مسح جميع البيانات
    clear() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userPermissions');
        // لا نمسح localStorage.userPermissions عمداً للاحتفاظ بها
    },

    // ✅ تحديث الجلسة (تمديد الوقت)
    refresh() {
        const user = this.getUser();
        if (user && user.type) {
            this.save(user);
            console.log('🔄 تم تمديد الجلسة:', user.name);
        }
    }
};

// ✅ جعل Session متاحاً عالمياً
if (typeof window !== 'undefined') {
    window.Session = Session;
}
