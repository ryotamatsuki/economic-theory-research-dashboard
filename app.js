const state = {data:null, filters:{priority:'',type:'',stage:'',health:'',journal:''}};
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const badgeClass = health => ({'Blocked':'blocked','Review':'review','On track':'track','Waiting':'waiting'}[health] || 'waiting');

const typeLabel = value => ({'Theory':'理論研究','Correction':'訂正論文','Candidate':'訂正候補','Audit':'監査'}[value] || value);
const healthLabel = value => ({'Blocked':'ブロック','Review':'要確認','On track':'順調','Waiting':'待機'}[value] || value);
const pipelineLabel = value => ({'Prior-Art':'先行研究','Research Gate':'研究ゲート','Theory Frozen':'理論凍結','Manuscript':'原稿','Submission Ready':'投稿準備完了','Submitted':'投稿済み'}[value] || value);
const publicationLabel = value => ({'Manuscript':'原稿','Submission Ready':'投稿準備完了','Submitted':'投稿済み','R&R':'R&R'}[value] || value);
const attentionReasonLabel = value => ({'Blocking gate':'ブロック中','Sync drift':'同期差分あり','Verification gate':'検証ゲート'}[value] || value);
const recentEventLabel = value => ({'Portfolio review signal detected':'ポートフォリオ差分を検出','Blocking gate active':'ブロック中','Repository observation refreshed':'リポジトリ観測を更新'}[value] || value);
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
  $('#portfolio-body').innerHTML = rows.map(p => `<tr><td class="priority">${esc(p.priority)}</td><td><button type="button" class="project-detail-link" data-project-id="${esc(p.id)}">${esc(p.project)}</button></td><td>${esc(typeLabel(p.type))}</td><td>${esc(p.stage)}</td><td class="verdict">${esc(p.verdict)}</td><td><span class="badge ${badgeClass(p.health)}">${esc(healthLabel(p.health))}</span></td><td>${esc(p.next_gate)}</td><td class="nowrap">${esc(p.journal||'—')}</td><td class="nowrap">${esc(relativeLabel(p.activity))}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">現在の絞り込み条件に一致する研究はありません。</td></tr>';
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
  const ageMinutes = (Date.now() - new Date(sync.generated_utc).getTime()) / 60000;
  let cls='healthy', label='自動同期: 正常';
  if (!Number.isFinite(ageMinutes) || ageMinutes > 360) { cls='failed'; label='ダッシュボード更新: 遅延'; }
  else if (ageMinutes > 150) { cls='stale'; label='自動同期: 更新待ち'; }
  const el = $('#sync-health');
  el.className = `sync-health ${cls}`;
  el.innerHTML = `<span class="dot"></span>${esc(label)}`;
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
  return `<div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>研究</th><th>優先度</th><th>種別</th><th>ステージ</th><th>科学的判定</th><th>状態</th><th>次のゲート</th><th>投稿先</th><th>更新</th></tr></thead><tbody>${rows.map(p => `<tr><td><button type="button" class="project-detail-link" data-project-id="${esc(p.id)}">${esc(p.project)}</button></td><td class="priority">${esc(p.priority)}</td><td>${esc(typeLabel(p.type))}</td><td>${esc(p.stage)}</td><td class="verdict">${esc(p.verdict)}</td><td><span class="badge ${badgeClass(p.health)}">${esc(healthLabel(p.health))}</span></td><td>${esc(p.next_gate)}</td><td>${esc(p.journal||'—')}</td><td>${esc(relativeLabel(p.activity))}</td></tr>`).join('')}</tbody></table></div>`;
}

function projectDetail(p) {
  return `<div class="project-detail-card">
    <div class="project-detail-head"><div><span class="priority">${esc(p.priority)}</span><h3>${esc(p.project)}</h3></div><span class="badge ${badgeClass(p.health)}">${esc(healthLabel(p.health))}</span></div>
    <section style="margin:0 0 16px;padding:16px;border:1px solid #eaeef2;border-radius:8px;background:#f6f8fa">
      <p class="eyebrow" style="margin-bottom:6px">研究概要</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.75">${esc(p.overview)}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
        <div><strong style="display:block;margin-bottom:4px">中心的な研究質問</strong><span style="line-height:1.7">${esc(p.research_question)}</span></div>
        <div><strong style="display:block;margin-bottom:4px">経済メカニズム</strong><span style="line-height:1.7">${esc(p.mechanism)}</span></div>
      </div>
    </section>
    <dl class="detail-grid">
      <div><dt>種別</dt><dd>${esc(typeLabel(p.type))}</dd></div><div><dt>ステージ</dt><dd>${esc(p.stage)}</dd></div>
      <div><dt>科学的判定</dt><dd>${esc(p.verdict)}</dd></div><div><dt>次のゲート</dt><dd>${esc(p.next_gate)}</dd></div>
      <div><dt>投稿先</dt><dd>${esc(p.journal||'—')}</dd></div><div><dt>更新</dt><dd>${esc(relativeLabel(p.activity))}</dd></div>
      <div><dt>要確認</dt><dd>${p.review_needed?'あり':'なし'}</dd></div><div><dt>注意シグナル</dt><dd>${esc(attentionReasonLabel(p.attention_reason)||'—')}</dd></div>
    </dl>
  </div>`;
}

function openDetail(title, rows, subtitle='研究名をクリックすると研究概要と公開用管理情報を確認できます。') {
  $('#detail-title').textContent = title;
  $('#detail-subtitle').textContent = `${rows.length}件 · ${subtitle}`;
  $('#detail-content').innerHTML = rows.length === 1 ? projectDetail(rows[0]) : detailTable(rows);
  const dialog = $('#detail-dialog');
  if (!dialog.open) dialog.showModal();
}

function openProject(id) {
  const project = state.data.projects.find(p => p.id === id);
  if (project) openDetail(project.project, [project], '研究概要とサニタイズ済みの進捗情報です。');
}

function bindDetails() {
  document.addEventListener('click', event => {
    if (event.target.closest('#detail-close')) { $('#detail-dialog').close(); return; }
    const project = event.target.closest('[data-project-id]');
    if (project) { openProject(project.dataset.projectId); return; }
    const kpiTrigger = event.target.closest('[data-detail-kind]');
    if (kpiTrigger) { const kind=kpiTrigger.dataset.detailKind; openDetail(titleForKind(kind), rowsForKind(kind)); return; }
    const stage = event.target.closest('[data-stage-lane]');
    if (stage) { const label=stage.dataset.stageLane; openDetail(`${pipelineLabel(label)}ステージ`, state.data.projects.filter(p=>p.pipeline_lane===label), 'この研究・投稿ステージに分類されている案件です。'); return; }
    const publication = event.target.closest('[data-publication-lane]');
    if (publication) { const label=publication.dataset.publicationLane; openDetail(`${publicationLabel(label)}の投稿案件`, state.data.projects.filter(p=>p.publication_lane===label), 'この投稿ステータスに分類されている案件です。'); }
  });
  $('#detail-dialog').addEventListener('click', event => { if (event.target === $('#detail-dialog')) $('#detail-dialog').close(); });
}

function bindFilters() {
  const spec = [['#filter-priority','priority'],['#filter-type','type'],['#filter-stage','stage'],['#filter-health','health'],['#filter-journal','journal']];
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
    setSelect('#filter-journal', state.data.projects.map(p=>p.journal));
    bindFilters(); bindDetails();
    renderSync(); renderKpis(); renderAttention(); renderStagePipeline(); renderTable(); renderPublication(); renderRecent();
  } catch (error) {
    document.body.innerHTML = `<main class="shell"><section class="panel"><div class="panel-title"><h2>ダッシュボードデータを読み込めませんでした</h2></div><div class="empty">${esc(error.message)}</div></section></main>`;
  }
}

init();
