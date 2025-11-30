// --- KONFIGURASI ---
// Ganti dengan URL Web App Google Apps Script Anda setelah deploy (Lihat README)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzC4BzGSb7gzIkK0V2o3EhlAcx51cgquZhn400frCGaaRcSMg6oWYylS-ubDfYsP6M/exec"; 

// Data Mockup Awal (Agar UI tidak kosong saat pertama kali dibuka)
let studentsData = [
    { no: 1, nama: "Ahmad Rizky", jk: "L", nisn: "0051234567", nis: "2324001", ttl: "Ambon, 12-05-2007" },
    { no: 2, nama: "Bunga Pertiwi", jk: "P", nisn: "0051234568", nis: "2324002", ttl: "Masohi, 22-08-2007" },
    { no: 3, nama: "Citra Lestari", jk: "P", nisn: "0051234569", nis: "2324003", ttl: "Saparua, 10-01-2008" }
];

// --- FUNGSI UTAMA ---

document.addEventListener("DOMContentLoaded", () => {
    renderTable();
    // Jika URL API sudah diisi, coba ambil data live
    if (GOOGLE_SCRIPT_URL !== "https://script.google.com/macros/s/AKfycbzC4BzGSb7gzIkK0V2o3EhlAcx51cgquZhn400frCGaaRcSMg6oWYylS-ubDfYsP6M/exec") {
        fetchDataFromGoogle();
    }
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- TAB DATA SISWA ---

function renderTable(data = studentsData) {
    const tbody = document.getElementById('siswaBody');
    tbody.innerHTML = "";

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Tidak ada data.</td></tr>`;
        return;
    }

    data.forEach((student, index) => {
        // Update nomor urut otomatis berdasarkan tampilan
        student.no = index + 1; 
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.no}</td>
            <td><strong>${student.nama}</strong></td>
            <td><span class="badge ${student.jk === 'L' ? 'badge-blue' : 'badge-pink'}">${student.jk}</span></td>
            <td>${student.nisn}</td>
            <td>${student.nis}</td>
            <td>${student.ttl}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="openDeleteModal(${index})">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleAddStudent(e) {
    e.preventDefault();
    showLoading(true);

    const form = e.target;
    const newStudent = {
        nama: form.nama.value,
        jk: form.jk.value,
        nisn: form.nisn.value,
        nis: form.nis.value,
        ttl: `${form.tempat_lahir.value}, ${formatDate(form.tanggal_lahir.value)}`
    };

    // 1. Update UI Lokal (Optimistic UI)
    studentsData.push(newStudent);
    renderTable();
    closeModal('addModal');
    form.reset();

    // 2. Kirim ke Google Sheets
    sendToAPI("add", newStudent);
}

function openDeleteModal(index) {
    document.getElementById('deleteTargetRow').value = index;
    openModal('deleteModal');
}

function confirmDelete() {
    const index = document.getElementById('deleteTargetRow').value;
    const student = studentsData[index];
    
    showLoading(true);
    
    // 1. Hapus dari UI Lokal
    studentsData.splice(index, 1);
    renderTable();
    closeModal('deleteModal');

    // 2. Hapus di Google Sheets (mengirim NISN sebagai ID unik misalnya, atau row index jika API mendukung)
    sendToAPI("delete", { row: parseInt(index) + 2 }); // +2 asumsi header ada di row 1
}

// --- UTILS & SEARCH ---

function searchTable() {
    const query = document.getElementById('searchSiswa').value.toLowerCase();
    const filtered = studentsData.filter(s => 
        s.nama.toLowerCase().includes(query) || 
        s.nisn.includes(query) || 
        s.nis.includes(query)
    );
    renderTable(filtered);
}

function sortTable(n) {
    // Implementasi simple sort (bisa dikembangkan)
    studentsData.sort((a, b) => {
        let valA = n === 0 ? a.no : a.nama.toLowerCase();
        let valB = n === 0 ? b.no : b.nama.toLowerCase();
        return valA < valB ? -1 : valA > valB ? 1 : 0;
    });
    renderTable();
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// --- IMPORT / EXPORT (SHEETJS) ---

function downloadTemplate(type) {
    const header = [["NO", "NAMA", "JK", "NISN", "NIS", "TEMPAT & TANGGAL LAHIR"]];
    const ws = XLSX.utils.aoa_to_sheet(header);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `template_data_siswa.${type}`);
}

function handleFileUpload(input) {
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
        
        // Hapus header
        jsonData.shift();
        
        // Masukkan ke data
        jsonData.forEach(row => {
            if(row[1]) { // Cek jika ada nama
                studentsData.push({
                    nama: row[1],
                    jk: row[2] || "-",
                    nisn: row[3] || "-",
                    nis: row[4] || "-",
                    ttl: row[5] || "-"
                });
            }
        });
        
        renderTable();
        showToast("Data berhasil diimport!");
        // Disini bisa ditambahkan loop untuk sendToAPI jika ingin sync otomatis
    };
    reader.readAsArrayBuffer(file);
}

// --- API GOOGLE SHEETS CONNECTION ---

async function sendToAPI(action, payload) {
    if (GOOGLE_SCRIPT_URL === "https://script.google.com/macros/s/AKfycbzC4BzGSb7gzIkK0V2o3EhlAcx51cgquZhn400frCGaaRcSMg6oWYylS-ubDfYsP6M/exec") {
        showLoading(false);
        showToast("Mode Demo: Data disimpan lokal saja.");
        return;
    }

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors", // Penting untuk Google Apps Script Web App
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action, data: payload })
        });
        
        // Karena no-cors, kita tidak bisa baca response JSON, kita asumsikan berhasil
        showToast(`Berhasil: ${action}`);
    } catch (error) {
        console.error("Error:", error);
        showToast("Gagal terhubung ke server");
    } finally {
        showLoading(false);
    }
}

async function fetchDataFromGoogle() {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const result = await response.json();
        if(result.data) {
            studentsData = result.data; // Asumsi format data cocok
            renderTable();
        }
    } catch (e) {
        console.log("Gagal load data live");
    }
}

// --- MODAL & UI HELPERS ---

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function showLoading(show) { 
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show); 
}
function showToast(msg) {
    const x = document.getElementById("toast");
    x.innerText = msg;
    x.className = "toast show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}
function refreshData() {
    showLoading(true);
    setTimeout(() => { showLoading(false); renderTable(); showToast("Data disegarkan"); }, 800);
}

// Menutup modal jika klik di luar
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}