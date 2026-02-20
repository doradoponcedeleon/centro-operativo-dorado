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
    }catch(e){ alert('JSON inválido.'); }
  };
  reader.readAsText(file);
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
}

load();
bind();
renderDashboard();
renderProyectos();
renderBitacora();
setView('dashboard');
