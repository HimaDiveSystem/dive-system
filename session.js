// ============================================================
// session.js - نظام إدارة الجلسة (Hybrid: sessionStorage + Fallback)
// ============================================================
// ✅ الجلسة الأساسية في sessionStorage (خاصة بكل تبويب)
// ✅ localStorage = Fallback فقط (آخر جلسة ناجحة)
// ✅ كل تبويب مستقل تماماً عن الآخر
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
  
  // ✅ مفاتيح التخزين
  const LS_KEY = 'currentUser';           // localStorage (Fallback)
  const SS_KEY = 'currentUser';           // sessionStorage (أساسي)
  
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
  // ✅ دالة مساعدة: حفظ في localStorage (Fallback فقط)
  // ============================================================
  function saveToLocalStorage(userWithMeta) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        user: userWithMeta,
        expiry: userWithMeta.expiry,
        savedAt: Date.now()
      }));
      console.log('💾 Fallback → localStorage (آخر جلسة ناجحة)');
    } catch(e) {
      console.error('❌ فشل الحفظ في localStorage:', e);
    }
  }
  
  // ============================================================
  // ✅ دالة مساعدة: قراءة من localStorage (Fallback)
  // ============================================================
  function readFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // ✅ الشكل الجديد: { user: {...}, expiry: <timestamp> }
      if (data.user) {
        return data.user;
      }
      
      // ✅ الشكل القديم: {...user fields...}
      return data;
    } catch(e) {
      console.error('❌ فشل القراءة من localStorage:', e);
      return null;
    }
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
    // 2️⃣ حفظ بيانات المستخدم
    // ----------------------------------------------------------
    // ✅ sessionStorage = الأساسي (خاص بالتبويب)
    // ✅ localStorage = Fallback (آخر جلسة ناجحة)
    // ----------------------------------------------------------
    save(user) {
      if (!user) {
        console.warn('⚠️ Session.save: مستخدم فارغ');
        return;
      }
      
      try {
        window._redirecting = false;
        
        // ✅ احفظ الفرع قبل المسح
        const savedBranch = sessionStorage.getItem('selectedBranch') 
                         || localStorage.getItem('selectedBranch');
        
        // ✅ امسح sessionStorage (خاص بالتبويب الحالي فقط)
        sessionStorage.clear();
        
        // ✅ استعد الفرع
        if (savedBranch) {
          sessionStorage.setItem('selectedBranch', savedBranch);
        }
        
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
        
        // ✅ 1. sessionStorage (الأساسي - خاص بالتبويب)
        sessionStorage.setItem(SS_KEY, JSON.stringify(userWithMeta));
        sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
        sessionStorage.setItem('userType', userWithMeta.type || '');
        sessionStorage.setItem('userId', userWithMeta.id || '');
        sessionStorage.setItem('userName', userWithMeta.name || '');
        sessionStorage.setItem('centerName', userWithMeta.centerName || '');
        sessionStorage.setItem('centerId', userWithMeta.centerId || '');
        sessionStorage.setItem('branchId', userWithMeta.branchId || '');
        sessionStorage.setItem('branchName', userWithMeta.branchName || '');
        
        // ✅ 2. localStorage (Fallback - آخر جلسة ناجحة)
        saveToLocalStorage(userWithMeta);
        
        console.log('✅ Session.save() - تم الحفظ');
        console.log('   📌 sessionStorage (خاص بالتبويب):', userWithMeta.type);
        console.log('   💾 localStorage (Fallback):', userWithMeta.type);
        console.log('   ⏱️ ينتهي:', new Date(userWithMeta.expiry).toLocaleString());
        
      } catch(e) {
        console.error('❌ Session.save() error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 3️⃣ جلب بيانات المستخدم
    // ----------------------------------------------------------
    // ✅ الأولوية: sessionStorage (خاص بالتبويب)
    // ✅ Fallback: localStorage (فقط إذا لم يوجد في sessionStorage)
    // ----------------------------------------------------------
    getUser() {
      try {
        // ✅ ✅ ✅ 1. sessionStorage أولاً (لا نلمس localStorage إذا وُجد)
        const sessionUser = sessionStorage.getItem(SS_KEY);
        
        if (sessionUser) {
          try {
            const user = JSON.parse(sessionUser);
            
            // ✅ تحقق من expiry
            if (user.expiry && Date.now() > user.expiry) {
              console.warn('⚠️ الجلسة منتهية (sessionStorage)');
              this.clear();
              return null;
            }
            
            // ✅ استرجع الصلاحيات إذا كانت مفقودة
            if (!user.permissions || user.permissions.length === 0) {
              const permStored = sessionStorage.getItem('userPermissions');
              if (permStored) {
                try {
                  user.permissions = JSON.parse(permStored);
                } catch(e) {
                  user.permissions = [];
                }
              }
            }
            
            // ✅ ✅ ✅ مهم جداً: نرجع فوراً - لا نقرأ من localStorage
            return user;
          } catch(e) {
            console.warn('⚠️ فشل تحليل sessionStorage');
          }
        }
        
        // ✅ 2. Fallback إلى localStorage (فقط إذا لم توجد جلسة في sessionStorage)
        const localUser = readFromLocalStorage();
        
        if (localUser) {
          // ✅ تحقق من expiry
          if (localUser.expiry && Date.now() > localUser.expiry) {
            console.warn('⚠️ الجلسة منتهية (localStorage)');
            localStorage.removeItem(LS_KEY);
            return null;
          }
          
          // ✅ انسخ إلى sessionStorage لهذا التبويب
          sessionStorage.setItem(SS_KEY, JSON.stringify(localUser));
          sessionStorage.setItem('userPermissions', JSON.stringify(localUser.permissions || []));
          sessionStorage.setItem('userType', localUser.type || '');
          sessionStorage.setItem('userId', localUser.id || '');
          sessionStorage.setItem('userName', localUser.name || '');
          sessionStorage.setItem('centerName', localUser.centerName || '');
          sessionStorage.setItem('centerId', localUser.centerId || '');
          sessionStorage.setItem('branchId', localUser.branchId || '');
          sessionStorage.setItem('branchName', localUser.branchName || '');
          sessionStorage.setItem('sessionId', localUser.sessionId || 'restored_from_ls');
          
          console.log('✅ تم استعادة الجلسة من localStorage → sessionStorage');
          console.log('   📌 النوع:', localUser.type);
          return localUser;
        }
        
        // ✅ 3. لا جلسة
        return null;
        
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
        
        // ✅ تمديد الجلسة
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
      
      if (!Array.isArray(allowedTypes)) {
        return user.type === allowedTypes;
      }
      
      return allowedTypes.includes(user.type);
    },
    
    checkUserTypeWithRedirect(allowedTypes, redirectOnFail = true) {
      const user = this.getUser();
      
      if (!user || !user.type) {
        if (redirectOnFail) {
          safeRedirect('index.html');
        }
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
    // 9️⃣ تسجيل الخروج
    // ----------------------------------------------------------
    // ✅ امسح sessionStorage فقط (لا تمس localStorage)
    //    حتى لا يُفقد Fallback للتبويبات الأخرى
    // ----------------------------------------------------------
    logout() {
      try {
        // ✅ امسح sessionStorage (خاص بالتبويب الحالي)
        sessionStorage.clear();
        
        // ✅ امسح الفرع من localStorage (اختياري - حسب السياسة)
        // ⚠️ نترك currentUser في localStorage كـ Fallback
        localStorage.removeItem('selectedBranch');
        
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
    
    // ----------------------------------------------------------
    // 🔟 مسح البيانات (sessionStorage فقط)
    // ----------------------------------------------------------
    clear() {
      try {
        sessionStorage.clear();
        console.log('✅ Session.clear() - تم مسح الجلسة الحالية (sessionStorage)');
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
        
        // ✅ مدد الجلسة
        user.expiry = Date.now() + SESSION_CONFIG.DURATION;
        
        // ✅ احفظ في sessionStorage (الأساسي)
        sessionStorage.setItem(SS_KEY, JSON.stringify(user));
        
        // ✅ حدّث localStorage (Fallback)
        saveToLocalStorage(user);
        
      } catch(e) {
        console.warn('⚠️ Session.refresh error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣2️⃣ الحصول على الصلاحيات
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
        
        sessionStorage.setItem(SS_KEY, JSON.stringify(user));
        sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions));
        
        saveToLocalStorage(user);
        
        console.log('✅ Session.updatePermissions()');
        return true;
        
      } catch(e) {
        console.error('❌ Session.updatePermissions() error:', e);
        return false;
      }
    },
    
    // ----------------------------------------------------------
    // 1️⃣4️⃣ بيانات مختصرة
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
        permissionsCount: (user.permissions || []).length,
        expiry: user.expiry,
        sessionId: user.sessionId
      };
    },
    
    // ----------------------------------------------------------
    // 1️⃣5️⃣ التوجيه الآمن (مكشوفة)
    // ----------------------------------------------------------
    safeRedirect(url) {
      return safeRedirect(url);
    }
  };
  
  // ============================================================
  // تصدير Session
  // ============================================================
  if (typeof window !== 'undefined') {
    window.Session = Session;
    console.log('✅ session.js - تم التحميل (v3 — Hybrid)');
    console.log('⏱️ مدة الجلسة:', SESSION_CONFIG.DURATION / 1000 / 60 / 60, 'ساعات');
    console.log('📌 sessionStorage: أساسي | localStorage: Fallback');
  }
  
})();
