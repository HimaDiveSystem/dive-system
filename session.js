// ============================================================
// session.js - نظام إدارة الجلسة الموحد (24 ساعة)
// ============================================================

const SESSION_CONFIG = {
    DURATION: 24 * 60 * 60 * 1000, // 24 ساعة
};

const Session = {
    // ✅ حفظ بيانات المستخدم مع صلاحياته
    save(user) {
        if (!user) {
            console.warn('⚠️ محاولة حفظ مستخدم فارغ');
            return;
        }

        try {
            const userWithPermissions = {
                ...user,
                permissions: user.permissions || []
            };

            // 1️⃣ تخزين في localStorage
            const dataToStore = {
                user: userWithPermissions,
                expiry: Date.now() + SESSION_CONFIG.DURATION
            };
            localStorage.setItem('currentUser', JSON.stringify(dataToStore));

            // 2️⃣ تخزين في sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(userWithPermissions));

            // 3️⃣ تخزين الصلاحيات بشكل منفصل
            localStorage.setItem('userPermissions', JSON.stringify(userWithPermissions.permissions));
            sessionStorage.setItem('userPermissions', JSON.stringify(userWithPermissions.permissions));

            // 4️⃣ تخزين بيانات أساسية
            sessionStorage.setItem('userType', userWithPermissions.type || '');
            sessionStorage.setItem('userId', userWithPermissions.id || '');
            sessionStorage.setItem('userName', userWithPermissions.name || '');

            console.log('✅ Session.save() - تم حفظ المستخدم:', userWithPermissions.name);
            console.log('📋 الصلاحيات المحفوظة:', userWithPermissions.permissions.length, 'صلاحية');
            
        } catch(e) {
            console.error('❌ Session.save() error:', e);
        }
    },

    // ✅ جلب بيانات المستخدم الحالي
    getUser() {
        try {
            // 1️⃣ محاولة من localStorage
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.expiry && Date.now() < data.expiry) {
                    const user = data.user || {};
                    
                    // محاولة استعادة الصلاحيات
                    if (!user.permissions || user.permissions.length === 0) {
                        const permStored = localStorage.getItem('userPermissions');
                        if (permStored) {
                            try {
                                user.permissions = JSON.parse(permStored);
                            } catch(e) {}
                        }
                        
                        if (!user.permissions || user.permissions.length === 0) {
                            const sessionPerm = sessionStorage.getItem('userPermissions');
                            if (sessionPerm) {
                                try {
                                    user.permissions = JSON.parse(sessionPerm);
                                } catch(e) {}
                            }
                        }
                    }
                    
                    return user;
                } else {
                    this.clear();
                }
            }

            // 2️⃣ محاولة من sessionStorage
            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                try {
                    const user = JSON.parse(sessionUser);
                    
                    const permStored = sessionStorage.getItem('userPermissions');
                    if (permStored && (!user.permissions || user.permissions.length === 0)) {
                        try {
                            user.permissions = JSON.parse(permStored);
                        } catch(e) {}
                    }
                    
                    if (user && user.type) {
                        this.save(user);
                    }
                    
                    return user;
                } catch(e) {}
            }

            return this._restoreFromSession();
            
        } catch(e) {
            console.error('❌ Session.getUser() error:', e);
            return this._restoreFromSession();
        }
    },

    // ✅ استعادة طارئة من sessionStorage
    _restoreFromSession() {
        try {
            const userType = sessionStorage.getItem('userType');
            const userId = sessionStorage.getItem('userId');
            const userName = sessionStorage.getItem('userName');
            const userPermissions = sessionStorage.getItem('userPermissions');

            if (userType && userId) {
                return {
                    id: userId,
                    type: userType,
                    name: userName || 'مستخدم',
                    permissions: userPermissions ? JSON.parse(userPermissions) : []
                };
            }
            return null;
        } catch(e) {
            return null;
        }
    },

    // ✅ الحصول على الصلاحيات فقط
    getUserPermissions() {
        const user = this.getUser();
        if (!user) return [];
        if (user.type === 'Admin') return ['*'];
        
        if (!user.permissions || user.permissions.length === 0) {
            const permStored = localStorage.getItem('userPermissions');
            if (permStored) {
                try {
                    return JSON.parse(permStored);
                } catch(e) {}
            }
            
            const sessionPerm = sessionStorage.getItem('userPermissions');
            if (sessionPerm) {
                try {
                    return JSON.parse(sessionPerm);
                } catch(e) {}
            }
        }
        
        return user.permissions || [];
    },

    // ✅ التحقق من الصلاحية
    hasPermission(permission) {
        const permissions = this.getUserPermissions();
        if (permissions.includes('*')) return true;
        return permissions.includes(permission);
    },

    // ✅ التحقق من صحة الجلسة
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

    // ✅ التحقق من نوع المستخدم
    checkPermission(allowedTypes, redirectOnFail = true) {
        const user = this.getUser();
        if (!user || !user.type) {
            if (redirectOnFail) {
                sessionStorage.setItem('intendedPage', window.location.pathname);
                window.location.href = 'index.html';
            }
            return false;
        }

        if (user.type === 'Admin') return true;
        if (allowedTypes.includes(user.type)) return true;
        
        if (redirectOnFail) {
            const targetPage = 'index.html';
            window.location.href = targetPage;
        }
        return false;
    },

    // ✅ تسجيل الخروج
    logout() {
        this.clear();
        sessionStorage.clear();
        localStorage.removeItem('userPermissions');
        window.location.href = 'index.html';
    },

    // ✅ مسح البيانات
    clear() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userPermissions');
    },

    // ✅ تمديد الجلسة
    refresh() {
        const user = this.getUser();
        if (user && user.type) {
            this.save(user);
        }
    }
};

// ✅ جعل Session متاحاً عالمياً
if (typeof window !== 'undefined') {
    window.Session = Session;
}
