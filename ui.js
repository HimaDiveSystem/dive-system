// ============================================================
// UI.js - نظام موحد للواجهات والتأكيدات
// ============================================================

// ═══════════════════════════════════════════════════════════
// 1️⃣ نظام المودال الموحد
// ═══════════════════════════════════════════════════════════

let activeModal = null;
let modalZIndex = 100000;

function createModalBase() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: ${modalZIndex++};
    direction: rtl;
    font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;
  return modal;
}

// ✅ رسالة تأكيد (نعم / لا)
function showConfirmDialog(message, onConfirm, onCancel = null) {
  const modal = createModalBase();
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 20px; max-width: 380px; width: 90%; padding: 28px 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.25); animation: modalFadeIn 0.25s ease-out;">
      <div style="font-size: 56px; margin-bottom: 16px;">❓</div>
      <div style="font-size: 17px; font-weight: 700; color: #1e2b4f; margin-bottom: 24px; line-height: 1.5;">${escapeHtml(message)}</div>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="confirmYes" class="ui-btn ui-btn-success" style="background: #27ae60; color: white; border: none; padding: 10px 28px; border-radius: 40px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s;">نعم</button>
        <button id="confirmNo" class="ui-btn ui-btn-danger" style="background: #e74c3c; color: white; border: none; padding: 10px 28px; border-radius: 40px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s;">لا</button>
      </div>
    </div>
    <style>
      @keyframes modalFadeIn {
        from { opacity: 0; transform: scale(0.95) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .ui-btn:hover { transform: translateY(-2px); opacity: 0.9; }
    </style>
  `;
  
  document.body.appendChild(modal);
  activeModal = modal;
  
  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');
  
  const cleanup = () => {
    if (modal && modal.remove) modal.remove();
    activeModal = null;
  };
  
  yesBtn.onclick = () => {
    cleanup();
    if (onConfirm) onConfirm();
  };
  
  noBtn.onclick = () => {
    cleanup();
    if (onCancel) onCancel();
  };
  
  return modal;
}

// ✅ رسالة تنبيه (موافق فقط)
function showAlertDialog(message, icon = 'ℹ️', onOk = null) {
  const modal = createModalBase();
  
  const iconMap = {
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️',
    'question': '❓'
  };
  
  const displayIcon = iconMap[icon] || icon;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 20px; max-width: 360px; width: 90%; padding: 28px 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.25); animation: modalFadeIn 0.25s ease-out;">
      <div style="font-size: 56px; margin-bottom: 16px;">${displayIcon}</div>
      <div style="font-size: 16px; font-weight: 600; color: #1e2b4f; margin-bottom: 24px; line-height: 1.5;">${escapeHtml(message)}</div>
      <button id="alertOk" class="ui-btn ui-btn-primary" style="background: #1e2b4f; color: #f5c842; border: none; padding: 10px 32px; border-radius: 40px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s;">موافق</button>
    </div>
    <style>
      @keyframes modalFadeIn {
        from { opacity: 0; transform: scale(0.95) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .ui-btn-primary:hover { transform: translateY(-2px); background: #2a4f8c; }
    </style>
  `;
  
  document.body.appendChild(modal);
  activeModal = modal;
  
  const okBtn = document.getElementById('alertOk');
  okBtn.onclick = () => {
    modal.remove();
    activeModal = null;
    if (onOk) onOk();
  };
  
  return modal;
}

// ✅ رسالة تأكيد الخروج (موحدة)
function showLogoutConfirm() {
  showConfirmDialog(
    '⚠️ تحذير: سيتم تسجيل خروجك من النظام.\nهل أنت متأكد؟',
    () => {
      // مسح جميع البيانات
      localStorage.removeItem('currentUser');
      sessionStorage.clear();
      window.location.href = 'index.html';
    }
  );
}

// ✅ رسالة تأكيد العودة للصفحة السابقة
function showBackConfirm() {
  showConfirmDialog(
    'هل تريد العودة إلى الصفحة السابقة؟',
    () => {
      window.history.back();
    }
  );
}

// ✅ دالة إغلاق جميع المودالات المفتوحة
function closeAllModals() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
  // إزالة أي مودال عائم آخر
  document.querySelectorAll('.modal-floating').forEach(m => m.remove());
}

// ═══════════════════════════════════════════════════════════
// 2️⃣ نظام الثيم الموحد (Theme System)
// ═══════════════════════════════════════════════════════════

const Theme = {
  // الألوان الأساسية
  colors: {
    primary: '#1e2b4f',      // الأزرق الداكن
    secondary: '#f5c842',    // الذهبي
    success: '#27ae60',      // الأخضر
    danger: '#e74c3c',       // الأحمر
    warning: '#f39c12',      // البرتقالي
    info: '#3498db',         // الأزرق الفاتح
    dark: '#152238',         // داكن جداً
    light: '#f0f4f8',        // فاتح
    white: '#ffffff',
    text: '#1a2540',
    textLight: '#5a6a8a'
  },
  
  // الظلال
  shadows: {
    sm: '0 2px 8px rgba(15,31,61,0.08)',
    md: '0 4px 16px rgba(15,31,61,0.12)',
    lg: '0 8px 24px rgba(15,31,61,0.15)',
    xl: '0 16px 40px rgba(15,31,61,0.2)'
  },
  
  // الحواف
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px'
  },
  
  // التدرجات (Gradients)
  gradients: {
    primary: 'linear-gradient(135deg, #1e2b4f 0%, #152238 100%)',
    secondary: 'linear-gradient(135deg, #f5c842 0%, #e6b800 100%)',
    success: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
    danger: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    info: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
  },
  
  // الخطوط
  fonts: {
    primary: "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    code: "'Courier New', monospace"
  },
  
  // إضافة الثيم إلى الصفحة (CSS Variables)
  applyToPage: function() {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --color-primary: ${this.colors.primary};
        --color-secondary: ${this.colors.secondary};
        --color-success: ${this.colors.success};
        --color-danger: ${this.colors.danger};
        --color-warning: ${this.colors.warning};
        --color-info: ${this.colors.info};
        --color-dark: ${this.colors.dark};
        --color-light: ${this.colors.light};
        --color-white: ${this.colors.white};
        --color-text: ${this.colors.text};
        --color-text-light: ${this.colors.textLight};
        
        --shadow-sm: ${this.shadows.sm};
        --shadow-md: ${this.shadows.md};
        --shadow-lg: ${this.shadows.lg};
        --shadow-xl: ${this.shadows.xl};
        
        --radius-sm: ${this.radius.sm};
        --radius-md: ${this.radius.md};
        --radius-lg: ${this.radius.lg};
        --radius-xl: ${this.radius.xl};
        --radius-full: ${this.radius.full};
        
        --gradient-primary: ${this.gradients.primary};
        --gradient-secondary: ${this.gradients.secondary};
        --gradient-success: ${this.gradients.success};
        --gradient-danger: ${this.gradients.danger};
        --gradient-info: ${this.gradients.info};
        
        --font-primary: ${this.fonts.primary};
      }
      
      /* أنماط عامة موحدة */
      body {
        font-family: var(--font-primary);
        background: var(--color-light);
        color: var(--color-text);
      }
      
      /* أزرار موحدة */
      .btn {
        padding: 10px 22px;
        border: none;
        border-radius: var(--radius-full);
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: var(--font-primary);
      }
      
      .btn-primary {
        background: var(--gradient-primary);
        color: var(--color-secondary);
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      
      .btn-success {
        background: var(--gradient-success);
        color: white;
      }
      
      .btn-danger {
        background: var(--gradient-danger);
        color: white;
      }
      
      .btn-secondary {
        background: var(--color-light);
        color: var(--color-primary);
        border: 1px solid var(--color-border);
      }
      
      /* البطاقات الموحدة */
      .card {
        background: var(--color-white);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        border: 1px solid #e9f0fa;
        overflow: hidden;
      }
      
      .card-header {
        background: var(--gradient-primary);
        color: var(--color-secondary);
        padding: 15px 20px;
        font-weight: 700;
      }
      
      .card-body {
        padding: 20px;
      }
      
      /* الحقول الموحدة */
      .form-control {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e9f0fa;
        border-radius: var(--radius-md);
        font-size: 13px;
        font-family: var(--font-primary);
        transition: all 0.2s;
      }
      
      .form-control:focus {
        outline: none;
        border-color: var(--color-secondary);
        box-shadow: 0 0 0 3px rgba(245,200,66,0.2);
      }
      
      /* الجداول الموحدة */
      .data-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .data-table th {
        background: var(--gradient-primary);
        color: var(--color-secondary);
        padding: 12px;
        text-align: right;
        font-weight: 700;
        font-size: 13px;
      }
      
      .data-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #e9f0fa;
        font-size: 12px;
      }
      
      .data-table tr:hover td {
        background: #f5f9ff;
      }
    `;
    document.head.appendChild(style);
  },
  
  // إضافة لوجو البرنامج إلى شريط العنوان
  setFavicon: function(iconUrl) {
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = iconUrl;
    document.head.appendChild(link);
  },
  
  // إضافة عنوان البرنامج الموحد
  setPageTitle: function(pageName) {
    document.title = `🌊 Dive System | ${pageName}`;
  }
};

// ═══════════════════════════════════════════════════════════
// 3️⃣ دوال مساعدة
// ═══════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════
// 4️⃣ تصدير الدوال للاستخدام العام
// ═══════════════════════════════════════════════════════════

window.showConfirmDialog = showConfirmDialog;
window.showAlertDialog = showAlertDialog;
window.showLogoutConfirm = showLogoutConfirm;
window.showBackConfirm = showBackConfirm;
window.closeAllModals = closeAllModals;
window.Theme = Theme;
