// Static webapp script: loads CSV from data/adipose_gene_pathway_cor.csv (or via file input)
// NOTE: project contains "adipose_gene_pathway_cor_head1000.csv" — set default to that file.
const DATA_PATH = 'data/adipose_gene_pathway_cor_head1000.csv';
let RAW = null; // array of objects
let LAST_RAW_TEXT = null; // store raw text for diagnostics

function showPreview(rows){
  const pre = document.getElementById('preview');
  if (!rows || !rows.length) { pre.textContent = 'No data loaded'; return; }
  const keys = Object.keys(rows[0]);
  const header = keys.join('\t');
  const lines = rows.slice(0,6).map(r => keys.map(k=>r[k]).join('\t'));
  pre.textContent = header + '\n' + lines.join('\n');
}

function parseCSVText(text){
  try {
    LAST_RAW_TEXT = String(text || '');
    // remove BOM if present
    const hasBOM = /^\uFEFF/.test(LAST_RAW_TEXT);
    const txt = LAST_RAW_TEXT.replace(/^\uFEFF/, '');
    // helper: detect likely delimiter from first non-empty line
    function detectSep(s){
      const lines = s.split(/\r?\n/).filter(l=>l.trim()!=='');
      if (!lines.length) return ',';
      const first = lines[0];
      const candidates = ['\t', ',', ';', '|'];
      let best = ','; let bestCount = -1;
      for (const c of candidates){ const cnt = (first.split(c).length - 1); if (cnt>bestCount){ bestCount = cnt; best = c; } }
      return best;
    }
    const sep = detectSep(txt);
    // store diagnostics for caller
    window.PARSE_DIAG = { detectedSep: sep, hasBOM: !!hasBOM };
    if (typeof Papa !== 'undefined' && Papa.parse) {
      // try with autodetect first
      let res = Papa.parse(txt, {header:true, skipEmptyLines:true});
      if (!res || !res.data || res.data.length===0){
        // try forcing detected delimiter
        res = Papa.parse(txt, {header:true, skipEmptyLines:true, delimiter: sep});
      }
      const data = (res && res.data) ? res.data : [];
      if (data.length===0){
        // no rows parsed -> keep LAST_RAW_TEXT and PARSE_DIAG for diagnostics
        return [];
      }
      return data;
    }
    // Fallback simple parser if Papa not available
    const lines = txt.split(/\r?\n/).filter(l=>l.trim()!=='');
    if (lines.length === 0) return [];
    const header = lines[0].split(sep).map(h=>h.trim());
    const data = lines.slice(1).map(l=>{
      const cols = l.split(sep);
      const obj = {};
      for (let i=0;i<header.length;i++){ obj[header[i]] = cols[i]!==undefined ? cols[i].replace(/^"|"$/g,'') : ''; }
      return obj;
    });
    return data;
  } catch (err) {
    console.error('parseCSVText error', err);
    const st = document.getElementById('status'); if (st) st.textContent = 'CSV parse error: '+(err.message||err);
    return [];
  }
}

function loadDefault(){
  const st = document.getElementById('status'); if (st) st.textContent = 'Loading default CSV...';
  // If page is opened via file:// browsers often block fetch; instruct user to use file input instead
  if (location && location.protocol === 'file:'){
    if (st) st.textContent = 'Running from file:// — use the file input or drag-and-drop to load CSV.';
    alert('This page is opened via file://. Use the "Load CSV" file input or drag-and-drop to load your CSV. Loading default via fetch requires serving the site over HTTP(S).');
    return;
  }

  fetch(DATA_PATH).then(r=>r.text()).then(txt=>{
    RAW = parseCSVText(txt);
    if (!RAW || RAW.length===0){ if (st) st.textContent = 'Default CSV loaded but empty or failed to parse.'; return; }
    initUIFromData();
  }).catch(e=>{
    console.error(e);
    alert('Failed to load default CSV at '+DATA_PATH+". Put your CSV there or use file input.");
    if (st) st.textContent = 'Failed to load default CSV.';
  });
}

function handleFileInput(file){
  const st = document.getElementById('status'); if (st) st.textContent = 'Reading file...';
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      RAW = parseCSVText(e.target.result);
      if (!RAW || RAW.length===0){
        // try to detect UTF-16/NULL-byte patterns and re-read as utf-16le once
        const sampleRaw = LAST_RAW_TEXT || '';
        const charCodes = [];
        for (let i=0;i<Math.min(8, sampleRaw.length); i++){ charCodes.push(sampleRaw.charCodeAt(i)); }
        const looksLikeUtf16 = charCodes.some(c=>c===0);
        if (looksLikeUtf16){
          // re-read as utf-16le and reparse
          const r2 = new FileReader();
          if (st) st.textContent = 'Retrying read as UTF-16...';
          r2.onload = function(e2){
            RAW = parseCSVText(e2.target.result || '');
            if (!RAW || RAW.length===0){
              showParseFailureDiagnostics(st);
              return;
            }
            initUIFromData();
          };
          r2.onerror = function(){ showParseFailureDiagnostics(st); };
          try{ r2.readAsText(file, 'utf-16le'); return; }catch(err){ /* ignore and fallthrough to diagnostics */ }
        }
        showParseFailureDiagnostics(st);
        return;
      }
      initUIFromData();
    } catch(err){ console.error(err); if (st) st.textContent = 'Error parsing file: '+(err.message||err); }
  };
  reader.onerror = function(err){ console.error('FileReader error', err); if (st) st.textContent = 'Failed to read file.'; };
  reader.readAsText(file);
}

function showParseFailureDiagnostics(st){
  if (st) {
    const diag = window.PARSE_DIAG || {};
    st.textContent = 'File loaded but empty or failed to parse. Detected sep: '+(diag.detectedSep||'?')+', BOM: '+(diag.hasBOM? 'yes':'no')+". See preview.";
  }
  const sample = (LAST_RAW_TEXT||'').slice(0,2000);
  function hexFirst(s,n){ const b=[]; for (let i=0;i<Math.min(n, s.length); i++){ b.push(s.charCodeAt(i).toString(16).padStart(2,'0')); } return b.join(' '); }
  const pre = document.getElementById('preview'); if (pre) pre.textContent = '--- First line (raw) ---\n'+(sample.split(/\r?\n/)[0]||'')+'\n\n--- First 2k chars ---\n'+sample+'\n\n--- Hex of first 64 chars ---\n'+hexFirst(LAST_RAW_TEXT||'',64);
}

function initUIFromData(){
  const st = document.getElementById('status');
  if (!RAW || RAW.length===0){ showPreview(RAW); if (st) st.textContent = 'No data loaded'; return; }
  showPreview(RAW);
  // populate column mapping selects
  const keys = Object.keys(RAW[0] || {});
  const colGene = document.getElementById('colGene');
  const colPathway = document.getElementById('colPathway');
  // create colCor and colP if not present in DOM
  if (!document.getElementById('colCor')){
    const el = document.createElement('select'); el.id = 'colCor'; el.style.marginTop = '8px'; document.querySelector('.panel').appendChild(el);
  }
  if (!document.getElementById('colP')){
    const el2 = document.createElement('select'); el2.id = 'colP'; el2.style.marginTop = '8px'; document.querySelector('.panel').appendChild(el2);
  }
  const colCor = document.getElementById('colCor');
  const colP = document.getElementById('colP');
  [colGene, colPathway, colCor, colP].forEach(s=>{ s.innerHTML=''; keys.forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k; s.appendChild(o); }); });

  // set sensible defaults based on detection
  const defGene = detectColumn(['gene','symbol','hgnc_symbol','gene_name']);
  const defPath = detectColumn(['pathway','term','gsva','gsva_name','path']);
  const defCor  = detectColumn(['cor','corr','correlation','rho']);
  const defP    = detectColumn(['pval','p.value','p_value','pvalue']);
  colGene.value = defGene || keys[0]; colPathway.value = defPath || keys[1] || keys[0]; colCor.value = defCor || keys[2] || keys[0]; colP.value = defP || '';

  // populate gene select using selected gene column
  const geneSelect = document.getElementById('geneSelect');
  function populateGenes(){
    const gcol = colGene.value;
    const vals = RAW.map(r=>{
      const v = r[gcol];
      if (v===undefined || v===null) return '';
      return String(v).replace(/^"|"$/g,'').trim();
    }).filter(v=>v!=='');
    const uniq = Array.from(new Set(vals)).sort((a,b)=>a.localeCompare(b, undefined, {sensitivity:'base'}));
    geneSelect.innerHTML = '';
    uniq.forEach(g=>{ const opt=document.createElement('option'); opt.value=g; opt.textContent=g; geneSelect.appendChild(opt); });
    geneSelect.disabled = uniq.length===0;
    document.getElementById('updateBtn').disabled = uniq.length===0;
    document.getElementById('downloadBtn').disabled = uniq.length===0;
    if (st) st.textContent = `Loaded ${RAW.length} rows — ${keys.length} columns detected.`;
  }
  colGene.addEventListener('change', populateGenes);
  colPathway.addEventListener('change', ()=>{ document.getElementById('status').textContent = `Pathway column set to ${colPathway.value}`; });
  populateGenes();
}

function detectColumn(candidates){
  if (!RAW || RAW.length===0) return null;
  const keys = Object.keys(RAW[0]).map(k=>k.toLowerCase());
  for (const c of candidates){
    const i = keys.indexOf(c.toLowerCase()); if (i>=0) return Object.keys(RAW[0])[i];
  }
  return Object.keys(RAW[0])[0];
}

function updatePlot(){
  if (!RAW) { alert('No data loaded'); return; }
  const gene = document.getElementById('geneSelect').value;
  const topPos = parseInt(document.getElementById('topPos').value)||0;
  const topNeg = parseInt(document.getElementById('topNeg').value)||0;
  const showLabels = document.getElementById('showLabels').checked;
    const plotType = document.getElementById('plotType') ? document.getElementById('plotType').value : 'Bubble';
  const lollipopPalette = document.getElementById('lollipopPalette').value;
  const lollipopReverse = document.getElementById('lollipopReverse').checked;

  // read column mapping from user-selected inputs (or fall back to auto-detection)
  const geneCol = document.getElementById('colGene')?.value || detectColumn(['gene','symbol','hgnc_symbol','gene_name']);
  const pathCol = document.getElementById('colPathway')?.value || detectColumn(['pathway','term','gsva','gsva_name','path']);
  const corCol  = document.getElementById('colCor')?.value || detectColumn(['cor','corr','correlation','rho']);
  const pCol    = document.getElementById('colP')?.value || detectColumn(['pval','p.value','p_value','pvalue']);

  // filter by sanitized gene column (remove quotes/trim before compare)
  let subset = RAW.filter(r=>{
    const v = r[geneCol];
    const sv = v===undefined || v===null ? '' : String(v).replace(/^"|"$/g,'').trim();
    return sv === String(gene);
  });
  // sanitize subset keys (remove surrounding quotes and trim)
  subset = subset.map(r=>{
    const copy = {};
    Object.keys(r).forEach(k=>{ copy[k]= r[k]===undefined || r[k]===null ? '' : String(r[k]).replace(/^"|"$/g,'').trim(); });
    return copy;
  });
  subset.forEach(r=>{ r._cor = parseFloat(r[corCol]); });
  const pos = subset.filter(r=>r._cor>0).sort((a,b)=>b._cor-a._cor).slice(0,topPos);
  const neg = subset.filter(r=>r._cor<0).sort((a,b)=>a._cor-b._cor).slice(0,topNeg);
  const final = neg.concat(pos);
  if (final.length===0){ alert('No rows for this gene'); return; }

  // prepare plot data
  const pathways = final.map(r=>r[pathCol]);
  const cors = final.map(r=>r._cor);
  // sizes: use correlation magnitude
  const sizesVals = final.map(r=>Math.abs(r._cor));
  // color values: prefer -log10(pvalue) if p column exists, otherwise use correlation
  let colorVals = null;
  if (pCol && final[0] && final[0][pCol]!==undefined && final[0][pCol]!==null && String(final[0][pCol]).trim()!==''){
    colorVals = final.map(r=>{
      const pv = parseFloat(r[pCol]);
      return Number.isFinite(pv) ? -Math.log10(Math.max(pv, 1e-300)) : 0;
    });
  } else {
    colorVals = cors.slice();
  }

  const width = parseInt(document.getElementById('plotWidth').value)||1200;
  const height = parseInt(document.getElementById('plotHeight').value)||700;

  if (plotType==='Bubble'){
    const markerSizes = computeMarkerSizes(sizesVals, {minPx:8, maxPx:60, transform:null});
    const palette = paletteToPlotly(lollipopPalette, lollipopReverse);
    const colorbarTitle = (pCol && colorVals && colorVals.length)? '-log10(p)' : 'Correlation';
    const trace = {
      x: cors,
      y: pathways,
      mode: 'markers',
      marker: { size: markerSizes, opacity:0.85, color: colorVals, colorscale: palette, showscale:true, colorbar:{title: colorbarTitle, titleside:'right'}, line:{color:'black',width:0.5}, sizemode:'diameter' },
      type: 'scatter'
    };
    // compute left margin based on longest pathway name
    const maxLabel = pathways.reduce((m,p)=>Math.max(m, String(p).length), 0);
    const leftMargin = Math.min(900, Math.max(220, Math.floor(maxLabel * 8)));
    const layout = {
      title: `Top ${final.length} pathways for ${gene}`,
      xaxis:{title:'Correlation', zeroline:true, zerolinecolor:'#ccc', tickcolor:'#000', titlefont:{color:'#000'}, tickfont:{color:'#000'}},
      yaxis:{type:'category', autorange:'reversed', tickfont:{color:'#000', size:11}, automargin:true},
      width, height,
      plot_bgcolor:'#fff', paper_bgcolor:'#fff',
      margin:{l:leftMargin, r:50, t:80, b:80}
    };
    Plotly.newPlot('plot',[trace], layout, {responsive:true});
    makeTable(final);
  } else {
    // lollipop: draw segments as one trace (with None separators) + markers
    const xSeg = [], ySeg = }]}