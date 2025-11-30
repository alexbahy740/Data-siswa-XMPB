# UI Data Siswa & Ledger MP-LB SMKN 1 Maluku Tengah

Project web responsif untuk manajemen data siswa kelas X MP-LB dan melihat ledger nilai.

## 🚀 Fitur
- **Data Siswa**: CRUD (Create, Read, Delete), Pencarian, Import/Export Excel.
- **Ledger Nilai**: Tampilan nilai mata pelajaran Umum & Kejuruan.
- **Responsif**: Tampilan mobile-friendly.

## ⚙️ Cara Instalasi & Upload ke GitHub

1. **Buat Repository Baru** di GitHub (misal: `mplb-siswa`).
2. **Upload File**: Upload semua file (`index.html`, `style.css`, `script.js`, dll) ke repository tersebut.
3. **Aktifkan GitHub Pages**:
   - Buka menu **Settings** di repository.
   - Pilih menu **Pages** di sidebar kiri.
   - Pada bagian **Build and deployment**, pilih Source: `Deploy from a branch`.
   - Pilih Branch: `main` (atau master), folder: `/ (root)`.
   - Klik **Save**. Tunggu 1-2 menit, link web akan muncul.

## 🔌 Cara Menghubungkan Google Sheets (WAJIB)

Agar fitur **Simpan** dan **Hapus** berfungsi permanen ke Google Sheets:

1. Buka Google Sheets baru.
2. Buat Header di Baris 1: `NO`, `NAMA`, `JK`, `NISN`, `NIS`, `TTL`.
3. Klik **Ekstensi** > **Apps Script**.
4. Hapus kode yang ada, copy-paste kode di bawah ini:

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  data.shift(); // Hapus header
  // Format ulang data ke JSON object... (bisa disesuaikan)
  return ContentService.createTextOutput(JSON.stringify({status:"success", data: data})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var json = JSON.parse(e.postData.contents);
  
  if(json.action == "add") {
    var d = json.data;
    sheet.appendRow([null, d.nama, d.jk, d.nisn, d.nis, d.ttl]);
    return ContentService.createTextOutput("Success");
  }
  
  if(json.action == "delete") {
    // Logika hapus baris
    sheet.deleteRow(json.data.row);
    return ContentService.createTextOutput("Deleted");
  }
}