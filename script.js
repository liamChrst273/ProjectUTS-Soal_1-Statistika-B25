/**
 * Stat Prototype Group 2 - Aplikasi Web Pengolahan Data Statistik Deskriptif
 * Dibangun dengan HTML5, Tailwind CSS, Vanilla JavaScript (ES6+), Plotly.js, dan PapaParse.
 * 
 * Modul ini mencakup:
 * 1. Parser Input Fleksibel (Manual & CSV multi-kolom)
 * 2. Validasi Input Ketat & Ramah Pengguna
 * 3. Mesin Hitung 14 Parameter Statistik Deskriptif (Format maks 4 desimal)
 * 4. Pembuat Tabel Distribusi Frekuensi (Aturan Sturges)
 * 5. Visualisasi Interaktif Plotly.js (Histogram, Boxplot, Diagram Batang)
 * 6. Ekspor Laporan & Manajemen State UI
 */

// ==========================================
// 1. STATE & KONFIGURASI APLIKASI
// ==========================================
const AppState = {
  activeTab: 'manual',        // 'manual' | 'csv'
  activeChartTab: 'histogram',// 'histogram' | 'boxplot' | 'frequency'
  boxplotOrientation: 'h',    // 'h' | 'v'
  currentData: [],            // Array angka numerik terurut
  rawInputString: '',
  csvData: null,              // Objek PapaParse mentah
  csvHeaders: [],
  selectedCsvColumn: '',
  stats: null,                // Objek hasil 14 parameter statistik
  frequencyTable: null        // Tabel distribusi frekuensi Sturges
};

// Data Contoh bawaan (Dirancang memiliki sebaran representatif & outlier nyata)
// Contoh: Nilai ujian 22 siswa dengan outlier bawah (15) dan outlier atas (115, 120)
const SAMPLE_DATASET = [
  15, 48, 52, 55, 58, 60, 61, 62, 63, 65, 
  66, 68, 70, 72, 75, 78, 80, 82, 85, 90, 
  115, 120
];

// ==========================================
// 2. HELPER UTILITY & FORMATTER
// ==========================================

/**
 * Format angka dengan maksimal 4 desimal jika pecahan.
 * Menghilangkan trailing zero (misal 12.5000 -> 12.5, 25.0 -> 25).
 * @param {number} num 
 * @param {number} maxDecimals 
 * @returns {string}
 */
function formatNum(num, maxDecimals = 4) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  if (Number.isInteger(num)) return num.toString();
  
  // Bulatkan ke maxDecimals untuk menghindari floating point artifact
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
  return rounded.toString();
}

/**
 * Menampilkan pesan alert/notifikasi ramah pengguna
 * @param {string} message - Pesan notifikasi
 * @param {'error' | 'success' | 'warning' | 'info'} type - Tipe alert
 */
function showAlert(message, type = 'error') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;

  const bgColors = {
    error: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    success: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    warning: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    info: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
  };

  const icons = {
    error: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    success: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    warning: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    info: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
  };

  alertContainer.innerHTML = `
    <div class="flex items-start gap-3 p-4 rounded-xl border ${bgColors[type]} transition-all duration-300 shadow-lg">
      ${icons[type]}
      <div class="flex-1 text-sm font-medium leading-relaxed">${message}</div>
      <button onclick="dismissAlert()" class="opacity-70 hover:opacity-100 transition-opacity p-1 -mr-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  `;
  alertContainer.classList.remove('hidden');
}

function dismissAlert() {
  const alertContainer = document.getElementById('alert-container');
  if (alertContainer) {
    alertContainer.classList.add('hidden');
    alertContainer.innerHTML = '';
  }
}

// ==========================================
// 3. PARSING DATA & VALIDASI KETAT
// ==========================================

/**
 * Parsing teks deret angka dari input manual.
 * Mendukung pemisah: koma (,), spasi ( ), titik koma (;), atau baris baru (\n).
 * Mengembalikan objek hasil validasi dan array angka.
 * @param {string} text 
 * @returns {{ valid: boolean, numbers: number[], errors: string[] }}
 */
function parseManualText(text) {
  if (!text || text.trim() === '') {
    return { valid: false, numbers: [], errors: ['Input data masih kosong. Silakan masukkan deret angka atau muat data contoh.'] };
  }

  // Pisahkan berdasarkan koma, titik koma, spasi ganda, atau baris baru
  const tokens = text
    .split(/[\s,;]+/)
    .map(t => t.trim())
    .filter(t => t !== '');

  if (tokens.length === 0) {
    return { valid: false, numbers: [], errors: ['Tidak ada data yang ditemukan dalam teks input.'] };
  }

  const numbers = [];
  const invalidTokens = [];

  for (const token of tokens) {
    // Normalisasi: jika pengguna mengetik koma desimal tunggal seperti "12,5" setelah split token
    let cleanToken = token;
    
    // Periksa apakah token adalah angka valid (mendukung desimal dan notasi ilmiah)
    const num = Number(cleanToken);
    if (!isNaN(num) && isFinite(num)) {
      numbers.push(num);
    } else {
      invalidTokens.push(token);
    }
  }

  if (invalidTokens.length > 0) {
    const previewInvalid = invalidTokens.slice(0, 5).map(t => `"${t}"`).join(', ');
    const moreText = invalidTokens.length > 5 ? ` dan ${invalidTokens.length - 5} lainnya` : '';
    return {
      valid: false,
      numbers: [],
      errors: [
        `Ditemukan ${invalidTokens.length} data bukan angka (non-numerik): ${previewInvalid}${moreText}. Harap masukkan hanya angka dengan pemisah koma, titik koma, spasi, atau baris baru.`
      ]
    };
  }

  if (numbers.length < 2) {
    return {
      valid: false,
      numbers: numbers,
      errors: ['Jumlah data minimal 2 angka untuk dapat menghitung Varians Sampel (derajat bebas n - 1).']
    };
  }

  return { valid: true, numbers, errors: [] };
}

// ==========================================
// 4. MESIN PERHITUNGAN STATISTIK DESKRIPTIF
// ==========================================

/**
 * Menghitung ke-14 parameter statistik deskriptif secara lengkap dan akurat.
 * @param {number[]} rawData - Array angka numerik
 * @returns {object} Objek hasil perhitungan statistik
 */
function calculateDescriptiveStats(rawData) {
  // Salin dan urutkan data secara ascending
  const sorted = [...rawData].sort((a, b) => a - b);
  const n = sorted.length;

  // 1. Jumlah Data (n)
  const count = n;

  // 2. Total Nilai (Σx)
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  // 3. Mean / Rata-rata (x̄ = Σx / n)
  const mean = sum / n;

  // 4. Median (Nilai Tengah)
  let median;
  if (n % 2 === 1) {
    median = sorted[Math.floor(n / 2)];
  } else {
    const mid1 = sorted[(n / 2) - 1];
    const mid2 = sorted[n / 2];
    median = (mid1 + mid2) / 2;
  }

  // 5. Modus (Nilai yang paling sering muncul)
  const freqMap = new Map();
  for (const num of sorted) {
    freqMap.set(num, (freqMap.get(num) || 0) + 1);
  }

  let maxFreq = 0;
  for (const freq of freqMap.values()) {
    if (freq > maxFreq) maxFreq = freq;
  }

  // Evaluasi keberadaan modus:
  // Jika semua elemen memiliki frekuensi sama (misal semua muncul 1 kali, atau semua muncul 2 kali),
  // maka data dianggap TIDAK MEMILIKI MODUS.
  let modes = [];
  const uniqueFreqs = new Set(freqMap.values());
  const hasMode = maxFreq > 1 && uniqueFreqs.size > 1;

  let modeText = 'Tidak ada modus';
  let modeClassification = 'Semua nilai memiliki frekuensi yang sama';

  if (hasMode) {
    for (const [val, freq] of freqMap.entries()) {
      if (freq === maxFreq) modes.push(val);
    }
    modes.sort((a, b) => a - b);

    if (modes.length === 1) {
      modeClassification = `Unimodal (Frekuensi: ${maxFreq}x)`;
      modeText = modes.map(m => formatNum(m)).join(', ');
    } else if (modes.length === 2) {
      modeClassification = `Bimodal (Frekuensi: ${maxFreq}x)`;
      modeText = modes.map(m => formatNum(m)).join(', ');
    } else {
      modeClassification = `Multimodal (Frekuensi: ${maxFreq}x)`;
      modeText = modes.map(m => formatNum(m)).join(', ');
    }
  }

  // 6. Nilai Minimum (Xmin)
  const min = sorted[0];

  // 7. Nilai Maksimum (Xmax)
  const max = sorted[n - 1];

  // 8. Range / Jangkauan (R = Xmax - Xmin)
  const range = max - min;

  // 9. Varians:
  // Jumlah kuadrat selisih dari mean: SS = Σ(xi - x̄)²
  const ss = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  
  // Varians Sampel (s² = SS / (n - 1))
  const sampleVariance = n > 1 ? ss / (n - 1) : 0;
  
  // Varians Populasi (σ² = SS / n)
  const populationVariance = ss / n;

  // 10. Standar Deviasi:
  // Standar Deviasi Sampel (s = √s²)
  const sampleStdDev = Math.sqrt(sampleVariance);
  // Standar Deviasi Populasi (σ = √σ²)
  const populationStdDev = Math.sqrt(populationVariance);

  // 11 & 12. Kuartil 1 (Q1) dan Kuartil 3 (Q3)
  // Menggunakan interpolasi linier standar (Metode R-7 / Excel PERCENTILE.INC)
  const calculatePercentile = (p) => {
    if (n === 1) return sorted[0];
    const index = p * (n - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const weight = index - lowerIndex;
    return sorted[lowerIndex] + weight * (sorted[upperIndex] - sorted[lowerIndex]);
  };

  const q1 = calculatePercentile(0.25);
  const q3 = calculatePercentile(0.75);

  // 13. Interquartile Range (IQR = Q3 - Q1)
  const iqr = q3 - q1;

  // 14. Deteksi Outlier (Metode 1.5 × IQR)
  // Batas Bawah = Q1 - (1.5 × IQR)
  // Batas Atas  = Q3 + (1.5 × IQR)
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const lowerOutliers = [];
  const upperOutliers = [];
  const allOutliers = [];

  for (const num of sorted) {
    if (num < lowerFence) {
      lowerOutliers.push(num);
      allOutliers.push(num);
    } else if (num > upperFence) {
      upperOutliers.push(num);
      allOutliers.push(num);
    }
  }

  return {
    n: count,
    sum,
    mean,
    median,
    modeText,
    modeClassification,
    modes,
    maxFreq,
    hasMode,
    min,
    max,
    range,
    sampleVariance,
    populationVariance,
    sampleStdDev,
    populationStdDev,
    q1,
    q3,
    iqr,
    lowerFence,
    upperFence,
    lowerOutliers,
    upperOutliers,
    allOutliers,
    sortedData: sorted
  };
}

// ==========================================
// 5. TABEL DISTRIBUSI FREKUENSI (ATURAN STURGES)
// ==========================================

/**
 * Membuat tabel distribusi frekuensi kelompok berdasarkan Aturan Sturges:
 * Banyak kelas k = 1 + 3.322 × log10(n)
 * Panjang kelas c = Range / k
 * @param {number[]} sorted 
 * @param {object} stats 
 * @returns {object}
 */
function generateFrequencyDistribution(sorted, stats) {
  const n = sorted.length;
  const min = stats.min;
  const max = stats.max;
  const range = stats.range;

  if (range === 0) {
    // Semua nilai sama
    return {
      k: 1,
      classWidth: 1,
      rows: [{
        classNumber: 1,
        interval: `${min} - ${max}`,
        boundaries: `${min - 0.5} - ${max + 0.5}`,
        midpoint: min,
        frequency: n,
        relFrequency: 100,
        cumFreqLess: n,
        cumFreqMore: n
      }],
      totalFreq: n,
      totalRelFreq: 100
    };
  }

  // Hitung jumlah kelas k dengan Aturan Sturges
  let k = Math.round(1 + 3.322 * Math.log10(n));
  if (k < 3) k = 3;
  if (k > 12) k = 12; // Batas wajar tampilan

  // Panjang kelas c
  let c = range / k;
  // Jika data seluruhnya bilangan bulat, buat panjang kelas sedikit lebih luas atau bulat
  const isAllInteger = sorted.every(x => Number.isInteger(x));
  if (isAllInteger && c >= 1) {
    c = Math.ceil(c);
  } else {
    // Bulatkan c ke 4 desimal ke atas
    c = Math.ceil(c * 10000) / 10000;
  }

  const rows = [];
  let currentLower = min;
  let cumLess = 0;

  for (let i = 0; i < k; i++) {
    const isLastClass = (i === k - 1);
    const lower = currentLower;
    // Kelas atas
    let upper = lower + c;
    if (isAllInteger && c >= 1) {
      upper = lower + c - 1;
    }

    // Pastikan kelas terakhir mencakup nilai maksimum
    if (isLastClass && upper < max) {
      upper = max;
    }

    // Hitung frekuensi fi
    let fi = 0;
    for (const val of sorted) {
      if (isLastClass) {
        if (val >= lower && val <= (upper + 0.000001)) fi++;
      } else {
        if (isAllInteger) {
          if (val >= lower && val <= upper) fi++;
        } else {
          if (val >= lower && val < upper) fi++;
        }
      }
    }

    cumLess += fi;
    const midpoint = (lower + upper) / 2;
    const boundaryLower = isAllInteger ? lower - 0.5 : lower;
    const boundaryUpper = isAllInteger ? upper + 0.5 : upper;

    rows.push({
      classNumber: i + 1,
      lowerLimit: lower,
      upperLimit: upper,
      interval: `${formatNum(lower)} - ${formatNum(upper)}`,
      boundaries: `${formatNum(boundaryLower)} - ${formatNum(boundaryUpper)}`,
      midpoint: midpoint,
      frequency: fi,
      relFrequency: (fi / n) * 100,
      cumFreqLess: cumLess,
      cumFreqMore: 0 // Diisi pada pass kedua
    });

    currentLower = isAllInteger ? upper + 1 : upper;
  }

  // Hitung Frekuensi Kumulatif Lebih Dari
  let cumMore = n;
  for (let i = 0; i < rows.length; i++) {
    rows[i].cumFreqMore = cumMore;
    cumMore -= rows[i].frequency;
  }

  return {
    k,
    classWidth: c,
    rows,
    totalFreq: n,
    totalRelFreq: 100
  };
}

// ==========================================
// 6. VISUALISASI INTERAKTIF PLOTLY.JS
// ==========================================

const PLOTLY_DARK_LAYOUT = {
  font: { family: 'Plus Jakarta Sans, sans-serif', color: '#94a3b8', size: 12 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(15, 23, 42, 0.4)',
  margin: { l: 55, r: 35, t: 40, b: 50 },
  autosize: true,
  xaxis: {
    gridcolor: 'rgba(255, 255, 255, 0.07)',
    zerolinecolor: 'rgba(255, 255, 255, 0.15)',
    tickfont: { color: '#94a3b8' }
  },
  yaxis: {
    gridcolor: 'rgba(255, 255, 255, 0.07)',
    zerolinecolor: 'rgba(255, 255, 255, 0.15)',
    tickfont: { color: '#94a3b8' }
  }
};

const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'hoverClosestCartesian', 'hoverCompareCartesian'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'stat_prototype_group2_chart',
    height: 600,
    width: 900,
    scale: 2
  }
};

/**
 * Render Histogram Distribusi Frekuensi dengan garis vertikal Mean & Median
 */
function renderHistogramPlot(data, stats) {
  const container = document.getElementById('plot-container');
  if (!container || !window.Plotly) return;

  const trace = {
    x: data,
    type: 'histogram',
    name: 'Distribusi Frekuensi',
    marker: {
      color: 'rgba(99, 102, 241, 0.65)',
      line: {
        color: '#818cf8',
        width: 1.5
      }
    },
    opacity: 0.9,
    hovertemplate: 'Rentang Nilai: %{x}<br>Frekuensi: %{y}<extra></extra>'
  };

  const layout = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: '<b>Histogram Distribusi Frekuensi Data</b>',
      font: { color: '#f8fafc', size: 15 },
      x: 0.05
    },
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      title: { text: 'Nilai Data', font: { color: '#cbd5e1', size: 12 } }
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Frekuensi (Kemunculan)', font: { color: '#cbd5e1', size: 12 } }
    },
    shapes: [
      // Garis Vertikal Penanda Mean
      {
        type: 'line',
        x0: stats.mean,
        x1: stats.mean,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: '#f97316', // Orange
          width: 2.5,
          dash: 'dashdot'
        }
      },
      // Garis Vertikal Penanda Median
      {
        type: 'line',
        x0: stats.median,
        x1: stats.median,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: '#10b981', // Emerald
          width: 2.5,
          dash: 'dot'
        }
      }
    ],
    annotations: [
      {
        x: stats.mean,
        y: 1,
        yref: 'paper',
        text: `Mean: ${formatNum(stats.mean)}`,
        showarrow: true,
        arrowhead: 2,
        arrowcolor: '#f97316',
        arrowsize: 1,
        ax: 35,
        ay: -25,
        font: { color: '#f97316', size: 11, family: 'JetBrains Mono, monospace' },
        bgcolor: 'rgba(15, 23, 42, 0.85)',
        bordercolor: '#f97316',
        borderwidth: 1
      },
      {
        x: stats.median,
        y: 0.85,
        yref: 'paper',
        text: `Median: ${formatNum(stats.median)}`,
        showarrow: true,
        arrowhead: 2,
        arrowcolor: '#10b981',
        arrowsize: 1,
        ax: -40,
        ay: -20,
        font: { color: '#10b981', size: 11, family: 'JetBrains Mono, monospace' },
        bgcolor: 'rgba(15, 23, 42, 0.85)',
        bordercolor: '#10b981',
        borderwidth: 1
      }
    ]
  };

  Plotly.react(container, [trace], layout, PLOTLY_CONFIG);
}

/**
 * Render Boxplot Interaktif (Horizontal / Vertical) dengan sebaran Q1, Median, Q3, dan Outliers
 */
function renderBoxplotPlot(data, stats, orientation = 'h') {
  const container = document.getElementById('plot-container');
  if (!container || !window.Plotly) return;

  const isHorizontal = orientation === 'h';

  const trace = {
    [isHorizontal ? 'x' : 'y']: data,
    type: 'box',
    name: 'Sebaran Data',
    boxpoints: 'all',          // Tampilkan semua titik data
    jitter: 0.35,              // Jitter sebaran titik agar tidak saling menumpuk
    pointpos: -1.8,            // Posisi sebaran titik di samping box
    boxmean: 'sd',             // Tampilkan Mean dan Garis Standar Deviasi
    marker: {
      color: '#6366f1',
      size: 6,
      outliercolor: '#ef4444', // Merah untuk outlier
      symbol: 'circle'
    },
    line: {
      color: '#818cf8',
      width: 2
    },
    fillcolor: 'rgba(99, 102, 241, 0.25)',
    hoveron: 'boxes+points',
    hovertemplate: isHorizontal 
      ? 'Nilai: %{x}<extra></extra>' 
      : 'Nilai: %{y}<extra></extra>'
  };

  const layout = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: `<b>Box & Whisker Plot Interaktif (${isHorizontal ? 'Horizontal' : 'Vertikal'})</b>`,
      font: { color: '#f8fafc', size: 15 },
      x: 0.05
    },
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      title: { text: isHorizontal ? 'Nilai Data' : '', font: { color: '#cbd5e1', size: 12 } }
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: !isHorizontal ? 'Nilai Data' : '', font: { color: '#cbd5e1', size: 12 } }
    },
    annotations: [
      {
        xref: 'paper',
        yref: 'paper',
        x: 0.98,
        y: 0.05,
        text: `Q1: ${formatNum(stats.q1)} | Me: ${formatNum(stats.median)} | Q3: ${formatNum(stats.q3)} | Outlier: ${stats.allOutliers.length}`,
        showarrow: false,
        font: { color: '#94a3b8', size: 11, family: 'JetBrains Mono, monospace' },
        bgcolor: 'rgba(15, 23, 42, 0.7)',
        bordercolor: 'rgba(255, 255, 255, 0.1)',
        borderwidth: 1
      }
    ]
  };

  Plotly.react(container, [trace], layout, PLOTLY_CONFIG);
}

/**
 * Render Diagram Batang Frekuensi
 */
function renderFrequencyBarChart(freqTable) {
  const container = document.getElementById('plot-container');
  if (!container || !window.Plotly || !freqTable) return;

  const categories = freqTable.rows.map(r => r.interval);
  const frequencies = freqTable.rows.map(r => r.frequency);

  const trace = {
    x: categories,
    y: frequencies,
    type: 'bar',
    name: 'Frekuensi Interval',
    marker: {
      color: frequencies.map((_, i) => `hsla(${230 + (i * 12)}, 80%, 65%, 0.75)`),
      line: {
        color: '#6366f1',
        width: 1.5
      }
    },
    text: frequencies.map(f => `${f}`),
    textposition: 'auto',
    textfont: {
      family: 'JetBrains Mono, monospace',
      size: 12,
      color: '#ffffff'
    },
    hovertemplate: 'Interval Kelas: %{x}<br>Frekuensi (fi): %{y}<br>Frekuensi Relatif: %{text}%<extra></extra>',
    text: freqTable.rows.map(r => formatNum(r.relFrequency))
  };

  const layout = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: '<b>Diagram Batang Frekuensi (Berdasarkan Interval Kelas Sturges)</b>',
      font: { color: '#f8fafc', size: 15 },
      x: 0.05
    },
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      title: { text: 'Interval Kelas', font: { color: '#cbd5e1', size: 12 } }
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Frekuensi (fi)', font: { color: '#cbd5e1', size: 12 } }
    }
  };

  Plotly.react(container, [trace], layout, PLOTLY_CONFIG);
}

// ==========================================
// 7. RENDER DASHBOARD HASIL KE DOM
// ==========================================

/**
 * Tampilkan 14 parameter statistik deskriptif ke dalam 14 kartu modern
 */
function renderDashboardStats(stats) {
  // Update Nilai Utama Kartu
  setText('stat-n', formatNum(stats.n));
  setText('stat-sum', formatNum(stats.sum));
  setText('stat-mean', formatNum(stats.mean));
  setText('stat-median', formatNum(stats.median));
  
  // Modus
  setText('stat-mode', stats.modeText);
  setText('stat-mode-sub', stats.modeClassification);

  // Min, Max, Range
  setText('stat-min', formatNum(stats.min));
  setText('stat-max', formatNum(stats.max));
  setText('stat-range', formatNum(stats.range));

  // Varians (Sampel Utama, Populasi Sekunder)
  setText('stat-variance-sample', formatNum(stats.sampleVariance));
  setText('stat-variance-pop', `σ² = ${formatNum(stats.populationVariance)}`);

  // Standar Deviasi (Sampel Utama, Populasi Sekunder)
  setText('stat-std-sample', formatNum(stats.sampleStdDev));
  setText('stat-std-pop', `σ = ${formatNum(stats.populationStdDev)}`);

  // Kuartil 1, Kuartil 3, IQR
  setText('stat-q1', formatNum(stats.q1));
  setText('stat-q3', formatNum(stats.q3));
  setText('stat-iqr', formatNum(stats.iqr));

  // Parameter 14: Deteksi Outlier (1.5 x IQR)
  setText('stat-outlier-lb', formatNum(stats.lowerFence));
  setText('stat-outlier-ub', formatNum(stats.upperFence));

  const outlierBadgeContainer = document.getElementById('stat-outlier-badges');
  if (outlierBadgeContainer) {
    if (stats.allOutliers.length === 0) {
      outlierBadgeContainer.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          Tidak ada outlier terdeteksi
        </span>
      `;
    } else {
      let badgesHtml = `<div class="flex flex-wrap gap-1.5 items-center">`;
      badgesHtml += `<span class="text-xs font-semibold text-rose-400 mr-1">${stats.allOutliers.length} Outlier Ditemukan:</span>`;

      if (stats.lowerOutliers.length > 0) {
        badgesHtml += stats.lowerOutliers.map(val => 
          `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40" title="Outlier Bawah (< ${formatNum(stats.lowerFence)})">
            ↓ ${formatNum(val)}
          </span>`
        ).join('');
      }

      if (stats.upperOutliers.length > 0) {
        badgesHtml += stats.upperOutliers.map(val => 
          `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40" title="Outlier Atas (> ${formatNum(stats.upperFence)})">
            ↑ ${formatNum(val)}
          </span>`
        ).join('');
      }

      badgesHtml += `</div>`;
      outlierBadgeContainer.innerHTML = badgesHtml;
    }
  }

  // Tampilkan data terurut pada Data Inspector
  renderSortedDataViewer(stats.sortedData, stats);

  // Munculkan kontainer hasil
  const resultsContainer = document.getElementById('results-section');
  if (resultsContainer) {
    resultsContainer.classList.remove('hidden');
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Render Tabel Distribusi Frekuensi Kelompok
 */
function renderFrequencyTable(freqTable) {
  const tbody = document.getElementById('freq-table-body');
  if (!tbody || !freqTable) return;

  tbody.innerHTML = freqTable.rows.map(row => `
    <tr class="border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors">
      <td class="py-2.5 px-3 font-mono text-center text-slate-400">${row.classNumber}</td>
      <td class="py-2.5 px-3 font-mono font-semibold text-indigo-300">${row.interval}</td>
      <td class="py-2.5 px-3 font-mono text-slate-300">${row.boundaries}</td>
      <td class="py-2.5 px-3 font-mono text-slate-300 text-center">${formatNum(row.midpoint)}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-white text-center">${row.frequency}</td>
      <td class="py-2.5 px-3 font-mono text-emerald-400 text-center">${formatNum(row.relFrequency)}%</td>
      <td class="py-2.5 px-3 font-mono text-sky-400 text-center">${row.cumFreqLess}</td>
      <td class="py-2.5 px-3 font-mono text-amber-400 text-center">${row.cumFreqMore}</td>
    </tr>
  `).join('');

  // Update Footer Total
  setText('freq-total-fi', freqTable.totalFreq);
  setText('freq-total-fr', `${freqTable.totalRelFreq}%`);
  setText('sturges-k-info', `Aturan Sturges: k = ${freqTable.k} kelas, Panjang Kelas (c) ≈ ${formatNum(freqTable.classWidth)}`);
}

/**
 * Render visualisasi array data terurut dengan badge khusus untuk Min, Q1, Median, Q3, Max, dan Outlier
 */
function renderSortedDataViewer(sortedData, stats) {
  const container = document.getElementById('sorted-data-list');
  if (!container) return;

  setText('sorted-count', `${sortedData.length} data`);

  container.innerHTML = sortedData.map((val, idx) => {
    const isOutlier = val < stats.lowerFence || val > stats.upperFence;
    const isMin = idx === 0;
    const isMax = idx === sortedData.length - 1;

    let badgeClass = 'bg-slate-800/80 border-slate-700 text-slate-200';
    let extraLabel = '';

    if (isOutlier) {
      badgeClass = 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold ring-1 ring-rose-500/30';
      extraLabel = '<span class="text-[10px] text-rose-400 ml-1">OUTLIER</span>';
    } else if (isMin) {
      badgeClass = 'bg-sky-500/20 border-sky-500/40 text-sky-300';
      extraLabel = '<span class="text-[10px] text-sky-400 ml-1">MIN</span>';
    } else if (isMax) {
      badgeClass = 'bg-purple-500/20 border-purple-500/40 text-purple-300';
      extraLabel = '<span class="text-[10px] text-purple-400 ml-1">MAX</span>';
    }

    return `
      <div class="px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-between ${badgeClass}">
        <span class="text-slate-400 text-[10px] mr-1.5">[${idx + 1}]</span>
        <span class="font-bold">${formatNum(val)}</span>
        ${extraLabel}
      </div>
    `;
  }).join('');
}

function setText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}

// ==========================================
// 8. KONTROL CHART & SWITCH TAB
// ==========================================

function updateActiveChart() {
  if (!AppState.stats || !AppState.currentData.length) return;

  const chartContainer = document.getElementById('plot-container');
  const tableContainer = document.getElementById('frequency-table-wrapper');
  const boxplotControls = document.getElementById('boxplot-controls');

  if (AppState.activeChartTab === 'histogram') {
    if (chartContainer) chartContainer.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (boxplotControls) boxplotControls.classList.add('hidden');
    renderHistogramPlot(AppState.currentData, AppState.stats);
  } else if (AppState.activeChartTab === 'boxplot') {
    if (chartContainer) chartContainer.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (boxplotControls) boxplotControls.classList.remove('hidden');
    renderBoxplotPlot(AppState.currentData, AppState.stats, AppState.boxplotOrientation);
  } else if (AppState.activeChartTab === 'frequency') {
    if (chartContainer) chartContainer.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (boxplotControls) boxplotControls.classList.add('hidden');
    renderFrequencyBarChart(AppState.frequencyTable);
    renderFrequencyTable(AppState.frequencyTable);
  }
}

function setChartTab(tabName) {
  AppState.activeChartTab = tabName;

  // Update styling tombol tab
  ['histogram', 'boxplot', 'frequency'].forEach(t => {
    const btn = document.getElementById(`tab-chart-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.className = 'px-4 py-2 text-xs md:text-sm font-semibold rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all';
      } else {
        btn.className = 'px-4 py-2 text-xs md:text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all';
      }
    }
  });

  updateActiveChart();
}

function setBoxplotOrientation(orient) {
  AppState.boxplotOrientation = orient;

  const btnH = document.getElementById('btn-orient-h');
  const btnV = document.getElementById('btn-orient-v');

  if (btnH && btnV) {
    if (orient === 'h') {
      btnH.className = 'px-2.5 py-1 text-xs font-semibold rounded bg-indigo-600 text-white';
      btnV.className = 'px-2.5 py-1 text-xs font-medium rounded text-slate-400 hover:text-white';
    } else {
      btnH.className = 'px-2.5 py-1 text-xs font-medium rounded text-slate-400 hover:text-white';
      btnV.className = 'px-2.5 py-1 text-xs font-semibold rounded bg-indigo-600 text-white';
    }
  }

  if (AppState.activeChartTab === 'boxplot') {
    renderBoxplotPlot(AppState.currentData, AppState.stats, orient);
  }
}

// ==========================================
// 9. PROSES DATA UTAMA (TRIGGER HITUNG)
// ==========================================

function processData() {
  dismissAlert();
  let numbers = [];

  if (AppState.activeTab === 'manual') {
    const textarea = document.getElementById('manual-data-input');
    const rawText = textarea ? textarea.value : '';
    const parseResult = parseManualText(rawText);

    if (!parseResult.valid) {
      showAlert(parseResult.errors.join('<br>'), 'error');
      return;
    }
    numbers = parseResult.numbers;
  } else if (AppState.activeTab === 'csv') {
    if (!AppState.csvData || !AppState.csvData.data) {
      showAlert('Silakan upload file CSV terlebih dahulu.', 'error');
      return;
    }

    const columnSelect = document.getElementById('csv-column-select');
    const selectedCol = columnSelect ? columnSelect.value : '';
    if (!selectedCol) {
      showAlert('Pilih kolom numerik dari file CSV yang ingin dianalisis.', 'error');
      return;
    }

    // Ambil semua data pada kolom terpilih
    const colValues = [];
    const nonNumericValues = [];

    for (const row of AppState.csvData.data) {
      if (row[selectedCol] !== undefined && row[selectedCol] !== null && String(row[selectedCol]).trim() !== '') {
        const valStr = String(row[selectedCol]).trim();
        const num = Number(valStr);
        if (!isNaN(num) && isFinite(num)) {
          colValues.push(num);
        } else {
          nonNumericValues.push(valStr);
        }
      }
    }

    if (colValues.length < 2) {
      showAlert(`Kolom "${selectedCol}" hanya memiliki ${colValues.length} nilai numerik valid. Minimal dibutuhkan 2 data numerik.`, 'error');
      return;
    }

    if (nonNumericValues.length > 0) {
      showAlert(`Informasi: ${nonNumericValues.length} baris dengan teks non-numerik diabaikan pada kolom "${selectedCol}". Memproses ${colValues.length} data numerik.`, 'info');
    }

    numbers = colValues;
  }

  // Simpan data dan jalankan perhitungan statistik
  AppState.currentData = numbers;
  const stats = calculateDescriptiveStats(numbers);
  AppState.stats = stats;

  // Buat tabel distribusi frekuensi
  const freqTable = generateFrequencyDistribution(stats.sortedData, stats);
  AppState.frequencyTable = freqTable;

  // Render semua komponen UI
  renderDashboardStats(stats);
  updateActiveChart();

  showAlert(`Berhasil memproses ${stats.n} data! Seluruh 14 parameter statistik dan visualisasi interaktif telah diperbarui.`, 'success');
}

// ==========================================
// 10. EVENT HANDLER & INTERAKSI INPUT
// ==========================================

function setInputTab(tab) {
  AppState.activeTab = tab;

  const btnManual = document.getElementById('tab-btn-manual');
  const btnCsv = document.getElementById('tab-btn-csv');
  const panelManual = document.getElementById('panel-input-manual');
  const panelCsv = document.getElementById('panel-input-csv');

  if (tab === 'manual') {
    if (btnManual) btnManual.className = 'flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all';
    if (btnCsv) btnCsv.className = 'flex-1 py-3 px-4 rounded-xl font-medium text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center justify-center gap-2 transition-all';
    if (panelManual) panelManual.classList.remove('hidden');
    if (panelCsv) panelCsv.classList.add('hidden');
  } else {
    if (btnManual) btnManual.className = 'flex-1 py-3 px-4 rounded-xl font-medium text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center justify-center gap-2 transition-all';
    if (btnCsv) btnCsv.className = 'flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all';
    if (panelManual) panelManual.classList.add('hidden');
    if (panelCsv) panelCsv.classList.remove('hidden');
  }
}

/**
 * Muat data contoh uji (dilengkapi dengan outlier)
 */
function loadSampleData() {
  dismissAlert();
  // Beralih ke tab manual
  setInputTab('manual');

  const textarea = document.getElementById('manual-data-input');
  if (textarea) {
    textarea.value = SAMPLE_DATASET.join(', ');
  }

  // Langsung proses data contoh agar pengguna dapat langsung melihat hasilnya
  processData();
}

/**
 * Reset seluruh formulir, hasil perhitungan, dan chart
 */
function resetAll() {
  dismissAlert();
  AppState.currentData = [];
  AppState.stats = null;
  AppState.csvData = null;
  AppState.csvHeaders = [];
  AppState.selectedCsvColumn = '';

  const textarea = document.getElementById('manual-data-input');
  if (textarea) textarea.value = '';

  const fileInput = document.getElementById('csv-file-input');
  if (fileInput) fileInput.value = '';

  const csvInfo = document.getElementById('csv-file-info');
  if (csvInfo) csvInfo.classList.add('hidden');

  const csvColWrapper = document.getElementById('csv-column-selector-wrapper');
  if (csvColWrapper) csvColWrapper.classList.add('hidden');

  const resultsSection = document.getElementById('results-section');
  if (resultsSection) resultsSection.classList.add('hidden');

  const chartContainer = document.getElementById('plot-container');
  if (chartContainer && window.Plotly) {
    Plotly.purge(chartContainer);
  }

  showAlert('Formulir dan hasil perhitungan berhasil direset.', 'info');
}

/**
 * Penanganan Upload File CSV menggunakan PapaParse CDN
 */
function handleCsvUpload(file) {
  dismissAlert();
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    showAlert('Harap upload file berekstensi .csv yang valid.', 'error');
    return;
  }

  if (!window.Papa) {
    showAlert('Library PapaParse gagal dimuat dari CDN. Periksa koneksi internet Anda.', 'error');
    return;
  }

  // Tampilkan info file
  const infoEl = document.getElementById('csv-file-info');
  const nameEl = document.getElementById('csv-file-name');
  const sizeEl = document.getElementById('csv-file-size');
  if (infoEl && nameEl && sizeEl) {
    nameEl.textContent = file.name;
    sizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    infoEl.classList.remove('hidden');
  }

  // Parsing file CSV dengan PapaParse
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    complete: function (results) {
      if (results.errors.length > 0 && results.data.length === 0) {
        showAlert(`Gagal mem-parsing CSV: ${results.errors[0].message}`, 'error');
        return;
      }

      AppState.csvData = results;
      AppState.csvHeaders = results.meta.fields || [];

      if (AppState.csvHeaders.length === 0) {
        showAlert('File CSV tidak memiliki baris header kolom.', 'error');
        return;
      }

      populateCsvColumnSelect(AppState.csvHeaders, results.data);
      showAlert(`Berhasil membaca file CSV: ${results.data.length} baris data ditemukan. Silakan pilih kolom yang akan dianalisis lalu klik tombol "Proses / Hitung".`, 'info');
    },
    error: function (err) {
      showAlert(`Terjadi kesalahan membaca file CSV: ${err.message}`, 'error');
    }
  });
}

/**
 * Mengisi dropdown pilihan kolom dan mendeteksi kolom numerik secara otomatis
 */
function populateCsvColumnSelect(headers, dataRows) {
  const select = document.getElementById('csv-column-select');
  const wrapper = document.getElementById('csv-column-selector-wrapper');
  if (!select || !wrapper) return;

  select.innerHTML = '';
  wrapper.classList.remove('hidden');

  let defaultNumericCol = '';

  headers.forEach(header => {
    // Periksa proporsi numerik pada kolom ini
    let numCount = 0;
    const sampleSize = Math.min(dataRows.length, 50);

    for (let i = 0; i < sampleSize; i++) {
      const val = dataRows[i][header];
      if (val !== undefined && val !== null && String(val).trim() !== '' && !isNaN(Number(val))) {
        numCount++;
      }
    }

    const isNumericCandidate = numCount / sampleSize > 0.6;
    if (isNumericCandidate && !defaultNumericCol) {
      defaultNumericCol = header;
    }

    const option = document.createElement('option');
    option.value = header;
    option.textContent = `${header} ${isNumericCandidate ? '(Numerik ✓)' : '(Teks/Lainnya)'}`;
    select.appendChild(option);
  });

  if (defaultNumericCol) {
    select.value = defaultNumericCol;
    AppState.selectedCsvColumn = defaultNumericCol;
  } else if (headers.length > 0) {
    select.value = headers[0];
    AppState.selectedCsvColumn = headers[0];
  }

  // Tampilkan preview cuplikan 3 baris
  updateCsvPreview(dataRows, headers);
}

function updateCsvPreview(rows, headers) {
  const previewContainer = document.getElementById('csv-preview-container');
  const previewThead = document.getElementById('csv-preview-thead');
  const previewTbody = document.getElementById('csv-preview-tbody');

  if (!previewContainer || !previewThead || !previewTbody) return;

  previewThead.innerHTML = `<tr>${headers.map(h => `<th class="py-1 px-2 text-left font-mono text-[11px] text-slate-400 bg-slate-800/60">${h}</th>`).join('')}</tr>`;

  const previewRows = rows.slice(0, 3);
  previewTbody.innerHTML = previewRows.map(r => `
    <tr class="border-t border-slate-700/50">
      ${headers.map(h => `<td class="py-1 px-2 text-[11px] font-mono text-slate-300 truncate max-w-[120px]">${r[h] ?? ''}</td>`).join('')}
    </tr>
  `).join('');

  previewContainer.classList.remove('hidden');
}

// ==========================================
// 11. EKSPOR LAPORAN & CLIPBOARD
// ==========================================

/**
 * Salin ringkasan ke clipboard dengan format rapi
 */
function copySummaryToClipboard() {
  if (!AppState.stats) {
    showAlert('Belum ada data hasil perhitungan untuk disalin.', 'warning');
    return;
  }

  const s = AppState.stats;
  const report = `=========================================
LAPORAN STATISTIK DESKRIPTIF (Stat Prototype Group 2)
=========================================
Jumlah Data (n)              : ${s.n}
Total Nilai (Σx)             : ${formatNum(s.sum)}
Mean (Rata-rata, x̄)          : ${formatNum(s.mean)}
Median (Nilai Tengah, Me)    : ${formatNum(s.median)}
Modus (Mo)                   : ${s.modeText} (${s.modeClassification})
Nilai Minimum (Xmin)         : ${formatNum(s.min)}
Nilai Maksimum (Xmax)        : ${formatNum(s.max)}
Jangkauan / Range (R)        : ${formatNum(s.range)}
Varians Sampel (s²)          : ${formatNum(s.sampleVariance)}
Varians Populasi (σ²)        : ${formatNum(s.populationVariance)}
Standar Deviasi Sampel (s)   : ${formatNum(s.sampleStdDev)}
Standar Deviasi Populasi (σ) : ${formatNum(s.populationStdDev)}
Kuartil 1 (Q1, 25%)          : ${formatNum(s.q1)}
Kuartil 3 (Q3, 75%)          : ${formatNum(s.q3)}
Interquartile Range (IQR)    : ${formatNum(s.iqr)}
-----------------------------------------
DETEKSI OUTLIER (Metode 1.5 × IQR):
Batas Bawah (Q1 - 1.5×IQR)   : ${formatNum(s.lowerFence)}
Batas Atas (Q3 + 1.5×IQR)    : ${formatNum(s.upperFence)}
Jumlah Outlier               : ${s.allOutliers.length} data
Daftar Outlier               : ${s.allOutliers.length > 0 ? s.allOutliers.join(', ') : 'Tidak ada'}
=========================================`;

  navigator.clipboard.writeText(report).then(() => {
    showAlert('Ringkasan 14 parameter statistik berhasil disalin ke clipboard!', 'success');
  }).catch(() => {
    showAlert('Gagal menyalin ke clipboard. Silakan salin manual.', 'error');
  });
}

/**
 * Download hasil parameter statistik dalam format CSV
 */
function exportSummaryCsv() {
  if (!AppState.stats) {
    showAlert('Belum ada data untuk diekspor.', 'warning');
    return;
  }

  const s = AppState.stats;
  const csvRows = [
    ['Parameter Statistik', 'Simbol/Notasi', 'Nilai', 'Keterangan'],
    ['Jumlah Data', 'n', s.n, 'Total elemen data'],
    ['Total Nilai', 'Σx', formatNum(s.sum), 'Penjumlahan seluruh data'],
    ['Mean (Rata-rata)', 'x̄', formatNum(s.mean), 'Rata-rata hitung'],
    ['Median', 'Me', formatNum(s.median), 'Nilai tengah data terurut'],
    ['Modus', 'Mo', `"${s.modeText}"`, s.modeClassification],
    ['Nilai Minimum', 'Xmin', formatNum(s.min), 'Nilai terendah'],
    ['Nilai Maksimum', 'Xmax', formatNum(s.max), 'Nilai tertinggi'],
    ['Jangkauan (Range)', 'R', formatNum(s.range), 'Xmax - Xmin'],
    ['Varians Sampel', 's²', formatNum(s.sampleVariance), 'Derajat bebas n-1'],
    ['Varians Populasi', 'σ²', formatNum(s.populationVariance), 'Dibagi n'],
    ['Standar Deviasi Sampel', 's', formatNum(s.sampleStdDev), 'Akar kuadrat varians sampel'],
    ['Standar Deviasi Populasi', 'σ', formatNum(s.populationStdDev), 'Akar kuadrat varians populasi'],
    ['Kuartil 1', 'Q1', formatNum(s.q1), 'Persentil ke-25'],
    ['Kuartil 3', 'Q3', formatNum(s.q3), 'Persentil ke-75'],
    ['Interquartile Range', 'IQR', formatNum(s.iqr), 'Q3 - Q1'],
    ['Batas Bawah Outlier', 'LB', formatNum(s.lowerFence), 'Q1 - 1.5×IQR'],
    ['Batas Atas Outlier', 'UB', formatNum(s.upperFence), 'Q3 + 1.5×IQR'],
    ['Outlier Terdeteksi', 'Outliers', `"${s.allOutliers.join(', ')}"`, `${s.allOutliers.length} data ditemukan`]
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `ringkasan_statistik_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 12. INITIALIZATION ON DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Setup Drag & Drop File CSV
  const dropZone = document.getElementById('csv-dropzone');
  const fileInput = document.getElementById('csv-file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-indigo-500', 'bg-indigo-500/10');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleCsvUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleCsvUpload(e.target.files[0]);
      }
    });
  }

  // Update real-time word/number count di manual input
  const manualInput = document.getElementById('manual-data-input');
  const countBadge = document.getElementById('manual-count-badge');
  if (manualInput && countBadge) {
    manualInput.addEventListener('input', () => {
      const tokens = manualInput.value.split(/[\s,;]+/).filter(t => t.trim() !== '' && !isNaN(Number(t)));
      countBadge.textContent = `${tokens.length} angka terdeteksi`;
    });
  }

  // Window resize handler for Plotly
  window.addEventListener('resize', () => {
    const plotContainer = document.getElementById('plot-container');
    if (plotContainer && window.Plotly && !plotContainer.classList.contains('hidden')) {
      Plotly.Plots.resize(plotContainer);
    }
  });

  // Muat data contoh secara otomatis di awal agar saat dibuka aplikasi langsung menampilkan dashboard hasil yang menarik!
  loadSampleData();
});
