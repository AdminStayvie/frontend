/**
 * @file app.js
 * @description Logika utama untuk dashboard KPI Sales, diadaptasi untuk backend MongoDB.
 * @version 16.0.0 - Menambahkan sidebar untuk data yang ditolak.
 */

// --- INISIALISASI PENGGUNA & PENJAGA HALAMAN ---
const API_BASE_URL = 'http://backend-kpi.148.230.97.197.sslip.io/api';
let currentUser;

// Fungsi untuk melakukan fetch dengan token otentikasi
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Jika token tidak valid/kadaluarsa, logout pengguna
        logout();
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Terjadi kesalahan pada server.');
    }

    // Cek jika response punya body sebelum parsing JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    } else {
        return; // Tidak ada body atau bukan JSON
    }
}

// Cek status login di awal
function checkAuth() {
    const userJSON = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');

    if (userJSON && token) {
        currentUser = JSON.parse(userJSON);
        initializeApp();
    } else {
        window.location.href = 'index.html';
    }
}

// =================================================================================
// KONFIGURASI TERPUSAT
// =================================================================================
const CONFIG = {
    targets: {
        daily: [
            { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'Leads', page: 'input-lead' },
            { id: 2, name: "Konversi Lead Menjadi Prospek", target: 5, penalty: 20000, dataKey: 'Prospects', page: 'input-lead' },
            { id: 3, name: "Promosi Campaign Package", target: 2, penalty: 10000, dataKey: 'Promosi', page: 'upload-promosi' }
        ],
        weekly: [
            { id: 4, name: "Canvasing dan Pitching", target: 1, penalty: 50000, dataKey: 'Canvasing', page: 'upload-canvasing' },
            { id: 5, name: "Door-to-door perusahaan", target: 3, penalty: 150000, dataKey: 'DoorToDoor', page: 'door-to-door' },
            { id: 6, name: "Menyampaikan Quotation", target: 1, penalty: 50000, dataKey: 'Quotations', page: 'quotation' },
            { id: 7, name: "Survey pengunjung Co-living", target: 4, penalty: 50000, dataKey: 'Surveys', page: 'survey-coliving' },
            { id: 8, name: "Laporan Ringkas Mingguan", target: 1, penalty: 50000, dataKey: 'Reports', page: 'laporan-mingguan' },
            { id: 9, name: "Input CRM Survey kompetitor", target: 1, penalty: 25000, dataKey: 'CRMSurveys', page: 'crm-survey' },
            { id: 10, name: "Konversi Booking Venue Barter", target: 1, penalty: 75000, dataKey: 'Conversions', page: 'konversi-venue' }
        ],
        monthly: [
            { id: 11, name: "Konversi Booking Kamar B2B", target: 2, penalty: 200000, dataKey: 'B2BBookings', page: 'input-lead' },
            { id: 12, name: "Konversi Booking Venue", target: 2, penalty: 200000, dataKey: 'VenueBookings', page: 'input-lead' },
            { id: 13, name: "Mengikuti Event/Networking", target: 1, penalty: 125000, dataKey: 'Events', page: 'event-networking' },
            { id: 14, name: "Launch Campaign Package", target: 1, penalty: 150000, dataKey: 'Campaigns', page: 'launch-campaign' }
        ]
    },
    dataMapping: {
        'Leads': { collectionName: 'Leads', headers: ['Waktu', 'Customer', 'Produk', 'Status Lead', 'Status Validasi', 'Aksi'], rowGenerator: 'generateLeadRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'Prospects': { collectionName: 'Prospects', headers: ['Waktu', 'Customer', 'Produk', 'Status Lead', 'Status Validasi', 'Aksi'], rowGenerator: 'generateLeadRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'B2BBookings': { collectionName: 'B2BBookings', headers: ['Waktu', 'Customer', 'Produk', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'VenueBookings': { collectionName: 'VenueBookings', headers: ['Waktu', 'Customer', 'Produk', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'DealLainnya': { collectionName: 'Deal Lainnya', headers: ['Waktu', 'Customer', 'Produk', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', 'status': 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'Canvasing': { collectionName: 'Canvasing', headers: ['Waktu', 'Judul Meeting', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Upload', meetingTitle: 'Judul Meeting', document: 'File', notes: 'Catatan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'Promosi': { collectionName: 'Promosi', headers: ['Waktu', 'Campaign', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Upload', campaignName: 'Nama Campaign', platform: 'Platform', screenshot: 'Screenshot', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' }},
        'DoorToDoor': { collectionName: 'DoorToDoor', headers: ['Waktu', 'Instansi', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', visitDate: 'Tanggal Kunjungan', institutionName: 'Nama Instansi', address: 'Alamat', picName: 'Nama PIC', picPhone: 'Kontak PIC', response: 'Hasil Kunjungan', proof: 'Bukti', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'Quotations': { collectionName: 'Quotations', headers: ['Waktu', 'Customer', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', customerName: 'Nama Customer', productType: 'Jenis Produk', quotationDoc: 'Dokumen', quotationAmount: 'Nominal', description: 'Keterangan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'Surveys': { collectionName: 'Surveys', headers: ['Waktu', 'Customer', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', customerName: 'Nama Customer', gender: 'Jenis Kelamin', phone: 'No. Telepon', surveyDate: 'Tanggal Survey', origin: 'Asal', feedback: 'Tanggapan', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'Reports': { collectionName: 'Reports', headers: ['Waktu', 'Periode', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Upload', reportPeriod: 'Periode Laporan', reportDoc: 'Dokumen', managementFeedback: 'Feedback', additionalNotes: 'Catatan Tambahan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'CRMSurveys': { collectionName: 'CRMSurveys', headers: ['Waktu', 'Kompetitor', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', competitorName: 'Nama Kompetitor', website: 'Website', product: 'Produk', priceDetails: 'Detail Harga', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'Conversions': { collectionName: 'Conversions', headers: ['Waktu', 'Event', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', eventName: 'Nama Event', clientName: 'Nama Client', eventDate: 'Tanggal Event', venueType: 'Jenis Venue', barterValue: 'Nilai Barter', barterDescription: 'Keterangan', barterAgreementFile: 'File Perjanjian', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'Events': { collectionName: 'Events', headers: ['Waktu', 'Nama Event', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', eventName: 'Nama Event', eventType: 'Jenis Event', eventDate: 'Tanggal Event', eventLocation: 'Lokasi', organizer: 'Penyelenggara', benefits: 'Hasil/Manfaat', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'Campaigns': { collectionName: 'Campaigns', headers: ['Waktu', 'Judul', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', campaignTitle: 'Judul Kampanye', targetMarket: 'Target Pasar', campaignStartDate: 'Tgl Mulai', campaignEndDate: 'Tgl Selesai', conceptDescription: 'Deskripsi', potentialConversion: 'Potensi', budget: 'Budget', campaignMaterial: 'Materi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
    }
};

const FORM_PAGE_MAP = {
    'Leads': 'input-lead', 'Prospects': 'input-lead', 'B2BBookings': 'input-lead', 'VenueBookings': 'input-lead', 'DealLainnya': 'input-lead',
    'Canvasing': 'upload-canvasing', 'Promosi': 'upload-promosi', 'DoorToDoor': 'door-to-door', 'Quotations': 'quotation',
    'Surveys': 'survey-coliving', 'Reports': 'laporan-mingguan', 'CRMSurveys': 'crm-survey', 'Conversions': 'konversi-venue',
    'Events': 'event-networking', 'Campaigns': 'launch-campaign'
};

let currentData = {};
let performanceReportWeekOffset = 0;
let tableSortState = {};

// =================================================================================
// FUNGSI PENGURUTAN TABEL
// =================================================================================

function initializeTableSortState() {
    tableSortState = {};
    const allDataKeys = [...Object.keys(CONFIG.dataMapping), 'Deals'];
    allDataKeys.forEach(key => {
        tableSortState[key] = {
            by: 'timestamp',
            dir: 'desc'
        };
    });
}

function sortData(data, sortConfig) {
    if (!sortConfig || !sortConfig.by || !Array.isArray(data)) return data;

    const isDateSort = ['timestamp', 'datestamp', 'visitDate', 'surveyDate', 'eventDate'].includes(sortConfig.by);

    data.sort((a, b) => {
        if (!a || !b) return 0;
        let valA, valB;

        if (isDateSort) {
            valA = new Date(a[sortConfig.by] || a.timestamp || 0);
            valB = new Date(b[sortConfig.by] || b.timestamp || 0);
            if (isNaN(valA) || isNaN(valB)) return 0;
        } else {
            valA = String(a[sortConfig.by] || '').toLowerCase();
            valB = String(b[sortConfig.by] || '').toLowerCase();
        }

        if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
    });
    return data;
}

function generateTableControls(dataKey) {
    const sortConfig = tableSortState[dataKey] || { by: 'timestamp', dir: 'desc' };
    const arrow = sortConfig.dir === 'desc' ? '▼' : '▲';
    const isActive = sortConfig.by === 'timestamp' ? 'active' : '';

    return `
        <div class="table-controls" data-table-id="${dataKey}">
            <button class="btn btn--sm btn--outline sort-btn ${isActive} ${sortConfig.dir}" data-sort-by="timestamp">
                Urutkan Tanggal <span class="arrow">${isActive ? arrow : ''}</span>
            </button>
        </div>
    `;
}

// =================================================================================
// FUNGSI PENGAMBILAN & PENGIRIMAN DATA
// =================================================================================

async function uploadFile(file, collectionName, salesName) { // Tambahkan parameter
    if (!file) return null;
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0o1xUtRSksLhlZCgDYCyJt-FS1bM2rKzIIuKLPDV0IRbo_NWlR1PI1s0P04ESO_VyBw/exec";
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Buat payload dengan data tambahan
                const payload = {
                    fileName: file.name,
                    mimeType: file.type,
                    fileData: e.target.result,
                    collectionName: collectionName,
                    salesName: salesName
                };
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload), // Kirim payload yang sudah diperbarui
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                });
                const result = await response.json();
                if (result.status === "success" && result.url) {
                    resolve(result.url);
                } else {
                    throw new Error(result.message || 'Gagal mengunggah file.');
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function loadInitialData() {
    showMessage("Memuat data dari server...", "info");
    document.body.style.cursor = 'wait';

    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    try {
        const collectionsToFetch = Object.keys(CONFIG.dataMapping);
        const fetchPromises = collectionsToFetch.map(dataKey =>
            fetchWithAuth(`${API_BASE_URL}/data/${dataKey}?startDate=${periodStartDate.toISOString()}&endDate=${periodEndDate.toISOString()}&salesName=${currentUser.name}`)
        );

        const settingsPromises = [
            fetchWithAuth(`${API_BASE_URL}/settings/kpi`),
            fetchWithAuth(`${API_BASE_URL}/settings/timeOff`),
            fetchWithAuth(`${API_BASE_URL}/settings/cutoff`)
        ];

        const results = await Promise.all([...fetchPromises, ...settingsPromises]);

        collectionsToFetch.forEach((dataKey, index) => {
            currentData[dataKey] = results[index];
        });

        currentData.kpiSettings = results[collectionsToFetch.length];
        currentData.timeOff = results[collectionsToFetch.length + 1].entries || [];
        currentData.cutoffSettings = results[collectionsToFetch.length + 2];

        updateAllUI();
        showMessage("Data berhasil dimuat.", "success");

    } catch (error) {
        showMessage(`Gagal memuat data: ${error.message}`, 'error');
        console.error("Load data error:", error);
    } finally {
        document.body.style.cursor = 'default';
    }
}


async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const collectionName = form.dataset.sheetName;
    if (!collectionName) return;

    const dailyTargetDataKeys = CONFIG.targets.daily.map(t => t.dataKey);
    const isDailyTarget = dailyTargetDataKeys.includes(collectionName);
    
    if (isDailyTarget && currentData.cutoffSettings && currentData.cutoffSettings.isEnabled) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const cutoffTimeParts = currentData.cutoffSettings.time.split(':');
        const cutoffTime = parseInt(cutoffTimeParts[0]) * 60 + parseInt(cutoffTimeParts[1]);
        if (currentTime > cutoffTime) {
            showMessage(`Waktu input untuk target harian sudah lewat. Batas waktu adalah pukul ${currentData.cutoffSettings.time}.`, 'error');
            return;
        }
    }

    const button = form.querySelector('button[type="submit"]');
    let originalButtonText = button.innerHTML;
    button.innerHTML = '<span class="loading"></span> Mengirim...';
    button.disabled = true;

    try {
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            if (!(value instanceof File)) {
                data[key] = value;
            }
        }
        
        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                const downloadURL = await uploadFile(value, collectionName, currentUser.name);
                data[key] = downloadURL;
            }
        }

        data.sales = currentUser.name;
        data.timestamp = new Date().toISOString(); 
        data.datestamp = getDatestamp();
        data.validationStatus = 'Pending';
        data.validationNotes = '';
        
        if (collectionName === 'Leads') {
            data.status = 'Lead';
            data.statusLog = `${getDatestamp()}: Dibuat sebagai Lead.`;
        }
        
        await fetchWithAuth(`${API_BASE_URL}/data/${collectionName}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        showMessage('Data berhasil disimpan!', 'success');
        form.reset();
        loadInitialData();

    } catch (error) {
        showMessage(`Gagal menyimpan data: ${error.message}.`, 'error');
        console.error("Save data error:", error);
    } finally {
        button.innerHTML = originalButtonText;
        button.disabled = false;
    }
}

function getDealCollectionName(product) {
    const productLower = product.toLowerCase();
    if (product === 'Kamar Hotel B2B') {
        return 'B2BBookings';
    } else if (productLower.includes('venue') || productLower.includes('package')) {
        return 'VenueBookings';
    }
    return 'DealLainnya';
}

async function handleUpdateLead(e) {
    e.preventDefault();
    const form = e.target;
    const leadId = form.querySelector('#updateLeadId').value;
    const newStatus = form.querySelector('#updateStatus').value;
    const notes = form.querySelector('#statusLog').value;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
        const allLeadsAndProspects = [...(currentData.Leads || []), ...(currentData.Prospects || [])];
        const leadData = allLeadsAndProspects.find(item => item && item._id === leadId);

        if (!leadData) throw new Error('Data asli tidak ditemukan!');

        const sourceCollectionName = leadData.status === 'Lead' ? 'Leads' : 'Prospects';
        
        if (sourceCollectionName === 'Leads' && newStatus === 'Prospect') {
            const newData = { ...leadData };
            newData.status = 'Prospect';
            newData.statusLog = (newData.statusLog || '') + `\n${getDatestamp()}: Status diubah menjadi Prospect. Catatan: ${notes}`;
            newData.timestamp = new Date().toISOString();
            newData.datestamp = getDatestamp();
            
            await fetchWithAuth(`${API_BASE_URL}/data/Prospects`, { method: 'POST', body: JSON.stringify(newData) });
            await fetchWithAuth(`${API_BASE_URL}/data/Leads/${leadId}`, { method: 'PUT', body: JSON.stringify({ status: 'Prospect', statusLog: newData.statusLog }) });

        } else if (newStatus === 'Deal') {
            if (sourceCollectionName === 'Leads') {
                const prospectData = {
                    ...leadData,
                    status: 'Prospect',
                    statusLog: (leadData.statusLog || '') + `\n${getDatestamp()}: Status otomatis diubah menjadi Prospect saat konversi ke Deal.`,
                    timestamp: new Date().toISOString(),
                    datestamp: getDatestamp(),
                    validationStatus: 'Pending',
                    validationNotes: ''
                };
                delete prospectData.proofOfDeal;
                await fetchWithAuth(`${API_BASE_URL}/data/Prospects`, { method: 'POST', body: JSON.stringify(prospectData) });
                showMessage('Info: Data Prospek otomatis dibuat.', 'info');
            }

            const dealCollectionName = getDealCollectionName(leadData.product);
            const newData = { ...leadData };
            newData.status = 'Deal';
            newData.statusLog = (leadData.statusLog || '') + `\n${getDatestamp()}: Status diubah menjadi Deal. Catatan: ${notes}`;
            newData.timestamp = new Date().toISOString();
            newData.datestamp = getDatestamp();
            
            const proofInput = form.querySelector('#modalProofOfDeal');
            if (proofInput && proofInput.files.length > 0) {
                newData.proofOfDeal = await uploadFile(proofInput.files[0], dealCollectionName, currentUser.name);
            } else if (!leadData.proofOfDeal) {
                throw new Error('Bukti deal wajib diunggah saat mengubah status menjadi "Deal".');
            }

            await fetchWithAuth(`${API_BASE_URL}/data/${dealCollectionName}`, { method: 'POST', body: JSON.stringify(newData) });
            await fetchWithAuth(`${API_BASE_URL}/data/${sourceCollectionName}/${leadId}`, { method: 'PUT', body: JSON.stringify({ status: 'Deal', statusLog: newData.statusLog }) });

        } else {
            const updatedLog = (leadData.statusLog || '') + `\n${getDatestamp()}: Status diubah menjadi ${newStatus}. Catatan: ${notes}`;
            await fetchWithAuth(`${API_BASE_URL}/data/${sourceCollectionName}/${leadId}`, { method: 'PUT', body: JSON.stringify({ status: newStatus, statusLog: updatedLog }) });
        }

        showMessage('Status berhasil diperbarui!', 'success');
        closeModal();
        loadInitialData();

    } catch (error) {
        showMessage(`Gagal memperbarui status: ${error.message}`, 'error');
        console.error("Update Lead Error:", error);
    } finally {
        button.disabled = false;
    }
}

async function handleEditFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const collectionName = form.dataset.sheetName;
    const id = form.dataset.id;
    if (!collectionName || !id) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
        const allData = Object.values(currentData).flat();
        const originalData = allData.find(d => d && d._id === id);
        if (!originalData) {
            throw new Error("Dokumen yang akan diedit tidak ditemukan.");
        }

        const formData = new FormData(form);
        const dataToUpdate = {};
        
        for (const [key, value] of formData.entries()) {
            if (!(value instanceof File)) {
                dataToUpdate[key] = value;
            }
        }

        const fileInputPromises = [];
        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                fileInputPromises.push(
                    uploadFile(value, collectionName, currentUser.name).then(downloadURL => {
    dataToUpdate[key] = downloadURL;
})
                );
            }
        }
        await Promise.all(fileInputPromises);
        
        dataToUpdate.validationStatus = 'Pending';
        dataToUpdate.validationNotes = '';
        
        const editEntry = `${getDatestamp()}: Data diubah oleh ${currentUser.name}.`;
        dataToUpdate.revisionLog = originalData.revisionLog ? `${originalData.revisionLog}\n${editEntry}` : editEntry;
        
        if (collectionName === 'Leads' && !dataToUpdate.status) {
            dataToUpdate.status = 'Lead';
        } else if (collectionName === 'Prospects' && !dataToUpdate.status) {
            dataToUpdate.status = 'Prospect';
        }

        await fetchWithAuth(`${API_BASE_URL}/data/${collectionName}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dataToUpdate)
        });

        showMessage('Data berhasil diubah dan dikirim ulang untuk validasi!', 'success');
        closeModal();
        loadInitialData();

    } catch (error) {
        showMessage(`Gagal menyimpan perubahan: ${error.message}`, 'error');
        console.error("Edit Submit Error:", error);
    } finally {
        button.disabled = false;
    }
}


// =================================================================================
// FUNGSI UI & PERHITUNGAN
// =================================================================================

function updateSidebarMenuState() {
    const kpiSettings = currentData.kpiSettings || {};
    const allTargets = [...CONFIG.targets.daily, ...CONFIG.targets.weekly, ...CONFIG.targets.monthly];
    const pageToTargetId = {};
    allTargets.forEach(target => {
        if (!pageToTargetId[target.page]) {
            pageToTargetId[target.page] = [];
        }
        pageToTargetId[target.page].push(target.id);
    });

    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        const page = link.dataset.page;
        if (pageToTargetId[page]) {
            const allTargetsForPageDisabled = pageToTargetId[page].every(id => kpiSettings[id] === false);
            const existingSpan = link.querySelector('.inactive-span');
            if (allTargetsForPageDisabled) {
                if (!existingSpan) {
                    const span = document.createElement('span');
                    span.textContent = ' (non aktif)';
                    span.className = 'inactive-span';
                    link.appendChild(span);
                }
                link.style.pointerEvents = 'none';
                link.style.opacity = '0.5';
            } else {
                if (existingSpan) {
                    existingSpan.remove();
                }
                link.style.pointerEvents = 'auto';
                link.style.opacity = '1';
            }
        }
    });
}

function updateAllUI() {
    try {
        updateDashboard();
        updateAllSummaries();
        calculateAndDisplayPenalties();
        updateValidationBreakdown();
        renderPerformanceReport();
        updateSidebarMenuState();
        updateRejectedDataSidebar(); // [NEW] Panggil fungsi untuk update sidebar
    } catch (error) {
        console.error("Error updating UI:", error);
        showMessage("Terjadi kesalahan saat menampilkan data.", "error");
    }
}

// [NEW] Fungsi untuk menampilkan data yang ditolak di sidebar
function updateRejectedDataSidebar() {
    const container = document.getElementById('rejectedDataSidebar');
    const badge = document.getElementById('rejectedCountBadge');
    if (!container || !badge) return;

    let rejectedItems = [];
    Object.keys(CONFIG.dataMapping).forEach(dataKey => {
        const data = currentData[dataKey] || [];
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item && item.validationStatus && item.validationStatus.toLowerCase() === 'rejected') {
                    rejectedItems.push({ ...item, originalDataKey: dataKey });
                }
            });
        }
    });

    if (rejectedItems.length > 0) {
        badge.textContent = rejectedItems.length;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }

    sortData(rejectedItems, { by: 'timestamp', dir: 'desc' });

    container.innerHTML = '';
    if (rejectedItems.length === 0) {
        container.innerHTML = '<p class="empty-state-sidebar">Tidak ada data yang perlu direvisi.</p>';
        return;
    }

    rejectedItems.forEach(item => {
        const mainValue = item.customerName || item.meetingTitle || item.campaignName || item.institutionName || item.competitorName || item.eventName || item.campaignTitle || 'N/A';
        const itemElement = document.createElement('div');
        itemElement.className = 'rejected-item';
        itemElement.innerHTML = `
            <div class="rejected-item__info">
                <span class="rejected-item__title">${mainValue}</span>
                <span class="rejected-item__type">${item.originalDataKey}</span>
            </div>
            <button class="btn btn--sm btn--revise" onclick="openRevisionModal('${item._id}', '${item.originalDataKey}')">Revisi</button>
        `;
        container.appendChild(itemElement);
    });
}


function getFilteredData(dataType, validationFilter = ['approved']) {
    const data = currentData[dataType] || [];
    if (!Array.isArray(data)) return [];
    if (validationFilter.includes('all')) {
        return data;
    }
    const lowerCaseFilter = validationFilter.map(f => f.toLowerCase());
    return data.filter(item => item && item.validationStatus && lowerCaseFilter.includes(item.validationStatus.toLowerCase()));
}

function calculateProgressForAllStatuses(dataKey, startDate, endDate) {
    const data = currentData[dataKey] || [];
    if (!Array.isArray(data)) return 0;
    return data.filter(item => {
        if (!item || !(item.timestamp || item.datestamp)) return false;
        const itemDate = new Date(item.timestamp); 
        return itemDate >= startDate && itemDate <= endDate;
    }).length;
}

function updateDashboard() {
    if (!currentUser || !currentData.kpiSettings) return;
    document.getElementById('userDisplayName').textContent = currentUser.name;
    const kpiSettings = currentData.kpiSettings || {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    let dailyAchieved = 0;
    let dailyTotal = 0;
    CONFIG.targets.daily.forEach(target => {
        if (kpiSettings[target.id] !== false) {
            dailyAchieved += calculateProgressForAllStatuses(target.dataKey, todayStart, todayEnd);
            dailyTotal += target.target;
        }
    });
    updateProgressBar('daily', dailyAchieved, dailyTotal);
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    let weeklyAchieved = 0;
    let weeklyTotal = 0;
    CONFIG.targets.weekly.forEach(target => {
        if (kpiSettings[target.id] !== false) {
            weeklyAchieved += calculateProgressForAllStatuses(target.dataKey, weekStart, weekEnd);
            weeklyTotal += target.target;
        }
    });
    updateProgressBar('weekly', weeklyAchieved, weeklyTotal);
    let monthlyAchieved = 0;
    let monthlyTotal = 0;
    CONFIG.targets.monthly.forEach(target => {
        if (kpiSettings[target.id] !== false) {
            const allDataForTargetInPeriod = currentData[target.dataKey] || [];
            monthlyAchieved += allDataForTargetInPeriod.length;
            monthlyTotal += target.target;
        }
    });
    updateProgressBar('monthly', monthlyAchieved, monthlyTotal);
}

function calculateAndDisplayPenalties() {
    const potentialPenaltyEl = document.getElementById('potentialPenalty');
    const finalPenaltyEl = document.getElementById('finalPenalty');
    if (!potentialPenaltyEl || !finalPenaltyEl) return;
    const potentialPenalty = calculatePenaltyForValidationStatus(['approved', 'pending']);
    potentialPenaltyEl.textContent = formatCurrency(potentialPenalty);
    const finalPenalty = calculatePenaltyForValidationStatus(['approved']);
    finalPenaltyEl.textContent = formatCurrency(finalPenalty);
}

function calculatePenaltyForValidationStatus(validationFilter) {
    let totalPenalty = 0;
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const kpiSettings = currentData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);
    if (today < periodStartDate || !currentData.timeOff) return 0;
    CONFIG.targets.daily.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        datesToCheck.forEach(date => {
            if (!isDayOff(date, currentUser.name)) {
                const achievedToday = getFilteredData(target.dataKey, validationFilter)
                    .filter(d => {
                        if (!d) return false;
                        const itemDate = new Date(d.timestamp);
                        return itemDate.toDateString() === date.toDateString();
                    }).length;
                if (achievedToday < target.target) totalPenalty += target.penalty;
            }
        });
    });
    const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
    CONFIG.targets.weekly.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        sundaysInPeriod.forEach(sunday => {
            const weekStart = getWeekStart(sunday);
            const achievedThisWeek = getFilteredData(target.dataKey, validationFilter)
                .filter(d => {
                    if (!d) return false;
                    const itemDate = new Date(d.timestamp);
                    return itemDate >= weekStart && itemDate <= sunday;
                }).length;
            if (achievedThisWeek < target.target) totalPenalty += target.penalty;
        });
    });
    if (today > periodEndDate) {
        CONFIG.targets.monthly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            const achievedThisMonth = getFilteredData(target.dataKey, validationFilter).length;
            if (achievedThisMonth < target.target) totalPenalty += target.penalty;
        });
    }
    return totalPenalty;
}

function updateValidationBreakdown() {
    const container = document.getElementById('validationBreakdown');
    if (!container) return;
    let total = 0, approved = 0, pending = 0, rejected = 0;
    Object.keys(CONFIG.dataMapping).forEach(dataKey => {
        const data = currentData[dataKey] || [];
        if (Array.isArray(data)) {
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
}

function updateProgressBar(type, achieved, total) {
    const percentage = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;
    const progressFill = document.getElementById(`${type}Progress`);
    const percentageText = document.getElementById(`${type}Percentage`);
    const achievedText = document.getElementById(`${type}Achieved`);
    const totalText = document.getElementById(`${type}Total`);
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (percentageText) percentageText.textContent = `${percentage}%`;
    if (achievedText) achievedText.textContent = achieved;
    if (totalText) totalText.textContent = total;
}

function renderPerformanceReport() {
    const table = document.getElementById('performanceTable');
    const kpiSettings = currentData.kpiSettings || {};
    if (!table) return;
    const todayString = toLocalDateString(new Date());
    const periodDates = getDatesForPeriod();
    if (periodDates.length === 0) {
        table.innerHTML = '<tbody><tr><td>Pilih periode untuk melihat laporan.</td></tr></tbody>';
        return;
    }
    const weekDates = periodDates.slice(performanceReportWeekOffset * 7, (performanceReportWeekOffset * 7) + 7);
    const dailyCounts = {};
    const allTargets = [...CONFIG.targets.daily, ...CONFIG.targets.weekly, ...CONFIG.targets.monthly];
    allTargets.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        (currentData[target.dataKey] || []).forEach(item => {
            if (!item || !item.timestamp) return;
            const itemDate = new Date(item.timestamp);
            const dateString = toLocalDateString(itemDate);
            if (!dailyCounts[dateString]) dailyCounts[dateString] = {};
            if (!dailyCounts[dateString][target.dataKey]) dailyCounts[dateString][target.dataKey] = { P: 0, A: 0, R: 0 };
            const status = (item.validationStatus || 'pending').toLowerCase();
            if (status === 'pending') dailyCounts[dateString][target.dataKey].P++;
            else if (status === 'approved') dailyCounts[dateString][target.dataKey].A++;
            else if (status === 'rejected') dailyCounts[dateString][target.dataKey].R++;
        });
    });
    let tableHeaderHTML = '<thead><tr><th>Target KPI</th>';
    weekDates.forEach(date => {
        const isTodayClass = toLocalDateString(date) === todayString ? 'is-today' : '';
        tableHeaderHTML += `<th class="${isTodayClass}">${date.toLocaleDateString('id-ID', { weekday: 'short' })}<br>${date.getDate()}</th>`;
    });
    tableHeaderHTML += '</tr></thead>';
    let tableBodyHTML = '<tbody>';
    ['daily', 'weekly'].forEach(period => {
        CONFIG.targets[period].forEach(target => {
            if (kpiSettings[target.id] === false) return;
            tableBodyHTML += `<tr><td>${target.name} (${target.target})</td>`;
            weekDates.forEach(date => {
                const isTodayClass = toLocalDateString(date) === todayString ? 'is-today' : '';
                let cellContent = '';
                const dateString = toLocalDateString(date);
                if (period === 'daily') {
                    const counts = dailyCounts[dateString]?.[target.dataKey] || { P: 0, A: 0, R: 0 };
                    cellContent = isDayOff(date, currentUser.name)
                        ? '-'
                        : `<span class="par-cell"><span class="par-p">${counts.P}</span>/<span class="par-a">${counts.A}</span>/<span class="par-r">${counts.R}</span></span>`;
                } else if (period === 'weekly' && date.getDay() === 0) {
                    const weekStart = getWeekStart(date);
                    let weeklyP = 0, weeklyA = 0, weeklyR = 0;
                    for (let i = 0; i < 7; i++) {
                        const dayInWeek = new Date(weekStart);
                        dayInWeek.setDate(dayInWeek.getDate() + i);
                        const dayString = toLocalDateString(dayInWeek);
                        const counts = dailyCounts[dayString]?.[target.dataKey] || { P: 0, A: 0, R: 0 };
                        weeklyP += counts.P;
                        weeklyA += counts.A;
                        weeklyR += counts.R;
                    }
                    cellContent = `<span class="par-cell"><span class="par-p">${weeklyP}</span>/<span class="par-a">${weeklyA}</span>/<span class="par-r">${weeklyR}</span></span>`;
                }
                tableBodyHTML += `<td class="${isTodayClass}">${cellContent}</td>`;
            });
            tableBodyHTML += '</tr>';
        });
    });
    CONFIG.targets.monthly.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        let totalP = 0, totalA = 0, totalR = 0;
        (currentData[target.dataKey] || []).forEach(item => {
            const status = (item.validationStatus || 'pending').toLowerCase();
            if (status === 'pending') totalP++;
            else if (status === 'approved') totalA++;
            else if (status === 'rejected') totalR++;
        });
        tableBodyHTML += `<tr>
            <td>${target.name} (${target.target})</td>
            <td colspan="7" class="monthly-total-cell">
                Total Periode: 
                <span class="par-cell">
                    <span class="par-p">${totalP}</span>/<span class="par-a">${totalA}</span>/<span class="par-r">${totalR}</span>
                </span>
            </td>
        </tr>`;
    });
    tableBodyHTML += '</tbody>';
    table.innerHTML = tableHeaderHTML + tableBodyHTML;
    document.getElementById('prevWeekBtn').disabled = (performanceReportWeekOffset === 0);
    const totalWeeks = Math.ceil(periodDates.length / 7);
    document.getElementById('nextWeekBtn').disabled = (performanceReportWeekOffset >= totalWeeks - 1);
    const startRange = weekDates[0] ? weekDates[0].toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '';
    const endRange = weekDates.length > 0 ? weekDates[weekDates.length - 1].toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '';
    document.getElementById('weekRangeLabel').textContent = startRange && endRange ? `${startRange} - ${endRange}` : '...';
}

function renderTable(container, data, dataKey, mapping) {
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data untuk periode ini</div>`;
        return;
    }

    sortData(data, tableSortState[dataKey]);

    const controlsHTML = generateTableControls(dataKey);
    const rowGenerator = window[mapping.rowGenerator];
    const tableHTML = `
        <table>
            <thead><tr><th>${mapping.headers.join('</th><th>')}</th></tr></thead>
            <tbody>${data.map(item => item ? rowGenerator(item, item.originalDataKey || dataKey) : '').join('')}</tbody>
        </table>`;
    
    container.innerHTML = controlsHTML + tableHTML;
}

function updateAllSummaries() {
    const leadData = (currentData.Leads || []).filter(item => item && (item.status === 'Lead' || item.validationStatus === 'Rejected'));
    renderTable(document.getElementById('leadContent'), leadData, 'Leads', CONFIG.dataMapping['Leads']);

    const prospectData = (currentData.Prospects || []).filter(item => item && item.validationStatus !== 'Rejected' && !(item.statusLog && item.statusLog.includes('Status otomatis diubah')));
    renderTable(document.getElementById('prospectContent'), prospectData, 'Prospects', CONFIG.dataMapping['Prospects']);

    const allDeals = [
        ...(currentData.B2BBookings || []).map(d => ({...d, originalDataKey: 'B2BBookings'})),
        ...(currentData.VenueBookings || []).map(d => ({...d, originalDataKey: 'VenueBookings'})),
        ...(currentData.DealLainnya || []).map(d => ({...d, originalDataKey: 'DealLainnya'}))
    ];
    const dealMapping = {
        ...CONFIG.dataMapping['Leads'],
        rowGenerator: 'generateDealRow'
    };
    renderTable(document.getElementById('dealContent'), allDeals, 'Deals', dealMapping);

    Object.keys(CONFIG.dataMapping).forEach(dataKey => {
        if (['Leads', 'Prospects', 'B2BBookings', 'VenueBookings', 'DealLainnya'].includes(dataKey)) return;
        
        const mapping = CONFIG.dataMapping[dataKey];
        const container = document.getElementById(`${dataKey.toLowerCase()}Summary`);
        const data = currentData[dataKey] || [];
        renderTable(container, data, dataKey, mapping);
    });
}

function generateSimpleRow(item, dataKey) {
    const validationStatus = item.validationStatus || 'Pending';
    const statusClass = validationStatus.toLowerCase();
    const mainValue = item.customerName || item.meetingTitle || item.campaignName || item.institutionName || item.competitorName || item.eventName || item.campaignTitle || 'N/A';
    
    let actionCell = '';
    if (validationStatus.toLowerCase() === 'rejected') {
        actionCell = `<button class="btn btn--sm btn--revise" onclick="openRevisionModal('${item._id}', '${dataKey}'); event.stopPropagation();">Revisi</button>`;
    } else {
        actionCell = `<button class="btn btn--sm btn--secondary" onclick="openEditModal('${item._id}', '${dataKey}'); event.stopPropagation();">Edit</button>`;
    }

    return `
        <tr onclick="openDetailModal('${item._id}', '${dataKey}')">
            <td>${item.datestamp || ''}</td>
            <td>${mainValue}</td>
            <td><span class="status status--${statusClass}">${validationStatus}</span></td>
            <td>${actionCell}</td>
        </tr>`;
}

function generateLeadRow(item, dataKey) {
    const statusClass = (item.status || '').toLowerCase().replace(/\s+/g, '-');
    const validationStatus = item.validationStatus || 'Pending';
    const validationStatusClass = validationStatus.toLowerCase();

    let validationCell = `<span class="status status--${validationStatusClass}">${validationStatus}</span>`;
    if (validationStatus.toLowerCase() === 'rejected') {
        validationCell = `<button class="btn btn--sm btn--revise" onclick="openRevisionModal('${item._id}', '${dataKey}'); event.stopPropagation();">Revisi</button>`;
    }

    let actionButton = '';
    if ((dataKey === 'Leads' || dataKey === 'Prospects') && validationStatus.toLowerCase() !== 'rejected') {
        actionButton += `<button class="btn btn--sm btn--outline" onclick="openUpdateModal('${item._id}'); event.stopPropagation();">Update</button>`;
    }
    if (validationStatus.toLowerCase() !== 'rejected') {
        actionButton += `<button class="btn btn--sm btn--secondary" style="margin-left: 8px;" onclick="openEditModal('${item._id}', '${dataKey}'); event.stopPropagation();">Edit</button>`;
    }
    if (actionButton.trim() === '') {
        actionButton = '-';
    }

    return `
        <tr onclick="openDetailModal('${item._id}', '${dataKey}')">
            <td>${item.datestamp || ''}</td>
            <td>${item.customerName || ''}</td>
            <td>${item.product || ''}</td>
            <td><span class="status status--${statusClass}">${item.status || 'N/A'}</span></td>
            <td>${validationCell}</td>
            <td>${actionButton}</td>
        </tr>`;
}

function generateDealRow(item, dataKey) {
    const validationStatus = item.validationStatus || 'Pending';
    const validationStatusClass = validationStatus.toLowerCase();
    
    let actionCell = '';
    if (validationStatus.toLowerCase() === 'rejected') {
        actionCell = `<button class="btn btn--sm btn--revise" onclick="openRevisionModal('${item._id}', '${dataKey}'); event.stopPropagation();">Revisi</button>`;
    } else {
        actionCell = `<button class="btn btn--sm btn--secondary" onclick="openEditModal('${item._id}', '${dataKey}'); event.stopPropagation();">Edit</button>`;
    }

    return `
        <tr onclick="openDetailModal('${item._id}', '${dataKey}')">
            <td>${item.datestamp || ''}</td>
            <td>${item.customerName || ''}</td>
            <td>${item.product || ''}</td>
            <td><span class="status status--deal">Deal</span></td>
            <td><span class="status status--${validationStatusClass}">${validationStatus}</span></td>
            <td>${actionCell}</td>
        </tr>`;
}

function openUpdateModal(leadId) {
    const modal = document.getElementById('updateLeadModal');
    const allLeadsAndProspects = [...(currentData.Leads || []), ...(currentData.Prospects || [])];
    const lead = allLeadsAndProspects.find(l => l && l._id === leadId);
    if (!lead || !modal) {
        showMessage('Data untuk diupdate tidak ditemukan.', 'error');
        return;
    }
    document.getElementById('updateLeadId').value = lead._id;
    document.getElementById('modalCustomerName').textContent = lead.customerName;
    const statusSelect = document.getElementById('updateStatus');
    const proofContainer = document.getElementById('proofOfDealContainer');
    const proofInput = document.getElementById('modalProofOfDeal');
    statusSelect.innerHTML = '';
    const currentStatus = lead.status || 'Lead';
    document.getElementById('modalCurrentStatus').textContent = currentStatus;
    const statusElement = document.getElementById('modalCurrentStatus');
    statusElement.className = `status status--${currentStatus.toLowerCase().replace(/\s+/g, '-')}`;
    statusElement.style.paddingLeft = '0';
    if (currentStatus === 'Lead') {
        statusSelect.innerHTML = `<option value="Prospect">Prospect</option><option value="Deal">Deal</option><option value="Lost">Lost</option>`;
    } else if (currentStatus === 'Prospect') {
        statusSelect.innerHTML = `<option value="Deal">Deal</option><option value="Lost">Lost</option>`;
    }
    const toggleProofVisibility = () => {
        if (statusSelect.value === 'Deal') {
            proofContainer.style.display = 'block';
            proofInput.required = true;
        } else {
            proofContainer.style.display = 'none';
            proofInput.required = false;
        }
    };
    statusSelect.removeEventListener('change', toggleProofVisibility);
    statusSelect.addEventListener('change', toggleProofVisibility);
    toggleProofVisibility();
    modal.classList.add('active');
}

function openEditOrRevisionModal(itemId, dataKey, isRevision) {
    const allData = Object.values(currentData).flat();
    const item = allData.find(d => d && d._id === itemId);
    const mapping = CONFIG.dataMapping[dataKey];
    if (!item || !mapping) {
        showMessage('Data untuk diubah tidak ditemukan.', 'error');
        return;
    }

    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('editModalTitle');
    const form = document.getElementById('editForm');
    const rejectionNotesContainer = document.getElementById('rejectionNotesContainer');
    
    if (!modal || !modalTitle || !form || !rejectionNotesContainer) {
        console.error('Elemen modal edit tidak ditemukan!');
        return;
    }

    if (isRevision) {
        modalTitle.textContent = 'Revisi Data';
        document.getElementById('rejectionNotesText').textContent = item.validationNotes || 'Tidak ada catatan.';
        rejectionNotesContainer.style.display = 'block';
    } else {
        modalTitle.textContent = 'Edit Data';
        rejectionNotesContainer.style.display = 'none';
    }

    form.innerHTML = '';
    form.dataset.sheetName = mapping.collectionName;
    form.dataset.id = item._id;

    const pageId = FORM_PAGE_MAP[dataKey];
    const formTemplate = pageId ? document.querySelector(`#${pageId} .kpi-form`) : null;

    if (formTemplate) {
        form.innerHTML = formTemplate.innerHTML;
        for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && input.type !== 'file') {
                    input.value = item[key];
                }
            }
        }
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Simpan Perubahan';
        }
    } else {
        form.innerHTML = '<p class="message error">Tidak dapat memuat form edit.</p>';
        console.error(`Form template tidak ditemukan untuk dataKey: ${dataKey}`);
    }

    modal.classList.add('active');
}

function openEditModal(itemId, dataKey) {
    openEditOrRevisionModal(itemId, dataKey, false);
}

function openRevisionModal(itemId, dataKey) {
    openEditOrRevisionModal(itemId, dataKey, true);
}


function closeModal() {
    document.getElementById('updateLeadModal')?.classList.remove('active');
    document.getElementById('updateLeadForm')?.reset();
    document.getElementById('editModal')?.classList.remove('active');
    document.getElementById('editForm')?.reset();
}

function closeDetailModal() {
    document.getElementById('detailModal')?.classList.remove('active');
}

function openDetailModal(itemId, dataKey) {
    const allData = Object.values(currentData).flat();
    const item = allData.find(d => d && d._id === itemId);
    const mapping = CONFIG.dataMapping[dataKey];
    if (!item || !mapping) {
        console.error("Data atau mapping tidak ditemukan:", itemId, dataKey);
        showMessage("Tidak dapat menampilkan detail data.", "error");
        return;
    }
    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('detailModalTitle');
    const modalBody = document.getElementById('detailModalBody');
    if(!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = `Detail Data`;
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

function isDayOff(date, salesName) {
    if (date.getDay() === 0) return true;
    const dateString = toLocalDateString(date);
    const timeOffData = currentData.timeOff || [];
    if (!Array.isArray(timeOffData)) return false;
    return timeOffData.some(off => off && off.date === dateString && (off.sales === 'Global' || off.sales === salesName));
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
}

// =================================================================================
// INISIALISASI
// =================================================================================
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function setupEventListeners() {
    document.querySelectorAll('form.kpi-form').forEach(form => form.addEventListener('submit', handleFormSubmit));
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        showContentPage(link.getAttribute('data-page'));
    }));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('updateLeadForm')?.addEventListener('submit', handleUpdateLead);
    document.getElementById('editForm')?.addEventListener('submit', handleEditFormSubmit);
    document.querySelectorAll('#leadTabsContainer .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#leadTabsContainer .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#leadTabContentContainer .tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        if (performanceReportWeekOffset > 0) {
            performanceReportWeekOffset--;
            renderPerformanceReport();
        }
    });
    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        const periodDates = getDatesForPeriod();
        const totalWeeks = Math.ceil(periodDates.length / 7);
        if (performanceReportWeekOffset < totalWeeks - 1) {
            performanceReportWeekOffset++;
            renderPerformanceReport();
        }
    });

    document.querySelector('.main-content').addEventListener('click', (e) => {
        const sortButton = e.target.closest('.sort-btn');
        if (sortButton) {
            e.stopPropagation();
            const controlsDiv = sortButton.closest('.table-controls');
            if (!controlsDiv) return;

            const tableId = controlsDiv.dataset.tableId;
            const sortBy = sortButton.dataset.sortBy;

            if (!tableSortState[tableId]) return;

            const currentSort = tableSortState[tableId];
            let newDir = 'desc';
            
            if (currentSort.by === sortBy) {
                newDir = currentSort.dir === 'desc' ? 'asc' : 'desc';
            }
            
            tableSortState[tableId].by = sortBy;
            tableSortState[tableId].dir = newDir;
            
            updateAllSummaries();
        }
    });
}

function initializeApp() {
    if (!currentUser) return;
    document.body.setAttribute('data-role', currentUser.role);
    document.getElementById('userDisplayName').textContent = currentUser.name;
    updateDateTime();
    setInterval(updateDateTime, 60000);
    initializeTableSortState();
    setupEventListeners();
    setupFilters(() => {
        performanceReportWeekOffset = 0;
        loadInitialData();
    });
    loadInitialData();
}

// Mulai aplikasi
checkAuth();
