// auth.js
const Auth = {
  getUser() {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return null;
    try {
      const data = JSON.parse(stored);
      if (data.expiry && Date.now() < data.expiry) {
        return data.user;
      }
    } catch(e) {}
    return null;
  },

  isLoggedIn() {
    return this.getUser() !== null;
  },

  logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  }
};
