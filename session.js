// ============================================================
// session.js - نظام إدارة الجلسة الموحّد
// ============================================================
// ✅ جلسة مشتركة بين كل التبويبات (localStorage + sessionStorage)
// ✅ صلاحية 24 ساعة
// ✅ استعادة تلقائية عند فتح أي صفحة
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
  
  // ✅ المفتاح الموحّد في localStorage
  const LS_KEY = 'currentUser';
  
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
  // ✅ دالة مساعدة: حفظ البيانات في localStorage (مشترك)
  // ============================================================
  function saveToLocalStorage(userWithMeta) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        user: userWithMeta,
        expiry: userWithMeta.expiry
      }));
      console.log('💾 تم الحفظ في localStorage (مشترك بين التبويبات)');
    } catch(e) {
      console.error('❌ فشل الحفظ في localStorage:', e);
    }
  }
  
  // ============================================================
  // ✅ دالة مساعدة: قراءة البيانات من localStorage
  // ============================================================
  function readFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // ✅ الشكل: { user: {...}, expiry: <timestamp> }
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
    // 2️⃣ حفظ بيانات المستخدم (في sessionStorage + localStorage)
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
        
        // ✅ امسح sessionStorage (لكن ليس localStorage!)
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
        
        // ✅ 1. احفظ في sessionStorage (للتبويب الحالي)
        sessionStorage.setItem('currentUser', JSON.stringify(userWithMeta));
        sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
        sessionStorage.setItem('userType', userWithMeta.type || '');
        sessionStorage.setItem('userId', userWithMeta.id || '');
        sessionStorage.setItem('userName', userWithMeta.name || '');
        sessionStorage.setItem('centerName', userWithMeta.centerName || '');
        sessionStorage.setItem('centerId', userWithMeta.centerId || '');
        sessionStorage.setItem('branchId', userWithMeta.branchId || '');
        sessionStorage.setItem('branchName', userWithMeta.branchName || '');
        
        // ✅ 2. احفظ في localStorage (مشترك بين كل التبويبات)
        saveToLocalStorage(userWithMeta);
        
        console.log('✅ Session.save() - تم الحفظ في sessionStorage + localStorage');
        console.log('   📌 النوع:', userWithMeta.type);
        console.log('   🌿 الفرع:', savedBranch ? 'محفوظ' : 'غير محدد');
        console.log('   ⏱️ ينتهي:', new Date(userWithMeta.expiry).toLocaleString());
        
      } catch(e) {
        console.error('❌ Session.save() error:', e);
      }
    },
    
    // ----------------------------------------------------------
    // 3️⃣ جلب بيانات المستخدم (من sessionStorage أو localStorage)
    // ----------------------------------------------------------
    getUser() {
      try {
        // ✅ 1. حاول من sessionStorage
        let sessionUser = sessionStorage.getItem('currentUser');
        
        if (sessionUser) {
          try {
            const user = JSON.parse(sessionUser);
            
            if (user.expiry && Date.now() > user.expiry) {
              console.warn('⚠️ الجلسة منتهية (sessionStorage)');
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
              }
            }
            
            return user;
          } catch(e) {
            console.warn('⚠️ فشل تحليل sessionStorage');
          }
        }
        
        // ✅ 2. Fallback إلى localStorage (جلسة مشتركة)
        const localUser = readFromLocalStorage();
        
        if (localUser) {
          if (localUser.expiry && Date.now() > localUser.expiry) {
            console.warn('⚠️ الجلسة منتهية (localStorage)');
            this.clear();
            return null;
          }
          
          sessionStorage.setItem('currentUser', JSON.stringify(localUser));
          sessionStorage.setItem('userPermissions', JSON.stringify(localUser.permissions || []));
          sessionStorage.setItem('userType', localUser.type || '');
          sessionStorage.setItem('userId', localUser.id || '');
          sessionStorage.setItem('userName', localUser.name || '');
          sessionStorage.setItem('centerName', localUser.centerName || '');
          sessionStorage.setItem('centerId', localUser.centerId || '');
          sessionStorage.setItem('branchId', localUser.branchId || '');
          sessionStorage.setItem('branchName', localUser.branchName || '');
          sessionStorage.setItem('sessionId', localUser.sessionId || 'restored');
          
          console.log('✅ تم استعادة الجلسة من localStorage (تبويب جديد)');
          return localUser;
        }
        
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
    // 9️⃣ تسجيل الخروج
    // ----------------------------------------------------------
    logout() {
      try {
        sessionStorage.clear();
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem('selectedBranch');
        
        console.log('✅ Session.logout() - تم تسجيل الخروج');
        
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
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        saveToLocalStorage(user);
        
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
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.setItem('userPermissions', JSON.stringify(user.permissions));
        saveToLocalStorage(user);
        
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
        expiry: user.expiry
      };
    },
    
    safeRedirect(url) {
      return safeRedirect(url);
    }
  };
  
  if (typeof window !== 'undefined') {
    window.Session = Session;
    console.log('✅ session.js - تم التحميل (v2 — جلسة مشتركة)');
    console.log('⏱️ مدة الجلسة:', SESSION_CONFIG.DURATION / 1000 / 60 / 60, 'ساعات');
  }
  
})();
