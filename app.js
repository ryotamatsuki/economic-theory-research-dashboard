const state={data:null,filters:{priority:'',type:'',stage:'',health:'',journal:''}};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const badgeClass=h=>({'Blocked':'blocked','Review':'review','On track':'track','Waiting':'waiting'}[h]||'waiting');

function setSelect(id,values){const el=$(id);[...new Set(values.filter(Boolean))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o);});}
function filtered(){return state.data.projects.filter(p=>Object.entries(state.filters).every(([k,v])=>!v||p[k]===v));}
function kpi(label,value,key,cls=''){return `<button type="button" class="kpi kpi-button ${cls}" data-detail-kind="${esc(key)}" aria-label="Show ${esc(label)} project details"><span class="kpi-label">${esc(label)}</span><span class="kpi-value">${esc(value)}</span><span class="kpi-hint">View details</span></button>`;}

function renderKpis(){const s=state.data.stats;$('#kpis').innerHTML=[kpi('Live',s.live,'live'),kpi('P0',s.p0,'p0'),kpi('Blocked',s.blocked,'blocked','blocked'),kpi('Submission Ready',s.submission_ready,'submission-ready'),kpi('Submitted',s.submitted,'submitted'),kpi('Review Needed',s.review_needed,'review-needed','review')].join('');}
function renderAttention(){const rows=state.data.projects.filter(p=>p.review_needed||p.health==='Blocked');const el=$('#attention-list');if(!rows.length){el.innerHTML='<div class="empty">No portfolio items currently require attention.</div>';return;}el.innerHTML=rows.map((p,i)=>`<button type="button" class="attention-row detail-trigger" data-project-id="${esc(p.id)}"><span>${i+1}</span><span class="project-link"><span class="priority">${esc(p.priority)}</span> ${esc(p.project)}</span><span class="badge ${badgeClass(p.health==='Blocked'?'Blocked':'Review')}">${esc(p.health==='Blocked'?'BLOCKED':'REVIEW NEEDED')}</span><span class="attention-note muted">${esc(p.attention_reason)}</span></button>`).join('');}
function renderStagePipeline(){const el=$('#stage-pipeline');el.innerHTML=state.data.pipeline.map(x=>`<button type="button" class="stage detail-trigger" data-stage-lane="${esc(x.label)}" aria-label="Show ${esc(x.label)} projects"><span class="stage-label">${esc(x.label)}</span><span class="stage-count">${esc(x.count)}</span><span class="stage-hint">View</span></button>`).join('');}
function renderTable(){const rows=filtered();$('#result-count').textContent=`${rows.length} of ${state.data.projects.length} live projects`;$('#portfolio-body').innerHTML=rows.map(p=>`<tr><td class="priority">${esc(p.priority)}</td><td><button type="button" class="project-detail-link" data-project-id="${esc(p.id)}">${esc(p.project)}</button></td><td>${esc(p.type)}</td><td>${esc(p.stage)}</td><td class="verdict">${esc(p.verdict)}</td><td><span class="badge ${badgeClass(p.health)}">${esc(p.health)}</span></td><td>${esc(p.next_gate)}</td><td class="nowrap">${esc(p.journal||'—')}</td><td class="nowrap">${esc(p.activity)}</td></tr>`).join('')||'<tr><td colspan="9" class="empty">No projects match the current filters.</td></tr>';}
function renderPublication(){const lanes=['Manuscript','Submission Ready','Submitted','R&R'];const root=$('#publication-pipeline');root.innerHTML=lanes.map(l=>{const items=state.data.projects.filter(p=>p.publication_lane===l);return `<button type="button" class="publication-lane detail-trigger" data-publication-lane="${esc(l)}" aria-label="Show ${esc(l)} publication details"><span class="publication-heading">${esc(l)} <span class="lane-count">${items.length}</span></span>${items.length?items.map(p=>`<span class="publication-item">${esc(p.project)}</span>`).join(''):'<span class="muted">—</span>'}<span class="publication-hint">View details</span></button>`}).join('');}
function renderRecent(){const el=$('#recent-list');el.innerHTML=state.data.recent.length?state.data.recent.map(r=>`<div class="recent-item"><span class="recent-time">${esc(r.when)}</span><span><strong>${esc(r.project)}</strong> — ${esc(r.event)}</span></div>`).join(''):'<div class="empty">No recent observed changes.</div>';}
function renderSync(){const s=state.data.sync;$('#last-sync').textContent=`Last refresh: ${s.generated_jst}`;const built=new Date(s.generated_utc).getTime();const ageMinutes=(Date.now()-built)/60000;let cls='healthy',label='Auto Sync Healthy';if(!Number.isFinite(ageMinutes)||ageMinutes>360){cls='failed';label='Dashboard refresh overdue';}else if(ageMinutes>150){cls='stale';label='Auto Sync Stale';}const el=$('#sync-health');el.className=`sync-health ${cls}`;el.innerHTML=`<span class="dot"></span>${esc(label)}`;}

function rowsForKind(kind){
  const all=state.data.projects;
  if(kind==='live')return all;
  if(kind==='p0')return all.filter(p=>p.priority==='P0');
  if(kind==='blocked')return all.filter(p=>p.health==='Blocked');
  if(kind==='submission-ready')return all.filter(p=>p.publication_lane==='Submission Ready');
  if(kind==='submitted')return all.filter(p=>p.publication_lane==='Submitted');
  if(kind==='review-needed')return all.filter(p=>p.review_needed);
  return [];
}
function titleForKind(kind){return ({live:'Live Projects',p0:'P0 Priority Projects',blocked:'Blocked Projects','submission-ready':'Submission Ready',submitted:'Submitted Projects','review-needed':'Review Needed'}[kind]||'Portfolio Details');}
function detailTable(rows){
  if(!rows.length)return '<div class="detail-empty">No projects in this category.</div>';
  return `<div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Project</th><th>P</th><th>Type</th><th>Stage</th><th>Verdict</th><th>Health</th><th>Next Gate</th><th>Journal</th><th>Activity</th></tr></thead><tbody>${rows.map(p=>`<tr><td><button type="button" class="project-detail-link" data-project-id="${esc(p.id)}">${esc(p.project)}</button></td><td class="priority">${esc(p.priority)}</td><td>${esc(p.type)}</td><td>${esc(p.stage)}</td><td class="verdict">${esc(p.verdict)}</td><td><span class="badge ${badgeClass(p.health)}">${esc(p.health)}</span></td><td>${esc(p.next_gate)}</td><td>${esc(p.journal||'—')}</td><td>${esc(p.activity)}</td></tr>`).join('')}</tbody></table></div>`;
}
function projectDetail(p){
  return `<div class="project-detail-card"><div class="project-detail-head"><div><span class="priority">${esc(p.priority)}</span><h3>${esc(p.project)}</h3></div><span class="badge ${badgeClass(p.health)}">${esc(p.health)}</span></div><dl class="detail-grid"><div><dt>Type</dt><dd>${esc(p.type)}</dd></div><div><dt>Stage</dt><dd>${esc(p.stage)}</dd></div><div><dt>Scientific Verdict</dt><dd>${esc(p.verdict)}</dd></div><div><dt>Next Gate</dt><dd>${esc(p.next_gate)}</dd></div><div><dt>Journal</dt><dd>${esc(p.journal||'—')}</dd></div><div><dt>Activity</dt><dd>${esc(p.activity)}</dd></div><div><dt>Review Needed</dt><dd>${p.review_needed?'Yes':'No'}</dd></div><div><dt>Attention Signal</dt><dd>${esc(p.attention_reason||'—')}</dd></div></dl></div>`;
}
function openDetail(title,rows,subtitle='Click a project name for its public metadata.'){
  $('#detail-title').textContent=title;
  $('#detail-subtitle').textContent=`${rows.length} project${rows.length===1?'':'s'} · ${subtitle}`;
  $('#detail-content').innerHTML=rows.length===1?projectDetail(rows[0]):detailTable(rows);
  const dialog=$('#detail-dialog');
  if(!dialog.open)dialog.showModal();
}
function openProject(id){
  const p=state.data.projects.find(x=>x.id===id);
  if(p)openDetail(p.project,[p],'Sanitized public project detail.');
}
function bindDetails(){
  document.addEventListener('click',e=>{
    if(e.target.closest('#detail-close')){$('#detail-dialog').close();return;}
    const project=e.target.closest('[data-project-id]');
    if(project){openProject(project.dataset.projectId);return;}
    const kpiTrigger=e.target.closest('[data-detail-kind]');
    if(kpiTrigger){const kind=kpiTrigger.dataset.detailKind;openDetail(titleForKind(kind),rowsForKind(kind));return;}
    const stage=e.target.closest('[data-stage-lane]');
    if(stage){const label=stage.dataset.stageLane;openDetail(`${label} Stage`,state.data.projects.filter(p=>p.pipeline_lane===label),'Projects currently mapped to this pipeline stage.');return;}
    const publication=e.target.closest('[data-publication-lane]');
    if(publication){const label=publication.dataset.publicationLane;openDetail(`${label} Publication Lane`,state.data.projects.filter(p=>p.publication_lane===label),'Projects currently mapped to this publication lane.');}
  });
  $('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog'))$('#detail-dialog').close();});
}
function bindFilters(){const spec=[['#filter-priority','priority'],['#filter-type','type'],['#filter-stage','stage'],['#filter-health','health'],['#filter-journal','journal']];spec.forEach(([id,key])=>{$(id).addEventListener('change',e=>{state.filters[key]=e.target.value;renderTable();});});$('#clear-filters').addEventListener('click',()=>{spec.forEach(([id,key])=>{$(id).value='';state.filters[key]='';});renderTable();});}

async function init(){try{const res=await fetch('data.json',{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);state.data=await res.json();setSelect('#filter-priority',state.data.projects.map(p=>p.priority));setSelect('#filter-type',state.data.projects.map(p=>p.type));setSelect('#filter-stage',state.data.projects.map(p=>p.stage));setSelect('#filter-health',state.data.projects.map(p=>p.health));setSelect('#filter-journal',state.data.projects.map(p=>p.journal));bindFilters();bindDetails();renderSync();renderKpis();renderAttention();renderStagePipeline();renderTable();renderPublication();renderRecent();}catch(err){document.body.innerHTML=`<main class="shell"><section class="panel"><div class="panel-title"><h2>Dashboard data unavailable</h2></div><div class="empty">${esc(err.message)}</div></section></main>`;}}
init();
