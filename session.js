// ============================================================
// session.js - نظام إدارة الجلسة الموحد (مع جلسات معزولة)
// ============================================================

const SESSION_CONFIG = {
    DURATION: 24 * 60 * 60 * 1000, // 24 ساعة
};

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

    // ✅ حفظ بيانات المستخدم مع معرف الجلسة
    save(user) {
        if (!user) {
            console.warn('⚠️ محاولة حفظ مستخدم فارغ');
            return;
        }

        try {
            const sessionId = this._getSessionId();
            
            // ✅ التأكد من وجود الصلاحيات
            const permissions = user.permissions || [];
            
            const userWithPermissions = {
                ...user,
                permissions: permissions,
                sessionId: sessionId,
                expiry: Date.now() + SESSION_CONFIG.DURATION
            };

            // ✅ تخزين في sessionStorage (مخصص لهذه العلامة)
            sessionStorage.setItem('currentUser', JSON.stringify(userWithPermissions));
            sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
            sessionStorage.setItem('userType', userWithPermissions.type || '');
            sessionStorage.setItem('userId', userWithPermissions.id || '');
            sessionStorage.setItem('userName', userWithPermissions.name || '');
            sessionStorage.setItem('sessionId', sessionId);
            sessionStorage.setItem('centerName', userWithPermissions.centerName || '');
            sessionStorage.setItem('branchId', userWithPermissions.branchId || '');

            // ✅ تخزين في localStorage (مشارك بين العلامات - للمستخدم النشط فقط)
            const dataToStore = {
                user: userWithPermissions,
                expiry: Date.now() + SESSION_CONFIG.DURATION,
                sessionId: sessionId
            };
            localStorage.setItem('currentUser_' + sessionId, JSON.stringify(dataToStore));
            
            // ✅ حفظ معرف الجلسة النشطة
            localStorage.setItem('activeSessionId', sessionId);
            
            // ✅ حفظ الصلاحيات بشكل منفصل في localStorage
            localStorage.setItem('userPermissions', JSON.stringify(permissions));

            console.log('✅ Session.save() - تم حفظ المستخدم:', userWithPermissions.name);
            console.log('📋 الصلاحيات المحفوظة:', permissions.length, 'صلاحية');
            console.log('🆔 معرف الجلسة:', sessionId);
            
        } catch(e) {
            console.error('❌ Session.save() error:', e);
        }
    },

    // ✅ جلب بيانات المستخدم الحالي (خاص بهذه العلامة)
    getUser() {
        try {
            // ✅ 1. محاولة من sessionStorage (الأولوية للعلامة الحالية)
            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                try {
                    const user = JSON.parse(sessionUser);
                    
                    // ✅ استعادة الصلاحيات من sessionStorage
                    const permStored = sessionStorage.getItem('userPermissions');
                    if (permStored && (!user.permissions || user.permissions.length === 0)) {
                        try {
                            user.permissions = JSON.parse(permStored);
                            console.log('✅ تم استعادة الصلاحيات من sessionStorage');
                        } catch(e) {}
                    }
                    
                    console.log('✅ getUser() - من sessionStorage:', user.name);
                    console.log('✅ getUser() - الصلاحيات:', user.permissions);
                    return user;
                } catch(e) {}
            }

            // ✅ 2. محاولة من localStorage (إذا كانت sessionStorage فارغة)
            const activeSessionId = localStorage.getItem('activeSessionId');
            if (activeSessionId) {
                const storageKey = 'currentUser_' + activeSessionId;
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.expiry && Date.now() < data.expiry) {
                        const user = data.user || {};
                        
                        // ✅ استعادة الصلاحيات
                        if (!user.permissions || user.permissions.length === 0) {
                            const permStored = localStorage.getItem('userPermissions');
                            if (permStored) {
                                try {
                                    user.permissions = JSON.parse(permStored);
                                    console.log('✅ تم استعادة الصلاحيات من localStorage');
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
                        
                        console.log('✅ getUser() - من localStorage:', user.name);
                        console.log('✅ getUser() - الصلاحيات:', user.permissions);
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

    // ✅ التحقق من صحة الجلسة (مع التحقق من الصلاحيات)
    checkValidity(redirectOnFail = true) {
        const user = this.getUser();
        
        if (!user || !user.type) {
            if (redirectOnFail) {
                this.clear();
                sessionStorage.setItem('intendedPage', window.location.pathname);
                window.location.href = 'index.html';
            }
            return false;
        }
        
        // ✅ التحقق من انتهاء الجلسة (24 ساعة)
        if (user.expiry && Date.now() > user.expiry) {
            console.warn('⚠️ checkValidity: الجلسة منتهية (أكثر من 24 ساعة)');
            if (redirectOnFail) {
                this.logout();
            }
            return false;
        }
        
        // ✅ التحقق من وجود الصلاحيات
        if (!user.permissions || user.permissions.length === 0) {
            console.warn('⚠️ checkValidity: لا توجد صلاحيات، محاولة استعادتها...');
            const storedPerms = sessionStorage.getItem('userPermissions');
            if (storedPerms) {
                try {
                    user.permissions = JSON.parse(storedPerms);
                    this.save(user);
                    console.log('✅ checkValidity: تم استعادة الصلاحيات');
                } catch(e) {}
            }
        }
        
        // ✅ تمديد الجلسة
        this.refresh();
        return true;
    },

    // ✅ التحقق من صلاحية محددة
    checkPermission(permission) {
        const user = this.getUser();
        if (!user) return false;
        if (user.type === 'Admin') return true;
        if (!user.permissions || user.permissions.length === 0) return false;
        return user.permissions.includes(permission);
    },

    // ✅ التحقق من صلاحية واحدة أو أكثر
    checkPermissionAny(permissions) {
        if (!permissions || permissions.length === 0) return true;
        const user = this.getUser();
        if (!user) return false;
        if (user.type === 'Admin') return true;
        if (!user.permissions || user.permissions.length === 0) return false;
        return permissions.some(perm => user.permissions.includes(perm));
    },

    // ✅ التحقق من الصلاحية مع إعادة التوجيه
    checkPermissionWithRedirect(allowedTypes, redirectOnFail = true) {
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
            window.location.href = 'index.html';
        }
        return false;
    },

    // ✅ تسجيل الخروج (من هذه العلامة فقط)
    logout() {
        const sessionId = sessionStorage.getItem('sessionId');
        if (sessionId) {
            localStorage.removeItem('currentUser_' + sessionId);
        }
        
        // ✅ مسح جميع مفاتيح sessionStorage
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userPermissions');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('centerName');
        sessionStorage.removeItem('branchId');
        
        // ✅ مسح activeSessionId إذا كانت هذه الجلسة النشطة
        const activeSessionId = localStorage.getItem('activeSessionId');
        if (activeSessionId === sessionId) {
            localStorage.removeItem('activeSessionId');
        }
        
        console.log('✅ Session.logout() - تم تسجيل الخروج');
        window.location.href = 'index.html';
    },

    // ✅ مسح جميع الجلسات (للخروج الكامل)
    logoutAll() {
        // مسح جميع مفاتيح currentUser_
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('currentUser_')) {
                localStorage.removeItem(key);
            }
        }
        localStorage.removeItem('activeSessionId');
        localStorage.removeItem('userPermissions');
        sessionStorage.clear();
        console.log('✅ Session.logoutAll() - تم تسجيل الخروج من جميع الجلسات');
        window.location.href = 'index.html';
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
    
    // ✅ الحصول على الصلاحيات فقط (للوصول السريع)
    getPermissions() {
        const user = this.getUser();
        if (!user) return [];
        if (user.type === 'Admin') {
            // ✅ Admin لديه كل الصلاحيات
            const allPermissions = [
                'ManageAll', 'ManageCenters', 'ManageBranches', 'ManageUsers',
                'ManagePermissions', 'ViewExpiringSubscriptions', 'ViewStats',
                'AddCustomerSupplier', 'EditCustomerSupplier', 'ViewCustomersSuppliers',
                'DeleteCustomerSupplier', 'UpdateCustomerPrices'
            ];
            return allPermissions;
        }
        return user.permissions || [];
    },
    
    // ✅ تحديث الصلاحيات فقط
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
