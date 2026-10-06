// ============================================================
// config.js - الإعدادات العامة والدوال المساعدة
// ============================================================
// ⚠️ مهم: هذا الملف يجب أن يُحمّل أولاً قبل session.js و ui.js
// ============================================================

const CONFIG = {
  // ✅ الرابط الأساسي لـ Google Apps Script
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzjv8iFYX6vm_3hsbKEHWRLRhFoGISm6TSQcDINgkkff14yjpoBY-rYGCqJFlpF5u3g/exec',
  
  // ✅ صلاحية الجلسة (بالمللي ثانية) - 24 ساعة
  SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  // ✅ مهلة الطلب الواحد (بالمللي ثانية) - 60 ثانية
  REQUEST_TIMEOUT: 60000,
  
  // ✅ التأخير بين الطلبات في الطابور (بالمللي ثانية)
  QUEUE_DELAY: 400,
  
  // ✅ أسماء الصفحات حسب نوع المستخدم
  DASHBOARD_PAGES: {
    Admin:                'Dashboard.html',
    Owner:                'OwnerDashboard.html',
    Sales:                'SalesDashboard.html',
    Accountant:           'AccountantDashboard.html',
    AccountantManager:    'AccountantDashboard.html',
    FinancialManager:     'AccountantDashboard.html',
    Customer:             'CustomerDashboard.html',
    Supplier:             'CustomerDashboard.html',
    OperationsManager:    'OperationManager.html',
    OperationsSupervisor: 'OperationSupervisor.html',
    Employee:             'EmployeeDashboard.html'
  },
  
  // ✅ أنواع المستخدمين المسموح لهم بدخول صفحات محددة
  ALLOWED_TYPES: {
    AccountantDashboard:    ['Accountant', 'Admin', 'AccountantManager', 'FinancialManager', 'Owner'],
    SalesDashboard:         ['Sales'],
    OwnerDashboard:         ['Owner', 'Admin'],
    Dashboard:              ['Admin', 'Owner', 'Accountant', 'Sales', 'OperationsManager', 'OperationsSupervisor'],
    OperationManager:       ['OperationsManager', 'Admin', 'Owner'],
    OperationSupervisor:    ['OperationsSupervisor', 'OperationsManager', 'Admin'],
    CustomerDashboard:      ['Customer', 'Supplier']
  }
};

// ============================================================
// 2️⃣ العلامات العالمية - تُعرّف مرة واحدة على window
// ============================================================
// ✅ مهم جداً: نستخدم window مباشرة لضمان المشاركة بين جميع الملفات

if (typeof window._redirecting === 'undefined') {
  window._redirecting = false;
}
if (typeof window._jsonpInProgress === 'undefined') {
  window._jsonpInProgress = false;
}
if (typeof window._jsonpQueue === 'undefined') {
  window._jsonpQueue = [];
}
if (typeof window._pageInitialized === 'undefined') {
  window._pageInitialized = false;
}

// ============================================================
// 3️⃣ callGAS - دالة JSONP الموحدة الوحيدة في المشروع
// ============================================================
/**
 * استدعاء Google Apps Script عبر JSONP مع طابور لمنع التعارض
 * @param {string} action - اسم الإجراء
 * @param {Object} params - المعاملات (اختياري)
 * @param {number} retries - عدد المحاولات المتبقية
 * @returns {Promise<any>}
 */
function callGAS(action, params = {}, retries = 2) {
  return new Promise((resolve, reject) => {
    window._jsonpQueue.push({ action, params, resolve, reject, retries });
    _processQueue();
  });
}

/**
 * معالجة الطابور - طلب واحد في كل مرة
 */
function _processQueue() {
  if (window._jsonpInProgress || window._jsonpQueue.length === 0) return;
  
  const task = window._jsonpQueue.shift();
  window._jsonpInProgress = true;
  
  const { action, params, resolve, reject, retries } = task;
  
  // ✅ إضافة centerName تلقائياً إذا كان المستخدم مسجلاً
  let user = null;
  try {
    user = (typeof Session !== 'undefined' && Session.getUser) ? Session.getUser() : null;
  } catch(e) {}
  
  const finalParams = { ...params };
  if (user && user.centerName && !finalParams.centerName) {
    finalParams.centerName = user.centerName;
  }
  if (user && user.centerId && !finalParams.centerId) {
    finalParams.centerId = user.centerId;
  }
  
  // ✅ بناء URL مع callback فريد
  const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 10);
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('callback', callbackName);
  url.searchParams.set('_t', Date.now() + '_' + Math.random().toString(36).substr(2, 8));
  
  Object.entries(finalParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      if (typeof v === 'object') {
        url.searchParams.set(k, JSON.stringify(v));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  });
  
  console.log(`📡 callGAS [${action}] →`, url.toString());
  
  let script = null;
  let timeoutId = null;
  let isResolved = false;
  
  // ✅ دالة التنظيف
  const cleanup = () => {
    window._jsonpInProgress = false;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    if (script && script.parentNode) {
      try { script.parentNode.removeChild(script); } catch(e) {}
    }
    
    try { delete window[callbackName]; } catch(e) {}
    
    // ✅ معالجة الطلب التالي بعد تأخير بسيط
    setTimeout(() => _processQueue(), CONFIG.QUEUE_DELAY);
  };
  
  // ✅ تعريف callback في النطاق العام
  window[callbackName] = function(data) {
    if (isResolved) return;
    isResolved = true;
    console.log(`✅ callGAS [${action}] ← response received`);
    cleanup();
    resolve(data);
  };
  
  // ✅ مهلة الطلب
  timeoutId = setTimeout(() => {
    if (isResolved) return;
    isResolved = true;
    console.error(`❌ callGAS [${action}] timeout after ${CONFIG.REQUEST_TIMEOUT}ms`);
    cleanup();
    
    // ✅ Retry Logic
    if (retries > 0) {
      console.log(`🔄 إعادة محاولة [${action}]... (${retries} متبقية)`);
      setTimeout(() => {
        callGAS(action, params, retries - 1).then(resolve).catch(reject);
      }, 1000);
    } else {
      reject(new Error('انتهى وقت الاتصال'));
    }
  }, CONFIG.REQUEST_TIMEOUT);
  
  // ✅ إنشاء عنصر script
  script = document.createElement('script');
  script.src = url.toString();
  script.async = true;
  
  script.onerror = function() {
    if (isResolved) return;
    isResolved = true;
    console.error(`❌ callGAS [${action}] script load error`);
    cleanup();
    
    // ✅ Retry Logic
    if (retries > 0) {
      console.log(`🔄 إعادة محاولة [${action}]... (${retries} متبقية)`);
      setTimeout(() => {
        callGAS(action, params, retries - 1).then(resolve).catch(reject);
      }, 1000);
    } else {
      reject(new Error('فشل تحميل السكربت'));
    }
  };
  
  document.head.appendChild(script);
}

// ============================================================
// 4️⃣ getDefaultPermissionsForType - الصلاحيات الافتراضية حسب نوع المستخدم
// ============================================================
// ⚠️ مهم جداً: هذه القائمة يجب أن تكون مطابقة تماماً للقائمة في Code.gs
// ============================================================
function getDefaultPermissionsForType(userType) {
  const permissionsMap = {
    'Admin': [
      'ManageAll', 'ManageCenters', 'ManageBranches', 'ManageUsers',
      'ManagePermissions', 'ViewExpiringSubscriptions', 'ViewStats'
    ],
    'Owner': [
      'ViewBranches', 'ViewStaff', 'ViewInvoices', 'ViewSalesReport',
      'ViewCashRegister', 'ViewNotifications', 'ManagePackageInvoice',
      'ManageSalesInvoice', 'ManageTripPrices', 'ManageExchangeRates',
      'ManageExpenseRevenue', 'ChangePassword', 'ManageEmployees',
      'ManageAttendance', 'ManageCustomersSuppliers',
      'ViewEmployees', 'ViewMyAttendance', 'ViewCustomerAccount',
      'ViewCustomerInvoices', 'ViewFinancialSummary', 'ViewPrices',
      'ViewPayments', 'AddCustomerInvoice', 'EditCustomer', 'PrintInvoice'
    ],
    'Accountant': [
      'ViewBookingsToday', 'ViewBookingsByActiveDate', 'ViewSalesReport', 'ViewReports',
      'ManagePackageInvoice', 'ManageEmployees', 'ManageAttendance',
      'ViewMyAttendance', 'ViewEmployeeAttendance', 'ManageSalaryReport',
      'ManageCashRegister', 'ManageExpenseRevenue', 'ManageExchangeRates',
      'ManageTripPrices', 'ManageCustomersSuppliers', 'ViewCustomerInvoice',
      'ViewCustomerAccount', 'ManageOperationManager', 'ViewInvoices',
      'EditInvoice', 'CollectInvoice', 'GenerateInvoicePDF',
      'ViewCustomersSuppliers', 'AddCustomerSupplier', 'EditCustomerSupplier',
      'DeleteCustomerSupplier', 'UpdateCustomerPrices'
    ],
    'Sales': [
      'CreateInvoice', 'CreatePackageInvoice', 'ScanPassport',
      'ViewPendingInvoices', 'ViewDoneInvoices', 'ViewCanceledInvoices',
      'ViewCommissions', 'SelectBranch', 'ViewAnalytics', 'ViewInvoices',
      'GenerateInvoicePDF', 'ViewBookingsToday'
    ],
    'OperationsManager': [
      'ManageInstructors', 'ManageVehicles', 'ManageBoats',
      'ViewInstructorRecords', 'ViewVehicleRecords', 'ViewBoatRecords',
      'ManageOperationAccess', 'ViewInstructors', 'ViewVehicles',
      'ViewBoats', 'ViewTrips', 'EditTrip', 'AddTrip', 'DeleteTrip',
      'ViewEmployees'
    ],
    'OperationsSupervisor': [
      'ViewInstructors', 'ViewVehicles', 'ViewBoats', 'ViewOperationAccess',
      'ViewInstructorRecords', 'ViewVehicleRecords', 'ViewBoatRecords',
      'ViewTrips', 'ViewMyAttendance', 'ViewEmployees'
    ],
    'FinancialManager': [
      'ViewInvoices', 'ViewSalesReport', 'ViewCashRegister',
      'ManageExpenseRevenue', 'ViewCustomerAccount'
    ],
    'Customer': [
      'ViewCustomerAccount', 'ViewCustomerInvoices', 'ViewFinancialSummary',
      'ViewPrices', 'ViewPayments', 'AddCustomerInvoice', 'EditCustomer',
      'PrintInvoice'
    ],
    'Supplier': [
      'ViewCustomerAccount', 'ViewCustomerInvoices', 'ViewFinancialSummary',
      'ViewPrices', 'ViewPayments', 'AddCustomerInvoice', 'EditCustomer',
      'PrintInvoice'
    ],
    'Employee': [
      'ViewEmployees', 'ViewMyAttendance', 'ChangePassword'
    ]
  };
  
  return permissionsMap[userType] || [];
}

// ============================================================
// 5️⃣ checkUserPermission - التحقق من صلاحية المستخدم الحالي
// ============================================================
/**
 * يتحقق من صلاحية المستخدم الحالي (يستخدم Session)
 * @param {string} permission - اسم الصلاحية
 * @returns {boolean}
 */
function checkUserPermission(permission) {
  try {
    // ✅ 1. محاولة استخدام Session
    if (typeof Session !== 'undefined' && Session.getUser) {
      const user = Session.getUser();
      if (!user) return false;
      
      // Admin لديه كل الصلاحيات
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
// 6️⃣ getCenterNameById - البحث عن اسم المركز بالمعرف
// ============================================================
function getCenterNameById(centerId) {
  try {
    if (!centerId) return '';
    
    const centers = JSON.parse(localStorage.getItem('centers') || '[]');
    const center = centers.find(c => c.id === centerId);
    if (center) return center.name;
    
    const sessionCenters = JSON.parse(sessionStorage.getItem('centers') || '[]');
    const sessionCenter = sessionCenters.find(c => c.id === centerId);
    if (sessionCenter) return sessionCenter.name;
    
    return '';
  } catch(e) {
    console.warn('⚠️ getCenterNameById error:', e);
    return '';
  }
}

// ============================================================
// 7️⃣ دوال مساعدة عامة
// ============================================================

/**
 * تحويل التاريخ إلى صيغة dd/MMM/yyyy
 */
function formatDateToDDMMMYYYY(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${months[d.getMonth()]}/${d.getFullYear()}`;
}

/**
 * تحويل التاريخ من صيغة YYYY-MM-DD إلى dd/MMM/yyyy
 */
function isoToDDMMMYYYY(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthIndex = parseInt(parts[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return isoDate;
  return `${parts[2].padStart(2, '0')}/${months[monthIndex]}/${parts[0]}`;
}

/**
 * تحويل التاريخ من صيغة dd/MMM/yyyy إلى YYYY-MM-DD
 */
function ddmmyyyyToISO(dateStr) {
  if (!dateStr) return '';
  const monthsMap = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                     Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const match = String(dateStr).match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (!match) return dateStr;
  const day = match[1].padStart(2, '0');
  const month = monthsMap[match[2]] || '01';
  const year = match[3];
  return `${year}-${month}-${day}`;
}

/**
 * تنسيق رقم الهاتف بشكل موحد
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/^=/, '').trim();
  if (p.startsWith('00')) p = '+' + p.substring(2);
  else if (p.startsWith('0')) p = '+20' + p.substring(1);
  else if (!p.startsWith('+') && p.length >= 10) p = '+' + p;
  return p;
}

// ============================================================
// 8️⃣ تصدير الوظائف للنطاق العام
// ============================================================
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.callGAS = callGAS;
  window.getDefaultPermissionsForType = getDefaultPermissionsForType;
  window.checkUserPermission = checkUserPermission;
  window.getCenterNameById = getCenterNameById;
  window.formatDateToDDMMMYYYY = formatDateToDDMMMYYYY;
  window.isoToDDMMMYYYY = isoToDDMMMYYYY;
  window.ddmmyyyyToISO = ddmmyyyyToISO;
  window.formatPhoneNumber = formatPhoneNumber;
  
  console.log('✅ config.js - تم التحميل بنجاح');
  console.log('📡 GAS_URL:', CONFIG.GAS_URL);
  console.log('⏱️ SESSION_DURATION:', CONFIG.SESSION_DURATION / 1000 / 60 / 60, 'hours');
  console.log('🔄 _redirecting (initial):', window._redirecting);
}
