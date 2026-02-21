const $ = (id)=>document.getElementById(id);
const views = {
  dashboard: $('view-dashboard'),
  proyectos: $('view-proyectos'),
  bitacora: $('view-bitacora'),
  modulos: $('view-modulos'),
  importexport: $('view-importexport')
};

const state = {
  proyectos: [],
  bitacora: []
};

const STORAGE_KEY = 'cod-data-v1';
const SUPABASE_URL = 'https://yxyzggisvwjjgxydativ.supabase.co';
const SUPABASE_ANON = 'sb_publishable_dnchkTsAhIxINM97-Si6yw_eWeZ9fDI';
const SUPABASE_TABLE = 'cod_data';
const SUPABASE_ID = 'main';
const IDEAS_DB = 'oficina_ideas_db';
const IDEAS_STORE = 'ideas';

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const data = JSON.parse(raw);
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
    }
  }catch(e){}
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleCloudSync();
}

function setView(name){
  Object.entries(views).forEach(([k,v])=>v.classList.toggle('hidden', k!==name));
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
}

function renderDashboard(){
  const total = state.proyectos.length;
  const activos = state.proyectos.filter(p=>p.estado==='activo').length;
  const pausados = state.proyectos.filter(p=>p.estado==='pausado').length;
  const completos = state.proyectos.filter(p=>p.estado==='completo').length;
  $('kpi-total').textContent = total;
  $('kpi-activos').textContent = activos;
  $('kpi-pausados').textContent = pausados;
  $('kpi-completos').textContent = completos;

  const list = $('dash-next');
  list.innerHTML='';
  const nexts = state.proyectos.filter(p=>p.next).slice(0,6);
  if(!nexts.length){ list.innerHTML = '<li class="small">Sin próximos pasos.</li>'; return; }
  nexts.forEach(p=>{
    const li = document.createElement('li');
    li.textContent = `${p.nombre} — ${p.next}`;
    list.appendChild(li);
  });
}

function renderProyectos(){
  const q = $('q').value.toLowerCase();
  const f = $('f-estado').value;
  const list = $('list-proyectos');
  list.innerHTML = '';

  const filtered = state.proyectos.filter(p=>{
    const text = [p.nombre, p.estado, (p.tags||[]).join(' '), p.notas||''].join(' ').toLowerCase();
    return (!q || text.includes(q)) && (!f || p.estado===f);
  });

  if(!filtered.length){
    list.innerHTML = '<div class="small">No hay proyectos.</div>';
    return;
  }

  filtered.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <strong>${p.nombre}</strong>
        <span class="small">${p.estado}</span>
      </div>
      <div class="small">Etiquetas: ${(p.tags||[]).join(', ') || '—'}</div>
      <div class="small">Próximo: ${p.next || '—'}</div>
      <div class="row">
        <button data-id="${p.id}" class="edit">Editar</button>
        <button data-id="${p.id}" class="del">Eliminar</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderBitacora(){
  const list = $('bit-list');
  list.innerHTML = '';
  const items = state.bitacora.slice().reverse();
  if(!items.length){ list.innerHTML = '<div class="small">Sin registros.</div>'; return; }
  items.forEach(b=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<div class="small">${new Date(b.ts).toLocaleString()}</div><div>${b.text}</div>`;
    list.appendChild(div);
  });
}

function openDialog(p){
  $('dlg').showModal();
  $('p-id').value = p?.id || '';
  $('p-nombre').value = p?.nombre || '';
  $('p-estado').value = p?.estado || 'activo';
  $('p-tags').value = (p?.tags||[]).join(', ');
  $('p-next').value = p?.next || '';
  $('p-notas').value = p?.notas || '';
  $('dlg-title').textContent = p ? 'Editar proyecto' : 'Nuevo proyecto';
}

function upsertProject(){
  const id = $('p-id').value || crypto.randomUUID();
  const data = {
    id,
    nombre: $('p-nombre').value.trim(),
    estado: $('p-estado').value,
    tags: $('p-tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    next: $('p-next').value.trim(),
    notas: $('p-notas').value.trim()
  };
  const idx = state.proyectos.findIndex(p=>p.id===id);
  if(idx>=0) state.proyectos[idx]=data; else state.proyectos.push(data);
  save();
  renderProyectos();
  renderDashboard();
}

function deleteProject(id){
  state.proyectos = state.proyectos.filter(p=>p.id!==id);
  save();
  renderProyectos();
  renderDashboard();
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'centro-operativo-dorado.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
      save();
      renderDashboard();
      renderProyectos();
      renderBitacora();
      alert('Importación lista.');
      scheduleCloudSync();
    }catch(e){ alert('JSON inválido.'); }
  };
  reader.readAsText(file);
}

function openIdeasDB(){
  return new Promise((res, rej)=>{
    const req = indexedDB.open(IDEAS_DB, 1);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(IDEAS_STORE)) db.createObjectStore(IDEAS_STORE, {keyPath:'id'});
    };
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

async function readIdeas(){
  try{
    const db = await openIdeasDB();
    const tx = db.transaction(IDEAS_STORE, 'readonly');
    const store = tx.objectStore(IDEAS_STORE);
    const req = store.getAll();
    return await new Promise((res)=>{ req.onsuccess = ()=>res(req.result || []); });
  }catch(e){ return []; }
}

async function writeIdeas(list){
  const db = await openIdeasDB();
  const tx = db.transaction(IDEAS_STORE, 'readwrite');
  const store = tx.objectStore(IDEAS_STORE);
  store.clear();
  (list||[]).forEach(i=>store.put(i));
}

async function exportAll(){
  const ideas = await readIdeas();
  const payload = {
    proyectos: state.proyectos,
    bitacora: state.bitacora,
    ideas
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'centro-operativo-dorado-todo.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importAll(file){
  const reader = new FileReader();
  reader.onload = async () => {
    try{
      const data = JSON.parse(reader.result);
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
      await writeIdeas(data.ideas || []);
      save();
      renderDashboard();
      renderProyectos();
      renderBitacora();
      alert('Importación total lista.');
      scheduleCloudSync();
    }catch(e){ alert('JSON inválido.'); }
  };
  reader.readAsText(file);
}

async function supaFetch(path, options={}){
  const headers = Object.assign({
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
  }, options.headers || {});
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  if(!res.ok) throw new Error('Supabase error');
  return res.status === 204 ? null : res.json();
}

async function loadFromCloud(){
  try{
    const rows = await supaFetch(`${SUPABASE_TABLE}?id=eq.${SUPABASE_ID}&select=data`, { method: 'GET' });
    if(rows && rows[0] && rows[0].data){
      const data = rows[0].data;
      state.proyectos = data.proyectos || [];
      state.bitacora = data.bitacora || [];
      await writeIdeas(data.ideas || []);
      save();
      renderDashboard();
      renderProyectos();
      renderBitacora();
    }
  }catch(e){}
}

let syncTimer = null;
function scheduleCloudSync(){
  if(syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToCloud, 800);
}

async function syncToCloud(){
  try{
    const ideas = await readIdeas();
    const payload = {
      id: SUPABASE_ID,
      data: {
        proyectos: state.proyectos,
        bitacora: state.bitacora,
        ideas
      }
    };
    await supaFetch(`${SUPABASE_TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([payload])
    });
  }catch(e){}
}

function bind(){
  document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click', ()=>setView(b.dataset.view)));
  $('btn-new').addEventListener('click', ()=>openDialog());
  $('form-proyecto').addEventListener('submit', (e)=>{ e.preventDefault(); upsertProject(); $('dlg').close(); });
  $('list-proyectos').addEventListener('click', (e)=>{
    const id = e.target.dataset.id;
    if(e.target.classList.contains('edit')){
      openDialog(state.proyectos.find(p=>p.id===id));
    }
    if(e.target.classList.contains('del')) deleteProject(id);
  });
  $('q').addEventListener('input', renderProyectos);
  $('f-estado').addEventListener('change', renderProyectos);

  $('bit-add').addEventListener('click', ()=>{
    const text = $('bit-text').value.trim();
    if(!text) return;
    state.bitacora.push({ts: Date.now(), text});
    $('bit-text').value='';
    save();
    renderBitacora();
  });

  $('btn-export').addEventListener('click', exportJSON);
  $('file-import').addEventListener('change', (e)=>{ if(e.target.files[0]) importJSON(e.target.files[0]); });
  $('btn-export-all').addEventListener('click', exportAll);
  $('file-import-all').addEventListener('change', (e)=>{ if(e.target.files[0]) importAll(e.target.files[0]); });
}

load();
bind();
renderDashboard();
renderProyectos();
renderBitacora();
setView('dashboard');
loadFromCloud();
