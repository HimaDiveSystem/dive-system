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

// ═══════════════════════════════════════════════════════════════════
// callGAS - نسخة محسّنة باستخدام fetch (تعمل على الهواتف)
// ═══════════════════════════════════════════════════════════════════

function callGAS(action, params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('_t', Date.now());
    
    // ✅ إضافة المعاملات
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
    
    // ✅ محاولة fetch أولاً (يعمل على الهواتف)
    fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.text();
    })
    .then(text => {
      // ✅ محاولة تحليل JSON
      try {
        const data = JSON.parse(text);
        resolve(data);
      } catch(e) {
        // ✅ إذا لم يكن JSON صحيحاً، قد يكون JSONP
        // محاولة استخراج البيانات من نص الاستجابة
        const match = text.match(/\((\{.*\})\)/s);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            resolve(data);
          } catch(e2) {
            reject(new Error('فشل تحليل الاستجابة'));
          }
        } else {
          reject(new Error('استجابة غير صالحة'));
        }
      }
    })
    .catch(fetchError => {
      console.warn('⚠️ fetch فشل، محاولة JSONP كحل بديل...');
      
      // ✅ Fallback: JSONP (للحالات التي لا يدعمها fetch)
      const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
      url.searchParams.set('callback', callbackName);
      
      window[callbackName] = function(data) {
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        resolve(data);
      };
      
      const script = document.createElement('script');
      script.src = url.toString();
      script.onerror = function() {
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('فشل الاتصال بالخادم (JSONP)'));
      };
      
      // ✅ مهلة 30 ثانية
      const timeout = setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
          reject(new Error('انتهى وقت الاتصال'));
        }
      }, 30000);
      
      // ✅ تنظيف المهلة عند النجاح
      const originalCallback = window[callbackName];
      window[callbackName] = function(data) {
        clearTimeout(timeout);
        originalCallback(data);
      };
      
      document.body.appendChild(script);
    });
  });
}
