// ============================================================
// session.js - نظام إدارة الجلسة (مستقل تماماً لكل تبويب)
// ============================================================
// ✅ الجلسة في sessionStorage فقط (خاصة بكل تبويب)
// ✅ لا Fallback — لا تداخل بين التبويبات
// ✅ كل تبويب مستقل 100%
// ⚠️ مهم: يجب تحميل config.js قبله
// ============================================================

(function() {
  'use strict';
  
  // ✅ التحقق من وجود config.js
  if (typeof CONFIG === 'undefined') {
    console.error('❌ session.js: config.js غير محمّل!');
    return;
  }
  
  // ✅ منع التحميل المزدوج
  if (window._sessionLoaded) {
    console.warn('⚠️ session.js محمّل مسبقاً');
    return;
  }
  window._sessionLoaded = true;
  
  // ============================================================
  // SESSION CONFIG
  // ============================================================
  const SESSION_CONFIG = {
    DURATION: CONFIG.SESSION_DURATION || 24 * 60 * 60 * 1000
  };
  
  // ✅ مفتاح sessionStorage فقط
  const SS_KEY = 'currentUser';
  
  // ============================================================
  // ✅ دالة مساعدة: التوجيه الآمن
  // ============================================================
  function safeRedirect(url) {
    if (window._redirecting) {
      console.log('⚠️ توجيه مرفوض');
      return false;
    }
    window._redirecting = true;
    console.log('🔀 توجيه آمن إلى:', url);
    window.location.replace(url);
    return true;
  }
  
  // ============================================================
  // Session Object
  // ============================================================
  const Session = {
    
    // ----------------------------------------------------------
    // 1️⃣ توليد معرّف جلسة فريد
    // ----------------------------------------------------------
    _generateSessionId() {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    },
    
    // ----------------------------------------------------------
    // 2️⃣ حفظ بيانات المستخدم (sessionStorage فقط)
    // ----------------------------------------------------------
    save(user) {
      if (!user) {
        console.warn('⚠️ Session.save: مستخدم فارغ');
        return;
      }
      
      try {
        window._redirecting = false;
        
        // ✅ امسح sessionStorage (خاص بالتبويب الحالي فقط)
        sessionStorage.clear();
        
        const sessionId = this._generateSessionId();
        sessionStorage.setItem('sessionId', sessionId);
        
        const permissions = user.permissions || [];
        
        const userWithMeta = {
          ...user,
          permissions: permissions,
          sessionId: sessionId,
          expiry: Date.now() + SESSION_CONFIG.DURATION,
          createdAt: Date.now()
        };
        
        // ✅ حفظ في sessionStorage فقط
        sessionStorage.setItem(SS_KEY, JSON.stringify(userWithMeta));
        sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
        sessionStorage.setItem('userType', userWithMeta.type || '');
        sessionStorage.setItem('userId', userWithMeta.id || '');
        sessionStorage.setItem('userName', userWithMeta.name || '');
        sessionStorage.setItem('centerName', userWithMeta.centerName || '');
        sessionStorage.setItem('centerId', userWithMeta.centerId || '');
        sessionStorage.setItem('branchId', userWithMeta.branchId || '');
        sessionStorage.setItem('branchName', userWithMeta.branchName || '');
        
        console.log('✅ Session.save() - تم الحفظ في sessionStorage (هذا التبويب فقط)');
        console.log('   📌 النوع:', userWithMeta.type);
        console.log('   🆔 sessionId:', sessionId);
        
      } catch(e) {
        console.error('❌ Session.save() error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 3️⃣ جلب بيانات المستخدم (sessionStorage فقط)
    // ----------------------------------------------------------
    getUser() {
      try {
        const sessionUser = sessionStorage.getItem(SS_KEY);
        
        if (!sessionUser) {
          return null;
        }
        
        let user;
        try {
          user = JSON.parse(sessionUser);
        } catch(e) {
          console.warn('⚠️ Session.getUser: فشل تحليل JSON');
          this.clear();
          return null;
        }
        
        if (user.expiry && Date.now() > user.expiry) {
          console.warn('⚠️ Session.getUser: الجلسة منتهية');
          this.clear();
          return null;
        }
        
        if (!user.permissions || user.permissions.length === 0) {
          const permStored = sessionStorage.getItem('userPermissions');
          if (permStored) {
            try {
              user.permissions = JSON.parse(permStored);
            } catch(e) {
              user.permissions = [];
            }
          } else {
            user.permissions = [];
          }
        }
        
        return user;
        
      } catch(e) {
        console.error('❌ Session.getUser() error:', e);
        return null;
      }
    },
    
    // ----------------------------------------------------------
    // 4️⃣ التحقق من صحة الجلسة
    // ----------------------------------------------------------
    checkValidity(redirectOnFail = true) {
      try {
        const user = this.getUser();
        
        if (!user || !user.type) {
          if (redirectOnFail) {
            this.clear();
            safeRedirect('index.html');
          }
          return false;
        }
        
        this.refresh();
        return true;
        
      } catch(e) {
        console.warn('⚠️ checkValidity error:', e);
        return false;
      }
    },
    
    // ----------------------------------------------------------
    // 5️⃣ التحقق من صلاحية
    // ----------------------------------------------------------
    checkPermission(permission) {
      const user = this.getUser();
      if (!user) return false;
      if (user.type === 'Admin') return true;
      if (!user.permissions || user.permissions.length === 0) return false;
      if (user.permissions.includes('ManageAll')) return true;
      if (user.permissions.includes('ManagePermissions')) return true;
      return user.permissions.includes(permission);
    },
    
    checkMultiplePermissions(permissions) {
      if (!Array.isArray(permissions) || permissions.length === 0) return false;
      const user = this.getUser();
      if (!user) return false;
      if (user.type === 'Admin') return true;
      if (!user.permissions || user.permissions.length === 0) return false;
      if (user.permissions.includes('ManageAll')) return true;
      if (user.permissions.includes('ManagePermissions')) return true;
      return permissions.some(p => user.permissions.includes(p));
    },
    
    checkUserType(allowedTypes) {
      const user = this.getUser();
      if (!user || !user.type) return false;
      if (user.type === 'Admin') return true;
      if (!Array.isArray(allowedTypes)) return user.type === allowedTypes;
      return allowedTypes.includes(user.type);
    },
    
    checkUserTypeWithRedirect(allowedTypes, redirectOnFail = true) {
      const user = this.getUser();
      if (!user || !user.type) {
        if (redirectOnFail) safeRedirect('index.html');
        return false;
      }
      if (user.type === 'Admin') return true;
      const typesArray = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
      if (typesArray.includes(user.type)) return true;
      if (redirectOnFail) {
        const target = CONFIG.DASHBOARD_PAGES[user.type] || 'index.html';
        console.log(`🔀 نوع "${user.type}" غير مسموح → ${target}`);
        safeRedirect(target);
      }
      return false;
    },
    
    // ----------------------------------------------------------
    // 9️⃣ تسجيل الخروج (sessionStorage فقط)
    // ----------------------------------------------------------
    logout() {
      try {
        sessionStorage.clear();
        localStorage.removeItem('selectedBranch');  // الفرع فقط
        
        console.log('✅ Session.logout() - تم تسجيل الخروج من هذا التبويب');
        
        window._redirecting = false;
        
        if (typeof safeRedirect === 'function') {
          safeRedirect('index.html');
        } else {
          window.location.replace('index.html');
        }
      } catch(e) {
        console.error('❌ Session.logout() error:', e);
        window.location.replace('index.html');
      }
    },
    
    clear() {
      try {
        sessionStorage.clear();
        console.log('✅ Session.clear() - تم مسح الجلسة');
      } catch(e) {
        console.error('❌ Session.clear() error:', e);
      }
    },
    
    refresh() {
      try {
        const user = this.getUser();
        if (!user || !user.type) return;
        
        user.expiry = Date.now() + SESSION_CONFIG.DURATION;
        sessionStorage.setItem(SS_KEY, JSON.stringify(user));
        // ⚠️ لا نكتب في localStorage
        
      } catch(e) {
        console.warn('⚠️ Session.refresh error:', e);
      }
    },
    
    getPermissions() {
      const user = this.getUser();
      if (!user) return [];
      if (user.type === 'Admin') return getDefaultPermissionsForType('Admin');
      return user.permissions || [];
    },
    
    updatePermissions(permissions) {
      try {
        const user = this.getUser();
        if (!user) return false;
        
        user.permissions = Array.isArray(permissions) ? permissions : [];
        sessionStorage.setItem(SS_KEY, JSON.stringify(user));
        sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions));
        
        console.log('✅ Session.updatePermissions()');
        return true;
      } catch(e) {
        console.error('❌ Session.updatePermissions() error:', e);
        return false;
      }
    },
    
    getUserSummary() {
      const user = this.getUser();
      if (!user) return null;
      return {
        id: user.id || '',
        name: user.name || '',
        type: user.type || '',
        email: user.email || '',
        centerId: user.centerId || '',
        centerName: user.centerName || '',
        branchId: user.branchId || '',
        branchName: user.branchName || '',
        permissionsCount: (user.permissions || []).length,
        expiry: user.expiry,
        sessionId: user.sessionId
      };
    },
    
    safeRedirect(url) {
      return safeRedirect(url);
    }
  };
  
  if (typeof window !== 'undefined') {
    window.Session = Session;
    console.log('✅ session.js - تم التحميل (v4 — مستقل تماماً)');
    console.log('⏱️ مدة الجلسة:', SESSION_CONFIG.DURATION / 1000 / 60 / 60, 'ساعات');
    console.log('📌 sessionStorage فقط — لا تداخل بين التبويبات');
  }
  
})();
