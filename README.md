# Stat Prototype Group 2 - Aplikasi Web Statistik Deskriptif Modern

Aplikasi web interaktif, responsif, dan siap pakai untuk pengolahan data statistik deskriptif lengkap dengan visualisasi grafis menggunakan **HTML5**, **Tailwind CSS (CDN)**, **JavaScript (ES6+)**, **Plotly.js (CDN)**, dan **PapaParse (CDN)**.

---

## 🚀 Fitur Utama

### 1. Masukan Data Fleksibel & Cerdas
- **Input Manual (Deret Angka)**:
  - Textarea interaktif dengan monospace font dan deteksi jumlah angka secara *real-time*.
  - Mendukung berbagai macam pemisah: koma (`,`), spasi (` `), titik koma (`;`), atau baris baru (`\n`).
  - Pemrosesan angka desimal menggunakan titik (`.`).
- **Upload File CSV (PapaParse CDN)**:
  - Drag-and-drop file zone atau pemilih file langsung.
  - Parsing otomatis file `.csv` dengan deteksi baris header.
  - Dropdown dinamis untuk memilih kolom numerik yang ingin dianalisis jika file CSV memiliki multi-kolom.
  - Deteksi otomatis kolom dengan proporsi data numerik tinggi.
  - Pratinjau (*preview*) 3 baris pertama data tabel CSV.
- **Tombol Aksi**:
  - `Proses / Hitung Data`: Menjalankan validasi dan kalkulasi seluruh parameter statistik.
  - `Muat Data Contoh (Outlier Demo)`: Memuat 22 data uji representatif yang dirancang khusus memiliki outlier bawah dan outlier atas.
  - `Reset`: Mengembalikan semua masukan dan dashboard ke kondisi awal.

### 2. Dashboard Hasil 14 Parameter Statistik Lengkap
Dihitung secara serentak dan disajikan dalam format grid card modern (glassmorphism):
1. **Jumlah data ($n$)**
2. **Total nilai ($\Sigma x$)**
3. **Mean / Rata-rata ($\bar{x} = \frac{\Sigma x}{n}$)**
4. **Median ($Me$)**: Nilai tengah data terurut (Persentil 50).
5. **Modus ($Mo$)**: Klasifikasi otomatis (Unimodal, Bimodal, Multimodal, atau "Tidak ada modus" jika semua frekuensi kemunculan seragam).
6. **Nilai Minimum ($X_{min}$)**
7. **Nilai Maksimum ($X_{max}$)**
8. **Jangkauan / Range ($R = X_{max} - X_{min}$)**
9. **Varians**: Varians Sampel ($s^2 = \frac{\Sigma(x_i - \bar{x})^2}{n - 1}$) sebagai metrik utama, dan Varians Populasi ($\sigma^2 = \frac{\Sigma(x_i - \bar{x})^2}{n}$) sebagai info sekunder.
10. **Standar Deviasi**: Standar Deviasi Sampel ($s = \sqrt{s^2}$) dan Standar Deviasi Populasi ($\sigma = \sqrt{\sigma^2}$).
11. **Kuartil 1 ($Q_1$)**: Persentil ke-25 (metode interpolasi linier standar R-7 / Excel).
12. **Kuartil 3 ($Q_3$)**: Persentil ke-75.
13. **Interquartile Range ($IQR = Q_3 - Q_1$)**
14. **Deteksi Outlier ($1.5 \times IQR$ - Tukey's Fences)**:
    - Batas Bawah: $LB = Q_1 - 1.5 \times IQR$
    - Batas Atas: $UB = Q_3 + 1.5 \times IQR$
    - Daftar badge dan jumlah nilai yang tergolong outlier bawah ($< LB$) maupun outlier atas ($> UB$).

*Catatan Format*: Seluruh angka pecahan dibulatkan secara cerdas maksimal **4 desimal** tanpa trailing zero.

### 3. Visualisasi Grafis Interaktif (Plotly.js)
- **Histogram Distribusi Frekuensi**: Dilengkapi garis vertikal penanda posisi Mean (garis oranye putus-putus) dan Median (garis hijau titik-titik) beserta label anotasi nilai.
- **Box & Whisker Plot Interaktif**: Menampilkan sebaran lima serangkai ($X_{min}, Q_1, Me, Q_3, X_{max}$), marker Mean, sebaran seluruh titik data (*jitter points*), dan titik outlier berwarna merah. Tersedia tombol toggle orientasi **Horizontal** atau **Vertikal**.
- **Tabel Distribusi Frekuensi Kelompok (Aturan Sturges)**:
  - Banyak kelas: $k = 1 + 3.322 \times \log_{10}(n)$
  - Panjang kelas: $c = \frac{Range}{k}$
  - Kolom lengkap: Nomor Kelas, Interval Kelas, Tepi Kelas ($TB - TA$), Titik Tengah ($x_i$), Frekuensi Absolut ($f_i$), Frekuensi Relatif ($f_r$ %), Frekuensi Kumulatif Kurang Dari ($F_k \le$), dan Frekuensi Kumulatif Lebih Dari ($F_k \ge$).
- **Diagram Batang Frekuensi**: Visualisasi grafik batang untuk frekuensi per interval kelas.

### 4. Fitur Ekspor & Presentasi
- Salin ringkasan laporan statistik deskriptif langsung ke *Clipboard*.
- Ekspor ringkasan 14 parameter ke file `.csv`.
- Tombol cetak / simpan laporan ke PDF (*Print optimized stylesheet*).
- Modal interaktif panduan rumus statistik deskriptif.
- Data Viewer: Daftar seluruh deret angka terurut dengan badge khusus untuk Min, Q1, Median, Q3, Max, dan Outlier.

---

## 📂 Struktur Berkas Proyek

```text
stat-deskriptif-app/
├── index.html            # Struktur antarmuka web semantik & modern
├── style.css             # Kustomisasi CSS, tema gelap, glassmorphism, dan print styling
├── script.js             # Logika statistik, parser CSV, validasi, dan controller Plotly
├── sample_mahasiswa.csv  # Berkas CSV contoh dengan multi-kolom untuk pengujian
└── README.md             # Dokumentasi teknis aplikasi
```

---

## 💻 Cara Menjalankan Aplikasi

Aplikasi ini bersifat murni **client-side** (berjalan langsung di browser web) tanpa membutuhkan kompilasi backend khusus:
1. Buka berkas `index.html` menggunakan browser modern pilihan Anda (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
2. Anda langsung dapat menguji aplikasi dengan mengklik tombol **"Muat Data Contoh (Outlier Demo)"** atau memasukkan deret angka sendiri.
3. Anda juga dapat menguji fitur CSV dengan mengunggah berkas `sample_mahasiswa.csv` yang disertakan di dalam folder ini.
