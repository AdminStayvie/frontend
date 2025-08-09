/**
 * @file utils.js
 * @description Berisi fungsi-fungsi utilitas yang digunakan bersama di seluruh aplikasi KPI.
 * @version 1.1.0 - Added robust date parsing
 */

// =================================================================================
// FUNGSI FORMATTING
// =================================================================================

/**
 * Memformat angka menjadi format mata uang Rupiah (IDR).
 * @param {number} amount - Jumlah yang akan diformat.
 * @returns {string} String mata uang yang diformat.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

/**
 * Memformat string tanggal atau objek Date menjadi format tanggal yang mudah dibaca.
 * @param {string|Date} dateStr - String tanggal atau objek Date.
 * @returns {string} String tanggal yang diformat (e.g., "21 Juli 2025").
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

// =================================================================================
// FUNGSI MANIPULASI TANGGAL
// =================================================================================

/**
 * [NEW] Mem-parsing string tanggal kustom (e.g., "24/07/2025 11.09") menjadi objek Date.
 * Juga menangani format ISO standar untuk data baru.
 * @param {string} dateString - String tanggal yang akan di-parse.
 * @returns {Date|null} Objek Date atau null jika format tidak valid.
 */
function parseCustomDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    // Coba parsing format ISO terlebih dahulu (untuk data baru yang disimpan aplikasi)
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime()) && dateString.includes('T')) {
        return isoDate;
    }

    // Coba parsing format kustom "dd/MM/yyyy HH.mm" atau "dd/MM/yyyy HH:mm" dari data impor
    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4}).*(\d{2})[:.](\d{2})/);
    if (parts) {
        // parts[1] = day, parts[2] = month, parts[3] = year, parts[4] = hour, parts[5] = minute
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed in JS
        const year = parseInt(parts[3], 10);
        const hour = parseInt(parts[4], 10);
        const minute = parseInt(parts[5], 10);
        const date = new Date(year, month, day, hour, minute);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    return null; // Return null jika tidak ada format yang cocok
}


/**
 * Mendapatkan tanggal awal minggu (Senin) dari tanggal yang diberikan.
 * @param {Date} [date=new Date()] - Tanggal referensi.
 * @returns {Date} Objek Date yang merupakan hari Senin dari minggu tersebut.
 */
function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Mengonversi objek Date menjadi string format YYYY-MM-DD.
 * @param {Date} date - Objek Date yang akan dikonversi.
 * @returns {string} String tanggal dengan format YYYY-MM-DD.
 */
function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Mendapatkan tanggal dan waktu saat ini dalam format lokal (id-ID).
 * @returns {string} String tanggal dan waktu yang diformat.
 */
function getDatestamp() {
    return new Date().toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\./g, ':'); // Ganti titik dengan titik dua agar konsisten
}


// =================================================================================
// FUNGSI UI & INTERAKSI PENGGUNA
// =================================================================================

/**
 * Menampilkan pesan notifikasi sementara kepada pengguna.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {string} [type='info'] - Jenis pesan ('info', 'success', 'error').
 */
function showMessage(message, type = 'info') {
    const oldMessage = document.querySelector('.app-message');
    if(oldMessage) oldMessage.remove();

    const notification = document.createElement('div');
    notification.className = `app-message message ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 2000;
        padding: 12px 20px; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0; transform: translateX(20px);
        transition: opacity 300ms ease, transform 300ms ease;
    `;

    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(20px)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}


/**
 * Memperbarui tampilan tanggal dan waktu saat ini di header.
 */
function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = new Date().toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta'
        });
    }
}

/**
 * Proses logout pengguna dengan menghapus data dari localStorage.
 */
function logout() {
    localStorage.removeItem('currentUser');
    auth.signOut();
    window.location.href = 'index.html';
}

// =================================================================================
// FUNGSI FILTER PERIODE
// =================================================================================

let selectedYear, selectedPeriod;

/**
 * Menginisialisasi filter tahun dan periode.
 * @param {Function} onFilterChange - Callback yang akan dijalankan saat filter berubah.
 */
function setupFilters(onFilterChange) {
    const yearFilter = document.getElementById('yearFilter');
    const periodFilter = document.getElementById('periodFilter');
    if (!yearFilter || !periodFilter) return;

    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 2; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
    selectedYear = yearFilter.value;

    generatePeriodOptions(periodFilter);

    yearFilter.addEventListener('change', (e) => {
        selectedYear = e.target.value;
        generatePeriodOptions(periodFilter);
        if (typeof onFilterChange === 'function') {
            onFilterChange();
        }
    });

    periodFilter.addEventListener('change', (e) => {
        selectedPeriod = e.target.value;
        if (typeof onFilterChange === 'function') {
            onFilterChange();
        }
    });
}

/**
 * Membuat opsi periode (bulan) pada elemen select.
 * @param {HTMLElement} periodFilter - Elemen <select> untuk filter periode.
 */
function generatePeriodOptions(periodFilter) {
    periodFilter.innerHTML = '';
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    
    for (let i = 0; i < 12; i++) {
        const month1 = months[i];
        const month2 = months[(i + 1) % 12];
        const value = `${i}-${(i + 1) % 12}`;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${month1} - ${month2}`;
        periodFilter.appendChild(option);
    }

    const now = new Date();
    const currentDay = now.getDate();
    let currentMonthIndex = now.getMonth();

    if (currentDay < 21) {
        currentMonthIndex = (currentMonthIndex - 1 + 12) % 12;
    }
    const nextMonthIndex = (currentMonthIndex + 1) % 12;
    selectedPeriod = `${currentMonthIndex}-${nextMonthIndex}`;
    periodFilter.value = selectedPeriod;
}


/**
 * Mendapatkan tanggal mulai periode berdasarkan filter yang dipilih.
 * @returns {Date} Objek Date dari tanggal mulai.
 */
function getPeriodStartDate() {
    if (!selectedYear || !selectedPeriod) return new Date(new Date().getFullYear(), 0, 21);
    const [startMonthIndex] = selectedPeriod.split('-').map(Number);
    return new Date(selectedYear, startMonthIndex, 21);
}

/**
 * Mendapatkan tanggal akhir periode berdasarkan filter yang dipilih.
 * @returns {Date} Objek Date dari tanggal akhir.
 */
function getPeriodEndDate() {
    if (!selectedYear || !selectedPeriod) return new Date();
    const [startMonthIndex, endMonthIndex] = selectedPeriod.split('-').map(Number);
    const endYear = startMonthIndex > endMonthIndex ? Number(selectedYear) + 1 : selectedYear;
    const endDate = new Date(endYear, endMonthIndex, 20);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
}

/**
 * Membuat array berisi semua tanggal dalam periode yang dipilih.
 * @returns {Date[]} Array dari objek Date.
 */
function getDatesForPeriod() {
    const startDate = getPeriodStartDate();
    const endDate = getPeriodEndDate();
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}
