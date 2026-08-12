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

// ============================================================
// ✅ callGAS - يستخدم JSONP فقط (بدون fetch لتجنب CORS)
// ============================================================

// ✅ منع الطلبات المتكررة
let _callInProgress = false;
let _callQueue = [];

function callGAS(action, params = {}) {
  return new Promise((resolve, reject) => {
    // ✅ إضافة الطلب إلى الطابور
    _callQueue.push({ action, params, resolve, reject });
    
    // ✅ محاولة تنفيذ الطلب التالي
    _processQueue();
  });
}

function _processQueue() {
  // ✅ إذا كان هناك طلب قيد التنفيذ أو الطابور فارغ، توقف
  if (_callInProgress || _callQueue.length === 0) return;
  
  // ✅ سحب الطلب الأول من الطابور
  const task = _callQueue.shift();
  _callInProgress = true;
  
  const { action, params, resolve, reject } = task;
  
  // ✅ إنشاء Callback فريد
  const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('callback', callbackName);
  url.searchParams.set('_t', Date.now() + '_' + Math.random().toString(36).substr(2, 4));
  
  // ✅ إضافة المعاملات
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });

  console.log('📡 callGAS JSONP URL:', url.toString());

  let script = null;
  let timeoutId = null;
  let isResolved = false;

  // ✅ دالة التنظيف
  const cleanup = () => {
    _callInProgress = false;
    if (timeoutId) clearTimeout(timeoutId);
    if (script && script.parentNode) {
      try { script.parentNode.removeChild(script); } catch(e) {}
    }
    try { delete window[callbackName]; } catch(e) {}
    
    // ✅ معالجة الطلب التالي في الطابور
    setTimeout(() => _processQueue(), 100);
  };

  // ✅ تعريف الدالة في النطاق العام
  window[callbackName] = function(data) {
    if (isResolved) return;
    isResolved = true;
    console.log('📡 callGAS response:', data);
    cleanup();
    resolve(data);
  };

  // ✅ مهلة 30 ثانية
  timeoutId = setTimeout(() => {
    if (isResolved) return;
    isResolved = true;
    console.error('❌ callGAS Timeout for action:', action);
    cleanup();
    reject(new Error('انتهى وقت الاتصال'));
  }, 30000);

  // ✅ إنشاء عنصر script
  script = document.createElement('script');
  script.src = url.toString();
  script.async = true;
  
  script.onerror = function() {
    if (isResolved) return;
    isResolved = true;
    console.error('❌ callGAS Script load error for action:', action);
    cleanup();
    reject(new Error('فشل تحميل السكربت'));
  };

  // ✅ إضافة إلى head (أفضل من body)
  document.head.appendChild(script);
}

// ============================================================
// ✅ دالة مساعدة للتحقق من الصلاحيات
// ============================================================

function checkUserPermission(permission) {
  try {
    // ✅ محاولة من Session
    if (typeof Session !== 'undefined' && Session.getUser) {
      const user = Session.getUser();
      if (!user) return false;
      if (user.type === 'Admin') return true;
      
      const perms = user.permissions || [];
      // ✅ إذا كان لديه ManageAll أو ManagePermissions، لديه كل الصلاحيات
      if (perms.includes('ManageAll')) return true;
      if (perms.includes('ManagePermissions')) return true;
      
      return perms.includes(permission);
    }
    
    // ✅ محاولة من localStorage
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const data = JSON.parse(stored);
      const user = data.user || {};
      if (user.type === 'Admin') return true;
      const perms = user.permissions || [];
      if (perms.includes('ManageAll')) return true;
      if (perms.includes('ManagePermissions')) return true;
      return perms.includes(permission);
    }
    
    return false;
  } catch(e) {
    console.warn('⚠️ checkUserPermission error:', e);
    return false;
  }
}

// ============================================================
// ✅ دالة مساعدة للبحث عن المركز بالمعرف
// ============================================================

function getCenterNameById(centerId) {
  try {
    const centers = JSON.parse(localStorage.getItem('centers') || '[]');
    const center = centers.find(c => c.id === centerId);
    return center ? center.name : '';
  } catch(e) {
    return '';
  }
}

// ============================================================
// ✅ تصدير الوظائف
// ============================================================

if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.callGAS = callGAS;
  window.checkUserPermission = checkUserPermission;
  window.getCenterNameById = getCenterNameById;
  
  console.log('✅ config.js - تم التحميل بنجاح');
  console.log('📡 GAS_URL:', CONFIG.GAS_URL);
}
