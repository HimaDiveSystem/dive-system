// ============================================================
// session.js - نظام إدارة الجلسة الموحد (محسّن)
// ============================================================

const SESSION_CONFIG = {
    DURATION: 24 * 60 * 60 * 1000, // 24 ساعة
};

// ✅ منع إعادة التوجيه المتكرر
let _redirecting = false;
let _sessionInitializing = false;

const Session = {
    // ✅ إنشاء معرف جلسة فريد لكل علامة تبويب
    _getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    },

    // ✅ حفظ بيانات المستخدم
    save(user) {
        if (!user) {
            console.warn('⚠️ محاولة حفظ مستخدم فارغ');
            return;
        }

        try {
            const sessionId = this._getSessionId();
            const permissions = user.permissions || [];
            
            const userWithPermissions = {
                ...user,
                permissions: permissions,
                sessionId: sessionId,
                expiry: Date.now() + SESSION_CONFIG.DURATION
            };

            // ✅ تخزين في sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(userWithPermissions));
            sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
            sessionStorage.setItem('userType', userWithPermissions.type || '');
            sessionStorage.setItem('userId', userWithPermissions.id || '');
            sessionStorage.setItem('userName', userWithPermissions.name || '');
            sessionStorage.setItem('sessionId', sessionId);
            sessionStorage.setItem('centerName', userWithPermissions.centerName || '');
            sessionStorage.setItem('branchId', userWithPermissions.branchId || '');

            // ✅ تخزين في localStorage
            const dataToStore = {
                user: userWithPermissions,
                expiry: Date.now() + SESSION_CONFIG.DURATION,
                sessionId: sessionId
            };
            localStorage.setItem('currentUser_' + sessionId, JSON.stringify(dataToStore));
            localStorage.setItem('activeSessionId', sessionId);
            localStorage.setItem('userPermissions', JSON.stringify(permissions));

            console.log('✅ Session.save() - تم حفظ المستخدم:', userWithPermissions.name);
            console.log('📋 الصلاحيات المحفوظة:', permissions.length, 'صلاحية');
            
        } catch(e) {
            console.error('❌ Session.save() error:', e);
        }
    },

    // ✅ جلب بيانات المستخدم الحالي
    getUser() {
        try {
            // ✅ 1. محاولة من sessionStorage
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
                    return user;
                } catch(e) {}
            }

            // ✅ 2. محاولة من localStorage
            const activeSessionId = localStorage.getItem('activeSessionId');
            if (activeSessionId) {
                const storageKey = 'currentUser_' + activeSessionId;
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.expiry && Date.now() < data.expiry) {
                        const user = data.user || {};
                        
                        if (!user.permissions || user.permissions.length === 0) {
                            const permStored = localStorage.getItem('userPermissions');
                            if (permStored) {
                                try {
                                    user.permissions = JSON.parse(permStored);
                                } catch(e) {}
                            }
                        }
                        
                        // ✅ حفظ في sessionStorage لهذه العلامة
                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                        sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions || []));
                        sessionStorage.setItem('userType', user.type || '');
                        sessionStorage.setItem('userId', user.id || '');
                        sessionStorage.setItem('userName', user.name || '');
                        sessionStorage.setItem('centerName', user.centerName || '');
                        sessionStorage.setItem('branchId', user.branchId || '');
                        
                        return user;
                    }
                }
            }

            // ✅ 3. محاولة الطوارئ
            return this._restoreFromSession();
            
        } catch(e) {
            console.error('❌ getUser() error:', e);
            return this._restoreFromSession();
        }
    },

    // ✅ استعادة طارئة
    _restoreFromSession() {
        try {
            const userType = sessionStorage.getItem('userType');
            const userId = sessionStorage.getItem('userId');
            const userName = sessionStorage.getItem('userName');
            const userPermissions = sessionStorage.getItem('userPermissions');
            const centerName = sessionStorage.getItem('centerName');
            const branchId = sessionStorage.getItem('branchId');

            if (userType && userId) {
                return {
                    id: userId,
                    type: userType,
                    name: userName || 'مستخدم',
                    centerName: centerName || '',
                    branchId: branchId || '',
                    permissions: userPermissions ? JSON.parse(userPermissions) : []
                };
            }
            return null;
        } catch(e) {
            return null;
        }
    },

    // ✅ التحقق من صحة الجلسة
    checkValidity(redirectOnFail = true) {
        try {
            // ✅ منع التنفيذ المتكرر
            if (_sessionInitializing) {
                console.warn('⚠️ جلسة قيد التهيئة بالفعل');
                return true;
            }
            _sessionInitializing = true;

            const user = this.getUser();
            
            if (!user || !user.type) {
                if (redirectOnFail && !_redirecting) {
                    _redirecting = true;
                    this.clear();
                    window.location.href = 'index.html';
                }
                _sessionInitializing = false;
                return false;
            }
            
            // ✅ التحقق من انتهاء الجلسة
            if (user.expiry && Date.now() > user.expiry) {
                console.warn('⚠️ الجلسة منتهية');
                if (redirectOnFail && !_redirecting) {
                    _redirecting = true;
                    this.logout();
                }
                _sessionInitializing = false;
                return false;
            }
            
            // ✅ تمديد الجلسة
            this.refresh();
            _sessionInitializing = false;
            return true;
            
        } catch(e) {
            console.warn('⚠️ checkValidity error:', e);
            _sessionInitializing = false;
            return false;
        }
    },

    // ✅ التحقق من صلاحية محددة
    checkPermission(permission) {
        const user = this.getUser();
        if (!user) return false;
        if (user.type === 'Admin') return true;
        if (!user.permissions || user.permissions.length === 0) return false;
        return user.permissions.includes(permission);
    },

    // ✅ التحقق من صلاحية مع إعادة التوجيه
    checkPermissionWithRedirect(allowedTypes, redirectOnFail = true) {
        const user = this.getUser();
        if (!user || !user.type) {
            if (redirectOnFail && !_redirecting) {
                _redirecting = true;
                window.location.href = 'index.html';
            }
            return false;
        }

        if (user.type === 'Admin') return true;
        if (allowedTypes.includes(user.type)) return true;
        
        if (redirectOnFail && !_redirecting) {
            _redirecting = true;
            window.location.href = 'index.html';
        }
        return false;
    },

    // ✅ تسجيل الخروج
    logout() {
        const sessionId = sessionStorage.getItem('sessionId');
        if (sessionId) {
            localStorage.removeItem('currentUser_' + sessionId);
        }
        
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userPermissions');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('centerName');
        sessionStorage.removeItem('branchId');
        
        const activeSessionId = localStorage.getItem('activeSessionId');
        if (activeSessionId === sessionId) {
            localStorage.removeItem('activeSessionId');
        }
        
        console.log('✅ Session.logout() - تم تسجيل الخروج');
        if (!_redirecting) {
            _redirecting = true;
            window.location.href = 'index.html';
        }
    },

    // ✅ مسح البيانات
    clear() {
        const sessionId = sessionStorage.getItem('sessionId');
        if (sessionId) {
            localStorage.removeItem('currentUser_' + sessionId);
        }
        sessionStorage.clear();
        console.log('✅ Session.clear() - تم مسح البيانات');
    },

    // ✅ تمديد الجلسة
    refresh() {
        const user = this.getUser();
        if (user && user.type) {
            this.save(user);
        }
    },
    
    // ✅ الحصول على الصلاحيات
    getPermissions() {
        const user = this.getUser();
        if (!user) return [];
        if (user.type === 'Admin') {
            return [
                'ManageAll', 'ManageCenters', 'ManageBranches', 'ManageUsers',
                'ManagePermissions', 'ViewExpiringSubscriptions', 'ViewStats',
                'AddCustomerSupplier', 'EditCustomerSupplier', 'ViewCustomersSuppliers',
                'DeleteCustomerSupplier', 'UpdateCustomerPrices'
            ];
        }
        return user.permissions || [];
    },
    
    // ✅ تحديث الصلاحيات
    updatePermissions(permissions) {
        const user = this.getUser();
        if (!user) return false;
        user.permissions = permissions || [];
        this.save(user);
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.Session = Session;
}
