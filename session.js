// session.js - نظام إدارة الجلسة الموحد (24 ساعة)
// ============================================================

const Session = {
  // ✅ حفظ بيانات المستخدم
  save(user) {
    try {
      const dataToStore = {
        user: user,
        expiry: Date.now() + CONFIG.SESSION_DURATION
      };
      localStorage.setItem('currentUser', JSON.stringify(dataToStore));
      
      // ✅ حفظ نسخة في sessionStorage للانتقال بين الصفحات
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      
      // ✅ ✅ ✅ حفظ نوع المستخدم ومعرفته بشكل منفصل (للرجوع السريع)
      if (user && user.type) {
        sessionStorage.setItem('userType', user.type);
        sessionStorage.setItem('userId', user.id);
        sessionStorage.setItem('userName', user.name || '');
      }
    } catch(e) {
      console.error('Session save error:', e);
    }
  },
  
  // ✅ جلب بيانات المستخدم الحالي
  getUser() {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) {
        // ✅ ✅ ✅ محاولة استعادة المستخدم من sessionStorage
        return this._restoreFromSession();
      }
      const data = JSON.parse(stored);
      if (data.expiry && Date.now() < data.expiry) {
        return data.user;
      } else {
        this.clear();
        return this._restoreFromSession();
      }
    } catch(e) {
      return this._restoreFromSession();
    }
  },
  
  // ✅ ✅ ✅ دالة مساعدة لاستعادة المستخدم من sessionStorage
  _restoreFromSession() {
    try {
      const userType = sessionStorage.getItem('userType');
      const userId = sessionStorage.getItem('userId');
      const userName = sessionStorage.getItem('userName');
      
      if (userType && userId) {
        // ✅ بناء كائن مستخدم مؤقت من البيانات المحفوظة
        const tempUser = {
          id: userId,
          type: userType,
          name: userName || 'مستخدم',
          // ✅ محاولة جلب باقي البيانات من localStorage إن وجدت
        };
        
        // ✅ محاولة جلب البيانات الكاملة من localStorage
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            if (data.user) {
              // ✅ دمج البيانات
              return { ...data.user, ...tempUser };
            }
          } catch(e) {}
        }
        
        return tempUser;
      }
      return null;
    } catch(e) {
      return null;
    }
  },
  
  // ✅ التحقق من صحة الجلسة (مع توجيه تلقائي إذا انتهت)
  checkValidity(redirectOnFail = true) {
    const user = this.getUser();
    if (user) {
      // ✅ ✅ ✅ تحديث وقت الجلسة عند التحقق
      this.refresh();
      return true;
    } else {
      if (redirectOnFail) {
        this.clear();
        // ✅ حفظ الصفحة الحالية قبل التوجيه
        sessionStorage.setItem('intendedPage', window.location.pathname);
        window.location.href = 'index.html';
      }
      return false;
    }
  },
  
  // ✅ التحقق من أن نوع المستخدم مسموح له بالدخول
  checkPermission(allowedTypes, redirectOnFail = true) {
    const user = this.getUser();
    if (!user) {
      if (redirectOnFail) {
        sessionStorage.setItem('intendedPage', window.location.pathname);
        window.location.href = 'index.html';
      }
      return false;
    }
    
    if (allowedTypes.includes(user.type)) {
      return true;
    } else {
      if (redirectOnFail) {
        const targetPage = CONFIG.DASHBOARD_PAGES?.[user.type] || 'index.html';
        window.location.href = targetPage;
      }
      return false;
    }
  },
  
  // ✅ تسجيل الخروج - نسخة محسنة مع رسالة تأكيد
  logout() {
    this.clear();
    // ✅ مسح sessionStorage بالكامل
    sessionStorage.clear();
    window.location.href = 'index.html';
  },
  
  // ✅ مسح جميع البيانات
  clear() {
    localStorage.removeItem('currentUser');
    // ✅ لا نمسح sessionStorage بالكامل هنا، فقط نزيل المفاتيح الخاصة
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userName');
  },
  
  // ✅ تحديث الجلسة (تمديد الوقت)
  refresh() {
    const user = this.getUser();
    if (user) {
      this.save(user);
    }
  }
};
