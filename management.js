/**
 * @file management.js
 * @description Logika lengkap untuk dashboard manajemen, diadaptasi untuk backend MongoDB.
 * @version 18.0.0 - Menghapus fitur import, menyesuaikan fitur export, dan menghapus kode Firebase.
 */

// --- INISIALISASI PENGGUNA & KONSTANTA ---
const API_BASE_URL = 'http://backend-kpi.148.230.97.197.sslip.io/api';
let currentUser;
let allData = {};
let allSalesUsers = [];
let pendingEntries = {};
let managementReportWeekOffset = 0;

// Fungsi fetch dengan otentikasi
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers }; // Salin header dari options

    // Jangan tambahkan Content-Type jika body adalah FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Hapus header Content-Type dari options utama agar tidak duplikat
    if (options.headers && options.headers['Content-Type']) {
        delete options.headers['Content-Type'];
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Jika token tidak valid/kadaluarsa, logout pengguna
        logout();
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'Terjadi kesalahan pada server.');
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    } else {
        // Untuk response yang bukan JSON (misal: text), kembalikan null atau text jika perlu
        return; 
    }
}

// Cek otentikasi pengguna saat halaman dimuat
function checkAuth() {
    const userJSON = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');

    if (userJSON && token) {
        currentUser = JSON.parse(userJSON);
        if (currentUser.role !== 'management') {
            logout();
            return;
        }
        initializeApp();
    } else {
        window.location.href = 'index.html';
    }
}

// --- KONFIGURASI (Sama seperti sebelumnya, untuk mapping UI) ---
const CONFIG = {
    dataMapping: {
        'Leads': { dataKey: 'Leads', collectionName: 'Leads', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Prospects': { dataKey: 'Prospects', collectionName: 'Prospects', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'B2BBookings': { dataKey: 'B2BBookings', collectionName: 'B2BBookings', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'VenueBookings': { dataKey: 'VenueBookings', collectionName: 'VenueBookings', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'DealLainnya': { dataKey: 'DealLainnya', collectionName: 'DealLainnya', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Canvasing': { dataKey: 'Canvasing', collectionName: 'Canvasing', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', meetingTitle: 'Judul Meeting', document: 'File', notes: 'Catatan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Promosi': { dataKey: 'Promosi', collectionName: 'Promosi', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', campaignName: 'Nama Campaign', platform: 'Platform', screenshot: 'Screenshot', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' }},
        'DoorToDoor': { dataKey: 'DoorToDoor', collectionName: 'DoorToDoor', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', visitDate: 'Tanggal Kunjungan', institutionName: 'Nama Instansi', address: 'Alamat', picName: 'Nama PIC', picPhone: 'Kontak PIC', response: 'Hasil Kunjungan', proof: 'Bukti', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Quotations': { dataKey: 'Quotations', collectionName: 'Quotations', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', productType: 'Jenis Produk', quotationDoc: 'Dokumen', quotationAmount: 'Nominal', description: 'Keterangan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Surveys': { dataKey: 'Surveys', collectionName: 'Surveys', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', gender: 'Jenis Kelamin', phone: 'No. Telepon', surveyDate: 'Tanggal Survey', origin: 'Asal', feedback: 'Tanggapan', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Reports': { dataKey: 'Reports', collectionName: 'Reports', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', reportPeriod: 'Periode Laporan', reportDoc: 'Dokumen', managementFeedback: 'Feedback', additionalNotes: 'Catatan Tambahan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'CRMSurveys': { dataKey: 'CRMSurveys', collectionName: 'CRMSurveys', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', competitorName: 'Nama Kompetitor', website: 'Website', product: 'Produk', priceDetails: 'Detail Harga', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Conversions': { dataKey: 'Conversions', collectionName: 'Conversions', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', eventName: 'Nama Event', clientName: 'Nama Client', eventDate: 'Tanggal Event', venueType: 'Jenis Venue', barterValue: 'Nilai Barter', barterDescription: 'Keterangan', barterAgreementFile: 'File Perjanjian', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Events': { dataKey: 'Events', collectionName: 'Events', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', eventName: 'Nama Event', eventType: 'Jenis Event', eventDate: 'Tanggal Event', eventLocation: 'Lokasi', organizer: 'Penyelenggara', benefits: 'Hasil/Manfaat', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Campaigns': { dataKey: 'Campaigns', collectionName: 'Campaigns', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', campaignTitle: 'Judul Kampanye', targetMarket: 'Target Pasar', campaignStartDate: 'Tgl Mulai', campaignEndDate: 'Tgl Selesai', conceptDescription: 'Deskripsi', potentialConversion: 'Potensi', budget: 'Budget', campaignMaterial: 'Materi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
    }
};
const TARGET_CONFIG = {
    daily: [
        { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'Leads' },
        { id: 2, name: "Konversi Lead Menjadi Prospek", target: 5, penalty: 20000, dataKey: 'Prospects' },
        { id: 3, name: "Promosi Campaign Package", target: 2, penalty: 10000, dataKey: 'Promosi' }
    ],
    weekly: [
        { id: 4, name: "Canvasing dan Pitching", target: 1, penalty: 50000, dataKey: 'Canvasing' },
        { id: 5, name: "Door-to-door perusahaan", target: 3, penalty: 150000, dataKey: 'DoorToDoor' },
        { id: 6, name: "Menyampaikan Quotation", target: 1, penalty: 50000, dataKey: 'Quotations' },
        { id: 7, name: "Survey pengunjung Co-living", target: 4, penalty: 50000, dataKey: 'Surveys' },
        { id: 8, name: "Laporan Ringkas Mingguan", target: 1, penalty: 50000, dataKey: 'Reports' },
        { id: 9, name: "Input CRM Survey kompetitor", target: 1, penalty: 25000, dataKey: 'CRMSurveys' },
        { id: 10, name: "Konversi Booking Venue Barter", target: 1, penalty: 75000, dataKey: 'Conversions' }
    ],
    monthly: [
        { id: 11, name: "Konversi Booking Kamar B2B", target: 2, penalty: 200000, dataKey: 'B2BBookings' },
        { id: 12, name: "Konversi Booking Venue", target: 2, penalty: 200000, dataKey: 'VenueBookings' },
        { id: 13, name: "Mengikuti Event/Networking", target: 1, penalty: 125000, dataKey: 'Events' },
        { id: 14, name: "Launch Campaign Package", target: 1, penalty: 150000, dataKey: 'Campaigns' }
    ]
};
const ALL_DATA_KEYS = Object.values(TARGET_CONFIG).flat().map(t => t.dataKey);

// =================================================================================
// FUNGSI PENGAMBILAN DATA
// =================================================================================

async function deleteKpiData(collectionName, id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini secara permanen? Aksi ini tidak dapat dibatalkan.')) {
        return;
    }

    try {
        await fetchWithAuth(`${API_BASE_URL}/data/${collectionName}/${id}`, {
            method: 'DELETE'
        });
        showMessage('Data berhasil dihapus!', 'success');
        // Panggil fungsi untuk memuat ulang data di tabel
        loadInitialData(); 
    } catch (error) {
        showMessage(`Gagal menghapus data: ${error.message}`, 'error');
    }
}

async function loadInitialData(isInitialLoad = false) {
    if (isInitialLoad) showMessage("Memuat data tim dari server...", "info");
    document.body.style.cursor = 'wait';
    
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    try {
        const fetchedData = await fetchWithAuth(`${API_BASE_URL}/all-data?startDate=${periodStartDate.toISOString()}&endDate=${periodEndDate.toISOString()}`);
        
        const [salesUsers, kpiSettings, timeOff, cutoffSettings] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/users/sales`),
            fetchWithAuth(`${API_BASE_URL}/settings/kpi`),
            fetchWithAuth(`${API_BASE_URL}/settings/timeOff`),
            fetchWithAuth(`${API_BASE_URL}/settings/cutoff`)
        ]);

        allData = fetchedData;
        allSalesUsers = salesUsers;
        allData.kpiSettings = kpiSettings;
        allData.timeOff = timeOff.entries || [];
        allData.cutoffSettings = cutoffSettings;

        if (isInitialLoad) {
            setupTimeOffForm();
            renderKpiSettings();
        }
        updateAllUI();
        if (isInitialLoad) showMessage("Data berhasil dimuat.", "success");

    } catch (error) {
        showMessage(`Gagal memuat data: ${error.message}`, 'error');
        console.error("Fetch Error:", error);
    } finally {
        document.body.style.cursor = 'default';
    }
}

// =================================================================================
// PUSAT VALIDASI
// =================================================================================

async function loadPendingEntries() {
    const tabsContainer = document.getElementById('validationTabsContainer');
    const contentContainer = document.getElementById('validationTabContentContainer');
    const dateFilterInput = document.getElementById('validationDateFilter');
    if (!tabsContainer || !contentContainer) return;
    
    tabsContainer.innerHTML = '<p>Memuat data validasi...</p>';
    contentContainer.innerHTML = '';
    document.body.style.cursor = 'wait';

    try {
        pendingEntries = {}; 
        const collectionsToFetch = Object.keys(CONFIG.dataMapping);
        const dateFilter = dateFilterInput.value ? `&startDate=${new Date(dateFilterInput.value).toISOString()}&endDate=${new Date(dateFilterInput.value + 'T23:59:59.999Z').toISOString()}` : '';
        
        const fetchPromises = collectionsToFetch.map(collectionName =>
            fetchWithAuth(`${API_BASE_URL}/data/${collectionName}?status=Pending${dateFilter}`)
        );
        
        const results = await Promise.all(fetchPromises);
        
        results.forEach((data, index) => {
            const collectionName = collectionsToFetch[index];
            if (data.length > 0) {
                pendingEntries[collectionName] = data;
            }
        });
        
        renderValidationTabs(pendingEntries);

    } catch (error) {
        tabsContainer.innerHTML = `<p class="message error">Gagal memuat data validasi: ${error.message}</p>`;
        console.error("Validation Load Error:", error);
    } finally {
        document.body.style.cursor = 'default';
    }
}

async function handleValidation(buttonElement, sheetName, id, type) {
    let notes = '';
    if (type === 'reject') {
        notes = prompt(`Mohon berikan alasan penolakan untuk data ini:`);
        if (notes === null || notes.trim() === '') {
            showMessage('Penolakan dibatalkan karena tidak ada alasan yang diberikan.', 'info');
            return;
        }
    }

    const actionCell = buttonElement.parentElement;
    actionCell.querySelectorAll('button').forEach(btn => btn.disabled = true);
    showMessage('Memproses validasi...', 'info');
    
    try {
        const payload = {
            validationStatus: type === 'approve' ? 'Approved' : 'Rejected',
            validationNotes: notes
        };

        await fetchWithAuth(`${API_BASE_URL}/data/${sheetName}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        showMessage('Validasi berhasil disimpan.', 'success');
        
        const row = actionCell.closest('tr');
        row.style.transition = 'opacity 0.5s ease';
        row.style.opacity = '0';
        setTimeout(() => {
            row.remove();
            loadPendingEntries();
            loadInitialData();
        }, 500);

    } catch (error) {
        showMessage(`Gagal memproses validasi: ${error.message}`, 'error');
        actionCell.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }
}

// =================================================================================
// FUNGSI EKSPOR DATA
// =================================================================================

function openExportModal() {
    const modal = document.getElementById('exportModal');
    if (!modal) return;

    const select = document.getElementById('exportCollectionSelect');
    select.innerHTML = '<option value="all">Semua Koleksi</option>';
    Object.keys(CONFIG.dataMapping).forEach(dataKey => {
        const collectionName = CONFIG.dataMapping[dataKey].collectionName || dataKey;
        const option = document.createElement('option');
        option.value = dataKey; // Gunakan dataKey untuk referensi internal
        option.textContent = collectionName;
        select.appendChild(option);
    });
    
    document.getElementById('exportForm').reset();
    document.getElementById('exportJsonOptions').style.display = 'none';
    modal.classList.add('active');
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function handleExportFormSubmit(e) {
    e.preventDefault();
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    
    if (format === 'excel') {
        exportAllDataAsExcel();
    } else if (format === 'json') {
        const collectionKey = document.getElementById('exportCollectionSelect').value;
        exportDataAsJson(collectionKey);
    }
    closeExportModal();
}

function exportAllDataAsExcel() {
    showMessage('Mempersiapkan file Excel...', 'info');
    try {
        const wb = XLSX.utils.book_new();
        const sheetOrder = Object.keys(CONFIG.dataMapping);

        sheetOrder.forEach(dataKey => {
            const data = allData[dataKey];
            if (data && data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, dataKey);
            }
        });

        if (wb.SheetNames.length === 0) {
            showMessage('Tidak ada data untuk diekspor pada periode ini.', 'warning');
            return;
        }

        const period = document.getElementById('periodFilter').options[document.getElementById('periodFilter').selectedIndex].text.replace(/\s/g, '');
        const year = document.getElementById('yearFilter').value;
        const fileName = `LaporanKPI_${year}_${period}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showMessage('Unduhan Excel berhasil disiapkan!', 'success');

    } catch (error) {
        showMessage(`Gagal mengekspor data ke Excel: ${error.message}`, 'error');
        console.error("Excel Export Error:", error);
    }
}

function exportDataAsJson(collectionKey) {
    let dataToExport;
    let fileName;
    const period = document.getElementById('periodFilter').options[document.getElementById('periodFilter').selectedIndex].text.replace(/\s/g, '');
    const year = document.getElementById('yearFilter').value;

    if (collectionKey === 'all') {
        dataToExport = allData;
        fileName = `KPI_ALL_${year}_${period}.json`;
    } else if (allData[collectionKey]) {
        dataToExport = allData[collectionKey];
        fileName = `KPI_${collectionKey}_${year}_${period}.json`;
    } else {
        showMessage('Koleksi tidak valid atau tidak ada data.', 'error');
        return;
    }

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Unduhan JSON berhasil disiapkan!', 'success');
}


// =================================================================================
// PENGATURAN
// =================================================================================

async function handleKpiSettingChange(event) {
    const toggle = event.target;
    const targetId = toggle.dataset.targetId;
    const isActive = toggle.checked;
    toggle.disabled = true;

    try {
        const currentSettings = allData.kpiSettings || {};
        currentSettings[targetId] = isActive;

        await fetchWithAuth(`${API_BASE_URL}/settings/kpi`, {
            method: 'POST',
            body: JSON.stringify({ data: currentSettings })
        });
        
        showMessage('Pengaturan KPI berhasil diperbarui.', 'success');
        allData.kpiSettings[targetId] = isActive;
        updateAllUI();

    } catch (error) {
        showMessage(`Gagal menyimpan pengaturan: ${error.message}`, 'error');
        toggle.checked = !isActive;
    } finally {
        toggle.disabled = false;
    }
}

async function handleSaveCutoffSettings(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const isEnabled = document.getElementById('cutoffEnabledToggle').checked;
    const time = document.getElementById('cutoffTimeInput').value;

    if (!time) {
        showMessage('Jam batas waktu wajib diisi.', 'error');
        return;
    }

    button.disabled = true;
    button.textContent = 'Menyimpan...';

    try {
        await fetchWithAuth(`${API_BASE_URL}/settings/cutoff`, {
            method: 'POST',
            body: JSON.stringify({ data: { isEnabled, time } })
        });
        showMessage('Pengaturan batas waktu berhasil disimpan.', 'success');
    } catch (error) {
        showMessage(`Gagal menyimpan pengaturan: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Simpan Pengaturan Cutoff';
    }
}

async function handleTimeOffSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const date = document.getElementById('timeOffDate').value;
    const sales = document.getElementById('timeOffSales').value;
    const description = document.getElementById('timeOffDescription').value;
    if (!date || !description) { 
        showMessage('Tanggal dan Keterangan wajib diisi.', 'error'); 
        return; 
    }

    const newEntry = { date, sales, description, id: `timeoff_${Date.now()}` };
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true; submitButton.textContent = 'Menyimpan...';

    try {
        const currentEntries = allData.timeOff || [];
        currentEntries.push(newEntry);
        
        await fetchWithAuth(`${API_BASE_URL}/settings/timeOff`, {
            method: 'POST',
            body: JSON.stringify({ data: { entries: currentEntries } })
        });

        showMessage('Data libur berhasil disimpan.', 'success');
        await loadInitialData(); 
        form.reset();
    } catch (error) {
        showMessage(`Error: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Simpan';
    }
}

async function handleDeleteTimeOff(id) {
    if (!confirm('Anda yakin ingin menghapus data ini?')) return;
    
    const updatedEntries = (allData.timeOff || []).filter(item => item.id !== id);

    try {
        await fetchWithAuth(`${API_BASE_URL}/settings/timeOff`, {
            method: 'POST',
            body: JSON.stringify({ data: { entries: updatedEntries } })
        });
        showMessage('Data berhasil dihapus.', 'success');
        await loadInitialData();
    } catch (error) {
        showMessage(`Error menghapus data: ${error.message}`, 'error');
    }
}

// =================================================================================
// SEMUA FUNGSI UI LAINNYA
// =================================================================================

function updateAllUI() {
    if (!allData.kpiSettings || !allSalesUsers || allSalesUsers.length === 0) {
        const leaderboardContainer = document.getElementById('leaderboard');
        if (leaderboardContainer) leaderboardContainer.innerHTML = '<p>Memuat data sales...</p>';
        return;
    }
    try {
        const penalties = calculatePenalties();
        updateStatCards(penalties);
        updateLeaderboard(penalties);
        renderTabbedTargetSummary();
        renderTimeOffList();
        updateTeamValidationBreakdown();
        renderCutoffSettings();
    } catch(error) {
        console.error("Error updating management UI:", error);
        showMessage("Terjadi kesalahan saat menampilkan data manajemen.", "error");
    }
}

function getFilteredData(salesName, dataKey, validationFilter = ['Approved']) {
    const data = allData[dataKey] || [];
    if (!Array.isArray(data)) return [];
    
    let filteredBySales = data.filter(item => item && item.sales === salesName);

    if (validationFilter.includes('All')) {
        return filteredBySales;
    }
    
    const lowerCaseFilter = validationFilter.map(f => f.toLowerCase());
    return filteredBySales.filter(item => 
        item.validationStatus && lowerCaseFilter.includes(item.validationStatus.toLowerCase())
    );
}

function updateStatCards(penalties) {
    const approvedLeads = (allData.Leads || []).filter(d => d && d.validationStatus && d.validationStatus.toLowerCase() === 'approved');
    const approvedCanvasing = (allData.Canvasing || []).filter(d => d && d.validationStatus && d.validationStatus.toLowerCase() === 'approved');
    document.getElementById('totalLeads').textContent = approvedLeads.length;
    document.getElementById('totalCanvasing').textContent = approvedCanvasing.length;
    
    const salesPerformance = {};
    allSalesUsers.forEach(salesUser => {
        salesPerformance[salesUser.name] = ALL_DATA_KEYS.reduce((total, key) => total + getFilteredData(salesUser.name, key, ['Approved']).length, 0);
    });
    const topSales = Object.keys(salesPerformance).length > 0 ? Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b) : 'N/A';
    document.getElementById('topSales').textContent = topSales;
    document.getElementById('totalPenalty').textContent = formatCurrency(penalties.total);
}

function updateLeaderboard(penalties) {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    const leaderboardData = allSalesUsers.map(salesUser => {
        const totalActivities = ALL_DATA_KEYS.reduce((sum, key) => sum + getFilteredData(salesUser.name, key, ['Approved']).length, 0);
        return { name: salesUser.name, total: totalActivities, penalty: penalties.bySales[salesUser.name] || 0 };
    });
    leaderboardData.sort((a, b) => b.total - a.total);
    container.innerHTML = `<div class="performance-table-wrapper"><table class="performance-table" style="table-layout: auto;"><thead><tr><th>Nama Sales</th><th>Total Aktivitas (Approved)</th><th>Denda Final</th></tr></thead><tbody>${leaderboardData.map(s => `<tr><td>${s.name}</td><td><strong>${s.total}</strong></td><td>${formatCurrency(s.penalty)}</td></tr>`).join('') || '<tr><td colspan="3">Tidak ada data sales</td></tr>'}</tbody></table></div>`;
}

function calculatePenalties() {
    const penalties = { total: 0, bySales: {} };
    const kpiSettings = allData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    if (today < periodStartDate) return penalties;

    allSalesUsers.forEach(salesUser => {
        const salesName = salesUser.name;
        penalties.bySales[salesName] = 0;
        
        TARGET_CONFIG.daily.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            datesToCheck.forEach(date => {
                if (!isDayOff(date, salesName)) {
                    const achievedToday = getFilteredData(salesName, target.dataKey, ['Approved'])
                        .filter(d => d && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                    if (achievedToday < target.target) penalties.bySales[salesName] += target.penalty;
                }
            });
        });

        const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
        TARGET_CONFIG.weekly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            sundaysInPeriod.forEach(sunday => {
                const weekStart = getWeekStart(sunday);
                const achievedThisWeek = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const itemDate = new Date(d.timestamp); return itemDate >= weekStart && itemDate <= sunday; }).length;
                if (achievedThisWeek < target.target) penalties.bySales[salesName] += target.penalty;
            });
        });

        if (today > periodEndDate) {
            TARGET_CONFIG.monthly.forEach(target => {
                if (kpiSettings[target.id] === false) return;
                const achievedThisPeriod = getFilteredData(salesName, target.dataKey, ['Approved']).length;
                if (achievedThisPeriod < target.target) penalties.bySales[salesName] += target.penalty;
            });
        }
    });

    penalties.total = Object.values(penalties.bySales).reduce((sum, p) => sum + p, 0);
    return penalties;
}

function isDayOff(date, salesName) {
    if (date.getDay() === 0) return true;
    const dateString = toLocalDateString(date);
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return false;
    return timeOffData.some(off => off && off.date === dateString && (off.sales === 'Global' || off.sales === salesName));
}

function renderTabbedTargetSummary() {
    const tabsContainer = document.getElementById('tabsContainer');
    const contentContainer = document.getElementById('tabContentContainer');
    if (!tabsContainer || !contentContainer) return;

    const periodDates = getDatesForPeriod();
    if (periodDates.length === 0) {
        contentContainer.innerHTML = '<div class="empty-state">Pilih periode untuk melihat laporan.</div>';
        return;
    }
    const weekDates = periodDates.slice(managementReportWeekOffset * 7, (managementReportWeekOffset * 7) + 7);
    const kpiSettings = allData.kpiSettings || {};

    if (tabsContainer.children.length === 0 || allSalesUsers.length !== (tabsContainer.children.length)) {
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';
        allSalesUsers.forEach((salesUser, index) => {
            const salesName = salesUser.name;
            const contentId = `content-${salesName.replace(/\s+/g, '')}`;
            tabsContainer.innerHTML += `<button class="tab-button ${index === 0 ? 'active' : ''}" data-tab="${contentId}">${salesName}</button>`;
            contentContainer.innerHTML += `<div id="${contentId}" class="tab-content ${index === 0 ? 'active' : ''}"><div class="performance-table-wrapper"><table class="performance-table"></table></div></div>`;
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });
    }

    allSalesUsers.forEach(salesUser => {
        const salesName = salesUser.name;
        const contentId = `content-${salesName.replace(/\s+/g, '')}`;
        const tableContainer = document.querySelector(`#${contentId} .performance-table`);
        if (!tableContainer) return;

        let tableHeader = `<thead><tr><th>Target (Target)</th>`;
        weekDates.forEach(date => { tableHeader += `<th>${date.getDate()}</th>`; });
        tableHeader += '</tr></thead>';
        
        let tableBody = '<tbody>';
        ['daily', 'weekly', 'monthly'].forEach(period => {
            TARGET_CONFIG[period].forEach(target => {
                if (kpiSettings[target.id] === false) return;
                tableBody += `<tr><td>${target.name} (${target.target})</td>`;
                weekDates.forEach(date => {
                    let cellContent = '-';
                    if (period === 'daily') {
                        if (!isDayOff(date, salesName)) {
                            const dailyData = (allData[target.dataKey] || []).filter(d => d && d.sales === salesName && new Date(d.timestamp).toDateString() === date.toDateString());
                            const p = dailyData.filter(d => d.validationStatus.toLowerCase() === 'pending').length;
                            const a = dailyData.filter(d => d.validationStatus.toLowerCase() === 'approved').length;
                            const r = dailyData.filter(d => d.validationStatus.toLowerCase() === 'rejected').length;
                            cellContent = `<span class="par-cell"><span class="par-p">${p}</span>/<span class="par-a">${a}</span>/<span class="par-r">${r}</span></span>`;
                        }
                    } else if (period === 'weekly' && date.getDay() === 0) {
                        const weekStart = getWeekStart(date);
                        const weeklyData = (allData[target.dataKey] || []).filter(d => {
                            if (!d || d.sales !== salesName) return false;
                            const itemDate = new Date(d.timestamp);
                            return itemDate >= weekStart && itemDate <= date;
                        });
                        const p = weeklyData.filter(d => d.validationStatus.toLowerCase() === 'pending').length;
                        const a = weeklyData.filter(d => d.validationStatus.toLowerCase() === 'approved').length;
                        const r = weeklyData.filter(d => d.validationStatus.toLowerCase() === 'rejected').length;
                        cellContent = `<span class="par-cell"><span class="par-p">${p}</span>/<span class="par-a">${a}</span>/<span class="par-r">${r}</span></span>`;
                    } else if (period === 'monthly' && date.getDate() === getPeriodEndDate().getDate()) {
                         const monthlyData = (allData[target.dataKey] || []).filter(d => d.sales === salesName);
                         const p = monthlyData.filter(d => d.validationStatus.toLowerCase() === 'pending').length;
                         const a = monthlyData.filter(d => d.validationStatus.toLowerCase() === 'approved').length;
                         const r = monthlyData.filter(d => d.validationStatus.toLowerCase() === 'rejected').length;
                         cellContent = `<span class="par-cell"><span class="par-p">${p}</span>/<span class="par-a">${a}</span>/<span class="par-r">${r}</span></span>`;
                    }
                    tableBody += `<td>${cellContent}</td>`;
                });
                tableBody += '</tr>';
            });
        });
        tableBody += '</tbody>';
        tableContainer.innerHTML = tableHeader + tableBody;
    });

    document.getElementById('managementPrevWeekBtn').disabled = (managementReportWeekOffset === 0);
    const totalWeeks = Math.ceil(periodDates.length / 7);
    document.getElementById('managementNextWeekBtn').disabled = (managementReportWeekOffset >= totalWeeks - 1);
    const startRange = weekDates[0] ? weekDates[0].toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '';
    const endRange = weekDates.length > 0 ? weekDates[weekDates.length - 1].toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '';
    document.getElementById('managementWeekRangeLabel').textContent = startRange && endRange ? `${startRange} - ${endRange}` : '...';
}


function updateTeamValidationBreakdown() {
    const container = document.getElementById('teamValidationBreakdown');
    if (!container) return;
    let total = 0, approved = 0, pending = 0, rejected = 0;
    ALL_DATA_KEYS.forEach(key => {
        const data = allData[key] || [];
        if(Array.isArray(data)) {
            data.forEach(item => {
                if(item && item.validationStatus) {
                    total++;
                    const status = item.validationStatus.toLowerCase();
                    if (status === 'approved') approved++;
                    else if (status === 'pending') pending++;
                    else if (status === 'rejected') rejected++;
                }
            });
        }
    });
    container.innerHTML = `
        <div class="validation-stats">
            <div class="stat-item approved"><strong>${approved}</strong> Disetujui</div>
            <div class="stat-item pending"><strong>${pending}</strong> Pending</div>
            <div class="stat-item rejected"><strong>${rejected}</strong> Ditolak</div>
            <div class="stat-item total"><strong>${total}</strong> Total Data</div>
        </div>`;
    const pendingBadge = document.getElementById('pendingCountBadge');
    if (pending > 0) {
        pendingBadge.textContent = pending;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
    }
}

function renderValidationTabs(data) {
    const tabsContainer = document.getElementById('validationTabsContainer');
    const contentContainer = document.getElementById('validationTabContentContainer');
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    const pendingBySales = {};
    let totalPendingAll = 0;

    for (const sheetName in data) {
        data[sheetName].forEach(item => {
            if (!item || !item.sales) return;
            if (!pendingBySales[item.sales]) {
                pendingBySales[item.sales] = { total: 0, items: {} };
            }
            if (!pendingBySales[item.sales].items[sheetName]) {
                pendingBySales[item.sales].items[sheetName] = [];
            }
            pendingBySales[item.sales].items[sheetName].push(item);
            pendingBySales[item.sales].total++;
            totalPendingAll++;
        });
    }

    const pendingBadge = document.getElementById('pendingCountBadge');
    if (totalPendingAll > 0) {
        pendingBadge.textContent = totalPendingAll;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
        const dateFilterInput = document.getElementById('validationDateFilter');
        if (dateFilterInput && dateFilterInput.value) {
            tabsContainer.innerHTML = `<p class="message success">Tidak ada data yang perlu divalidasi untuk tanggal ${new Date(dateFilterInput.value).toLocaleDateString('id-ID')}.</p>`;
        } else {
            tabsContainer.innerHTML = '<p class="message success">Tidak ada data yang perlu divalidasi saat ini. Kerja bagus!</p>';
        }
        return;
    }

    let isFirstTab = true;
    for (const salesName in pendingBySales) {
        const salesData = pendingBySales[salesName];
        const contentId = `validation-content-${salesName.replace(/\s+/g, '')}`;

        const tabButton = document.createElement('button');
        tabButton.className = `tab-button ${isFirstTab ? 'active' : ''}`;
        tabButton.dataset.tab = contentId;
        tabButton.innerHTML = `${salesName} <span class="pending-badge">${salesData.total}</span>`;
        tabsContainer.appendChild(tabButton);

        const contentDiv = document.createElement('div');
        contentDiv.id = contentId;
        contentDiv.className = `tab-content ${isFirstTab ? 'active' : ''}`;
        
        for (const sheetName in salesData.items) {
            const items = salesData.items[sheetName];
            
            items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            const card = document.createElement('div');
            card.className = 'card is-collapsed';
            let tableHTML = `
                <div class="card__header">
                    <h3>${sheetName} (${items.length} pending)</h3>
                    <button class="collapse-btn" aria-expanded="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                </div>
                <div class="card__body performance-table-wrapper">
                    <table class="validation-table">
                        <thead><tr><th>Waktu</th><th>Detail Utama</th><th>Aksi</th></tr></thead>
                        <tbody>`;
            items.forEach(item => {
                const mainDetail = item.customerName || item.meetingTitle || item.campaignName || item.institutionName || item.competitorName || item.eventName || item.campaignTitle || 'N/A';
                tableHTML += `
                    <tr data-id="${item._id}" data-sheet="${sheetName}">
                        <td>${item.datestamp || new Date(item.timestamp).toLocaleString('id-ID')}</td>
                        <td>${mainDetail}</td>
                        <td class="validation-actions">
                            <button class="btn btn--sm btn--outline" onclick="openDetailModal('${item._id}', '${sheetName}')">Detail</button>
                            <button class="btn btn--sm btn--primary" onclick="handleValidation(this, '${sheetName}', '${item._id}', 'approve')">Approve</button>
                            <button class="btn btn--sm btn--secondary" onclick="handleValidation(this, '${sheetName}', '${item._id}', 'reject')">Reject</button>
                        </td>
                    </tr>`;
            });
            tableHTML += `</tbody></table></div>`;
            card.innerHTML = tableHTML;
            contentDiv.appendChild(card);
        }
        contentContainer.appendChild(contentDiv);
        isFirstTab = false;
    }

    document.querySelectorAll('#validationTabContentContainer .card__header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.card');
            const button = header.querySelector('.collapse-btn');
            if (!card || !button) return;

            const isCurrentlyExpanded = !card.classList.contains('is-collapsed');
            card.classList.toggle('is-collapsed');
            button.setAttribute('aria-expanded', !isCurrentlyExpanded);
        });
    });

    document.querySelectorAll('#validationTabsContainer .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#validationTabsContainer .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#validationTabContentContainer .tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function closeDetailModal() {
    const modal = document.getElementById('managementDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openDetailModal(itemId, sheetName) {
    const items = pendingEntries[sheetName] || [];
    const item = items.find(d => d && d._id === itemId);
    const mapping = CONFIG.dataMapping[sheetName];

    if (!item || !mapping) {
        console.error("Data atau mapping tidak ditemukan untuk modal:", itemId, sheetName);
        showMessage("Tidak dapat menampilkan detail data.", "error");
        return;
    }

    const modal = document.getElementById('managementDetailModal');
    const modalTitle = document.getElementById('managementDetailModalTitle');
    const modalBody = document.getElementById('managementDetailModalBody');
    if(!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = `Detail Data - ${sheetName}`;
    modalBody.innerHTML = '';

    const detailList = document.createElement('dl');
    detailList.className = 'detail-list';
    const dateFields = ['timestamp', 'visitDate', 'surveyDate', 'eventDate', 'campaignStartDate', 'campaignEndDate'];

    for (const key in mapping.detailLabels) {
        if (Object.prototype.hasOwnProperty.call(item, key) && (item[key] || item[key] === 0 || typeof item[key] === 'string')) {
            const dt = document.createElement('dt');
            dt.textContent = mapping.detailLabels[key];
            
            const dd = document.createElement('dd');
            let value = item[key];

            if (key === 'timestamp') value = item.datestamp || formatDate(item.timestamp);
            else if (dateFields.includes(key)) value = formatDate(value);
            else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('budget') || key.toLowerCase().includes('value')) value = formatCurrency(value);
            else if (key === 'validationStatus') {
                dd.innerHTML = `<span class="status status--${(value || 'pending').toLowerCase()}">${value || 'Pending'}</span>`;
                detailList.appendChild(dt); detailList.appendChild(dd); continue;
            } else if (typeof value === 'string' && (value.startsWith('http'))) {
                 dd.innerHTML = `<a href="${value}" target="_blank" rel="noopener noreferrer">Lihat File/Link</a>`;
                detailList.appendChild(dt); detailList.appendChild(dd); continue;
            }
            
            dd.textContent = value;
            detailList.appendChild(dt);
            detailList.appendChild(dd);
        }
    }
    
    modalBody.appendChild(detailList);
    modal.classList.add('active');
}

function renderCutoffSettings() {
    const container = document.getElementById('cutoffSettingsContainer');
    if (!container) return;

    const settings = allData.cutoffSettings || { isEnabled: false, time: '16:00' };
    
    const toggle = document.getElementById('cutoffEnabledToggle');
    const timeInput = document.getElementById('cutoffTimeInput');

    if(toggle) toggle.checked = settings.isEnabled;
    if(timeInput) timeInput.value = settings.time;
}

function renderKpiSettings() {
    const container = document.getElementById('kpiSettingsContainer');
    if (!container) return;
    container.innerHTML = '';
    const allTargets = [...TARGET_CONFIG.daily, ...TARGET_CONFIG.weekly, ...TARGET_CONFIG.monthly];
    const kpiSettings = allData.kpiSettings || {};
    allTargets.forEach(target => {
        const isActive = kpiSettings[target.id] !== false;
        const item = document.createElement('div');
        item.className = 'setting-item';
        item.innerHTML = `<div class="setting-info"><div class="setting-name">${target.name}</div><div class="setting-description">Denda: ${formatCurrency(target.penalty)}</div></div><label class="toggle-switch"><input type="checkbox" data-target-id="${target.id}" ${isActive ? 'checked' : ''}><span class="toggle-slider"></span></label>`;
        container.appendChild(item);
    });
    container.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
        toggle.addEventListener('change', handleKpiSettingChange);
    });
}

function setupTimeOffForm() {
    const form = document.getElementById('timeOffForm');
    const salesSelect = document.getElementById('timeOffSales');
    if (!form || !salesSelect) return;
    salesSelect.innerHTML = '<option value="Global">Global (Hari Libur)</option>';
    allSalesUsers.forEach(user => {
        salesSelect.innerHTML += `<option value="${user.name}">${user.name}</option>`;
    });
    form.removeEventListener('submit', handleTimeOffSubmit);
    form.addEventListener('submit', handleTimeOffSubmit);
}

function renderTimeOffList() {
    const container = document.getElementById('timeOffListContainer');
    if (!container) return;
    container.innerHTML = '';
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return;
    timeOffData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        if (!item || !item.date) return;
        const li = document.createElement('li');
        const displayDate = new Date(item.date + 'T00:00:00Z').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        li.innerHTML = `<span>${displayDate} - <strong>${item.sales}</strong> (${item.description || 'Tanpa keterangan'})</span><button class="delete-btn" data-id="${item.id}">&times;</button>`;
        container.appendChild(li);
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDeleteTimeOff(e.target.dataset.id));
    });
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
    if (pageId === 'validationCenter') {
        loadPendingEntries();
    }
}

// =================================================================================
// INISIALISASI
// =================================================================================
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function initializeApp() {
    if (!currentUser) return;
    document.getElementById('userDisplayName').textContent = currentUser.name;
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Setup Event Listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('refreshValidationBtn')?.addEventListener('click', loadPendingEntries);
    document.getElementById('exportDataBtn')?.addEventListener('click', openExportModal);
    document.getElementById('exportForm')?.addEventListener('submit', handleExportFormSubmit);
    document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('exportJsonOptions').style.display = e.target.value === 'json' ? 'block' : 'none';
        });
    });
    document.getElementById('cutoffForm')?.addEventListener('submit', handleSaveCutoffSettings);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showContentPage(link.dataset.page);
        });
    });
    const validationDateFilter = document.getElementById('validationDateFilter');
    if (validationDateFilter) {
        validationDateFilter.value = toLocalDateString(new Date());
        validationDateFilter.addEventListener('change', loadPendingEntries);
    }
    setupFilters(() => {
        managementReportWeekOffset = 0;
        loadInitialData(false);
    });
    document.getElementById('managementPrevWeekBtn').addEventListener('click', () => {
        if (managementReportWeekOffset > 0) {
            managementReportWeekOffset--;
            renderTabbedTargetSummary();
        }
    });
    document.getElementById('managementNextWeekBtn').addEventListener('click', () => {
        const periodDates = getDatesForPeriod();
        const totalWeeks = Math.ceil(periodDates.length / 7);
        if (managementReportWeekOffset < totalWeeks - 1) {
            managementReportWeekOffset++;
            renderTabbedTargetSummary();
        }
    });
    
    // Panggilan data awal
    loadInitialData(true);
}

// Mulai aplikasi
checkAuth();
