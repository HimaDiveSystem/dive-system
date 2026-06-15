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
      // حفظ نسخة في sessionStorage للانتقال بين الصفحات
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    } catch(e) {
      console.error('Session save error:', e);
    }
  },
  
  // ✅ جلب بيانات المستخدم الحالي
  getUser() {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) return null;
      const data = JSON.parse(stored);
      if (data.expiry && Date.now() < data.expiry) {
        return data.user;
      } else {
        this.clear();
        return null;
      }
    } catch(e) {
      return null;
    }
  },
  
  // ✅ التحقق من صحة الجلسة (مع توجيه تلقائي إذا انتهت)
  checkValidity(redirectOnFail = true) {
    const user = this.getUser();
    if (user) {
      return true;
    } else {
      if (redirectOnFail) {
        this.clear();
        window.location.href = 'index.html';
      }
      return false;
    }
  },
  
  // ✅ التحقق من أن نوع المستخدم مسموح له بالدخول
  checkPermission(allowedTypes, redirectOnFail = true) {
    const user = this.getUser();
    if (!user) {
      if (redirectOnFail) window.location.href = 'index.html';
      return false;
    }
    
    if (allowedTypes.includes(user.type)) {
      return true;
    } else {
      if (redirectOnFail) {
        const targetPage = CONFIG.DASHBOARD_PAGES[user.type] || 'index.html';
        window.location.href = targetPage;
      }
      return false;
    }
  },
  
  // ✅ تسجيل الخروج
  logout() {
    this.clear();
    window.location.href = 'index.html';
  },
  
  // ✅ مسح جميع البيانات
  clear() {
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
  },
  
  // ✅ تحديث الجلسة (تمديد الوقت)
  refresh() {
    const user = this.getUser();
    if (user) {
      this.save(user);
    }
  }
};
