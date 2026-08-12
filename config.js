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
// ✅ callGAS - يستخدم JSONP فقط مع طابور محسّن
// ============================================================

// ✅ منع الطلبات المتكررة
let _callInProgress = false;
let _callQueue = [];
let _callTimeoutId = null;

function callGAS(action, params = {}) {
  return new Promise((resolve, reject) => {
    _callQueue.push({ action, params, resolve, reject });
    _processQueue();
  });
}

function _processQueue() {
  if (_callInProgress) {
    console.log('⏳ طلب قيد التنفيذ، انتظار...');
    return;
  }
  
  if (_callQueue.length === 0) {
    console.log('📭 الطابور فارغ');
    return;
  }
  
  const task = _callQueue.shift();
  _callInProgress = true;
  
  const { action, params, resolve, reject } = task;
  
  const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('callback', callbackName);
  url.searchParams.set('_t', Date.now() + '_' + Math.random().toString(36).substr(2, 4));
  
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });

  console.log('📡 callGAS JSONP URL:', url.toString());

  let script = null;
  let isResolved = false;
  let timeoutId = null;

  // ✅ تعريف الدالة في النطاق العام
  window[callbackName] = function(data) {
    if (isResolved) return;
    isResolved = true;
    console.log('📡 callGAS response for', action, ':', data);
    clearTimeout(timeoutId);
    cleanup();
    resolve(data);
  };

  // ✅ دالة التنظيف (تُستدعى مرة واحدة فقط)
  const cleanup = () => {
    if (_callInProgress === false) return; // ✅ منع التنفيذ المتكرر
    _callInProgress = false;
    
    if (script && script.parentNode) {
      try { script.parentNode.removeChild(script); } catch(e) {}
    }
    try { delete window[callbackName]; } catch(e) {}
    
    if (_callTimeoutId) {
      clearTimeout(_callTimeoutId);
      _callTimeoutId = null;
    }
    
    // ✅ معالجة الطلب التالي بعد تأخير بسيط
    _callTimeoutId = setTimeout(() => {
      _callTimeoutId = null;
      _processQueue();
    }, 150);
  };

  // ✅ مهلة 20 ثانية
  timeoutId = setTimeout(() => {
    if (isResolved) return;
    isResolved = true;
    console.error('❌ callGAS Timeout for action:', action);
    cleanup();
    reject(new Error('انتهى وقت الاتصال'));
  }, 20000);

  // ✅ إنشاء عنصر script
  script = document.createElement('script');
  script.src = url.toString();
  script.async = true;
  
  // ✅ onload: لا تفعل شيئاً لأن callback هو من سيتعامل مع النتيجة
  script.onload = function() {
    console.log('✅ script loaded for action:', action);
    // ✅ لا نستدعي cleanup هنا لأن callback هو من يستدعيها
  };
  
  script.onerror = function() {
    if (isResolved) return;
    isResolved = true;
    clearTimeout(timeoutId);
    console.error('❌ callGAS Script load error for action:', action);
    cleanup();
    reject(new Error('فشل تحميل السكربت'));
  };

  document.body.appendChild(script);
}

// ============================================================
// ✅ دالة مساعدة للتحقق من الصلاحيات
// ============================================================

function checkUserPermission(permission) {
  try {
    if (typeof Session !== 'undefined' && Session.getUser) {
      const user = Session.getUser();
      if (!user) return false;
      if (user.type === 'Admin') return true;
      
      const perms = user.permissions || [];
      if (perms.includes('ManageAll')) return true;
      if (perms.includes('ManagePermissions')) return true;
      
      return perms.includes(permission);
    }
    
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
