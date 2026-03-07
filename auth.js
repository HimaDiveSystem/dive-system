const Auth = {
  // حفظ بيانات المستخدم بعد Login
  saveUser(userData) {
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('loggedIn', 'true');
  },

  // جلب بيانات المستخدم
  getUser() {
    const u = sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },

  // التحقق من تسجيل الدخول
  isLoggedIn() {
    return sessionStorage.getItem('loggedIn') === 'true';
  },

  // تسجيل الخروج
  logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
  },

  // حماية الصفحات — ضعها في أول كل صفحة
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return null;
    }
    return this.getUser();
  }
};
