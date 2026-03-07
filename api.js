const API = {
  
  // ── GET Request ──
  async get(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.append('action', action);
    Object.entries(params).forEach(([k, v]) => 
      url.searchParams.append(k, v)
    );
    const res = await fetch(url.toString());
    return await res.json();
  },

  // ── POST Request ──
  async post(action, data = {}) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...data })
    });
    return await res.json();
  },

  // ══════════════════════════════
  // 🔐 Authentication
  // ══════════════════════════════
  login: (email, password) => 
    API.get('login', { email, password }),

  // ══════════════════════════════
  // 🏢 Centers
  // ══════════════════════════════
  getAllCenters:      ()       => API.get('getAllCentersData'),
  getCentersCount:    ()       => API.get('getCentersCount'),
  addCenter:          (data)   => API.post('addNewCenter', data),
  updateCenter:       (data)   => API.post('updateCenter', data),
  deleteCenter:       (id)     => API.post('deleteCenter', { centerId: id }),
  toggleCenter:       (id)     => API.post('toggleCenterStatus', { centerId: id }),

  // ══════════════════════════════
  // 🌿 Branches
  // ══════════════════════════════
  getAllBranches:      ()       => API.get('getAllBranchesData'),
  getBranchesByCenter:(id)     => API.get('getBranchesByCenter', { centerId: id }),
  getActiveBranches:  ()       => API.get('getActiveBranches'),
  addBranch:          (data)   => API.post('addNewBranch', data),
  updateBranch:       (data)   => API.post('updateBranch', data),
  deleteBranch:       (id)     => API.post('deleteBranch', { branchId: id }),
  toggleBranch:       (id)     => API.post('toggleBranchStatus', { branchId: id }),

  // ══════════════════════════════
  // 👥 Users
  // ══════════════════════════════
  getAllUsers:         ()       => API.get('getAllUsersData'),
  getUsersCount:       ()       => API.get('getUsersCount'),
  getStaffByCenter:   (id)     => API.get('getStaffByCenter', { centerId: id }),
  addUser:             (data)   => API.post('addNewUser', data),
  updateUser:          (data)   => API.post('updateUser', data),
  deleteUser:          (id)     => API.post('deleteUser', { userId: id }),

  // ══════════════════════════════
  // 💱 Exchange Rates
  // ══════════════════════════════
  getAllExchangeRates: ()       => API.get('getAllExchangeRates'),
  checkRateStatus:    ()       => API.get('checkExchangeRateStatus'),
  getLastRateDate:    ()       => API.get('getLastExchangeDate'),
  getExchangeRate:    (date)   => API.get('getExchangeRate', { dateStr: date }),
  saveExchangeRates:  (data)   => API.post('saveExchangeRates', data),

  // ══════════════════════════════
  // 🚤 Trips
  // ══════════════════════════════
  getAllTrips:         ()       => API.get('getAllTrips'),
  getUniqueTrips:     ()       => API.get('getUniqueTrips'),
  getAllCategories:   ()       => API.get('getAllCategories'),
  getTripsSummary:    ()       => API.get('getAllTripsSummary'),
  getTripDefinition:  (name)   => API.get('getTripDefinition', { tripName: name }),
  getTripPrices:      (name, currency, category) => 
    API.get('getTripPrices', { tripName: name, currency, category }),
  saveTripDef:        (data)   => API.post('saveTripDefinition', data),
  saveTripPrices:     (data)   => API.post('saveTripPrices', data),
  updateTrip:         (data)   => API.post('updateTrip', data),
  deleteTrip:         (name)   => API.post('deleteTrip', { tripName: name }),

  // ══════════════════════════════
  // 🧾 Invoices
  // ══════════════════════════════
  getAllInvoices:      ()       => API.get('getAllInvoices'),
  generateVoucher:    ()       => API.get('generateVoucherNumber'),
  searchCustomer:     (phone)  => API.get('searchCustomerByPhone', { phone }),
  saveInvoice:        (data)   => API.post('saveInvoice', data),
  saveSignature:      (voucherNo, sig) => 
    API.post('saveSignature', { voucherNo, sig }),
  generatePDF:        (ids)    => API.post('generatePDFFromIds', { ids }),
  shareWhatsApp:      (id, phone) => 
    API.post('shareWhatsApp', { invoiceId: id, phoneNumber: phone }),

  // ══════════════════════════════
  // 📋 Misc
  // ══════════════════════════════
  getNationalities:   ()       => API.get('getNationalities'),
  getHotels:          ()       => API.get('getHotels'),
  getAllActivities:   ()       => API.get('getAllActivities'),
};
