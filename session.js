// ============================================================
// session.js - نظام إدارة الجلسة الموحد (مع معرف جلسة)
// ============================================================

const SESSION_CONFIG = {
    DURATION: 24 * 60 * 60 * 1000, // 24 ساعة
};

const Session = {
    // ✅ إنشاء معرف جلسة فريد
    _getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
            const userWithPermissions = {
                ...user,
                permissions: user.permissions || [],
                sessionId: sessionId
            };

            // ✅ تخزين في localStorage مع معرف الجلسة
            const dataToStore = {
                user: userWithPermissions,
                expiry: Date.now() + SESSION_CONFIG.DURATION,
                sessionId: sessionId
            };
            
            // ✅ مفتاح فريد لكل جلسة
            const storageKey = 'currentUser_' + sessionId;
            localStorage.setItem(storageKey, JSON.stringify(dataToStore));
            
            // ✅ حفظ معرف الجلسة الحالية
            localStorage.setItem('activeSessionId', sessionId);

            // ✅ تخزين في sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(userWithPermissions));
            sessionStorage.setItem('userPermissions', JSON.stringify(userWithPermissions.permissions));
            sessionStorage.setItem('userType', userWithPermissions.type || '');
            sessionStorage.setItem('userId', userWithPermissions.id || '');
            sessionStorage.setItem('userName', userWithPermissions.name || '');

            console.log('✅ Session.save() - تم حفظ المستخدم:', userWithPermissions.name);
            console.log('📋 الصلاحيات المحفوظة:', userWithPermissions.permissions.length, 'صلاحية');
            console.log('🆔 معرف الجلسة:', sessionId);
            
        } catch(e) {
            console.error('❌ Session.save() error:', e);
        }
    },

    // ✅ جلب بيانات المستخدم الحالي
    getUser() {
        try {
            // ✅ الحصول على معرف الجلسة النشط
            const activeSessionId = localStorage.getItem('activeSessionId');
            
            // ✅ محاولة جلب من localStorage باستخدام معرف الجلسة
            if (activeSessionId) {
                const storageKey = 'currentUser_' + activeSessionId;
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.expiry && Date.now() < data.expiry) {
                        const user = data.user || {};
                        
                        // استعادة الصلاحيات
                        if (!user.permissions || user.permissions.length === 0) {
                            const permStored = sessionStorage.getItem('userPermissions');
                            if (permStored) {
                                try {
                                    user.permissions = JSON.parse(permStored);
                                } catch(e) {}
                            }
                        }
                        
                        return user;
                    } else {
                        // انتهت الجلسة
                        localStorage.removeItem(storageKey);
                        localStorage.removeItem('activeSessionId');
                    }
                }
            }

            // ✅ محاولة من sessionStorage (طوارئ)
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

    // ✅ استعادة طارئة
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
        return user.permissions || [];
    },

    // ✅ التحقق من الصلاحية
    hasPermission(permission) {
        const permissions = this.getUserPermissions();
        if (permissions.includes('*')) return true;
        return permissions.includes(permission);
    },

    // ✅ تسجيل الخروج (مسح جلسة واحدة فقط)
    logout() {
        const sessionId = this._getSessionId();
        const storageKey = 'currentUser_' + sessionId;
        localStorage.removeItem(storageKey);
        localStorage.removeItem('activeSessionId');
        sessionStorage.clear();
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
        sessionStorage.clear();
        window.location.href = 'index.html';
    },

    // ✅ مسح البيانات
    clear() {
        const sessionId = this._getSessionId();
        const storageKey = 'currentUser_' + sessionId;
        localStorage.removeItem(storageKey);
        localStorage.removeItem('activeSessionId');
        sessionStorage.clear();
    },

    // ✅ تمديد الجلسة
    refresh() {
        const user = this.getUser();
        if (user && user.type) {
            this.save(user);
        }
    }
};

if (typeof window !== 'undefined') {
    window.Session = Session;
}
