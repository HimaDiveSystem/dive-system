// config.js - الملف الموحد للإعدادات والمتغيرات المشتركة
// ============================================================

// ✅ رابط Web App (استخدم الرابط الصحيح الوحيد)
const CONFIG = {
  // الرابط الأساسي لـ Google Apps Script
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzjv8iFYX6vm_3hsbKEHWRLRhFoGISm6TSQcDINgkkff14yjpoBY-rYGCqJFlpF5u3g/exec',
  
  // صلاحية الجلسة (بالمللي ثانية) - 24 ساعة
  SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  // أسماء الصفحات حسب نوع المستخدم
  DASHBOARD_PAGES: {
    Admin:                'Dashboard.html',
    Owner:                'OwnerDashboard.html',
    Sales:                'SalesDashboard.html',
    Accountant:           'AccountantDashboard.html',
    Customer:             'CustomerDashboard.html',
    OperationsManager:    'OperationManager.html',
    OperationsSupervisor: 'OperationSupervisor.html'
  },
  
  // أنواع المستخدمين المسموح لهم بدخول صفحات محددة
  ALLOWED_TYPES: {
    AccountantDashboard: ['Accountant', 'Admin', 'AccountantManager', 'FinancialManager'],
    SalesDashboard: ['Sales'],
    OwnerDashboard: ['Owner', 'Admin'],
    Dashboard: ['Admin', 'Owner', 'Accountant', 'Sales', 'OperationsManager', 'OperationsSupervisor'],
    OperationManager: ['OperationsManager', 'Admin', 'Owner'],
    OperationSupervisor: ['OperationsSupervisor', 'OperationsManager', 'Admin']
  }
};

// ✅ دالة مساعدة للاتصال بـ Apps Script
function callGAS(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', callbackName);
    url.searchParams.set('_t', Date.now());
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v ?? '')));
    
    window[callbackName] = function(data) {
      delete window[callbackName];
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      resolve(data);
    };
    
    const script = document.createElement('script');
    script.src = url.toString();
    script.onerror = () => {
      delete window[callbackName];
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      reject(new Error('فشل الاتصال بالخادم'));
    };
    document.body.appendChild(script);
    
    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('انتهى وقت الاتصال'));
      }
    }, 30000);
  });
}
