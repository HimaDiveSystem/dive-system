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
            const userWithPermissions = {
                ...user,
                permissions: user.permissions || [],
                sessionId: sessionId
            };

            // ✅ تخزين في sessionStorage (مخصص لهذه العلامة)
            sessionStorage.setItem('currentUser', JSON.stringify(userWithPermissions));
            sessionStorage.setItem('userPermissions', JSON.stringify(userWithPermissions.permissions));
            sessionStorage.setItem('userType', userWithPermissions.type || '');
            sessionStorage.setItem('userId', userWithPermissions.id || '');
            sessionStorage.setItem('userName', userWithPermissions.name || '');
            sessionStorage.setItem('sessionId', sessionId);

            // ✅ تخزين في localStorage (مشارك بين العلامات - للمستخدم النشط فقط)
            // نستخدم معرف الجلسة في المفتاح لتجنب التداخل
            const dataToStore = {
                user: userWithPermissions,
                expiry: Date.now() + SESSION_CONFIG.DURATION,
                sessionId: sessionId
            };
            localStorage.setItem('currentUser_' + sessionId, JSON.stringify(dataToStore));
            
            // ✅ حفظ معرف الجلسة النشطة
            localStorage.setItem('activeSessionId', sessionId);

            console.log('✅ Session.save() - تم حفظ المستخدم:', userWithPermissions.name);
            console.log('📋 الصلاحيات المحفوظة:', userWithPermissions.permissions.length, 'صلاحية');
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
                        sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions));
                        sessionStorage.setItem('userType', user.type || '');
                        sessionStorage.setItem('userId', user.id || '');
                        sessionStorage.setItem('userName', user.name || '');
                        
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

    // ✅ التحقق من الصلاحية
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

    // ✅ تسجيل الخروج (من هذه العلامة فقط)
    logout() {
        const sessionId = sessionStorage.getItem('sessionId');
        if (sessionId) {
            localStorage.removeItem('currentUser_' + sessionId);
        }
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
        const sessionId = sessionStorage.getItem('sessionId');
        if (sessionId) {
            localStorage.removeItem('currentUser_' + sessionId);
        }
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
