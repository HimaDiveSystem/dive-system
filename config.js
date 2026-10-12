// ============================================================
// config.js - الإعدادات العامة والدوال المساعدة
// ============================================================
// ⚠️ مهم: هذا الملف يجب أن يُحمّل أولاً قبل session.js و ui.js
// ============================================================
// 🆕 V3: Parallel Execution + Client Cache
// ============================================================

const CONFIG = {
  // ✅ الرابط الأساسي لـ Google Apps Script
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzjv8iFYX6vm_3hsbKEHWRLRhFoGISm6TSQcDINgkkff14yjpoBY-rYGCqJFlpF5u3g/exec',
  
  // ✅ صلاحية الجلسة (بالمللي ثانية) - 24 ساعة
  SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  REQUEST_TIMEOUT: 90000,  // 90 ثانية
  QUEUE_DELAY: 10,         // ✅ تم التخفيض من 100ms إلى 10ms
  
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
// 3️⃣ 🆕 Client Cache — تخزين نتائج callGAS في الذاكرة
// ============================================================

const _gasClientCache = new Map();

const CACHEABLE_ACTIONS = [
  'getEmployeesByCenter',
  'getActiveBranches',
  'getBranchesByCenter',
  'getBranchesByCenterId',
  'getVehicles',
  'getBoats',
  'getInstructors',
  'getAllSuppliersCustomers',
  'getCustomers',
  'getSuppliers',
  'getCenterUsersWithPermissions',
  'getTripDefinitions',
  'getAllTrips',
  'getAllCategories',
  'getAllActivities',
  'getAllExchangeRatesNew',
  'getLatestExchangeRates',
  'getAllJobTitles',
  'getCenterCommissionSettings',
  'getDashboardStats',
  'getDashboardBootstrap'
];

const CLIENT_CACHE_TTL = 5 * 60 * 1000;

function _buildCacheKey(action, params) {
  const cleanParams = { ...params };
  delete cleanParams._t;
  delete cleanParams.callback;
  
  const sortedKeys = Object.keys(cleanParams).sort();
  const sortedParams = {};
  sortedKeys.forEach(k => {
    sortedParams[k] = cleanParams[k];
  });
  
  return action + '|' + JSON.stringify(sortedParams);
}

function clearGASClientCache(actionPattern) {
  if (!actionPattern) {
    const count = _gasClientCache.size;
    _gasClientCache.clear();
    console.log(`🗑️ clearGASClientCache: تم إبطال كل Cache (${count} مفتاح)`);
    return;
  }
  
  let cleared = 0;
  for (const key of Array.from(_gasClientCache.keys())) {
    if (key.startsWith(actionPattern + '|')) {
      _gasClientCache.delete(key);
      cleared++;
    }
  }
  console.log(`🗑️ clearGASClientCache: تم إبطال ${cleared} مفتاح لـ ${actionPattern}`);
}

function showGASClientCacheStatus() {
  console.log('═══════════════════════════════════════');
  console.log('📊 حالة Client Cache');
  console.log('═══════════════════════════════════════');
  console.log('   العدد:', _gasClientCache.size);
  
  let idx = 1;
  for (const [key, value] of _gasClientCache.entries()) {
    const age = Math.round((Date.now() - value.timestamp) / 1000);
    const actionName = key.split('|')[0];
    console.log(`   [${idx}] ${actionName} (عمر ${age}s)`);
    idx++;
  }
  console.log('═══════════════════════════════════════');
}

// ============================================================
// 4️⃣ callGAS - دالة JSONP مع Client Cache (بدون Queue)
// ============================================================
/**
 * استدعاء Google Apps Script عبر JSONP
 * - Client Cache للأكشنز الثابتة
 * - تنفيذ متوازي (بدون Queue)
 * - Retry Logic
 */
function callGAS(action, params = {}, retries = 2) {
  // ═══════════════════════════════════════════════════════════
  // ✅ 1. فحص Client Cache
  // ═══════════════════════════════════════════════════════════
  const isCacheable = CACHEABLE_ACTIONS.includes(action);
  
  if (isCacheable) {
    const cacheKey = _buildCacheKey(action, params);
    const cached = _gasClientCache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CLIENT_CACHE_TTL) {
        console.log(`⚡ callGAS [${action}] ← Client Cache HIT (عمر ${Math.round(age / 1000)}s)`);
        return Promise.resolve(cached.data);
      } else {
        _gasClientCache.delete(cacheKey);
        console.log(`⏰ callGAS [${action}] — انتهت مدة Cache`);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // ✅ 2. تنفيذ مباشر (بدون Queue — تنفيذ متوازي)
  // ═══════════════════════════════════════════════════════════
  return new Promise((resolve, reject) => {
    // ✅ إضافة centerName/centerId تلقائياً
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
    
    // ✅ بناء URL
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
    
    console.log(`📡 callGAS [${action}] → START`);
    const startTime = Date.now();
    
    let script = null;
    let timeoutId = null;
    let isResolved = false;
    
    // ✅ دالة التنظيف
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (script && script.parentNode) {
        try { script.parentNode.removeChild(script); } catch(e) {}
      }
      
      try { delete window[callbackName]; } catch(e) {}
    };
    
    // ✅ callback
    window[callbackName] = function(data) {
      if (isResolved) return;
      isResolved = true;
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ callGAS [${action}] ← END (${elapsed}ms)`);
      
      cleanup();
      
      // ✅ تخزين في Cache قبل الإرجاع
      if (isCacheable && data) {
        _gasClientCache.set(_buildCacheKey(action, params), {
          data: data,
          timestamp: Date.now()
        });
        console.log(`💾 callGAS [${action}] ← تم التخزين في Client Cache`);
      }
      
      resolve(data);
    };
    
    // ✅ timeout
    timeoutId = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      console.error(`❌ callGAS [${action}] timeout after ${CONFIG.REQUEST_TIMEOUT}ms`);
      cleanup();
      
      if (retries > 0) {
        console.log(`🔄 إعادة محاولة [${action}]... (${retries} متبقية)`);
        setTimeout(() => {
          callGAS(action, params, retries - 1).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(new Error('انتهى وقت الاتصال'));
      }
    }, CONFIG.REQUEST_TIMEOUT);
    
    // ✅ إنشاء script
    script = document.createElement('script');
    script.src = url.toString();
    script.async = true;
    
    script.onerror = function() {
      if (isResolved) return;
      isResolved = true;
      console.error(`❌ callGAS [${action}] script load error`);
      cleanup();
      
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
  });
}

// ============================================================
// 5️⃣ getDefaultPermissionsForType - الصلاحيات الافتراضية
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
// 6️⃣ checkUserPermission - التحقق من صلاحية
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
    
    return false;
  } catch(e) {
    console.warn('⚠️ checkUserPermission error:', e);
    return false;
  }
}

// ============================================================
// 7️⃣ getCenterNameById
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
// 8️⃣ دوال مساعدة للتواريخ والأرقام
// ============================================================

function formatDateToDDMMMYYYY(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${months[d.getMonth()]}/${d.getFullYear()}`;
}

function isoToDDMMMYYYY(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthIndex = parseInt(parts[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return isoDate;
  return `${parts[2].padStart(2, '0')}/${months[monthIndex]}/${parts[0]}`;
}

function ddmmyyyyToISO(dateStr) {
  if (!dateStr) return '';
  const monthsMap = {
    Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
    Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'
  };
  const match = String(dateStr).match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (!match) return dateStr;
  const day = match[1].padStart(2, '0');
  const month = monthsMap[match[2]] || '01';
  const year = match[3];
  return `${year}-${month}-${day}`;
}

function formatPhoneNumber(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/^=/, '').trim();
  if (p.startsWith('00')) p = '+' + p.substring(2);
  else if (p.startsWith('0')) p = '+20' + p.substring(1);
  else if (!p.startsWith('+') && p.length >= 10) p = '+' + p;
  return p;
}

// ============================================================
// 9️⃣ تصدير الوظائف للنطاق العام
// ============================================================
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.callGAS = callGAS;
  window.clearGASClientCache = clearGASClientCache;
  window.showGASClientCacheStatus = showGASClientCacheStatus;
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
  console.log('🚀 Client Cache: مُفعّل (5 دقائق، ' + CACHEABLE_ACTIONS.length + ' أكشن)');
  console.log('⚡ Parallel Execution: مُفعّل (بدون Queue)');
}
