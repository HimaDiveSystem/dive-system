// ============================================================
// ui.js - نظام الواجهات والتأكيدات الموحد
// ============================================================
// ⚠️ هذا الملف مستقل ولا يعتمد على config.js أو session.js
// يمكن تحميله في أي صفحة
// ============================================================

(function() {
  'use strict';
  
  // ✅ منع التحميل المزدوج
  if (window._uiLoaded) {
    console.warn('⚠️ ui.js محمّل مسبقاً، تجاهل...');
    return;
  }
  window._uiLoaded = true;
  
  // ============================================================
  // 1️⃣ المتغيرات العالمية
  // ============================================================
  let activeModal = null;
  let modalZIndex = 100000;
  
  // ============================================================
  // 2️⃣ دالة مساعدة: escapeHtml
  // ============================================================
  /**
   * تحويل النص إلى HTML آمن
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  // ============================================================
  // 3️⃣ إنشاء قاعدة المودال
  // ============================================================
  function createModalBase() {
    const modal = document.createElement('div');
    modal.className = 'ui-modal-base';
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
      animation: uiModalFadeIn 0.2s ease-out;
    `;
    
    // ✅ إغلاق عند النقر على الخلفية
    modal.addEventListener('click', (e) => {
      if (e.target === modal && modal._closeOnBackdrop) {
        closeAllModals();
      }
    });
    
    return modal;
  }
  
  // ============================================================
  // 4️⃣ رسالة تأكيد (نعم / لا)
  // ============================================================
  /**
   * @param {string} message - الرسالة
   * @param {Function} onConfirm - عند الموافقة
   * @param {Function} onCancel - عند الإلغاء (اختياري)
   * @returns {HTMLElement}
   */
  function showConfirmDialog(message, onConfirm, onCancel = null) {
    const modal = createModalBase();
    modal._closeOnBackdrop = true;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 20px;
        max-width: 400px;
        width: 90%;
        padding: 28px 24px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        animation: uiModalScaleIn 0.25s ease-out;
        direction: rtl;
      ">
        <div style="font-size: 56px; margin-bottom: 16px; line-height: 1;">❓</div>
        <div style="
          font-size: 16px;
          font-weight: 700;
          color: #1e2b4f;
          margin-bottom: 24px;
          line-height: 1.6;
          white-space: pre-wrap;
        ">${escapeHtml(message)}</div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="uiConfirmYes" style="
            background: #27ae60;
            color: white;
            border: none;
            padding: 11px 32px;
            border-radius: 40px;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s;
            min-width: 100px;
          ">نعم</button>
          <button id="uiConfirmNo" style="
            background: #e74c3c;
            color: white;
            border: none;
            padding: 11px 32px;
            border-radius: 40px;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s;
            min-width: 100px;
          ">لا</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    activeModal = modal;
    
    // ✅ إضافة الأنماط مرة واحدة
    ensureUiStyles();
    
    const yesBtn = modal.querySelector('#uiConfirmYes');
    const noBtn = modal.querySelector('#uiConfirmNo');
    
    // ✅ تأثيرات hover
    yesBtn.addEventListener('mouseenter', () => yesBtn.style.transform = 'translateY(-2px)');
    yesBtn.addEventListener('mouseleave', () => yesBtn.style.transform = 'translateY(0)');
    noBtn.addEventListener('mouseenter', () => noBtn.style.transform = 'translateY(-2px)');
    noBtn.addEventListener('mouseleave', () => noBtn.style.transform = 'translateY(0)');
    
    const cleanup = () => {
      if (modal && modal.remove) modal.remove();
      if (activeModal === modal) activeModal = null;
    };
    
    yesBtn.onclick = () => {
      cleanup();
      if (typeof onConfirm === 'function') onConfirm();
    };
    
    noBtn.onclick = () => {
      cleanup();
      if (typeof onCancel === 'function') onCancel();
    };
    
    // ✅ تركيز زر "نعم" للوصول السريع
    setTimeout(() => yesBtn.focus(), 50);
    
    return modal;
  }
  
  // ============================================================
  // 5️⃣ رسالة تنبيه (موافق فقط)
  // ============================================================
  /**
   * @param {string} message - الرسالة
   * @param {string} icon - أيقونة (success/error/warning/info أو emoji مباشر)
   * @param {Function} onOk - عند الموافقة (اختياري)
   * @returns {HTMLElement}
   */
  function showAlertDialog(message, icon = 'ℹ️', onOk = null) {
    const modal = createModalBase();
    modal._closeOnBackdrop = true;
    
    const iconMap = {
      'success': '✅',
      'error':   '❌',
      'warning': '⚠️',
      'info':    'ℹ️',
      'question':'❓'
    };
    
    const displayIcon = iconMap[icon] || icon || 'ℹ️';
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 20px;
        max-width: 380px;
        width: 90%;
        padding: 28px 24px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        animation: uiModalScaleIn 0.25s ease-out;
        direction: rtl;
      ">
        <div style="font-size: 56px; margin-bottom: 16px; line-height: 1;">${displayIcon}</div>
        <div style="
          font-size: 15px;
          font-weight: 600;
          color: #1e2b4f;
          margin-bottom: 24px;
          line-height: 1.6;
          white-space: pre-wrap;
        ">${escapeHtml(message)}</div>
        <button id="uiAlertOk" style="
          background: linear-gradient(135deg, #1e2b4f 0%, #152238 100%);
          color: #f5c842;
          border: none;
          padding: 11px 40px;
          border-radius: 40px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s;
          min-width: 120px;
        ">موافق</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    activeModal = modal;
    
    ensureUiStyles();
    
    const okBtn = modal.querySelector('#uiAlertOk');
    
    okBtn.addEventListener('mouseenter', () => {
      okBtn.style.transform = 'translateY(-2px)';
      okBtn.style.boxShadow = '0 8px 20px rgba(30,43,79,0.3)';
    });
    okBtn.addEventListener('mouseleave', () => {
      okBtn.style.transform = 'translateY(0)';
      okBtn.style.boxShadow = 'none';
    });
    
    okBtn.onclick = () => {
      if (modal && modal.remove) modal.remove();
      if (activeModal === modal) activeModal = null;
      if (typeof onOk === 'function') onOk();
    };
    
    setTimeout(() => okBtn.focus(), 50);
    
    return modal;
  }
  
  // ============================================================
  // 6️⃣ رسالة تأكيد الخروج
  // ============================================================
  function showLogoutConfirm() {
    showConfirmDialog(
      '⚠️ تحذير: سيتم تسجيل خروجك من النظام.\nهل أنت متأكد؟',
      () => {
        // ✅ استخدام Session إذا كان متوفراً
        if (typeof Session !== 'undefined' && Session.logout) {
          Session.logout();
        } else {
          // Fallback
          try {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userPermissions');
            sessionStorage.clear();
          } catch(e) {}
          window.location.href = 'index.html';
        }
      }
    );
  }
  
  // ============================================================
  // 7️⃣ رسالة تأكيد العودة للصفحة السابقة
  // ============================================================
  function showBackConfirm() {
    showConfirmDialog(
      'هل تريد العودة إلى الصفحة السابقة؟',
      () => {
        window.history.back();
      }
    );
  }
  
  // ============================================================
  // 8️⃣ إغلاق جميع المودالات المفتوحة
  // ============================================================
  function closeAllModals() {
    if (activeModal && activeModal.remove) {
      activeModal.remove();
      activeModal = null;
    }
    // إزالة أي مودال عائم آخر
    document.querySelectorAll('.ui-modal-base').forEach(m => m.remove());
  }
  
  // ============================================================
  // 9️⃣ إضافة أنماط CSS مرة واحدة فقط
  // ============================================================
  function ensureUiStyles() {
    if (document.getElementById('uiModalStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'uiModalStyles';
    style.textContent = `
      @keyframes uiModalFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes uiModalScaleIn {
        from { opacity: 0; transform: scale(0.95) translateY(-10px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // ============================================================
  // 🔟 Theme - نظام الثيم الموحد
  // ============================================================
  const Theme = {
    // الألوان الأساسية
    colors: {
      primary:    '#1e2b4f',  // الأزرق الداكن
      secondary:  '#f5c842',  // الذهبي
      success:    '#27ae60',  // الأخضر
      danger:     '#e74c3c',  // الأحمر
      warning:    '#f39c12',  // البرتقالي
      info:       '#3498db',  // الأزرق الفاتح
      dark:       '#152238',  // داكن جداً
      light:      '#f0f4f8',  // فاتح
      white:      '#ffffff',
      text:       '#1a2540',
      textLight:  '#5a6a8a',
      border:     '#dde4f0'
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
      sm:   '8px',
      md:   '12px',
      lg:   '16px',
      xl:   '24px',
      full: '9999px'
    },
    
    // التدرجات
    gradients: {
      primary:   'linear-gradient(135deg, #1e2b4f 0%, #152238 100%)',
      secondary: 'linear-gradient(135deg, #f5c842 0%, #e6b800 100%)',
      success:   'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
      danger:    'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      info:      'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
    },
    
    // الخطوط
    fonts: {
      primary: "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      code:    "'Courier New', monospace"
    },
    
    /**
     * إضافة CSS Variables إلى الصفحة
     */
    applyToPage() {
      if (document.getElementById('uiThemeStyles')) return;
      
      const style = document.createElement('style');
      style.id = 'uiThemeStyles';
      style.textContent = `
        :root {
          --color-primary:   ${this.colors.primary};
          --color-secondary: ${this.colors.secondary};
          --color-success:   ${this.colors.success};
          --color-danger:    ${this.colors.danger};
          --color-warning:   ${this.colors.warning};
          --color-info:      ${this.colors.info};
          --color-dark:      ${this.colors.dark};
          --color-light:     ${this.colors.light};
          --color-white:     ${this.colors.white};
          --color-text:      ${this.colors.text};
          --color-text-light:${this.colors.textLight};
          --color-border:    ${this.colors.border};
          
          --shadow-sm: ${this.shadows.sm};
          --shadow-md: ${this.shadows.md};
          --shadow-lg: ${this.shadows.lg};
          --shadow-xl: ${this.shadows.xl};
          
          --radius-sm:   ${this.radius.sm};
          --radius-md:   ${this.radius.md};
          --radius-lg:   ${this.radius.lg};
          --radius-xl:   ${this.radius.xl};
          --radius-full: ${this.radius.full};
          
          --gradient-primary:   ${this.gradients.primary};
          --gradient-secondary: ${this.gradients.secondary};
          --gradient-success:   ${this.gradients.success};
          --gradient-danger:    ${this.gradients.danger};
          --gradient-info:      ${this.gradients.info};
          
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
        
        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .btn-danger {
          background: var(--gradient-danger);
          color: white;
        }
        
        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
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
          border: 1px solid var(--color-border);
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
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 13px;
          font-family: var(--font-primary);
          transition: all 0.2s;
          background: white;
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
          border-bottom: 1px solid var(--color-border);
          font-size: 12px;
        }
        
        .data-table tr:hover td {
          background: #f5f9ff;
        }
      `;
      document.head.appendChild(style);
    },
    
    /**
     * تعيين favicon
     */
    setFavicon(iconUrl) {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.type = 'image/x-icon';
      link.href = iconUrl;
    },
    
    /**
     * تعيين عنوان الصفحة
     */
    setPageTitle(pageName) {
      document.title = `🌊 Dive System | ${pageName}`;
    }
  };
  
  // ============================================================
  // 1️⃣1️⃣ اختصارات لوحة المفاتيح للمودالات
  // ============================================================
  document.addEventListener('keydown', (e) => {
    // ESC لإغلاق المودال
    if (e.key === 'Escape' && activeModal) {
      closeAllModals();
    }
    // Enter لتأكيد أول زر في المودال
    if (e.key === 'Enter' && activeModal) {
      const firstBtn = activeModal.querySelector('button');
      if (firstBtn) firstBtn.click();
    }
  });
  
  // ============================================================
  // 1️⃣2️⃣ تصدير الدوال للنطاق العام
  // ============================================================
  window.escapeHtml = escapeHtml;
  window.showConfirmDialog = showConfirmDialog;
  window.showAlertDialog = showAlertDialog;
  window.showLogoutConfirm = showLogoutConfirm;
  window.showBackConfirm = showBackConfirm;
  window.closeAllModals = closeAllModals;
  window.Theme = Theme;
  
  // ✅ اسم بديل للتوافق مع الكود القديم
  window.escHtml = escapeHtml;
  
  console.log('✅ ui.js - تم التحميل بنجاح');
  
})();
