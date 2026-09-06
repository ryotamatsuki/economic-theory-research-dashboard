const state = {data:null, filters:{priority:'',type:'',stage:'',health:'',field:''}};
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const badgeClass = health => ({'Blocked':'blocked','Review':'review','On track':'track','Waiting':'waiting'}[health] || 'waiting');
let modalScrollY = 0;

const typeLabel = value => ({'Theory':'理論研究','Correction':'訂正論文','Candidate':'訂正候補','Audit':'監査'}[value] || value);
const healthLabel = value => ({'Blocked':'ブロック','Review':'要確認','On track':'順調','Waiting':'待機'}[value] || value);
const pipelineLabel = value => ({'Prior-Art':'先行研究','Research Gate':'研究ゲート','Theory Frozen':'理論凍結','Manuscript':'原稿','Submission Ready':'投稿準備完了','Submitted':'投稿済み'}[value] || value);
const publicationLabel = value => ({'Manuscript':'原稿','Submission Ready':'投稿準備完了','Submitted':'投稿済み','R&R':'R&R'}[value] || value);
const attentionReasonLabel = value => ({'Blocking gate':'ブロック中','Sync drift':'更新差分あり','Verification gate':'検証ゲート','Research reset':'研究ルート再検討'}[value] || value);
const recentEventLabel = value => ({'Portfolio review signal detected':'ポートフォリオ差分を検出','Blocking gate active':'ブロック中','Repository observation refreshed':'GitHub上の研究記録を確認して更新'}[value] || value);

function relativeLabel(value) {
  const match = String(value ?? '').match(/^(\d+)(m|h|d)$/);
  if (!match) return value || '—';
  const unit = {m:'分前',h:'時間前',d:'日前'}[match[2]];
  return `${match[1]}${unit}`;
}

function setSelect(id, values, formatter=value=>value) {
  const el = $(id);
  [...new Set(values.filter(Boolean))].sort().forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = formatter(value);
    el.appendChild(option);
  });
}

function filtered() {
  return state.data.projects.filter(project =>
    Object.entries(state.filters).every(([key,value]) => !value || project[key] === value)
  );
}

function kpi(label, value, key, cls='') {
  return `<button type="button" class="kpi kpi-button ${cls}" data-detail-kind="${esc(key)}" aria-label="${esc(label)}の詳細を表示"><span class="kpi-label">${esc(label)}</span><span class="kpi-value">${esc(value)}</span><span class="kpi-hint">詳細を見る</span></button>`;
}

function renderKpis() {
  const s = state.data.stats;
  $('#kpis').innerHTML = [
    kpi('稼働中', s.live, 'live'),
    kpi('P0', s.p0, 'p0'),
    kpi('ブロック', s.blocked, 'blocked', 'blocked'),
    kpi('投稿準備完了', s.submission_ready, 'submission-ready'),
    kpi('投稿済み', s.submitted, 'submitted'),
    kpi('要確認', s.review_needed, 'review-needed', 'review')
  ].join('');
}

function renderAttention() {
  const rows = state.data.projects.filter(p => p.review_needed || p.health === 'Blocked');
  const el = $('#attention-list');
  if (!rows.length) {
    el.innerHTML = '<div class="empty">現在、要対応の案件はありません。</div>';
    return;
  }
  el.innerHTML = rows.map((p,i) => `<button type="button" class="attention-row detail-trigger" data-project-id="${esc(p.id)}"><span>${i+1}</span><span class="project-link"><span class="priority">${esc(p.priority)}</span> ${esc(p.project)}</span><span class="badge ${badgeClass(p.health==='Blocked'?'Blocked':'Review')}">${esc(p.health==='Blocked'?'ブロック':'要確認')}</span><span class="attention-note muted">${esc(attentionReasonLabel(p.attention_reason))}</span></button>`).join('');
}

function renderStagePipeline() {
  $('#stage-pipeline').innerHTML = state.data.pipeline.map(stage => `<button type="button" class="stage detail-trigger" data-stage-lane="${esc(stage.label)}" aria-label="${esc(pipelineLabel(stage.label))}の研究を表示"><span class="stage-label">${esc(pipelineLabel(stage.label))}</span><span class="stage-count">${esc(stage.count)}</span><span class="stage-hint">詳細を見る</span></button>`).join('');
}

function renderTable() {
  const rows = filtered();
  $('#result-count').textContent = `全${state.data.projects.length}件中 ${rows.length}件を表示`;
  $('#portfolio-body').innerHTML = rows.map(p => `<tr><td class="priority">${esc(p.priority)}</td><td><button type="button" class="project-detail-link" data-project-id="${esc(p.id)}">${esc(p.project)}</button></td><td>${esc(typeLabel(p.type))}</td><td>${esc(p.stage)}</td><td class="verdict">${esc(p.verdict)}</td><td><span class="badge ${badgeClass(p.health)}">${esc(healthLabel(p.health))}</span></td><td>${esc(p.next_gate)}</td><td>${esc(p.field||'—')}</td><td class="nowrap">${esc(relativeLabel(p.activity))}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">現在の絞り込み条件に一致する研究はありません。</td></tr>';
}

function renderPublication() {
  const lanes = ['Manuscript','Submission Ready','Submitted','R&R'];
  $('#publication-pipeline').innerHTML = lanes.map(lane => {
    const items = state.data.projects.filter(p => p.publication_lane === lane);
    return `<button type="button" class="publication-lane detail-trigger" data-publication-lane="${esc(lane)}" aria-label="${esc(publicationLabel(lane))}の投稿案件を表示"><span class="publication-heading">${esc(publicationLabel(lane))} <span class="lane-count">${items.length}</span></span>${items.length ? items.map(p=>`<span class="publication-item">${esc(p.project)}</span>`).join('') : '<span class="muted">—</span>'}<span class="publication-hint">詳細を見る</span></button>`;
  }).join('');
}

function renderRecent() {
  const recent = state.data.recent;
  $('#recent-list').innerHTML = recent.length
    ? recent.map(r => `<div class="recent-item"><span class="recent-time">${esc(relativeLabel(r.when))}</span><span><strong>${esc(r.project)}</strong> — ${esc(recentEventLabel(r.event))}</span></div>`).join('')
    : '<div class="empty">最近の更新はありません。</div>';
}

function renderSync() {
  const sync = state.data.sync;
  $('#last-sync').textContent = `最終更新: ${sync.generated_jst}`;
  const el = $('#sync-health');
  el.className = 'sync-health healthy';
  el.innerHTML = '<span class="dot"></span>手動更新';
}

function rowsForKind(kind) {
  const all = state.data.projects;
  if (kind === 'live') return all;
  if (kind === 'p0') return all.filter(p => p.priority === 'P0');
  if (kind === 'blocked') return all.filter(p => p.health === 'Blocked');
  if (kind === 'submission-ready') return all.filter(p => p.publication_lane === 'Submission Ready');
  if (kind === 'submitted') return all.filter(p => p.publication_lane === 'Submitted');
  if (kind === 'review-needed') return all.filter(p => p.review_needed);
  return [];
}

function titleForKind(kind) {
  return ({
    live:'稼働中の研究',
    p0:'P0優先研究',
    blocked:'ブロック中の研究',
    'submission-ready':'投稿準備完了',
    submitted:'投稿済み研究',
    'review-needed':'要確認の研究'
  }[kind] || 'ポートフォリオ詳細');
}

function detailTable(rows) {
  if (!rows.length) return '<div class="detail-empty">この区分に該当する研究はありません。</div>';
  return `<div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>研究</th><th>優先度</th><th>種別</th><th>ステージ</th><th>科学的判定</th><th>状態</th><th>次のゲート</th><th>研究分野</th><th>更新</th></tr></thead><tbody>${rows.map(p => `<tr><td><button type="button" class="project-detail-link" data-project-id="${esc(p.id)}">${esc(p.project)}</button></td><td class="priority">${esc(p.priority)}</td><td>${esc(typeLabel(p.type))}</td><td>${esc(p.stage)}</td><td class="verdict">${esc(p.verdict)}</td><td><span class="badge ${badgeClass(p.health)}">${esc(healthLabel(p.health))}</span></td><td>${esc(p.next_gate)}</td><td>${esc(p.field||'—')}</td><td>${esc(relativeLabel(p.activity))}</td></tr>`).join('')}</tbody></table></div>`;
}

function explanationBlock(kicker, title, body, background='#f7f7f5') {
  return `<section style="padding:17px 18px;border:1px solid rgba(17,17,17,.12);border-radius:9px;background:${background}"><p class="eyebrow" style="margin:0 0 6px">${esc(kicker)}</p><h4 style="margin:0 0 8px;font-size:16px;font-weight:650;letter-spacing:-.015em">${esc(title)}</h4><p style="margin:0;font-size:14px;line-height:1.9;color:#33332f">${esc(body)}</p></section>`;
}

function projectDetail(p) {
  const interesting = p.interesting_point || p.research_question || '—';
  return `<div class="project-detail-card">
    <div class="project-detail-head"><div><span class="priority">${esc(p.priority)}</span><h3>${esc(p.project)}</h3></div><span class="badge ${badgeClass(p.health)}">${esc(healthLabel(p.health))}</span></div>
    <div style="display:grid;grid-template-columns:1fr;gap:10px;margin:0 0 18px">
      ${explanationBlock('01 / CONTEXT','どんな研究？',p.overview,'#f7f7f5')}
      ${explanationBlock('02 / WHY IT MATTERS','何が面白い？',interesting,'#ffffff')}
      ${explanationBlock('03 / MECHANISM','どういう仕組み？',p.mechanism,'#f7f7f5')}
    </div>
    <dl class="detail-grid">
      <div><dt>種別</dt><dd>${esc(typeLabel(p.type))}</dd></div><div><dt>ステージ</dt><dd>${esc(p.stage)}</dd></div>
      <div><dt>科学的判定</dt><dd>${esc(p.verdict)}</dd></div><div><dt>次のゲート</dt><dd>${esc(p.next_gate)}</dd></div>
      <div><dt>研究分野</dt><dd>${esc(p.field||'—')}</dd></div><div><dt>更新</dt><dd>${esc(relativeLabel(p.activity))}</dd></div>
      <div><dt>要確認</dt><dd>${p.review_needed?'あり':'なし'}</dd></div><div><dt>注意シグナル</dt><dd>${esc(attentionReasonLabel(p.attention_reason)||'—')}</dd></div>
    </dl>
  </div>`;
}

function lockPageScroll() {
  modalScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${modalScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockPageScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, modalScrollY);
}

function closeDetail() {
  const overlay = $('#detail-overlay');
  if (overlay.hidden) return;
  overlay.hidden = true;
  unlockPageScroll();
}

function openDetail(title, rows, subtitle='研究名をクリックすると、一般向けの研究紹介と現在の公開ステータスを確認できます。') {
  $('#detail-title').textContent = title;
  $('#detail-subtitle').textContent = `${rows.length}件 · ${subtitle}`;
  $('#detail-content').innerHTML = rows.length === 1 ? projectDetail(rows[0]) : detailTable(rows);
  const overlay = $('#detail-overlay');
  const panel = $('#detail-dialog');
  if (!overlay.hidden) return;
  lockPageScroll();
  overlay.hidden = false;
  panel.scrollTop = 0;
  $('#detail-content').scrollTop = 0;
  requestAnimationFrame(() => $('#detail-close').focus({preventScroll:true}));
}

function openProject(id) {
  const project = state.data.projects.find(p => p.id === id);
  if (project) openDetail(project.project, [project], '30秒程度で問題意識・面白さ・仕組みをつかめるようにまとめています。');
}

function bindDetails() {
  document.addEventListener('click', event => {
    if (event.target.closest('#detail-close')) { closeDetail(); return; }
    const project = event.target.closest('[data-project-id]');
    if (project) { openProject(project.dataset.projectId); return; }
    const kpiTrigger = event.target.closest('[data-detail-kind]');
    if (kpiTrigger) { const kind=kpiTrigger.dataset.detailKind; openDetail(titleForKind(kind), rowsForKind(kind)); return; }
    const stage = event.target.closest('[data-stage-lane]');
    if (stage) { const label=stage.dataset.stageLane; openDetail(`${pipelineLabel(label)}ステージ`, state.data.projects.filter(p=>p.pipeline_lane===label), 'この研究・投稿ステージに分類されている案件です。'); return; }
    const publication = event.target.closest('[data-publication-lane]');
    if (publication) { const label=publication.dataset.publicationLane; openDetail(`${publicationLabel(label)}の投稿案件`, state.data.projects.filter(p=>p.publication_lane===label), 'この投稿ステータスに分類されている案件です。'); }
  });
  $('#detail-overlay').addEventListener('click', event => {
    if (event.target === $('#detail-overlay')) closeDetail();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('#detail-overlay').hidden) closeDetail();
  });
}

function bindFilters() {
  const spec = [['#filter-priority','priority'],['#filter-type','type'],['#filter-stage','stage'],['#filter-health','health'],['#filter-field','field']];
  spec.forEach(([id,key]) => $(id).addEventListener('change', event => { state.filters[key]=event.target.value; renderTable(); }));
  $('#clear-filters').addEventListener('click', () => { spec.forEach(([id,key]) => { $(id).value=''; state.filters[key]=''; }); renderTable(); });
}

async function init() {
  try {
    const response = await fetch('data.json', {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    setSelect('#filter-priority', state.data.projects.map(p=>p.priority));
    setSelect('#filter-type', state.data.projects.map(p=>p.type), typeLabel);
    setSelect('#filter-stage', state.data.projects.map(p=>p.stage));
    setSelect('#filter-health', state.data.projects.map(p=>p.health), healthLabel);
    setSelect('#filter-field', state.data.projects.map(p=>p.field));
    bindFilters();
    bindDetails();
    renderSync();
    renderKpis();
    renderAttention();
    renderStagePipeline();
    renderTable();
    renderPublication();
    renderRecent();
  } catch (error) {
    document.body.innerHTML = `<main class="shell"><section class="panel"><div class="panel-title"><h2>ダッシュボードデータを読み込めませんでした</h2></div><div class="empty">${esc(error.message)}</div></section></main>`;
  }
}

init();