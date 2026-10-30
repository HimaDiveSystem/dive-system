/**
 * GuidedPayments.js
 * واجهة المودالات الموجّهة لتسجيل المدفوعات (منفذين، موظفين، رحلات)
 */

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    
    // ─── 1. حقن الـ CSS (تم تصغير الأحجام لمنع التمرير) ───
    const style = document.createElement('style');
    style.innerHTML = `
      .gp-overlay {
        position: fixed; inset: 0; background: rgba(10,20,35,.6);
        display: none; align-items: center; justify-content: center;
        z-index: 99999; backdrop-filter: blur(3px);
      }
      .gp-overlay.open { display: flex; }
      .gp-modal {
        background: #fff; width: 95%; max-width: 600px; border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,.3); overflow: hidden;
        animation: gp-pop .2s ease; display: flex; flex-direction: column;
      }
      @keyframes gp-pop { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .gp-header {
        background: linear-gradient(135deg, #0f1f3d, #1a3260);
        padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;
      }
      .gp-title { color: #f5c842; font-size: 15px; font-weight: 800; margin: 0; font-family: 'Cairo', sans-serif; }
      .gp-close { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; opacity: .7; transition: .2s; }
      .gp-close:hover { opacity: 1; }
      .gp-body { padding: 16px; max-height: 75vh; overflow-y: auto; font-family: 'Cairo', sans-serif; }
      
      .gp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
      .gp-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
      .gp-field { display: flex; flex-direction: column; gap: 4px; }
      .gp-field label { font-size: 11.5px; font-weight: 700; color: #5a6a8a; }
      .gp-field input, .gp-field select {
        padding: 8px 10px; border: 1.5px solid #dde4f0; border-radius: 6px;
        font-size: 13px; font-family: 'Cairo', sans-serif; background: #fafbfd;
        height: 36px; width: 100%; outline: none; transition: .2s;
      }
      .gp-field input:focus, .gp-field select:focus { border-color: #2563eb; background: #fff; }
      .gp-field input[readonly] { background: #f0f4f8; color: #64748b; cursor: not-allowed; }
      
      .gp-section-title { font-size: 12px; font-weight: 800; color: #0f1f3d; margin: 12px 0 8px; border-bottom: 1.5px solid #f0f4f8; padding-bottom: 4px; }
      
      /* ✅ تصغير حقول المبالغ */
      .gp-currency-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
      .gp-cur-field { display: flex; flex-direction: column; gap: 2px; }
      .gp-cur-field label { font-size: 10px; font-weight: 800; color: #64748b; text-align: center; }
      .gp-cur-field input {
        padding: 6px; border: 1.5px solid #dde4f0; border-radius: 6px;
        font-size: 13px; text-align: center; font-weight: 700; color: #0f1f3d;
        background: #fff; outline: none; height: 34px;
      }
      .gp-cur-field input:focus { border-color: #159895; box-shadow: 0 0 0 2px rgba(21,152,149,0.1); }
      
      .gp-footer { padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; }
      .gp-btn { padding: 8px 20px; border-radius: 30px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: 'Cairo', sans-serif; transition: .2s; border: none; }
      .gp-btn-cancel { background: #e2e8f0; color: #475569; }
      .gp-btn-cancel:hover { background: #cbd5e1; }
      .gp-btn-save { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 4px 10px rgba(22,163,74,.3); }
      .gp-btn-save:hover { transform: translateY(-2px); filter: brightness(1.05); }
      .gp-btn-save:disabled { opacity: .6; cursor: not-allowed; transform: none; }
      
      .gp-loader { text-align: center; padding: 20px; color: #64748b; font-size: 13px; }
      .gp-spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: gp-spin .8s linear infinite; margin: 0 auto 10px; }
      @keyframes gp-spin { to { transform: rotate(360deg); } }

      @media(max-width: 500px) {
        .gp-grid { grid-template-columns: 1fr; }
        .gp-grid-3 { grid-template-columns: 1fr; }
        .gp-currency-grid { grid-template-columns: repeat(2, 1fr); }
      }
    `;
    document.head.appendChild(style);

    // ─── 2. حقن الـ HTML ───
    const modalHTML = `
      <div class="gp-overlay" id="gpModalOverlay">
        <div class="gp-modal">
          <div class="gp-header">
            <h3 class="gp-title" id="gpModalTitle">دفعة جديدة</h3>
            <button class="gp-close" onclick="GuidedPayments.close()">&times;</button>
          </div>
          <div class="gp-body">
            <div id="gpModalContent"></div>
          </div>
          <div class="gp-footer">
            <button class="gp-btn gp-btn-cancel" onclick="GuidedPayments.close()">إلغاء</button>
            <button class="gp-btn gp-btn-save" id="gpSaveBtn" onclick="GuidedPayments.save()">💾 حفظ</button>
          </div>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div.firstElementChild);

    // ─── 3. الكود البرمجي ───
    const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentYear = new Date().getFullYear();
    const currentMonth = MN[new Date().getMonth()];

    window.GuidedPayments = {
      open: function(type, prefillAccount = '', centerName = '') {
        if (!centerName) {
          if (window.currentUser && window.currentUser.centerName) {
            centerName = window.currentUser.centerName;
          } else {
            try {
              const stored = localStorage.getItem('currentUser');
              if (stored) {
                const parsed = JSON.parse(stored);
                centerName = parsed.user ? parsed.user.centerName : parsed.centerName;
              }
            } catch(e) {}
          }
        }

        if (!centerName) {
          alert('⚠️ لم يتم العثور على اسم المركز. تأكد من تسجيل الدخول.');
          return;
        }

        window._gpCenterName = centerName;

        const overlay = document.getElementById('gpModalOverlay');
        const title = document.getElementById('gpModalTitle');
        const content = document.getElementById('gpModalContent');
        
        if (type === 'supplier') title.textContent = '💸 تسجيل دفعة لمنفذ';
        else if (type === 'employee') title.textContent = '👤 تسجيل دفعة لموظف';
        else if (type === 'trip') title.textContent = '🏝️ تسجيل مصروف رحلة';

        overlay.classList.add('open');
        content.innerHTML = `<div class="gp-loader"><div class="gp-spinner"></div>جاري تحميل البيانات...</div>`;

        GuidedPayments.fetchOptions(type).then(res => {
          if (!res.success) {
            content.innerHTML = `<div style="color:#dc2626; text-align:center; padding:20px;">❌ ${res.message}</div>`;
            return;
          }

          content.innerHTML = `
            <div class="gp-grid">
              <div class="gp-field">
                <label>📋 التفاصيل *</label>
                <select id="gpDetails">
                  ${res.detailsOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
              </div>
              
              <div class="gp-field" style="position: relative;">
                <label>🏦 الحساب (${type === 'supplier' ? 'المنفذ' : type === 'employee' ? 'الموظف' : 'الرحلة'}) *</label>
                <input type="text" id="gpAccountInput" placeholder="اكتب للبحث أو اختر..." autocomplete="off" style="padding-left: 30px;">
                <span style="position: absolute; left: 10px; top: 33px; color: #a8b4c8; pointer-events: none; font-size: 12px;">▾</span>
                
                <div id="gpAccountDropdown" style="display: none; position: absolute; top: 58px; left: 0; right: 0; background: #fff; border: 1.5px solid #2563eb; border-radius: 6px; max-height: 180px; overflow-y: auto; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  ${res.accounts.map(acc => `<div class="gp-acc-option" style="padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #f0f4f8; font-size: 13px;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='#fff'" onclick="document.getElementById('gpAccountInput').value='${acc.replace(/'/g, "\\'")}'; document.getElementById('gpAccountDropdown').style.display='none';">${acc}</div>`).join('')}
                  ${res.accounts.length === 0 ? '<div style="padding: 10px; text-align: center; color: #94a3b8; font-size: 12px;">لا توجد خيارات</div>' : ''}
                </div>
              </div>
            </div>

            <div class="gp-grid-3">
              <div class="gp-field">
                <label>🏷️ النوع (مقفل)</label>
                <input type="text" id="gpAccountType" value="${res.defaultAccountType}" readonly>
              </div>
              <div class="gp-field">
                <label>📆 الشهر *</label>
                <select id="gpMonth">
                  ${MN.map(m => `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>
              <div class="gp-field">
                <label>📅 السنة *</label>
                <input type="number" id="gpYear" value="${currentYear}">
              </div>
            </div>

            <div class="gp-grid" style="grid-template-columns: 1fr 1fr;">
              <div class="gp-field">
                <label>📅 تاريخ الدفع *</label>
                <input type="date" id="gpDate">
              </div>
              <div class="gp-field">
                <label>⏰ تاريخ الاستحقاق</label>
                <input type="date" id="gpDueDate">
              </div>
            </div>

            <div class="gp-section-title">💵 المبالغ المدفوعة (نقدي)</div>
            <div class="gp-currency-grid">
              <div class="gp-cur-field"><label>$ دولار</label><input type="number" id="gpCashUSD" min="0" step="0.01" placeholder="0"></div>
              <div class="gp-cur-field"><label>€ يورو</label><input type="number" id="gpCashEUR" min="0" step="0.01" placeholder="0"></div>
              <div class="gp-cur-field"><label>£ إسترليني</label><input type="number" id="gpCashGBP" min="0" step="0.01" placeholder="0"></div>
              <div class="gp-cur-field"><label>LE جنيه</label><input type="number" id="gpCashLE" min="0" step="0.01" placeholder="0"></div>
            </div>

            <div class="gp-section-title">💳 المبالغ المدفوعة (فيزا / تحويل)</div>
            <div class="gp-currency-grid">
              <div class="gp-cur-field"><label>V$ دولار</label><input type="number" id="gpVisaUSD" min="0" step="0.01" placeholder="0"></div>
              <div class="gp-cur-field"><label>V€ يورو</label><input type="number" id="gpVisaEUR" min="0" step="0.01" placeholder="0"></div>
              <div class="gp-cur-field"><label>V£ إسترليني</label><input type="number" id="gpVisaGBP" min="0" step="0.01" placeholder="0"></div>
              <div class="gp-cur-field"><label>VLE جنيه</label><input type="number" id="gpVisaLE" min="0" step="0.01" placeholder="0"></div>
            </div>
          `;

          const today = new Date().toISOString().split('T')[0];
          document.getElementById('gpDate').value = today;

          const accInput = document.getElementById('gpAccountInput');
          const accDrop = document.getElementById('gpAccountDropdown');
          const allOptions = Array.from(accDrop.querySelectorAll('.gp-acc-option'));

          accInput.addEventListener('input', function() {
            const val = this.value.toLowerCase();
            accDrop.style.display = 'block';
            allOptions.forEach(opt => {
              opt.style.display = opt.innerText.toLowerCase().includes(val) ? 'block' : 'none';
            });
          });

          accInput.addEventListener('focus', function() {
            accDrop.style.display = 'block';
            allOptions.forEach(opt => opt.style.display = 'block');
          });

          document.addEventListener('click', function(e) {
            if (!e.target.closest('.gp-field')) accDrop.style.display = 'none';
          });
        });
      },

      fetchOptions: function(type) {
        return new Promise((resolve) => {
          const centerName = window._gpCenterName || '';
          const cb = 'gp_cb_' + Date.now();
          const url = new URL(window.CONFIG.GAS_URL);
          url.searchParams.set('action', 'getGuidedPaymentOptions');
          url.searchParams.set('type', type);
          url.searchParams.set('centerName', centerName);
          url.searchParams.set('callback', cb);

          window[cb] = function(data) { delete window[cb]; resolve(data); };

          const script = document.createElement('script');
          script.src = url.toString();
          script.onerror = () => { delete window[cb]; resolve({ success: false, message: 'فشل الاتصال' }); };
          document.body.appendChild(script);
        });
      },

            save: function() {
        const btn = document.getElementById('gpSaveBtn');
        const account = document.getElementById('gpAccountInput').value.trim();
        
        if (!account) { alert('⚠️ يرجى اختيار الحساب أولاً'); return; }

        const cU = parseFloat(document.getElementById('gpCashUSD').value) || 0;
        const cE = parseFloat(document.getElementById('gpCashEUR').value) || 0;
        const cG = parseFloat(document.getElementById('gpCashGBP').value) || 0;
        const cL = parseFloat(document.getElementById('gpCashLE').value) || 0;
        const vU = parseFloat(document.getElementById('gpVisaUSD').value) || 0;
        const vE = parseFloat(document.getElementById('gpVisaEUR').value) || 0;
        const vG = parseFloat(document.getElementById('gpVisaGBP').value) || 0;
        const vL = parseFloat(document.getElementById('gpVisaLE').value) || 0;

        const hasAmount = (cU + cE + cG + cL + vU + vE + vG + vL) > 0;
        if (!hasAmount) { alert('⚠️ يرجى إدخال مبلغ واحد على الأقل'); return; }

        const isoToDD = (iso) => {
          if (!iso) return '';
          const parts = iso.split('-');
          if (parts.length !== 3) return iso;
          return `${parts[2].padStart(2,'0')}/${MN[parseInt(parts[1]) - 1]}/${parts[0]}`;
        };

        // ✅ التعديل الجديد: جلب بيانات المستخدم من الجلسة
        let userID = '';
        let userName = '';
        let userBranch = '';
        
        if (window.currentUser) {
          userID = window.currentUser.id || '';
          userName = window.currentUser.name || '';
          userBranch = window.currentUser.branchName || '';
        } else {
          try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
              const parsed = JSON.parse(stored);
              const u = parsed.user || parsed;
              userID = u.id || '';
              userName = u.name || '';
              userBranch = u.branchName || '';
            }
          } catch(e) {}
        }

        // ✅ التصحيح: إرسال branchName و userName بدلاً من القيم الفارغة
        const payload = {
          action: 'saveExpRev',
          sheet: 'Expenses',
          isEdit: '0',
          rowNum: 0,
          date: isoToDD(document.getElementById('gpDate').value),
          details: document.getElementById('gpDetails').value,
          account: account,
          accountType: document.getElementById('gpAccountType').value,
          month: document.getElementById('gpMonth').value,
          year: document.getElementById('gpYear').value,
          centerName: window._gpCenterName || '',
          branchName: userBranch,        // ✅ تم التعديل
          userID: userID,                // ✅ تم التعديل
          userName: userName,            // ✅ تم التعديل
          dueDate: isoToDD(document.getElementById('gpDueDate').value),
          usd: cU, eur: cE, gbp: cG, le: cL,
          vUSD: vU, vEUR: vE, vGBP: vG, vLE: vL
        };
        
        btn.disabled = true;
        btn.textContent = '⏳ جاري الحفظ...';

        const cb = 'gp_save_' + Date.now();
        const url = new URL(window.CONFIG.GAS_URL);
        Object.entries(payload).forEach(([k, v]) => { url.searchParams.set(k, String(v ?? '')); });
        url.searchParams.set('callback', cb);

        window[cb] = function(res) {
          delete window[cb];
          btn.disabled = false;
          btn.textContent = '💾 حفظ';

          if (res && res.success) {
            GuidedPayments.close();
            alert('✅ تم تسجيل الدفعة بنجاح');
            if (typeof window.loadListForDate === 'function') {
              const iso = document.getElementById('fDateInput')?.value || new Date().toISOString().split('T')[0];
              window.loadListForDate(iso);
            }
          } else {
            alert('❌ فشل الحفظ: ' + (res.message || 'خطأ غير معروف'));
          }
        };

        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = () => {
          delete window[cb]; btn.disabled = false; btn.textContent = '💾 حفظ'; alert('❌ فشل الاتصال بالخادم');
        };
        document.body.appendChild(script);
      },
      close: function() {
        document.getElementById('gpModalOverlay').classList.remove('open');
      }
    };
  });
})();
