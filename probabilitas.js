/**
 * PROBABILITAS & TEOREMA BAYES - ENGINE JAVASCRIPT
 * Bagian dari Aplikasi Analisis Statistik & Probabilitas Kelompok 2
 * 
 * Modul:
 * 1. Modul A: Probabilitas Dasar (Komplemen, Saling Lepas, Independen, Irisan & Gabungan)
 * 2. Modul B: Probabilitas Bersyarat & Teorema Bayes (Prevalensi, Sensitivitas, False Positive, Posterior)
 */

// ==============================================================
// 1. STATE GLOBAL & DEFAULT CONFIGURATION
// ==============================================================
const state = {
  activeModule: 'modul-a', // 'modul-a' | 'modul-b'
  modulBMode: 'bayes',     // 'bayes' | 'conditional'
  
  // State Modul A
  modulA: {
    pa: 0.3,
    pb: 0.4,
    relation: 'exclusive', // 'exclusive' | 'independent' | 'general'
    pIntersection: 0.0,
    labelA: 'Kejadian A',
    labelB: 'Kejadian B'
  },

  // State Modul B - Teorema Bayes
  modulB: {
    labelH: 'Email Phishing',
    labelE: 'Ditandai Sistem',
    priorH: 0.08,        // P(H) = 8%
    sensitivity: 0.92,   // P(E|H) = 92%
    falsePositive: 0.03, // P(E|H') = 3%
    basePopulation: 10000
  },

  // State Modul B - Probabilitas Bersyarat Dasar
  conditional: {
    labelA: 'Kejadian A',
    labelB: 'Kejadian B',
    pa: 0.6,
    pb: 0.5,
    pIntersection: 0.35
  }
};

// ==============================================================
// 2. HELPER FORMATTING & VALIDATION UTILITIES
// ==============================================================

/**
 * Format angka ke desimal dengan presisi tertentu (default 4 desimal)
 */
function formatDecimal(val, digits = 4) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return Number(val).toFixed(digits);
}

/**
 * Format angka ke format persentase (default 2 desimal, e.g. 72.73%)
 */
function formatPercent(val, digits = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return (Number(val) * 100).toFixed(digits) + '%';
}

/**
 * Parse input string atau number menjadi nilai probabilitas valid [0, 1]
 */
function parseProbability(raw) {
  if (raw === '' || raw === null || raw === undefined) return NaN;
  let str = String(raw).trim().replace(',', '.');
  let isPercent = false;

  if (str.endsWith('%')) {
    isPercent = true;
    str = str.replace('%', '').trim();
  }

  let num = parseFloat(str);
  if (isNaN(num)) return NaN;

  if (isPercent) {
    num = num / 100;
  } else if (num > 1 && num <= 100) {
    // Toleransi jika user memasukkan persentase tanpa tanda persen (misal: 8 -> 0.08)
    num = num / 100;
  }

  return num;
}

/**
 * Menampilkan pesan alert/toast
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-slate-800 border-indigo-500 text-indigo-200',
    success: 'bg-slate-800 border-emerald-500 text-emerald-200',
    warning: 'bg-slate-800 border-amber-500 text-amber-200',
    error: 'bg-slate-800 border-rose-500 text-rose-200'
  };

  const icons = {
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />',
    error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />'
  };

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl shadow-black/40 backdrop-blur-md text-xs sm:text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${icons[type] || icons.info}
    </svg>
    <div class="flex-1">${message}</div>
  `;

  container.appendChild(toast);

  // Animasi Masuk
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  // Hapus otomatis setelah 4 detik
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==============================================================
// 3. LOGIKA PERHITUNGAN MODUL A - PROBABILITAS DASAR
// ==============================================================

/**
 * Validasi dan hitung kalkulasi Modul A
 */
function calculateModulA() {
  const paInput = document.getElementById('input-pa');
  const pbInput = document.getElementById('input-pb');
  const pIntInput = document.getElementById('input-p-intersection');
  const relationSelect = document.getElementById('select-relation');
  const labelAInput = document.getElementById('label-event-a');
  const labelBInput = document.getElementById('label-event-b');

  if (!paInput || !pbInput) return;

  const pa = parseProbability(paInput.value);
  const pb = parseProbability(pbInput.value);
  const relation = relationSelect ? relationSelect.value : state.modulA.relation;
  const labelA = (labelAInput && labelAInput.value.trim()) || 'Kejadian A';
  const labelB = (labelBInput && labelBInput.value.trim()) || 'Kejadian B';

  state.modulA.labelA = labelA;
  state.modulA.labelB = labelB;
  state.modulA.relation = relation;

  const errorBox = document.getElementById('modul-a-alert');
  if (errorBox) errorBox.classList.add('hidden');

  // Validasi nilai dasar
  if (isNaN(pa) || isNaN(pb)) {
    displayModulAError('Silakan masukkan nilai probabilitas P(A) dan P(B) yang valid (angka antara 0 dan 1).');
    return;
  }

  if (pa < 0 || pa > 1 || pb < 0 || pb > 1) {
    displayModulAError('Nilai probabilitas harus berada dalam rentang 0 hingga 1 (atau 0% hingga 100%).');
    return;
  }

  // Hitung komplemen
  const compA = 1 - pa;
  const compB = 1 - pb;

  let pIntersection = 0;
  let pUnion = 0;
  let formulaExplanation = '';
  let relationNote = '';

  if (relation === 'exclusive') {
    // Saling Lepas: P(A ∩ B) = 0
    pIntersection = 0;
    
    // Validasi aksioma: P(A) + P(B) tidak boleh > 1
    if (pa + pb > 1.0000001) {
      displayModulAError(`Peringatan: Pada Kejadian Saling Lepas, P(A) + P(B) = ${(pa + pb).toFixed(4)} melebihi 1.0000 (100%). Hal ini melanggar aksioma probabilitas.`);
      return;
    }

    pUnion = pa + pb;
    formulaExplanation = `P(A ∪ B) = P(A) + P(B) = ${formatDecimal(pa)} + ${formatDecimal(pb)} = ${formatDecimal(pUnion)}`;
    relationNote = `Karena <strong>${labelA}</strong> dan <strong>${labelB}</strong> adalah <em>Kejadian Saling Lepas (Mutually Exclusive)</em>, kedua kejadian mustahil terjadi bersamaan. Oleh karena itu, irisan <strong>P(A ∩ B) = 0</strong> dan gabungan cukup dengan menjumlahkan kedua probabilitas.`;

  } else if (relation === 'independent') {
    // Bebas / Independen: P(A ∩ B) = P(A) * P(B)
    pIntersection = pa * pb;
    pUnion = pa + pb - pIntersection;
    formulaExplanation = `P(A ∩ B) = P(A) × P(B) = ${formatDecimal(pa)} × ${formatDecimal(pb)} = ${formatDecimal(pIntersection)}<br>P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = ${formatDecimal(pa)} + ${formatDecimal(pb)} - ${formatDecimal(pIntersection)} = ${formatDecimal(pUnion)}`;
    relationNote = `Karena <strong>${labelA}</strong> dan <strong>${labelB}</strong> adalah <em>Kejadian Independen (Bebas)</em>, terjadinya salah satu kejadian tidak memengaruhi peluang kejadian lainnya. Irisan dihitung dengan aturan perkalian <strong>P(A ∩ B) = P(A) × P(B)</strong>.`;

  } else {
    // Umum / Tidak Saling Lepas (User input P(A ∩ B))
    let rawIntersection = pIntInput ? parseProbability(pIntInput.value) : 0;
    if (isNaN(rawIntersection)) rawIntersection = 0;

    // Validasi Irisan
    const maxIntersection = Math.min(pa, pb);
    const minIntersection = Math.max(0, pa + pb - 1);

    if (rawIntersection < 0 || rawIntersection > maxIntersection + 0.000001) {
      displayModulAError(`Nilai irisan P(A ∩ B) = ${rawIntersection} tidak valid. Maksimal adalah nilai terkecil dari P(A) dan P(B) yaitu ${formatDecimal(maxIntersection)}.`);
      return;
    }

    if (rawIntersection < minIntersection - 0.000001) {
      displayModulAError(`Nilai irisan P(A ∩ B) = ${rawIntersection} terlalu kecil. Minimal adalah ${formatDecimal(minIntersection)} agar P(A ∪ B) tidak melebihi 1.0.`);
      return;
    }

    pIntersection = rawIntersection;
    pUnion = pa + pb - pIntersection;
    formulaExplanation = `P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = ${formatDecimal(pa)} + ${formatDecimal(pb)} - ${formatDecimal(pIntersection)} = ${formatDecimal(pUnion)}`;
    relationNote = `Pada kondisi <em>Kejadian Umum / Tidak Saling Lepas</em>, irisan bernilai <strong>${formatDecimal(pIntersection)} (${formatPercent(pIntersection)})</strong>, sehingga untuk mencari peluang gabungan dikurangi irisan agar tidak terjadi perhitungan ganda.`;
  }

  // Peluang eksklusif untuk diagram Venn
  const onlyA = Math.max(0, pa - pIntersection);
  const onlyB = Math.max(0, pb - pIntersection);
  const neither = Math.max(0, 1 - pUnion);

  // Update State
  state.modulA.pa = pa;
  state.modulA.pb = pb;
  state.modulA.pIntersection = pIntersection;

  // Render Hasil ke UI
  renderModulAResults({
    pa,
    pb,
    compA,
    compB,
    pIntersection,
    pUnion,
    onlyA,
    onlyB,
    neither,
    relation,
    formulaExplanation,
    relationNote,
    labelA,
    labelB
  });
}

/**
 * Menampilkan error khusus Modul A
 */
function displayModulAError(msg) {
  const errorBox = document.getElementById('modul-a-alert');
  const errorText = document.getElementById('modul-a-alert-text');
  if (errorBox && errorText) {
    errorText.innerHTML = msg;
    errorBox.classList.remove('hidden');
  }
}

/**
 * Render elemen hasil Modul A ke dalam kartu dan diagram
 */
function renderModulAResults(data) {
  // Metric Cards
  setText('out-pa-dec', formatDecimal(data.pa));
  setText('out-pa-pct', formatPercent(data.pa));
  setText('out-compa-dec', formatDecimal(data.compA));
  setText('out-compa-pct', formatPercent(data.compA));

  setText('out-pb-dec', formatDecimal(data.pb));
  setText('out-pb-pct', formatPercent(data.pb));
  setText('out-compb-dec', formatDecimal(data.compB));
  setText('out-compb-pct', formatPercent(data.compB));

  setText('out-pab-dec', formatDecimal(data.pIntersection));
  setText('out-pab-pct', formatPercent(data.pIntersection));

  setText('out-pub-dec', formatDecimal(data.pUnion));
  setText('out-pub-pct', formatPercent(data.pUnion));

  setText('out-only-a', `${formatDecimal(data.onlyA)} (${formatPercent(data.onlyA)})`);
  setText('out-only-b', `${formatDecimal(data.onlyB)} (${formatPercent(data.onlyB)})`);
  setText('out-neither', `${formatDecimal(data.neither)} (${formatPercent(data.neither)})`);

  // Formula Breakdown
  const formulaBox = document.getElementById('modul-a-formula-steps');
  if (formulaBox) {
    formulaBox.innerHTML = data.formulaExplanation;
  }

  // Narasi Interpretasi Bahasa Indonesia
  const narrativeBox = document.getElementById('modul-a-narrative');
  if (narrativeBox) {
    narrativeBox.innerHTML = `
      <p class="mb-2 leading-relaxed text-slate-200">
        ${data.relationNote}
      </p>
      <ul class="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
        <li>Peluang terjadinya <strong>${data.labelA}</strong> saja tanpa ${data.labelB} adalah <strong>${formatPercent(data.onlyA)}</strong> (desimal: ${formatDecimal(data.onlyA)}).</li>
        <li>Peluang terjadinya <strong>${data.labelB}</strong> saja tanpa ${data.labelA} adalah <strong>${formatPercent(data.onlyB)}</strong> (desimal: ${formatDecimal(data.onlyB)}).</li>
        <li>Peluang <strong>kedua kejadian terjadi sekaligus</strong> (P(A ∩ B)) adalah <strong>${formatPercent(data.pIntersection)}</strong> (desimal: ${formatDecimal(data.pIntersection)}).</li>
        <li>Peluang <strong>minimal salah satu kejadian terjadi</strong> (P(A ∪ B)) adalah <strong>${formatPercent(data.pUnion)}</strong> (desimal: ${formatDecimal(data.pUnion)}).</li>
        <li>Peluang <strong>tak satupun kejadian terjadi</strong> (bukan A dan bukan B) adalah <strong>${formatPercent(data.neither)}</strong> (desimal: ${formatDecimal(data.neither)}).</li>
      </ul>
    `;
  }

  // Update Diagram Venn SVG
  updateVennDiagram(data);
}

/**
 * Render Diagram Venn Interaktif Berbasis SVG
 */
function updateVennDiagram(data) {
  const svg = document.getElementById('venn-svg');
  if (!svg) return;

  const isExclusive = data.pIntersection === 0;

  // Koordinat SVG Lingkaran
  const circleA = document.getElementById('venn-circle-a');
  const circleB = document.getElementById('venn-circle-b');
  const textA = document.getElementById('venn-text-a');
  const textB = document.getElementById('venn-text-b');
  const textAB = document.getElementById('venn-text-ab');
  const textNeither = document.getElementById('venn-text-neither');

  if (isExclusive) {
    // Jika saling lepas, pisahkan lingkaran
    if (circleA) circleA.setAttribute('cx', '130');
    if (circleB) circleB.setAttribute('cx', '310');
    if (textA) {
      textA.setAttribute('x', '130');
      textA.textContent = `${formatPercent(data.pa)}`;
    }
    if (textB) {
      textB.setAttribute('x', '310');
      textB.textContent = `${formatPercent(data.pb)}`;
    }
    if (textAB) {
      textAB.textContent = 'Irisan = 0';
      textAB.setAttribute('x', '220');
      textAB.setAttribute('class', 'text-[11px] fill-slate-400 font-mono text-center');
    }
  } else {
    // Ada irisan
    if (circleA) circleA.setAttribute('cx', '165');
    if (circleB) circleB.setAttribute('cx', '275');
    if (textA) {
      textA.setAttribute('x', '120');
      textA.textContent = `${formatPercent(data.onlyA)}`;
    }
    if (textB) {
      textB.setAttribute('x', '320');
      textB.textContent = `${formatPercent(data.onlyB)}`;
    }
    if (textAB) {
      textAB.textContent = `${formatPercent(data.pIntersection)}`;
      textAB.setAttribute('x', '220');
      textAB.setAttribute('class', 'text-xs fill-amber-300 font-mono font-bold');
    }
  }

  if (textNeither) {
    textNeither.textContent = `Luar: ${formatPercent(data.neither)}`;
  }
}

// ==============================================================
// 4. LOGIKA PERHITUNGAN MODUL B - TEOREMA BAYES
// ==============================================================

/**
 * Validasi dan perhitungan Teorema Bayes
 */
function calculateModulB() {
  const priorInput = document.getElementById('bayes-prior');
  const sensInput = document.getElementById('bayes-sensitivity');
  const fpInput = document.getElementById('bayes-false-positive');
  const labelHInput = document.getElementById('bayes-label-h');
  const labelEInput = document.getElementById('bayes-label-e');

  if (!priorInput || !sensInput || !fpInput) return;

  const prior = parseProbability(priorInput.value);
  const sensitivity = parseProbability(sensInput.value);
  const falsePositive = parseProbability(fpInput.value);

  const labelH = (labelHInput && labelHInput.value.trim()) || 'Email Phishing';
  const labelE = (labelEInput && labelEInput.value.trim()) || 'Ditandai Sistem';

  state.modulB.labelH = labelH;
  state.modulB.labelE = labelE;

  const errorBox = document.getElementById('modul-b-alert');
  if (errorBox) errorBox.classList.add('hidden');

  // Validasi Input
  if (isNaN(prior) || isNaN(sensitivity) || isNaN(falsePositive)) {
    displayModulBError('Mohon isi seluruh parameter probabilitas dengan angka yang valid.');
    return;
  }

  if (prior < 0 || prior > 1 || sensitivity < 0 || sensitivity > 1 || falsePositive < 0 || falsePositive > 1) {
    displayModulBError('Seluruh parameter probabilitas harus berada di antara 0 dan 1 (atau 0% hingga 100%).');
    return;
  }

  // Parameter Turunan Teori Bayes:
  // H  : Hipotesis Benar (cth: Email adalah Phishing)
  // H' : Hipotesis Salah (cth: Email Normal/Aman)
  // E  : Bukti / Deteksi Terjadi (cth: Sistem Memberikan Tanda/Flag)
  // E' : Bukti Negatif (cth: Sistem Tidak Memberikan Tanda)

  const priorNotH = 1 - prior;                    // P(H')
  const falseNegative = 1 - sensitivity;           // P(E'|H)
  const specificity = 1 - falsePositive;           // P(E'|H') = True Negative Rate

  // Hukum Probabilitas Total: P(E) = P(E|H)*P(H) + P(E|H')*P(H')
  const jointTP = sensitivity * prior;            // P(E ∩ H) = True Positive Probability
  const jointFP = falsePositive * priorNotH;       // P(E ∩ H') = False Positive Probability
  const probEvidence = jointTP + jointFP;          // P(E) = Total Evidence Probability

  // Teorema Bayes: P(H|E) = [P(E|H) * P(H)] / P(E)
  let posterior = 0;
  let posteriorNotH = 0;

  if (probEvidence > 0) {
    posterior = jointTP / probEvidence;
    posteriorNotH = 1 - posterior;
  } else {
    displayModulBError('Probabilitas total bukti P(E) bernilai 0. Perhitungan posterior tidak terdefinisi (pembagian dengan nol).');
    return;
  }

  // Hitung Frekuensi Alami (Natural Frequencies) untuk Populasi Dasar 10.000 kasus
  const N = state.modulB.basePopulation || 10000;
  const countH = Math.round(N * prior);
  const countNotH = N - countH;
  const countTP = Math.round(countH * sensitivity);
  const countFN = countH - countTP;
  const countFP = Math.round(countNotH * falsePositive);
  const countTN = countNotH - countFP;
  const countFlagged = countTP + countFP;

  // Render Hasil ke Layar
  renderModulBResults({
    prior,
    priorNotH,
    sensitivity,
    falseNegative,
    falsePositive,
    specificity,
    jointTP,
    jointFP,
    probEvidence,
    posterior,
    posteriorNotH,
    labelH,
    labelE,
    N,
    countH,
    countNotH,
    countTP,
    countFN,
    countFP,
    countTN,
    countFlagged
  });
}

/**
 * Menampilkan pesan error Modul B
 */
function displayModulBError(msg) {
  const errorBox = document.getElementById('modul-b-alert');
  const errorText = document.getElementById('modul-b-alert-text');
  if (errorBox && errorText) {
    errorText.innerHTML = msg;
    errorBox.classList.remove('hidden');
  }
}

/**
 * Render hasil Teorema Bayes ke UI
 */
function renderModulBResults(data) {
  // 1. Output Utama: Probabilitas Total Bukti P(E) & Posterior P(H|E)
  setText('out-pe-dec', formatDecimal(data.probEvidence));
  setText('out-pe-pct', formatPercent(data.probEvidence));
  setText('out-posterior-dec', formatDecimal(data.posterior));
  setText('out-posterior-pct', formatPercent(data.posterior));

  // Metrik Tambahan
  setText('out-prior-h', `${formatDecimal(data.prior)} (${formatPercent(data.prior)})`);
  setText('out-prior-noth', `${formatDecimal(data.priorNotH)} (${formatPercent(data.priorNotH)})`);
  setText('out-joint-tp', `${formatDecimal(data.jointTP)} (${formatPercent(data.jointTP)})`);
  setText('out-joint-fp', `${formatDecimal(data.jointFP)} (${formatPercent(data.jointFP)})`);
  setText('out-posterior-noth', `${formatDecimal(data.posteriorNotH)} (${formatPercent(data.posteriorNotH)})`);

  // 2. Langkah Perhitungan Rumus Lengkap
  const formulaBox = document.getElementById('bayes-formula-steps');
  if (formulaBox) {
    formulaBox.innerHTML = `
      <div class="space-y-3 font-mono text-xs sm:text-sm">
        <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <p class="text-indigo-400 font-semibold mb-1">1. Hukum Probabilitas Total Bukti P(E):</p>
          <p class="text-slate-300">P(E) = [P(E|H) × P(H)] + [P(E|H') × P(H')]</p>
          <p class="text-slate-400 mt-1">P(E) = [${formatDecimal(data.sensitivity)} × ${formatDecimal(data.prior)}] + [${formatDecimal(data.falsePositive)} × ${formatDecimal(data.priorNotH)}]</p>
          <p class="text-slate-200 mt-1">P(E) = ${formatDecimal(data.jointTP)} + ${formatDecimal(data.jointFP)} = <strong class="text-white">${formatDecimal(data.probEvidence)}</strong> (${formatPercent(data.probEvidence)})</p>
        </div>

        <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <p class="text-indigo-400 font-semibold mb-1">2. Probabilitas Posterior Teorema Bayes P(H|E):</p>
          <p class="text-slate-300">P(H|E) = [P(E|H) × P(H)] / P(E)</p>
          <p class="text-slate-400 mt-1">P(H|E) = ${formatDecimal(data.jointTP)} / ${formatDecimal(data.probEvidence)}</p>
          <p class="text-slate-200 mt-1">P(H|E) = <strong class="text-emerald-400 text-base">${formatDecimal(data.posterior)}</strong> (<strong class="text-emerald-400">${formatPercent(data.posterior)}</strong>)</p>
        </div>
      </div>
    `;
  }

  // 3. Interpretasi Hasil Naratif (Wajib sesuai spesifikasi)
  const interpBox = document.getElementById('bayes-interpretation');
  if (interpBox) {
    interpBox.innerHTML = `
      <div class="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-700/50 space-y-3 text-slate-200">
        <div class="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
          <svg class="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Interpretasi Naratif Teorema Bayes:
        </div>
        <p class="leading-relaxed text-xs sm:text-sm">
          Dari seluruh kejadian di mana bukti muncul (<span class="text-white font-semibold">"${data.labelE}"</span> dengan probabilitas total <span class="text-indigo-300 font-semibold">P(E) = ${formatPercent(data.probEvidence)}</span> atau desimal <span class="font-mono">${formatDecimal(data.probEvidence)}</span>), peluang bahwa kondisi sebenarnya adalah <span class="text-white font-semibold">"${data.labelH}"</span> (<span class="text-indigo-300 font-semibold">P(H|E)</span>) adalah sebesar <span class="text-emerald-400 font-bold text-base">${formatPercent(data.posterior)}</span> (<span class="font-mono text-emerald-400">${formatDecimal(data.posterior)}</span>).
        </p>
        <p class="leading-relaxed text-xs text-slate-400 border-t border-slate-800 pt-2">
          <strong>Insight Intuitif:</strong> Meskipun sensitivitas deteksi sangat tinggi (${formatPercent(data.sensitivity)}), sekitar <span class="text-amber-300 font-semibold">${formatPercent(data.posteriorNotH)}</span> dari seluruh kasus yang terdeteksi sebenarnya adalah <em>alarm palsu (False Discovery)</em>. Hal ini disebabkan karena prevalensi dasar ${data.labelH} di populasi relatif kecil (${formatPercent(data.prior)}).
        </p>
      </div>
    `;
  }

  // 4. Update Pohon Probabilitas (Probability Tree Visual)
  renderBayesTree(data);

  // 5. Update Tabel Matriks Kontingensi Frekuensi Alami (10.000 Kasus)
  renderFrequencyMatrix(data);
}

/**
 * Visualisasi Pohon Probabilitas Bayes (SVG / HTML Tree)
 */
function renderBayesTree(data) {
  const treeBox = document.getElementById('bayes-tree-diagram');
  if (!treeBox) return;

  treeBox.innerHTML = `
    <div class="relative w-full max-w-xl mx-auto py-2 text-xs font-mono">
      <!-- Root Node: Populasi Total -->
      <div class="flex justify-center mb-6">
        <div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-center shadow-lg">
          <div class="text-[10px] text-slate-400 uppercase font-sans font-semibold">Populasi Total (100%)</div>
          <div class="text-white font-bold font-mono">1.0000 (10.000 Kasus)</div>
        </div>
      </div>

      <!-- Cabang 1: Prior H vs Prior H' -->
      <div class="grid grid-cols-2 gap-4 sm:gap-8 mb-6">
        <!-- Cabang Kiri: Hipotesis Positif (H) -->
        <div class="p-3 rounded-xl bg-indigo-950/50 border border-indigo-700/50 text-center">
          <div class="text-[10px] text-indigo-300 font-sans font-semibold">P(H) — ${data.labelH}</div>
          <div class="text-sm font-bold text-white">${formatPercent(data.prior)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${data.countH.toLocaleString('id-ID')} kasus</div>
        </div>

        <!-- Cabang Kanan: Hipotesis Negatif (H') -->
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div class="text-[10px] text-slate-400 font-sans font-semibold">P(H') — Bukan ${data.labelH}</div>
          <div class="text-sm font-bold text-white">${formatPercent(data.priorNotH)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${data.countNotH.toLocaleString('id-ID')} kasus</div>
        </div>
      </div>

      <!-- Cabang 2: Hasil Uji Bukti (E vs E') -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <!-- True Positive (TP) -->
        <div class="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-600/40 text-center">
          <div class="text-[9px] text-emerald-400 font-semibold font-sans">True Positive</div>
          <div class="text-[10px] text-slate-300">P(E|H) = ${formatPercent(data.sensitivity)}</div>
          <div class="text-xs font-bold text-emerald-300 mt-1">${formatPercent(data.jointTP)}</div>
          <div class="text-[10px] text-slate-400">${data.countTP} kasus</div>
        </div>

        <!-- False Negative (FN) -->
        <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center opacity-70">
          <div class="text-[9px] text-rose-400 font-semibold font-sans">False Negative</div>
          <div class="text-[10px] text-slate-300">P(E'|H) = ${formatPercent(data.falseNegative)}</div>
          <div class="text-xs font-bold text-slate-300 mt-1">${formatPercent(data.prior * data.falseNegative)}</div>
          <div class="text-[10px] text-slate-400">${data.countFN} kasus</div>
        </div>

        <!-- False Positive (FP) -->
        <div class="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-center">
          <div class="text-[9px] text-amber-400 font-semibold font-sans">False Positive</div>
          <div class="text-[10px] text-slate-300">P(E|H') = ${formatPercent(data.falsePositive)}</div>
          <div class="text-xs font-bold text-amber-300 mt-1">${formatPercent(data.jointFP)}</div>
          <div class="text-[10px] text-slate-400">${data.countFP} kasus</div>
        </div>

        <!-- True Negative (TN) -->
        <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center opacity-70">
          <div class="text-[9px] text-sky-400 font-semibold font-sans">True Negative</div>
          <div class="text-[10px] text-slate-300">P(E'|H') = ${formatPercent(data.specificity)}</div>
          <div class="text-xs font-bold text-slate-300 mt-1">${formatPercent(data.priorNotH * data.specificity)}</div>
          <div class="text-[10px] text-slate-400">${data.countTN} kasus</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Matriks Kontingensi Frekuensi Alami (Natural Frequency Grid)
 */
function renderFrequencyMatrix(data) {
  const matrixBox = document.getElementById('bayes-frequency-matrix');
  if (!matrixBox) return;

  matrixBox.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-slate-800 text-slate-400">
            <th class="p-2.5 bg-slate-950/40 font-medium">Kondisi Sebenarnya</th>
            <th class="p-2.5 bg-slate-950/40 text-emerald-400 font-medium">${data.labelE} (Bukti +)</th>
            <th class="p-2.5 bg-slate-950/40 text-slate-400 font-medium">Tidak ${data.labelE} (Bukti -)</th>
            <th class="p-2.5 bg-slate-950/40 font-semibold text-white">Total Kondisi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 font-mono">
          <tr class="hover:bg-slate-800/30">
            <td class="p-2.5 text-slate-200 font-sans font-medium">${data.labelH} (Positif)</td>
            <td class="p-2.5 text-emerald-300 font-bold bg-emerald-950/20">
              ${data.countTP.toLocaleString('id-ID')}
              <span class="block text-[10px] text-emerald-400 font-sans">True Positive</span>
            </td>
            <td class="p-2.5 text-slate-400">
              ${data.countFN.toLocaleString('id-ID')}
              <span class="block text-[10px] text-slate-500 font-sans">False Negative</span>
            </td>
            <td class="p-2.5 font-bold text-white bg-slate-900/50">
              ${data.countH.toLocaleString('id-ID')}
            </td>
          </tr>
          <tr class="hover:bg-slate-800/30">
            <td class="p-2.5 text-slate-200 font-sans font-medium">Bukan ${data.labelH} (Negatif)</td>
            <td class="p-2.5 text-amber-300 font-bold bg-amber-950/20">
              ${data.countFP.toLocaleString('id-ID')}
              <span class="block text-[10px] text-amber-400 font-sans">False Positive</span>
            </td>
            <td class="p-2.5 text-slate-300">
              ${data.countTN.toLocaleString('id-ID')}
              <span class="block text-[10px] text-slate-500 font-sans">True Negative</span>
            </td>
            <td class="p-2.5 font-bold text-white bg-slate-900/50">
              ${data.countNotH.toLocaleString('id-ID')}
            </td>
          </tr>
          <tr class="border-t-2 border-slate-700 font-bold bg-slate-950 text-white">
            <td class="p-2.5 font-sans">Total Bukti</td>
            <td class="p-2.5 text-indigo-300 bg-indigo-950/30">
              ${data.countFlagged.toLocaleString('id-ID')}
              <span class="block text-[10px] text-indigo-400 font-sans">P(E) = ${(data.countFlagged / data.N * 100).toFixed(2)}%</span>
            </td>
            <td class="p-2.5 text-slate-400">
              ${(data.countFN + data.countTN).toLocaleString('id-ID')}
            </td>
            <td class="p-2.5 text-white">
              ${data.N.toLocaleString('id-ID')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ==============================================================
// 5. LOGIKA PERHITUNGAN MODUL B - PROBABILITAS BERSYARAT DASAR
// ==============================================================

/**
 * Validasi dan perhitungan Probabilitas Bersyarat Sederhana P(A|B) & P(B|A)
 */
function calculateConditionalSimple() {
  const paInput = document.getElementById('cond-pa');
  const pbInput = document.getElementById('cond-pb');
  const pIntInput = document.getElementById('cond-pab');
  const labelAInput = document.getElementById('cond-label-a');
  const labelBInput = document.getElementById('cond-label-b');

  if (!paInput || !pbInput || !pIntInput) return;

  const pa = parseProbability(paInput.value);
  const pb = parseProbability(pbInput.value);
  const pInt = parseProbability(pIntInput.value);

  const labelA = (labelAInput && labelAInput.value.trim()) || 'Kejadian A';
  const labelB = (labelBInput && labelBInput.value.trim()) || 'Kejadian B';

  const errorBox = document.getElementById('cond-alert');
  if (errorBox) errorBox.classList.add('hidden');

  if (isNaN(pa) || isNaN(pb) || isNaN(pInt)) {
    displayCondError('Silakan masukkan nilai probabilitas yang valid.');
    return;
  }

  if (pa < 0 || pa > 1 || pb < 0 || pb > 1 || pInt < 0 || pInt > 1) {
    displayCondError('Seluruh nilai harus berada dalam rentang [0, 1].');
    return;
  }

  const maxInt = Math.min(pa, pb);
  if (pInt > maxInt + 0.000001) {
    displayCondError(`Irisan P(A ∩ B) tidak boleh lebih besar dari P(A) atau P(B) (Maks: ${formatDecimal(maxInt)}).`);
    return;
  }

  let pAgivenB = null;
  let pBgivenA = null;

  if (pb > 0) {
    pAgivenB = pInt / pb;
  }
  if (pa > 0) {
    pBgivenA = pInt / pa;
  }

  // Render Hasil
  setText('out-p-a-given-b-dec', pAgivenB !== null ? formatDecimal(pAgivenB) : 'Tak Terdefinisi (P(B)=0)');
  setText('out-p-a-given-b-pct', pAgivenB !== null ? formatPercent(pAgivenB) : '-');

  setText('out-p-b-given-a-dec', pBgivenA !== null ? formatDecimal(pBgivenA) : 'Tak Terdefinisi (P(A)=0)');
  setText('out-p-b-given-a-pct', pBgivenA !== null ? formatPercent(pBgivenA) : '-');

  const stepBox = document.getElementById('cond-steps');
  if (stepBox) {
    stepBox.innerHTML = `
      <div class="space-y-2 font-mono text-xs text-slate-300">
        <p>• P(A|B) = P(A ∩ B) / P(B) = ${formatDecimal(pInt)} / ${formatDecimal(pb)} = <strong class="text-indigo-400">${pAgivenB !== null ? formatDecimal(pAgivenB) : 'Tak Terdefinisi'}</strong> (${pAgivenB !== null ? formatPercent(pAgivenB) : '-'})</p>
        <p>• P(B|A) = P(A ∩ B) / P(A) = ${formatDecimal(pInt)} / ${formatDecimal(pa)} = <strong class="text-indigo-400">${pBgivenA !== null ? formatDecimal(pBgivenA) : 'Tak Terdefinisi'}</strong> (${pBgivenA !== null ? formatPercent(pBgivenA) : '-'})</p>
      </div>
    `;
  }

  const interpBox = document.getElementById('cond-interpretation');
  if (interpBox) {
    interpBox.innerHTML = `
      <p class="text-slate-300 leading-relaxed text-xs sm:text-sm">
        Jika diketahui bahwa <strong class="text-white">${labelB}</strong> telah terjadi (P(B) = ${formatPercent(pb)}), maka peluang bersyarat terjadinya <strong class="text-white">${labelA}</strong> (P(A|B)) adalah sebesar <strong class="text-emerald-400">${pAgivenB !== null ? formatPercent(pAgivenB) : '-'}</strong>. Sebaliknya, jika ${labelA} terjadi lebih dahulu, peluang ${labelB} juga terjadi adalah <strong class="text-indigo-300">${pBgivenA !== null ? formatPercent(pBgivenA) : '-'}</strong>.
      </p>
    `;
  }
}

function displayCondError(msg) {
  const errorBox = document.getElementById('cond-alert');
  const errorText = document.getElementById('cond-alert-text');
  if (errorBox && errorText) {
    errorText.innerHTML = msg;
    errorBox.classList.remove('hidden');
  }
}

// ==============================================================
// 6. PRESET DATA KASUS BAWAAN (MUAT CONTOH KASUS SOAL)
// ==============================================================

/**
 * Muat Preset Kasus Modul A (Sesuai Spesifikasi Wajib)
 * P(A) = 0.3, P(B) = 0.4, Kejadian Saling Lepas -> P(A ∪ B) = 0.7
 */
function loadPresetKasusA() {
  const paInput = document.getElementById('input-pa');
  const pbInput = document.getElementById('input-pb');
  const relationSelect = document.getElementById('select-relation');
  const labelAInput = document.getElementById('label-event-a');
  const labelBInput = document.getElementById('label-event-b');

  if (paInput) paInput.value = '0.3';
  if (pbInput) pbInput.value = '0.4';
  if (labelAInput) labelAInput.value = 'Siswa Lolos Jalur SNBP';
  if (labelBInput) labelBInput.value = 'Siswa Lolos Jalur SNBT Mandiri';
  if (relationSelect) {
    relationSelect.value = 'exclusive';
    toggleRelationInputs('exclusive');
  }

  calculateModulA();
  showToast('Contoh Kasus A (Saling Lepas: P(A)=0.3, P(B)=0.4) berhasil dimuat!', 'success');
}

/**
 * Muat Preset Kasus Modul B: Filter Phishing (Sesuai Spesifikasi Wajib)
 * Prevalensi = 8% (0.08), Sensitivitas = 92% (0.92), False Positive = 3% (0.03)
 */
function loadPresetKasusBPhishing() {
  switchModulBMode('bayes');

  const priorInput = document.getElementById('bayes-prior');
  const sensInput = document.getElementById('bayes-sensitivity');
  const fpInput = document.getElementById('bayes-false-positive');
  const labelHInput = document.getElementById('bayes-label-h');
  const labelEInput = document.getElementById('bayes-label-e');

  if (priorInput) priorInput.value = '0.08';
  if (sensInput) sensInput.value = '0.92';
  if (fpInput) fpInput.value = '0.03';
  if (labelHInput) labelHInput.value = 'Email Phishing';
  if (labelEInput) labelEInput.value = 'Ditandai Sistem';

  calculateModulB();
  showToast('Kasus Filter Phishing (Prevalensi 8%, Sensitivitas 92%, FP 3%) berhasil dimuat!', 'success');
}

/**
 * Preset Kasus Medis: Uji Skrining Penyakit Langka
 * Prevalensi = 1% (0.01), Sensitivitas = 95% (0.95), False Positive = 2% (0.02)
 */
function loadPresetKasusBMedical() {
  switchModulBMode('bayes');

  const priorInput = document.getElementById('bayes-prior');
  const sensInput = document.getElementById('bayes-sensitivity');
  const fpInput = document.getElementById('bayes-false-positive');
  const labelHInput = document.getElementById('bayes-label-h');
  const labelEInput = document.getElementById('bayes-label-e');

  if (priorInput) priorInput.value = '0.01';
  if (sensInput) sensInput.value = '0.95';
  if (fpInput) fpInput.value = '0.02';
  if (labelHInput) labelHInput.value = 'Pasien Positif Mengidap Penyakit';
  if (labelEInput) labelEInput.value = 'Hasil Tes Lab Reaktif/Positif';

  calculateModulB();
  showToast('Kasus Skrining Medis (Prevalensi 1%, Sensitivitas 95%, FP 2%) berhasil dimuat!', 'info');
}

/**
 * Preset Kasus Fraud Deteksi Transaksi Finansial
 */
function loadPresetKasusBFraud() {
  switchModulBMode('bayes');

  const priorInput = document.getElementById('bayes-prior');
  const sensInput = document.getElementById('bayes-sensitivity');
  const fpInput = document.getElementById('bayes-false-positive');
  const labelHInput = document.getElementById('bayes-label-h');
  const labelEInput = document.getElementById('bayes-label-e');

  if (priorInput) priorInput.value = '0.005';
  if (sensInput) sensInput.value = '0.98';
  if (fpInput) fpInput.value = '0.01';
  if (labelHInput) labelHInput.value = 'Transaksi Finansial Curang (Fraud)';
  if (labelEInput) labelEInput.value = 'Sistem Anti-Fraud Memicu Blokir';

  calculateModulB();
  showToast('Kasus Deteksi Fraud (Prevalensi 0.5%, Sensitivitas 98%, FP 1%) berhasil dimuat!', 'info');
}

// ==============================================================
// 7. NAVIGASI TABS & KONTROL UI
// ==============================================================

/**
 * Ganti tab Modul A vs Modul B
 */
function switchMainTab(moduleKey) {
  state.activeModule = moduleKey;

  const btnA = document.getElementById('tab-btn-modul-a');
  const btnB = document.getElementById('tab-btn-modul-b');
  const viewA = document.getElementById('view-modul-a');
  const viewB = document.getElementById('view-modul-b');

  if (moduleKey === 'modul-a') {
    if (btnA) {
      btnA.className = 'flex-1 py-3 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all';
    }
    if (btnB) {
      btnB.className = 'flex-1 py-3 px-5 rounded-xl font-medium text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2.5 transition-all';
    }
    if (viewA) viewA.classList.remove('hidden');
    if (viewB) viewB.classList.add('hidden');
    calculateModulA();
  } else {
    if (btnB) {
      btnB.className = 'flex-1 py-3 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all';
    }
    if (btnA) {
      btnA.className = 'flex-1 py-3 px-5 rounded-xl font-medium text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2.5 transition-all';
    }
    if (viewB) viewB.classList.remove('hidden');
    if (viewA) viewA.classList.add('hidden');
    
    if (state.modulBMode === 'bayes') {
      calculateModulB();
    } else {
      calculateConditionalSimple();
    }
  }
}

/**
 * Ganti sub-mode di Modul B (Teorema Bayes vs Bersyarat Sederhana)
 */
function switchModulBMode(modeKey) {
  state.modulBMode = modeKey;

  const btnBayes = document.getElementById('subtab-btn-bayes');
  const btnCond = document.getElementById('subtab-btn-cond');
  const viewBayes = document.getElementById('subview-bayes');
  const viewCond = document.getElementById('subview-cond');

  if (modeKey === 'bayes') {
    if (btnBayes) {
      btnBayes.className = 'py-2 px-4 rounded-lg font-bold text-xs bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all';
    }
    if (btnCond) {
      btnCond.className = 'py-2 px-4 rounded-lg font-medium text-xs text-slate-400 hover:text-white transition-all';
    }
    if (viewBayes) viewBayes.classList.remove('hidden');
    if (viewCond) viewCond.classList.add('hidden');
    calculateModulB();
  } else {
    if (btnCond) {
      btnCond.className = 'py-2 px-4 rounded-lg font-bold text-xs bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all';
    }
    if (btnBayes) {
      btnBayes.className = 'py-2 px-4 rounded-lg font-medium text-xs text-slate-400 hover:text-white transition-all';
    }
    if (viewCond) viewCond.classList.remove('hidden');
    if (viewBayes) viewBayes.classList.add('hidden');
    calculateConditionalSimple();
  }
}

/**
 * Toggle input untuk irisan P(A ∩ B) jika tipe hubungan berubah
 */
function toggleRelationInputs(relationVal) {
  const container = document.getElementById('container-p-intersection');
  const infoText = document.getElementById('relation-desc-info');

  if (!container) return;

  if (relationVal === 'general') {
    container.classList.remove('hidden');
    if (infoText) {
      infoText.innerHTML = '<strong>Kejadian Umum / Tidak Saling Lepas:</strong> Masukkan nilai irisan P(A ∩ B) yang diketahui.';
    }
  } else if (relationVal === 'exclusive') {
    container.classList.add('hidden');
    if (infoText) {
      infoText.innerHTML = '<strong>Saling Lepas (Mutually Exclusive):</strong> Kedua kejadian tidak bisa terjadi bersamaan. P(A ∩ B) otomatis 0.';
    }
  } else if (relationVal === 'independent') {
    container.classList.add('hidden');
    if (infoText) {
      infoText.innerHTML = '<strong>Independen (Bebas):</strong> Terjadinya A tidak memengaruhi B. P(A ∩ B) otomatis P(A) × P(B).';
    }
  }
}

/**
 * Salin ringkasan hasil ke clipboard
 */
function copySummaryToClipboard(module) {
  let summaryText = '';

  if (module === 'modul-a') {
    const pa = document.getElementById('out-pa-dec')?.innerText || '';
    const pb = document.getElementById('out-pb-dec')?.innerText || '';
    const pab = document.getElementById('out-pab-dec')?.innerText || '';
    const pub = document.getElementById('out-pub-dec')?.innerText || '';
    const pubPct = document.getElementById('out-pub-pct')?.innerText || '';
    summaryText = `=== RINGKASAN PROBABILITAS DASAR (MODUL A) ===\n` +
      `P(A) = ${pa}\n` +
      `P(B) = ${pb}\n` +
      `P(A ∩ B) = ${pab}\n` +
      `P(A ∪ B) = ${pub} (${pubPct})\n` +
      `Hubungan: ${state.modulA.relation}\n` +
      `Dihasilkan oleh Aplikasi Kalkulator Probabilitas Kelompok 2.`;
  } else {
    const pe = document.getElementById('out-pe-dec')?.innerText || '';
    const pePct = document.getElementById('out-pe-pct')?.innerText || '';
    const post = document.getElementById('out-posterior-dec')?.innerText || '';
    const postPct = document.getElementById('out-posterior-pct')?.innerText || '';
    summaryText = `=== RINGKASAN TEOREMA BAYES (MODUL B) ===\n` +
      `Konteks: ${state.modulB.labelH} vs ${state.modulB.labelE}\n` +
      `Prior P(H) = ${state.modulB.priorH}\n` +
      `Sensitivitas P(E|H) = ${state.modulB.sensitivity}\n` +
      `False Positive P(E|H') = ${state.modulB.falsePositive}\n` +
      `Total Bukti P(E) = ${pe} (${pePct})\n` +
      `Posterior P(H|E) = ${post} (${postPct})\n` +
      `Dihasilkan oleh Aplikasi Kalkulator Probabilitas Kelompok 2.`;
  }

  navigator.clipboard.writeText(summaryText).then(() => {
    showToast('Ringkasan hasil berhasil disalin ke papan klip!', 'success');
  }).catch(() => {
    showToast('Gagal menyalin ringkasan ke papan klip.', 'error');
  });
}

/**
 * Buka / Tutup Modal Kamus Rumus
 */
function openFormulaModal() {
  const modal = document.getElementById('formula-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeFormulaModal() {
  const modal = document.getElementById('formula-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Helper untuk mengisi textContent elemen aman
 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ==============================================================
// 8. INISIALISASI SAAT DOM SIAP
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Pasang Event Listeners Input Modul A
  const paInput = document.getElementById('input-pa');
  const pbInput = document.getElementById('input-pb');
  const pIntInput = document.getElementById('input-p-intersection');
  const relationSelect = document.getElementById('select-relation');
  const labelAInput = document.getElementById('label-event-a');
  const labelBInput = document.getElementById('label-event-b');

  if (paInput) paInput.addEventListener('input', calculateModulA);
  if (pbInput) pbInput.addEventListener('input', calculateModulA);
  if (pIntInput) pIntInput.addEventListener('input', calculateModulA);
  if (labelAInput) labelAInput.addEventListener('input', calculateModulA);
  if (labelBInput) labelBInput.addEventListener('input', calculateModulA);

  if (relationSelect) {
    relationSelect.addEventListener('change', (e) => {
      toggleRelationInputs(e.target.value);
      calculateModulA();
    });
  }

  // Pasang Event Listeners Input Modul B - Bayes
  const priorInput = document.getElementById('bayes-prior');
  const sensInput = document.getElementById('bayes-sensitivity');
  const fpInput = document.getElementById('bayes-false-positive');
  const labelHInput = document.getElementById('bayes-label-h');
  const labelEInput = document.getElementById('bayes-label-e');

  if (priorInput) priorInput.addEventListener('input', calculateModulB);
  if (sensInput) sensInput.addEventListener('input', calculateModulB);
  if (fpInput) fpInput.addEventListener('input', calculateModulB);
  if (labelHInput) labelHInput.addEventListener('input', calculateModulB);
  if (labelEInput) labelEInput.addEventListener('input', calculateModulB);

  // Pasang Event Listeners Input Modul B - Bersyarat Sederhana
  const cPa = document.getElementById('cond-pa');
  const cPb = document.getElementById('cond-pb');
  const cPab = document.getElementById('cond-pab');
  const cLabelA = document.getElementById('cond-label-a');
  const cLabelB = document.getElementById('cond-label-b');

  if (cPa) cPa.addEventListener('input', calculateConditionalSimple);
  if (cPb) cPb.addEventListener('input', calculateConditionalSimple);
  if (cPab) cPab.addEventListener('input', calculateConditionalSimple);
  if (cLabelA) cLabelA.addEventListener('input', calculateConditionalSimple);
  if (cLabelB) cLabelB.addEventListener('input', calculateConditionalSimple);

  // Inisialisasi awal nilai default
  loadPresetKasusA();
  calculateModulB();
});
