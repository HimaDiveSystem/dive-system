// ============================================================
// session.js - نظام إدارة الجلسة (جلسة لكل تبويب)
// ============================================================
// ✅ يعتمد على sessionStorage فقط — جلسة مستقلة لكل تبويب
// ⚠️ مهم: يجب تحميل config.js قبله
// ============================================================

(function() {
  'use strict';
  
  // ✅ التحقق من وجود config.js
  if (typeof CONFIG === 'undefined') {
    console.error('❌ session.js: config.js غير محمّل! يجب تحميل config.js أولاً');
    return;
  }
  
  // ✅ منع التحميل المزدوج
  if (window._sessionLoaded) {
    console.warn('⚠️ session.js محمّل مسبقاً، تجاهل...');
    return;
  }
  window._sessionLoaded = true;
  
  // ============================================================
  // SESSION CONFIG
  // ============================================================
  const SESSION_CONFIG = {
    DURATION: CONFIG.SESSION_DURATION || 24 * 60 * 60 * 1000
  };
  
  // ============================================================
  // Session Object
  // ============================================================
  const Session = {
    
    // ----------------------------------------------------------
    // 1️⃣ توليد معرّف جلسة فريد لكل تبويب
    // ----------------------------------------------------------
    _generateSessionId() {
      return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    },
    
    // ----------------------------------------------------------
    // 2️⃣ حفظ بيانات المستخدم (في sessionStorage فقط)
    // ----------------------------------------------------------
    save(user) {
      if (!user) {
        console.warn('⚠️ Session.save: محاولة حفظ مستخدم فارغ');
        return;
      }
      
      try {
        // ✅ إعادة تعيين _redirecting
        if (typeof _redirecting !== 'undefined') {
          window._redirecting = false;
        }
        
        // ✅ مسح sessionStorage القديم
        sessionStorage.clear();
        
        // ✅ إنشاء sessionId جديد
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
        
        // ✅ حفظ كل شيء في sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(userWithMeta));
        sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
        sessionStorage.setItem('userType', userWithMeta.type || '');
        sessionStorage.setItem('userId', userWithMeta.id || '');
        sessionStorage.setItem('userName', userWithMeta.name || '');
        sessionStorage.setItem('centerName', userWithMeta.centerName || '');
        sessionStorage.setItem('centerId', userWithMeta.centerId || '');
        sessionStorage.setItem('branchId', userWithMeta.branchId || '');
        sessionStorage.setItem('branchName', userWithMeta.branchName || '');
        
        console.log('✅ Session.save() - تم حفظ الجلسة لهذا التبويب فقط');
        console.log('   📌 النوع:', userWithMeta.type);
        console.log('   📋 الصلاحيات:', permissions.length);
        console.log('   🆔 sessionId:', sessionId);
        
      } catch(e) {
        console.error('❌ Session.save() error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 3️⃣ جلب بيانات المستخدم الحالي
    // ----------------------------------------------------------
    getUser() {
      try {
        // ✅ sessionStorage فقط
        const sessionUser = sessionStorage.getItem('currentUser');
        
        if (!sessionUser) {
          return null;
        }
        
        let user;
        try {
          user = JSON.parse(sessionUser);
        } catch(e) {
          console.warn('⚠️ Session.getUser: فشل تحليل JSON، سيتم مسح الجلسة');
          this.clear();
          return null;
        }
        
        // ✅ التحقق من انتهاء الصلاحية
        if (user.expiry && Date.now() > user.expiry) {
          console.warn('⚠️ Session.getUser: الجلسة منتهية');
          this.clear();
          return null;
        }
        
        // ✅ استرجاع الصلاحيات إذا كانت مفقودة
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
    /**
     * @param {boolean} redirectOnFail - هل يتم إعادة التوجيه عند الفشل؟
     * @returns {boolean}
     */
    checkValidity(redirectOnFail = true) {
      try {
        const user = this.getUser();
        
        // ✅ لا يوجد مستخدم
        if (!user || !user.type) {
          if (redirectOnFail && !_redirecting) {
            _redirecting = true;
            this.clear();
            window.location.href = 'index.html';
          }
          return false;
        }
        
        // ✅ تمديد الجلسة
        this.refresh();
        
        return true;
        
      } catch(e) {
        console.warn('⚠️ checkValidity error:', e);
        return false;
      }
    },
    
    // ----------------------------------------------------------
    // 5️⃣ التحقق من صلاحية واحدة
    // ----------------------------------------------------------
    checkPermission(permission) {
      const user = this.getUser();
      if (!user) return false;
      
      // Admin لديه كل الصلاحيات
      if (user.type === 'Admin') return true;
      
      if (!user.permissions || user.permissions.length === 0) return false;
      if (user.permissions.includes('ManageAll')) return true;
      if (user.permissions.includes('ManagePermissions')) return true;
      
      return user.permissions.includes(permission);
    },
    
    // ----------------------------------------------------------
    // 6️⃣ التحقق من عدة صلاحيات (أي واحدة)
    // ----------------------------------------------------------
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
    
    // ----------------------------------------------------------
    // 7️⃣ التحقق من نوع المستخدم
    // ----------------------------------------------------------
    checkUserType(allowedTypes) {
      const user = this.getUser();
      if (!user || !user.type) return false;
      
      // Admin مسموح دائماً
      if (user.type === 'Admin') return true;
      
      if (!Array.isArray(allowedTypes)) {
        return user.type === allowedTypes;
      }
      
      return allowedTypes.includes(user.type);
    },
    
    // ----------------------------------------------------------
    // 8️⃣ التحقق من نوع المستخدم مع إعادة توجيه
    // ----------------------------------------------------------
    checkUserTypeWithRedirect(allowedTypes, redirectOnFail = true) {
      const user = this.getUser();
      
      if (!user || !user.type) {
        if (redirectOnFail && !_redirecting) {
          _redirecting = true;
          window.location.href = 'index.html';
        }
        return false;
      }
      
      if (user.type === 'Admin') return true;
      
      const typesArray = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
      if (typesArray.includes(user.type)) return true;
      
      if (redirectOnFail && !_redirecting) {
        _redirecting = true;
        window.location.href = 'index.html';
      }
      return false;
    },
    
    // ----------------------------------------------------------
    // 9️⃣ تسجيل الخروج
    // ----------------------------------------------------------
    logout() {
      try {
        // ✅ مسح sessionStorage فقط (لا نلمس localStorage)
        sessionStorage.clear();
        
        console.log('✅ Session.logout() - تم تسجيل الخروج من هذا التبويب');
        
        // ✅ إعادة توجيه (مرة واحدة فقط)
        if (!_redirecting) {
          _redirecting = true;
          window.location.href = 'index.html';
        }
        
      } catch(e) {
        console.error('❌ Session.logout() error:', e);
        window.location.href = 'index.html';
      }
    },
    
    // ----------------------------------------------------------
    // 🔟 مسح البيانات (بدون إعادة توجيه)
    // ----------------------------------------------------------
    clear() {
      try {
        sessionStorage.clear();
        console.log('✅ Session.clear() - تم مسح الجلسة');
      } catch(e) {
        console.error('❌ Session.clear() error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣1️⃣ تمديد الجلسة
    // ----------------------------------------------------------
    refresh() {
      try {
        const user = this.getUser();
        if (!user || !user.type) return;
        
        // ✅ تحديث expiry فقط (بدون مسح sessionStorage)
        user.expiry = Date.now() + SESSION_CONFIG.DURATION;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        
      } catch(e) {
        console.warn('⚠️ Session.refresh error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣2️⃣ الحصول على الصلاحيات الحالية
    // ----------------------------------------------------------
    getPermissions() {
      const user = this.getUser();
      if (!user) return [];
      
      if (user.type === 'Admin') {
        return getDefaultPermissionsForType('Admin');
      }
      
      return user.permissions || [];
    },
    
    // ----------------------------------------------------------
    // 1️⃣3️⃣ تحديث الصلاحيات
    // ----------------------------------------------------------
    updatePermissions(permissions) {
      try {
        const user = this.getUser();
        if (!user) return false;
        
        user.permissions = Array.isArray(permissions) ? permissions : [];
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions));
        
        console.log('✅ Session.updatePermissions() - تم تحديث الصلاحيات:', user.permissions.length);
        return true;
        
      } catch(e) {
        console.error('❌ Session.updatePermissions() error:', e);
        return false;
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣4️⃣ الحصول على بيانات مختصرة للمستخدم
    // ----------------------------------------------------------
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
        permissionsCount: (user.permissions || []).length
      };
    }
  };
  
  // ============================================================
  // تصدير Session
  // ============================================================
  if (typeof window !== 'undefined') {
    window.Session = Session;
    console.log('✅ session.js - تم التحميل (جلسة لكل تبويب)');
    console.log('⏱️ مدة الجلسة:', SESSION_CONFIG.DURATION / 1000 / 60 / 60, 'ساعات');
  }
  
})();
