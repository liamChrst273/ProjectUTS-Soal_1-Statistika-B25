/**
 * Stat Prototype Group 2 - Aplikasi Web Pengolahan Data Statistik Deskriptif
 * Tema Gelap (Dark Mode) yang Bersih & Ramah Pengguna
 * 
 * Modul ini mencakup:
 * 1. Parser Input Fleksibel (Manual & CSV multi-kolom via PapaParse)
 * 2. Validasi Input Ketat dengan Pesan Edukatif
 * 3. Mesin Hitung 14 Parameter Statistik Deskriptif (Format maks 4 desimal)
 * 4. Narator Kesimpulan Bahasa Awam (Executive Plain-Language Summary)
 * 5. Pembuat Tabel Distribusi Frekuensi (Aturan Sturges)
 * 6. Visualisasi Interaktif Plotly.js Tema Gelap (Histogram, Boxplot, Bar Chart)
 * 7. Ekspor Laporan & Manajemen State UI
 */

// ==========================================
// 1. STATE & KONFIGURASI APLIKASI
// ==========================================
const AppState = {
  activeTab: 'manual',         // 'manual' | 'csv'
  activeChartTab: 'histogram', // 'histogram' | 'boxplot' | 'frequency'
  boxplotOrientation: 'h',     // 'h' | 'v'
  currentData: [],             // Array angka numerik terurut
  rawInputString: '',
  csvData: null,               // Objek PapaParse mentah
  csvHeaders: [],
  selectedCsvColumn: '',
  stats: null,                 // Objek hasil 14 parameter statistik
  frequencyTable: null         // Tabel distribusi frekuensi Sturges
};

// Data Contoh bawaan (Dataset nilai ujian 22 siswa dengan outlier nyata: 15 di bawah, 115 dan 120 di atas)
const SAMPLE_DATASET = [
  15, 48, 52, 55, 58, 60, 61, 62, 63, 65, 
  66, 68, 70, 72, 75, 78, 80, 82, 85, 90, 
  115, 120
];

// ==========================================
// 2. HELPER UTILITY & FORMATTER
// ==========================================

function formatNum(num, maxDecimals = 4) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  if (Number.isInteger(num)) return num.toString();
  
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
  return rounded.toString();
}

function showAlert(message, type = 'error') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;

  const bgStyles = {
    error: 'bg-rose-950/40 border-rose-800/60 text-rose-300',
    success: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300',
    warning: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
    info: 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
  };

  const icons = {
    error: `<svg class="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    success: `<svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    warning: `<svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    info: `<svg class="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
  };

  alertContainer.innerHTML = `
    <div class="flex items-start gap-3 p-4 rounded-xl border ${bgStyles[type]} shadow-lg transition-all duration-300">
      ${icons[type]}
      <div class="flex-1 text-sm font-medium leading-relaxed">${message}</div>
      <button onclick="dismissAlert()" class="opacity-70 hover:opacity-100 p-1 -mr-1 transition-opacity">
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

function parseManualText(text) {
  if (!text || text.trim() === '') {
    return { valid: false, numbers: [], errors: ['Kolom input data masih kosong. Silakan ketik deret angka atau klik tombol "Coba Pakai Data Contoh".'] };
  }

  const tokens = text
    .split(/[\s,;]+/)
    .map(t => t.trim())
    .filter(t => t !== '');

  if (tokens.length === 0) {
    return { valid: false, numbers: [], errors: ['Tidak ada angka yang ditemukan dalam teks yang Anda masukkan.'] };
  }

  const numbers = [];
  const invalidTokens = [];

  for (const token of tokens) {
    const num = Number(token);
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
        `Ditemukan karakter bukan angka: ${previewInvalid}${moreText}. Harap masukkan hanya angka. Untuk pemisah desimal gunakan tanda titik (contoh: 75.5).`
      ]
    };
  }

  if (numbers.length < 2) {
    return {
      valid: false,
      numbers: numbers,
      errors: ['Data Anda baru ada 1 angka. Minimal dibutuhkan minimal 2 angka untuk menghitung varians dan persebaran statistik.']
    };
  }

  return { valid: true, numbers, errors: [] };
}

// ==========================================
// 4. MESIN PERHITUNGAN STATISTIK DESKRIPTIF
// ==========================================

function calculateDescriptiveStats(rawData) {
  const sorted = [...rawData].sort((a, b) => a - b);
  const n = sorted.length;

  const count = n;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  let median;
  if (n % 2 === 1) {
    median = sorted[Math.floor(n / 2)];
  } else {
    const mid1 = sorted[(n / 2) - 1];
    const mid2 = sorted[n / 2];
    median = (mid1 + mid2) / 2;
  }

  const freqMap = new Map();
  for (const num of sorted) {
    freqMap.set(num, (freqMap.get(num) || 0) + 1);
  }

  let maxFreq = 0;
  for (const freq of freqMap.values()) {
    if (freq > maxFreq) maxFreq = freq;
  }

  let modes = [];
  const uniqueFreqs = new Set(freqMap.values());
  const hasMode = maxFreq > 1 && uniqueFreqs.size > 1;

  let modeText = 'Tidak ada modus';
  let modeClassification = 'Semua nilai muncul dengan jumlah frekuensi yang sama';

  if (hasMode) {
    for (const [val, freq] of freqMap.entries()) {
      if (freq === maxFreq) modes.push(val);
    }
    modes.sort((a, b) => a - b);

    if (modes.length === 1) {
      modeClassification = `Unimodal (Muncul ${maxFreq} kali)`;
      modeText = modes.map(m => formatNum(m)).join(', ');
    } else if (modes.length === 2) {
      modeClassification = `Bimodal (Masing-masing muncul ${maxFreq} kali)`;
      modeText = modes.map(m => formatNum(m)).join(', ');
    } else {
      modeClassification = `Multimodal (Masing-masing muncul ${maxFreq} kali)`;
      modeText = modes.map(m => formatNum(m)).join(', ');
    }
  }

  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  const ss = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const sampleVariance = n > 1 ? ss / (n - 1) : 0;
  const populationVariance = ss / n;

  const sampleStdDev = Math.sqrt(sampleVariance);
  const populationStdDev = Math.sqrt(populationVariance);

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
  const iqr = q3 - q1;

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

function generateFrequencyDistribution(sorted, stats) {
  const n = sorted.length;
  const min = stats.min;
  const max = stats.max;
  const range = stats.range;

  if (range === 0) {
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

  let k = Math.round(1 + 3.322 * Math.log10(n));
  if (k < 3) k = 3;
  if (k > 10) k = 10;

  let c = range / k;
  const isAllInteger = sorted.every(x => Number.isInteger(x));
  if (isAllInteger && c >= 1) {
    c = Math.ceil(c);
  } else {
    c = Math.ceil(c * 10000) / 10000;
  }

  const rows = [];
  let currentLower = min;
  let cumLess = 0;

  for (let i = 0; i < k; i++) {
    const isLastClass = (i === k - 1);
    const lower = currentLower;
    let upper = lower + c;
    if (isAllInteger && c >= 1) {
      upper = lower + c - 1;
    }

    if (isLastClass && upper < max) {
      upper = max;
    }

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
      cumFreqMore: 0
    });

    currentLower = isAllInteger ? upper + 1 : upper;
  }

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
// 6. VISUALISASI PLOTLY (TEMA GELAP BERSIH)
// ==========================================

const PLOTLY_DARK_LAYOUT = {
  font: { family: 'Plus Jakarta Sans, sans-serif', color: '#94a3b8', size: 12 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: '#0f172a',
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

function renderHistogramPlot(data, stats) {
  const container = document.getElementById('plot-container');
  if (!container || !window.Plotly) return;

  const trace = {
    x: data,
    type: 'histogram',
    name: 'Frekuensi Data',
    marker: {
      color: 'rgba(99, 102, 241, 0.75)',
      line: {
        color: '#818cf8',
        width: 1.5
      }
    },
    opacity: 0.9,
    hovertemplate: 'Rentang Nilai: %{x}<br>Jumlah Kemunculan: %{y}<extra></extra>'
  };

  const layout = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: '<b>Grafik Histogram Sebaran Frekuensi Data</b>',
      font: { color: '#f8fafc', size: 15 },
      x: 0.05
    },
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      title: { text: 'Nilai Data', font: { color: '#cbd5e1', size: 12 } }
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Banyak Kemunculan (Frekuensi)', font: { color: '#cbd5e1', size: 12 } }
    },
    shapes: [
      {
        type: 'line',
        x0: stats.mean,
        x1: stats.mean,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: '#f97316',
          width: 2.5,
          dash: 'dash'
        }
      },
      {
        type: 'line',
        x0: stats.median,
        x1: stats.median,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: '#10b981',
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
        ax: 35,
        ay: -25,
        font: { color: '#ffffff', size: 11, family: 'Plus Jakarta Sans, sans-serif' },
        bgcolor: '#ea580c',
        bordercolor: '#f97316',
        borderwidth: 1,
        borderpad: 4
      },
      {
        x: stats.median,
        y: 0.85,
        yref: 'paper',
        text: `Median: ${formatNum(stats.median)}`,
        showarrow: true,
        arrowhead: 2,
        arrowcolor: '#10b981',
        ax: -40,
        ay: -20,
        font: { color: '#ffffff', size: 11, family: 'Plus Jakarta Sans, sans-serif' },
        bgcolor: '#059669',
        bordercolor: '#10b981',
        borderwidth: 1,
        borderpad: 4
      }
    ]
  };

  Plotly.react(container, [trace], layout, PLOTLY_CONFIG);
}

function renderBoxplotPlot(data, stats, orientation = 'h') {
  const container = document.getElementById('plot-container');
  if (!container || !window.Plotly) return;

  const isHorizontal = orientation === 'h';

  const trace = {
    [isHorizontal ? 'x' : 'y']: data,
    type: 'box',
    name: 'Sebaran Data',
    boxpoints: 'all',
    jitter: 0.35,
    pointpos: -1.8,
    boxmean: 'sd',
    marker: {
      color: '#818cf8',
      size: 6,
      outliercolor: '#ef4444'
    },
    line: {
      color: '#6366f1',
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
      text: `<b>Grafik Kotak (Boxplot) Lima Serangkai & Outlier (${isHorizontal ? 'Horizontal' : 'Vertikal'})</b>`,
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
        text: `Q1: ${formatNum(stats.q1)} | Median: ${formatNum(stats.median)} | Q3: ${formatNum(stats.q3)} | Outlier: ${stats.allOutliers.length}`,
        showarrow: false,
        font: { color: '#cbd5e1', size: 11, family: 'JetBrains Mono, monospace' },
        bgcolor: '#1e293b',
        bordercolor: '#334155',
        borderwidth: 1
      }
    ]
  };

  Plotly.react(container, [trace], layout, PLOTLY_CONFIG);
}

function renderFrequencyBarChart(freqTable) {
  const container = document.getElementById('plot-container');
  if (!container || !window.Plotly || !freqTable) return;

  const categories = freqTable.rows.map(r => r.interval);
  const frequencies = freqTable.rows.map(r => r.frequency);

  const trace = {
    x: categories,
    y: frequencies,
    type: 'bar',
    name: 'Banyak Data per Interval',
    marker: {
      color: '#6366f1',
      line: {
        color: '#818cf8',
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
    hovertemplate: 'Interval Kelas: %{x}<br>Banyak Data: %{y}<br>Persentase: %{text}%<extra></extra>',
    text: freqTable.rows.map(r => formatNum(r.relFrequency))
  };

  const layout = {
    ...PLOTLY_DARK_LAYOUT,
    title: {
      text: '<b>Diagram Batang Frekuensi (Berdasarkan Kelompok Interval)</b>',
      font: { color: '#f8fafc', size: 15 },
      x: 0.05
    },
    xaxis: {
      ...PLOTLY_DARK_LAYOUT.xaxis,
      title: { text: 'Kelompok Interval Nilai', font: { color: '#cbd5e1', size: 12 } }
    },
    yaxis: {
      ...PLOTLY_DARK_LAYOUT.yaxis,
      title: { text: 'Frekuensi (Jumlah Data)', font: { color: '#cbd5e1', size: 12 } }
    }
  };

  Plotly.react(container, [trace], layout, PLOTLY_CONFIG);
}

// ==========================================
// 7. NARASI KESIMPULAN BAHASA AWAM
// ==========================================

function renderPlainLanguageSummary(stats) {
  const summaryContainer = document.getElementById('plain-summary-content');
  if (!summaryContainer) return;

  let outlierStory = '';
  if (stats.allOutliers.length === 0) {
    outlierStory = `<span class="text-emerald-400 font-semibold">Semua data berada dalam batas wajar</span> (antara ${formatNum(stats.lowerFence)} sampai ${formatNum(stats.upperFence)}). Tidak terdeteksi angka ekstrem / outlier.`;
  } else {
    outlierStory = `Ditemukan <span class="text-rose-400 font-bold">${stats.allOutliers.length} angka tidak wajar (outlier)</span> yang berada di luar rentang wajar (${formatNum(stats.lowerFence)} s/d ${formatNum(stats.upperFence)}), yaitu angka: <strong class="text-rose-300 font-mono">${stats.allOutliers.map(formatNum).join(', ')}</strong>. Angka ini patut diperiksa apakah salah ketik atau data khusus.`;
  }

  summaryContainer.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50">
        <div class="text-xs font-semibold text-indigo-300 mb-1.5 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Nilai Khas / Rata-rata
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Dari total <strong class="text-white">${stats.n} data</strong> yang Anda masukkan, nilai rata-ratanya adalah <strong class="text-indigo-300">${formatNum(stats.mean)}</strong> dengan nilai persis di posisi tengah yaitu <strong class="text-indigo-300">${formatNum(stats.median)}</strong>.
        </p>
      </div>

      <div class="p-4 rounded-xl bg-blue-950/40 border border-blue-800/50">
        <div class="text-xs font-semibold text-blue-300 mb-1.5 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Rentang & Sebaran
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Angka paling kecil adalah <strong class="text-white">${formatNum(stats.min)}</strong> dan terbesar <strong class="text-white">${formatNum(stats.max)}</strong> (rentang selisih <strong class="text-white">${formatNum(stats.range)}</strong>). Separuh data inti berada di kisaran <strong class="text-blue-300">${formatNum(stats.q1)}</strong> hingga <strong class="text-blue-300">${formatNum(stats.q3)}</strong>.
        </p>
      </div>

      <div class="p-4 rounded-xl bg-amber-950/40 border border-amber-800/50">
        <div class="text-xs font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          Deteksi Kejanggalan Data
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          ${outlierStory}
        </p>
      </div>
    </div>
  `;
}

// ==========================================
// 8. RENDER DASHBOARD HASIL KE DOM
// ==========================================

function renderDashboardStats(stats) {
  setText('stat-n', formatNum(stats.n));
  setText('stat-sum', formatNum(stats.sum));
  setText('stat-mean', formatNum(stats.mean));
  setText('stat-median', formatNum(stats.median));
  
  setText('stat-mode', stats.modeText);
  setText('stat-mode-sub', stats.modeClassification);

  setText('stat-min', formatNum(stats.min));
  setText('stat-max', formatNum(stats.max));
  setText('stat-range', formatNum(stats.range));

  setText('stat-variance-sample', formatNum(stats.sampleVariance));
  setText('stat-variance-pop', `Varians Populasi: ${formatNum(stats.populationVariance)}`);

  setText('stat-std-sample', formatNum(stats.sampleStdDev));
  setText('stat-std-pop', `Deviasi Populasi: ${formatNum(stats.populationStdDev)}`);

  setText('stat-q1', formatNum(stats.q1));
  setText('stat-q3', formatNum(stats.q3));
  setText('stat-iqr', formatNum(stats.iqr));

  setText('stat-outlier-lb', formatNum(stats.lowerFence));
  setText('stat-outlier-ub', formatNum(stats.upperFence));

  const outlierBadgeContainer = document.getElementById('stat-outlier-badges');
  if (outlierBadgeContainer) {
    if (stats.allOutliers.length === 0) {
      outlierBadgeContainer.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          Bagus! Tidak ada angka yang aneh atau outlier terdeteksi
        </span>
      `;
    } else {
      let badgesHtml = `<div class="flex flex-wrap gap-2 items-center">`;
      badgesHtml += `<span class="text-xs font-bold text-rose-400 mr-1">${stats.allOutliers.length} Angka Outlier:</span>`;

      if (stats.lowerOutliers.length > 0) {
        badgesHtml += stats.lowerOutliers.map(val => 
          `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800" title="Terlalu kecil (< ${formatNum(stats.lowerFence)})">
            ↓ ${formatNum(val)} (Terlalu Kecil)
          </span>`
        ).join('');
      }

      if (stats.upperOutliers.length > 0) {
        badgesHtml += stats.upperOutliers.map(val => 
          `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800" title="Terlalu besar (> ${formatNum(stats.upperFence)})">
            ↑ ${formatNum(val)} (Terlalu Besar)
          </span>`
        ).join('');
      }

      badgesHtml += `</div>`;
      outlierBadgeContainer.innerHTML = badgesHtml;
    }
  }

  renderPlainLanguageSummary(stats);
  renderSortedDataViewer(stats.sortedData, stats);

  const resultsContainer = document.getElementById('results-section');
  if (resultsContainer) {
    resultsContainer.classList.remove('hidden');
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderFrequencyTable(freqTable) {
  const tbody = document.getElementById('freq-table-body');
  if (!tbody || !freqTable) return;

  tbody.innerHTML = freqTable.rows.map(row => `
    <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
      <td class="py-2.5 px-3 font-mono text-center text-slate-400 font-semibold">${row.classNumber}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-indigo-400">${row.interval}</td>
      <td class="py-2.5 px-3 font-mono text-slate-300">${row.boundaries}</td>
      <td class="py-2.5 px-3 font-mono text-slate-300 text-center font-medium">${formatNum(row.midpoint)}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-white text-center bg-indigo-950/30">${row.frequency}</td>
      <td class="py-2.5 px-3 font-mono text-emerald-400 text-center font-semibold">${formatNum(row.relFrequency)}%</td>
      <td class="py-2.5 px-3 font-mono text-sky-400 text-center">${row.cumFreqLess}</td>
      <td class="py-2.5 px-3 font-mono text-amber-400 text-center">${row.cumFreqMore}</td>
    </tr>
  `).join('');

  setText('freq-total-fi', freqTable.totalFreq);
  setText('freq-total-fr', `${freqTable.totalRelFreq}%`);
  setText('sturges-k-info', `Aturan Sturges: k = ${freqTable.k} kelompok kelas, Lebar Kelas (c) ≈ ${formatNum(freqTable.classWidth)}`);
}

function renderSortedDataViewer(sortedData, stats) {
  const container = document.getElementById('sorted-data-list');
  if (!container) return;

  setText('sorted-count', `${sortedData.length} data`);

  container.innerHTML = sortedData.map((val, idx) => {
    const isOutlier = val < stats.lowerFence || val > stats.upperFence;
    const isMin = idx === 0;
    const isMax = idx === sortedData.length - 1;

    let badgeClass = 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700/80';
    let extraLabel = '';

    if (isOutlier) {
      badgeClass = 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold ring-2 ring-rose-500/50';
      extraLabel = '<span class="text-[10px] bg-rose-900/60 text-rose-300 px-1.5 py-0.2 rounded ml-1 font-sans">OUTLIER</span>';
    } else if (isMin) {
      badgeClass = 'bg-sky-950/80 border-sky-700 text-sky-300 font-semibold';
      extraLabel = '<span class="text-[10px] bg-sky-900/60 text-sky-300 px-1.5 py-0.2 rounded ml-1 font-sans">MIN</span>';
    } else if (isMax) {
      badgeClass = 'bg-purple-950/80 border-purple-700 text-purple-300 font-semibold';
      extraLabel = '<span class="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.2 rounded ml-1 font-sans">MAX</span>';
    }

    return `
      <div class="px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-between ${badgeClass} transition-all">
        <span class="text-slate-400 text-[10px] mr-1.5">#${idx + 1}</span>
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
// 9. KONTROL CHART & SWITCH TAB
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
      btnH.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white shadow-xs';
      btnV.className = 'px-3 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-white';
    } else {
      btnH.className = 'px-3 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-white';
      btnV.className = 'px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white shadow-xs';
    }
  }

  if (AppState.activeChartTab === 'boxplot') {
    renderBoxplotPlot(AppState.currentData, AppState.stats, orient);
  }
}

// ==========================================
// 10. PROSES DATA UTAMA (TRIGGER HITUNG)
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
      showAlert('Silakan pilih berkas CSV terlebih dahulu.', 'error');
      return;
    }

    const columnSelect = document.getElementById('csv-column-select');
    const selectedCol = columnSelect ? columnSelect.value : '';
    if (!selectedCol) {
      showAlert('Pilih kolom angka dari file CSV yang ingin dianalisis.', 'error');
      return;
    }

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
      showAlert(`Kolom "${selectedCol}" hanya memiliki ${colValues.length} angka valid. Minimal dibutuhkan 2 angka.`, 'error');
      return;
    }

    if (nonNumericValues.length > 0) {
      showAlert(`Info: ${nonNumericValues.length} baris teks non-angka dilewati secara otomatis. Menganalisis ${colValues.length} data angka.`, 'info');
    }

    numbers = colValues;
  }

  AppState.currentData = numbers;
  const stats = calculateDescriptiveStats(numbers);
  AppState.stats = stats;

  const freqTable = generateFrequencyDistribution(stats.sortedData, stats);
  AppState.frequencyTable = freqTable;

  renderDashboardStats(stats);
  updateActiveChart();

  showAlert(`Berhasil menganalisis ${stats.n} data angka! Seluruh parameter dan visualisasi telah diperbarui.`, 'success');
}

// ==========================================
// 11. EVENT HANDLER & INTERAKSI INPUT
// ==========================================

function setInputTab(tab) {
  AppState.activeTab = tab;

  const btnManual = document.getElementById('tab-btn-manual');
  const btnCsv = document.getElementById('tab-btn-csv');
  const panelManual = document.getElementById('panel-input-manual');
  const panelCsv = document.getElementById('panel-input-csv');

  if (tab === 'manual') {
    if (btnManual) btnManual.className = 'flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs md:text-sm bg-indigo-600 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all';
    if (btnCsv) btnCsv.className = 'flex-1 py-2.5 px-4 rounded-lg font-medium text-xs md:text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center justify-center gap-2 transition-all';
    if (panelManual) panelManual.classList.remove('hidden');
    if (panelCsv) panelCsv.classList.add('hidden');
  } else {
    if (btnManual) btnManual.className = 'flex-1 py-2.5 px-4 rounded-lg font-medium text-xs md:text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center justify-center gap-2 transition-all';
    if (btnCsv) btnCsv.className = 'flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs md:text-sm bg-indigo-600 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all';
    if (panelManual) panelManual.classList.add('hidden');
    if (panelCsv) panelCsv.classList.remove('hidden');
  }
}

function loadSampleData() {
  dismissAlert();
  setInputTab('manual');

  const textarea = document.getElementById('manual-data-input');
  if (textarea) {
    textarea.value = SAMPLE_DATASET.join(', ');
  }

  processData();
}

function resetAll() {
  dismissAlert();
  AppState.currentData = [];
  AppState.stats = null;
  AppState.csvData = null;
  AppState.csvHeaders = [];
  AppState.selectedCsvColumn = '';

  const textarea = document.getElementById('manual-data-input');
  if (textarea) textarea.value = '';

  const countBadge = document.getElementById('manual-count-badge');
  if (countBadge) countBadge.textContent = '0 angka terdeteksi';

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

  showAlert('Formulir berhasil direset. Silakan masukkan data baru.', 'info');
}

function handleCsvUpload(file) {
  dismissAlert();
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    showAlert('Pilih berkas berekstensi .csv yang valid.', 'error');
    return;
  }

  if (!window.Papa) {
    showAlert('Komponen pembaca CSV gagal dimuat. Periksa koneksi internet Anda.', 'error');
    return;
  }

  const infoEl = document.getElementById('csv-file-info');
  const nameEl = document.getElementById('csv-file-name');
  const sizeEl = document.getElementById('csv-file-size');
  if (infoEl && nameEl && sizeEl) {
    nameEl.textContent = file.name;
    sizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    infoEl.classList.remove('hidden');
  }

  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    complete: function (results) {
      if (results.errors.length > 0 && results.data.length === 0) {
        showAlert(`Gagal membaca berkas CSV: ${results.errors[0].message}`, 'error');
        return;
      }

      AppState.csvData = results;
      AppState.csvHeaders = results.meta.fields || [];

      if (AppState.csvHeaders.length === 0) {
        showAlert('Berkas CSV tidak memiliki baris judul (header) kolom.', 'error');
        return;
      }

      populateCsvColumnSelect(AppState.csvHeaders, results.data);
      showAlert(`File CSV berhasil dibaca (${results.data.length} baris). Silakan pilih kolom angka pada dropdown lalu klik "Analisis Data".`, 'info');
    },
    error: function (err) {
      showAlert(`Terjadi kesalahan membaca CSV: ${err.message}`, 'error');
    }
  });
}

function populateCsvColumnSelect(headers, dataRows) {
  const select = document.getElementById('csv-column-select');
  const wrapper = document.getElementById('csv-column-selector-wrapper');
  if (!select || !wrapper) return;

  select.innerHTML = '';
  wrapper.classList.remove('hidden');

  let defaultNumericCol = '';

  headers.forEach(header => {
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
    option.textContent = `${header} ${isNumericCandidate ? '(Kolom Angka ✓)' : '(Teks/Lainnya)'}`;
    select.appendChild(option);
  });

  if (defaultNumericCol) {
    select.value = defaultNumericCol;
    AppState.selectedCsvColumn = defaultNumericCol;
  } else if (headers.length > 0) {
    select.value = headers[0];
    AppState.selectedCsvColumn = headers[0];
  }

  updateCsvPreview(dataRows, headers);
}

function updateCsvPreview(rows, headers) {
  const previewContainer = document.getElementById('csv-preview-container');
  const previewThead = document.getElementById('csv-preview-thead');
  const previewTbody = document.getElementById('csv-preview-tbody');

  if (!previewContainer || !previewThead || !previewTbody) return;

  previewThead.innerHTML = `<tr>${headers.map(h => `<th class="py-2 px-3 text-left font-mono text-xs font-semibold text-slate-300 bg-slate-800">${h}</th>`).join('')}</tr>`;

  const previewRows = rows.slice(0, 3);
  previewTbody.innerHTML = previewRows.map(r => `
    <tr class="border-t border-slate-800">
      ${headers.map(h => `<td class="py-2 px-3 text-xs font-mono text-slate-400 truncate max-w-[140px]">${r[h] ?? ''}</td>`).join('')}
    </tr>
  `).join('');

  previewContainer.classList.remove('hidden');
}

// ==========================================
// 12. EKSPOR LAPORAN & CETAK
// ==========================================

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
    showAlert('Ringkasan statistik berhasil disalin ke clipboard!', 'success');
  }).catch(() => {
    showAlert('Gagal menyalin ke clipboard. Silakan salin manual.', 'error');
  });
}

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

function printReport() {
  if (!AppState.stats) {
    showAlert('Belum ada data hasil analisis yang dapat dicetak. Silakan analisis data terlebih dahulu.', 'warning');
    return;
  }

  const timestampEl = document.getElementById('print-timestamp');
  if (timestampEl) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
    timestampEl.textContent = `Dicetak pada: ${formattedDate}, ${formattedTime} WIB`;
  }

  window.print();
}

// ==========================================
// 13. INISIALISASI PADA SAAT HALAMAN DIBUKA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('csv-dropzone');
  const fileInput = document.getElementById('csv-file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-indigo-500', 'bg-indigo-950/20');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-950/20');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-950/20');
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

  const manualInput = document.getElementById('manual-data-input');
  const countBadge = document.getElementById('manual-count-badge');
  if (manualInput && countBadge) {
    manualInput.addEventListener('input', () => {
      const tokens = manualInput.value.split(/[\s,;]+/).filter(t => t.trim() !== '' && !isNaN(Number(t)));
      countBadge.textContent = `${tokens.length} angka terdeteksi`;
    });
  }

  window.addEventListener('resize', () => {
    const plotContainer = document.getElementById('plot-container');
    if (plotContainer && window.Plotly && !plotContainer.classList.contains('hidden')) {
      Plotly.Plots.resize(plotContainer);
    }
  });

  loadSampleData();
});
