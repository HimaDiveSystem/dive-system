// login.js — يُحمَّل مرة واحدة فقط من index.html
(function() {
  // تجنب التشغيل المزدوج
  if (window.__loginLoaded) return;
  window.__loginLoaded = true;

  const _GAS = 'https://script.google.com/macros/s/AKfycbxy3i2tiKsZpTkFj0gljt0_LuXFzdOlZAU10AtIrVFdAi_n3gcQjvMxLKpWiV0EHPI2/exec';

  // إظهار/إخفاء كلمة المرور
  const showPassEl = document.getElementById('showPass');
  if (showPassEl) {
    showPassEl.addEventListener('change', function() {
      const p = document.getElementById('password');
      if (p) p.type = this.checked ? 'text' : 'password';
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') window.login && window.login();
  });

  function showAlert(msg) {
    const el = document.getElementById('alertMessage');
    const modal = document.getElementById('customAlertModal');
    if (el) el.innerText = msg;
    if (modal) modal.style.display = 'flex';
    const okBtn = document.getElementById('alertOk') || modal?.querySelector('button');
    if (okBtn) okBtn.onclick = () => { if(modal) modal.style.display = 'none'; };
  }

  function setLoading(on) {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = on ? 'flex' : 'none';
  }

  function navigateTo(page) {
    window.parent.postMessage({ type: 'navigate', page: page }, '*');
    // إذا كان هذا الملف هو الـ top (يُحمَّل مباشرة بدون iframe parent)
    window.postMessage({ type: 'navigate', page: page }, '*');
  }

  window.login = async function() {
    const emailEl = document.getElementById('email');
    const passEl  = document.getElementById('password');
    const btn     = document.getElementById('loginBtn');

    const email    = emailEl?.value?.trim() || '';
    const password = passEl?.value?.trim()  || '';

    if (!email || !password) return showAlert('يرجى إدخال البريد الإلكتروني وكلمة المرور');

    if (btn) btn.disabled = true;
    setLoading(true);

    try {
      const url = _GAS + '?action=login'
                       + '&email='    + encodeURIComponent(email)
                       + '&password=' + encodeURIComponent(password);
      const res = await fetch(url);
      const r   = await res.json();

      if (r && r.success) {
        try { sessionStorage.setItem('currentUser', JSON.stringify(r.user)); } catch(e) {}
        // أرسل postMessage لـ index.html للتنقل
        window.parent.postMessage({ type: 'navigate', page: r.dashboardPage || 'Dashboard' }, '*');
        // إذا كان في نفس الصفحة
        if (window.__navigateTo) window.__navigateTo(r.dashboardPage || 'Dashboard');
      } else {
        showAlert(r?.message || 'بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('خطأ في الاتصال بالخادم.\nتأكد من اتصال الإنترنت وحاول مجدداً.');
    } finally {
      if (btn) btn.disabled = false;
      setLoading(false);
    }
  };

})();
