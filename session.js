// ============================================================
// session.js - نظام إدارة الجلسة الموحد
// ============================================================
// ⚠️ مهم: هذا الملف يعتمد على config.js
// يجب أن يُحمّل config.js قبله
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
    // 1️⃣ إدارة معرّف الجلسة (لكل تبويب)
    // ----------------------------------------------------------
    _getSessionId() {
      let sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        sessionStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    },
    
    // ----------------------------------------------------------
    // 2️⃣ حفظ بيانات المستخدم
    // ----------------------------------------------------------
   // ═══════════════════════════════════════════════════════════════
// save - حفظ المستخدم (نسخة محسّنة - تنظف القديم)
// ═══════════════════════════════════════════════════════════════
save(user) {
  if (!user) {
    console.warn('⚠️ Session.save: محاولة حفظ مستخدم فارغ');
    return;
  }
  
  try {
    // ✅ 1. إعادة تعيين _redirecting
    if (typeof _redirecting !== 'undefined') {
      window._redirecting = false;
    }
    
    // ✅ 2. مسح كل الجلسات القديمة أولاً
    const oldKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('currentUser_') || 
      key === 'currentUser' ||
      key === 'activeSessionId'
    );
    oldKeys.forEach(key => {
      console.log(`🗑️ حذف مفتاح قديم: ${key}`);
      localStorage.removeItem(key);
    });
    
    // ✅ 3. امسح sessionStorage القديم
    sessionStorage.clear();
    
    // ✅ 4. إنشاء sessionId جديد
    const sessionId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    sessionStorage.setItem('sessionId', sessionId);
    
    const permissions = user.permissions || [];
    
    const userWithMeta = {
      ...user,
      permissions: permissions,
      sessionId: sessionId,
      expiry: Date.now() + SESSION_CONFIG.DURATION
    };
    
    // ✅ 5. تخزين في sessionStorage
    sessionStorage.setItem('currentUser', JSON.stringify(userWithMeta));
    sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
    sessionStorage.setItem('userType', userWithMeta.type || '');
    sessionStorage.setItem('userId', userWithMeta.id || '');
    sessionStorage.setItem('userName', userWithMeta.name || '');
    sessionStorage.setItem('centerName', userWithMeta.centerName || '');
    sessionStorage.setItem('branchId', userWithMeta.branchId || '');
    
    // ✅ 6. تخزين في localStorage (بمفتاح sessionId فقط)
    const dataToStore = {
      user: userWithMeta,
      expiry: Date.now() + SESSION_CONFIG.DURATION,
      sessionId: sessionId
    };
    localStorage.setItem('currentUser_' + sessionId, JSON.stringify(dataToStore));
    localStorage.setItem('activeSessionId', sessionId);
    localStorage.setItem('userPermissions', JSON.stringify(permissions));
    
    console.log('✅ Session.save() - تم حفظ المستخدم:', userWithMeta.name);
    console.log('   📌 النوع:', userWithMeta.type);
    console.log('   📋 الصلاحيات:', permissions.length, 'صلاحية');
    console.log('   🆔 sessionId:', sessionId);
    
  } catch(e) {
    console.error('❌ Session.save() error:', e);
  }
},
    
    // ----------------------------------------------------------
    // 3️⃣ جلب بيانات المستخدم الحالي
    // ----------------------------------------------------------
   // ═══════════════════════════════════════════════════════════════
// getUser - جلب المستخدم الحالي (نسخة محسّنة)
// ═══════════════════════════════════════════════════════════════
getUser() {
  try {
    // ✅ 1. محاولة من sessionStorage أولاً (الأسرع والأدق)
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
      try {
        const user = JSON.parse(sessionUser);
        
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
            } catch(e) {}
          }
        }
        
        return user;
      } catch(e) {
        console.warn('⚠️ Session.getUser: فشل تحليل sessionStorage:', e);
      }
    }
    
    // ✅ 2. محاولة من localStorage (فقط بمفتاح sessionId)
    const activeSessionId = localStorage.getItem('activeSessionId');
    if (activeSessionId) {
      const storageKey = 'currentUser_' + activeSessionId;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          
          if (data.expiry && Date.now() < data.expiry) {
            const user = data.user || {};
            
            // ✅ استرجاع الصلاحيات
            if (!user.permissions || user.permissions.length === 0) {
              const permStored = localStorage.getItem('userPermissions');
              if (permStored) {
                try {
                  user.permissions = JSON.parse(permStored);
                } catch(e) {}
              }
            }
            
            // ✅ نسخ إلى sessionStorage لهذا التبويب
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions || []));
            sessionStorage.setItem('userType', user.type || '');
            sessionStorage.setItem('userId', user.id || '');
            sessionStorage.setItem('userName', user.name || '');
            sessionStorage.setItem('centerName', user.centerName || '');
            sessionStorage.setItem('branchId', user.branchId || '');
            
            return user;
          }
        } catch(e) {
          console.warn('⚠️ Session.getUser: فشل تحليل localStorage:', e);
        }
      }
    }
    
    // ✅ 3. حذف المفاتيح القديمة (تنظيف تلقائي)
    // ⚠️ هذا جديد: يحذف `currentUser` بدون sessionId (نسخة قديمة)
    const oldKey = localStorage.getItem('currentUser');
    if (oldKey) {
      try {
        const oldData = JSON.parse(oldKey);
        // إذا كان المفتاح القديم يحتوي على بيانات صالحة، انقلها للشكل الجديد
        if (oldData && oldData.user && oldData.expiry && Date.now() < oldData.expiry) {
          console.log('⚠️ Session.getUser: وجدت مفتاح currentUser قديم - سيتم ترحيله');
          
          const sessionId = this._getSessionId();
          const migratedData = {
            user: { ...oldData.user, sessionId: sessionId, expiry: oldData.expiry },
            expiry: oldData.expiry,
            sessionId: sessionId
          };
          
          // انقل للمفتاح الجديد
          localStorage.setItem('currentUser_' + sessionId, JSON.stringify(migratedData));
          localStorage.setItem('activeSessionId', sessionId);
          
          // احذف المفتاح القديم
          localStorage.removeItem('currentUser');
          console.log('✅ تم ترحيل المفتاح القديم');
          
          // أعد المحاولة
          return migratedData.user;
        } else {
          // مفتاح قديم منتهي - احذفه
          localStorage.removeItem('currentUser');
          console.log('🗑️ تم حذف مفتاح currentUser قديم (منتهي)');
        }
      } catch(e) {
        // مفتاح قديم تالف - احذفه
        localStorage.removeItem('currentUser');
      }
    }
    
    // ✅ 4. محاولة الطوارئ
    return this._restoreFromSession();
    
  } catch(e) {
    console.error('❌ Session.getUser() error:', e);
    return this._restoreFromSession();
  }
},
    
    // ----------------------------------------------------------
    // 4️⃣ استعادة طارئة (Fallback)
    // ----------------------------------------------------------
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
    
    // ----------------------------------------------------------
    // 5️⃣ التحقق من صحة الجلسة
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
        
        // ✅ الجلسة منتهية (يتم فحصها في getUser لكن للتأكيد)
        if (user.expiry && Date.now() > user.expiry) {
          console.warn('⚠️ الجلسة منتهية');
          if (redirectOnFail && !_redirecting) {
            _redirecting = true;
            this.logout();
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
    // 6️⃣ التحقق من صلاحية واحدة
    // ----------------------------------------------------------
    /**
     * @param {string} permission - اسم الصلاحية
     * @returns {boolean}
     */
    checkPermission(permission) {
      const user = this.getUser();
      if (!user) return false;
      
      // Admin لديه كل الصلاحيات
      if (user.type === 'Admin') return true;
      
      // إذا كان لديه ManageAll
      if (!user.permissions || user.permissions.length === 0) return false;
      if (user.permissions.includes('ManageAll')) return true;
      if (user.permissions.includes('ManagePermissions')) return true;
      
      return user.permissions.includes(permission);
    },
    
    // ----------------------------------------------------------
    // 7️⃣ التحقق من عدة صلاحيات (أي واحدة)
    // ----------------------------------------------------------
    /**
     * @param {string[]} permissions - مصفوفة الصلاحيات
     * @returns {boolean}
     */
    checkMultiplePermissions(permissions) {
      if (!Array.isArray(permissions) || permissions.length === 0) return false;
      
      const user = this.getUser();
      if (!user) return false;
      
      // Admin لديه كل الصلاحيات
      if (user.type === 'Admin') return true;
      
      if (!user.permissions || user.permissions.length === 0) return false;
      if (user.permissions.includes('ManageAll')) return true;
      if (user.permissions.includes('ManagePermissions')) return true;
      
      return permissions.some(p => user.permissions.includes(p));
    },
    
    // ----------------------------------------------------------
    // 8️⃣ التحقق من نوع المستخدم
    // ----------------------------------------------------------
    /**
     * @param {string|string[]} allowedTypes - نوع أو مصفوفة أنواع
     * @returns {boolean}
     */
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
    // 9️⃣ التحقق من نوع المستخدم مع إعادة توجيه
    // ----------------------------------------------------------
    /**
     * @param {string[]} allowedTypes
     * @param {boolean} redirectOnFail
     * @returns {boolean}
     */
    checkUserTypeWithRedirect(allowedTypes, redirectOnFail = true) {
      const user = this.getUser();
      
      // لا يوجد مستخدم
      if (!user || !user.type) {
        if (redirectOnFail && !_redirecting) {
          _redirecting = true;
          window.location.href = 'index.html';
        }
        return false;
      }
      
      // Admin مسموح دائماً
      if (user.type === 'Admin') return true;
      
      // تحقق من النوع
      const typesArray = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
      if (typesArray.includes(user.type)) return true;
      
      // غير مسموح → إعادة توجيه
      if (redirectOnFail && !_redirecting) {
        _redirecting = true;
        window.location.href = 'index.html';
      }
      return false;
    },
    
    // ----------------------------------------------------------
    // 🔟 تسجيل الخروج
    // ----------------------------------------------------------
    logout() {
      try {
        const sessionId = sessionStorage.getItem('sessionId');
        
        // ✅ حذف من localStorage
        if (sessionId) {
          localStorage.removeItem('currentUser_' + sessionId);
        }
        localStorage.removeItem('userPermissions');
        
        // ✅ تحديث activeSessionId
        const activeSessionId = localStorage.getItem('activeSessionId');
        if (activeSessionId === sessionId) {
          localStorage.removeItem('activeSessionId');
        }
        
        // ✅ حذف من sessionStorage
        sessionStorage.clear();
        
        console.log('✅ Session.logout() - تم تسجيل الخروج');
        
        // ✅ إعادة توجيه (مرة واحدة فقط)
        if (!_redirecting) {
          _redirecting = true;
          window.location.href = 'index.html';
        }
        
      } catch(e) {
        console.error('❌ Session.logout() error:', e);
        // محاولة إعادة التوجيه على أي حال
        window.location.href = 'index.html';
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣1️⃣ مسح البيانات (بدون إعادة توجيه)
    // ----------------------------------------------------------
    clear() {
      try {
        const sessionId = sessionStorage.getItem('sessionId');
        
        // ✅ حذف من localStorage
        if (sessionId) {
          localStorage.removeItem('currentUser_' + sessionId);
        }
        localStorage.removeItem('userPermissions');
        
        // ✅ حذف من sessionStorage
        sessionStorage.clear();
        
        console.log('✅ Session.clear() - تم مسح البيانات');
        
      } catch(e) {
        console.error('❌ Session.clear() error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣2️⃣ تمديد الجلسة
    // ----------------------------------------------------------
    refresh() {
      const user = this.getUser();
      if (user && user.type) {
        // تحديث expiry
        this.save(user);
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣3️⃣ الحصول على الصلاحيات الحالية
    // ----------------------------------------------------------
    getPermissions() {
      const user = this.getUser();
      if (!user) return [];
      
      // Admin لديه كل الصلاحيات
      if (user.type === 'Admin') {
        return getDefaultPermissionsForType('Admin');
      }
      
      return user.permissions || [];
    },
    
    // ----------------------------------------------------------
    // 1️⃣4️⃣ تحديث الصلاحيات
    // ----------------------------------------------------------
    /**
     * @param {string[]} permissions - مصفوفة الصلاحيات الجديدة
     * @returns {boolean}
     */
    updatePermissions(permissions) {
      try {
        const user = this.getUser();
        if (!user) return false;
        
        user.permissions = Array.isArray(permissions) ? permissions : [];
        this.save(user);
        
        console.log('✅ Session.updatePermissions() - تم تحديث الصلاحيات:', user.permissions.length);
        return true;
        
      } catch(e) {
        console.error('❌ Session.updatePermissions() error:', e);
        return false;
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣5️⃣ الحصول على بيانات مختصرة للمستخدم
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
    console.log('✅ session.js - تم التحميل بنجاح');
    console.log('⏱️ مدة الجلسة:', SESSION_CONFIG.DURATION / 1000 / 60 / 60, 'ساعات');
  }
  
})();
