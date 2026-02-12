// --- Stage -> Document-type auto link (for 일반인 UX) ---
const STAGE_TO_DOCTYPE = {
  "소송 시작 단계 (소장·신청서)":"complaint",
  "상대방 대응 단계 (답변서)":"answer",
  "주장·반박 정리 단계 (준비서면)":"brief",
  "절차 보완 단계 (보정서)":"correction",
  "증거·입증 단계 (증거·문서제출명령)":"evidence",
  "변론·기일 대응 단계 (기일 관련 서류)":"hearing",
  "판결 이후 대응 단계 (항소·집행)":"post"
};

const DOCTYPE_FOCUS = {
  complaint:"청구취지·청구원인(사실관계)·당사자/관할·금액/이자·증거 연결을 중점 점검합니다.",
  answer:"인정/부인/다툼(인부) 명확성·항변(시효/변제 등)·증거 계획을 중점 점검합니다.",
  brief:"쟁점 정리·주장 구조·법률근거(조문/판례)·반박 누락·증거 연결을 중점 점검합니다. (청구취지 점검은 최소화)",
  correction:"보정명령 사항 반영·기한·보정 범위 준수·정정표시(전/후)를 중점 점검합니다.",
  evidence:"증거목록/입증취지·문서 특정성·관련성·보유자 특정·제출기한을 중점 점검합니다.",
  hearing:"기일변경/연기 사유의 구체성·증빙·상대방 통지·불이익 예방을 중점 점검합니다.",
  post:"항소/집행의 기간·대상·집행문/송달·비용확정 등 후속 절차를 중점 점검합니다."
};

function syncDocTypeFromStage(){
  const stageSel = document.getElementById("caseStage");
  const docSel = document.getElementById("docType");
  const focus = document.getElementById("docFocus");
  if(!stageSel || !docSel) return;

  // if user hasn't manually chosen (value empty), auto set from stage
  if(docSel.value === ""){
    const mapped = STAGE_TO_DOCTYPE[stageSel.value] || "";
    if(mapped) docSel.dataset.auto = "1";
    docSel.value = mapped;
  }
  if(focus){
    const v = docSel.value || (STAGE_TO_DOCTYPE[stageSel.value]||"");
    focus.textContent = DOCTYPE_FOCUS[v] || "문서 종류를 선택하면 중점 점검 포인트가 표시됩니다.";
  }
}

function onDocTypeChange(){
  const docSel = document.getElementById("docType");
  const focus = document.getElementById("docFocus");
  if(!docSel) return;
  // If user explicitly selects, stop auto override
  docSel.dataset.auto = "0";
  if(focus){
    focus.textContent = DOCTYPE_FOCUS[docSel.value] || "문서 종류를 선택하면 중점 점검 포인트가 표시됩니다.";
  }
}

// --- Stage-aware extra checks (keeps existing AI report, adds a focused addendum) ---
const DOC_CHECKS = {
  complaint: [
    {name:"청구취지", need:["청구취지"]},
    {name:"청구원인", need:["청구원인"]},
    {name:"당사자 표시", need:["원고","피고"]},
    {name:"금액/이자 특정", hints:["원","이자","연","%","기산일"]},
    {name:"증거 연결", hints:["증거","갑","을","첨부","계약서","입금","카톡"]}
  ],
  brief: [
    {name:"쟁점/요지", hints:["쟁점","요지","주장","핵심"]},
    {name:"법률근거", hints:["민법","민사소송법","판례","대법원","제","조"]},
    {name:"반박 구조", hints:["반박","부인","다툰다","재반박"]},
    {name:"증거 연결", hints:["증거","갑","을","첨부","계약서","입금","카톡"]},
    {name:"일관성(날짜/금액)", hints:["20","원","만원","일","월","년"]}
  ],
  answer: [
    {name:"인부(인정/부인)", hints:["인정","부인","다툰다","모른다"]},
    {name:"항변", hints:["소멸시효","상계","변제","채무부존재","하자","동시이행"]},
    {name:"증거 계획", hints:["증거","갑","을","신청","증인","감정"]},
    {name:"주장 구조", hints:["1.","2.","가.","나.","첫째","둘째"]}
  ],
  correction: [
    {name:"보정명령 반영", hints:["보정","명령","보완","정정"]},
    {name:"기한", hints:["기한","까지","제출","송달"]},
    {name:"수정 전/후 표시", hints:["수정","정정","전","후","변경"]},
  ],
  evidence: [
    {name:"증거목록/입증취지", hints:["증거목록","입증취지","갑","을"]},
    {name:"문서 특정성", hints:["문서","특정","기간","작성자","파일","원본"]},
    {name:"관련성/필요성", hints:["관련","입증","필요","상당"]},
    {name:"보유자 특정", hints:["보유","관리","소지","회사","기관"]},
  ],
  hearing: [
    {name:"신청 취지", hints:["신청","기일","연기","변경","지정"]},
    {name:"사유 구체성", hints:["사유","불가피","일정","질병","출장","증빙"]},
    {name:"증빙", hints:["진단서","확인서","증빙","첨부"]},
  ],
  post: [
    {name:"기간", hints:["14일","2주","항소기간","상고기간","기간"]},
    {name:"대상/범위", hints:["원심","판결","주문","범위","일부"]},
    {name:"집행 관련", hints:["집행","집행문","송달","강제집행","재산조회"]},
  ]
};

function stageAwareAddendum(){
  const reportEl = document.getElementById("report");
  const finalDoc = document.getElementById("finalDoc");
  const stageSel = document.getElementById("caseStage");
  const docSel = document.getElementById("docType");
  if(!reportEl || !finalDoc) return;

  const text = (finalDoc.value||"").trim();
  const stageLabel = stageSel ? stageSel.value : "";
  const docType = (docSel && docSel.value) ? docSel.value : (STAGE_TO_DOCTYPE[stageLabel] || "");
  if(!docType) return;

  const checks = DOC_CHECKS[docType] || [];
  if(checks.length===0) return;

  let add = "\n\n=== 단계/문서 연동 점검(추가) ===\n";
  add += `현재 단계: ${stageLabel || "-"}\n`;
  add += `문서 종류: ${docSel ? (docSel.selectedOptions[0]?.text || docType) : docType}\n\n`;

  const missing = [];
  checks.forEach(c=>{
    let ok = false;
    if(c.need){
      ok = c.need.every(k=>text.includes(k));
    } else if(c.hints){
      const hit = c.hints.filter(k=>text.includes(k)).length;
      ok = hit >= 2;
    }
    const icon = ok ? "✅" : "❌";
    add += `- ${icon} ${c.name}\n`;
    if(!ok) missing.push(c.name);
  });

  // Special rule: if 준비서면, explicitly say we are not judging 청구취지 as a core item
  if(docType==="brief"){
    add += "\n※ 준비서면 단계에서는 ‘청구취지’ 자체보다 ‘쟁점/주장/근거/증거 연결’을 핵심으로 봅니다.\n";
  }

  if(missing.length){
    add += "\n보완 우선순위: " + missing.slice(0,5).join(", ") + "\n";
  } else {
    add += "\n보완 우선순위: 큰 누락은 보이지 않습니다.\n";
  }

  // Append to existing report text (don't overwrite)
  reportEl.textContent = (reportEl.textContent || "") + add;
}

window.addEventListener("DOMContentLoaded", ()=>{
  const stageSel = document.getElementById("caseStage");
  const docSel = document.getElementById("docType");
  if(stageSel){
    stageSel.addEventListener("change", ()=>{
      // only auto-select docType if user hasn't explicitly chosen
      const ds = document.getElementById("docType");
      if(ds && ds.dataset.auto !== "0") ds.value = "";
      syncDocTypeFromStage();
    });
  }
  if(docSel){
    docSel.addEventListener("change", onDocTypeChange);
  }
  syncDocTypeFromStage();

  // Hook into existing AI review button (keeps existing logic)
  const btn = document.getElementById("btnReview");
  if(btn){
    btn.addEventListener("click", ()=>{
      setTimeout(()=>{ syncDocTypeFromStage(); stageAwareAddendum(); }, 80);
    }, true);
  }
});

// ---------- Utils ----------
const $ = (id) => document.getElementById(id);
function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> t.style.display="none", 1700);
}
function setProg(p){ $("progBar").style.width = Math.max(0,Math.min(100,p)) + "%"; }
function escapeHtml(s){
  return (s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

// ---------- Page switch ----------
const home = $("home");
const review = $("review");
function showHome(){ home.classList.remove("hidden"); review.classList.add("hidden"); window.scrollTo({top:0, behavior:"smooth"}); }
function showReview(){ review.classList.remove("hidden"); home.classList.add("hidden"); window.scrollTo({top:0, behavior:"smooth"}); }
$("goHome").onclick = showHome;
$("backToHome").onclick = showHome;
$("goReview").onclick = showReview;
$("startBtn").onclick = showReview;
$("scrollFAQ").onclick = () => $("faq").scrollIntoView({behavior:"smooth"});

// ---------- Tabs: Write/Upload ----------
const tabWrite = $("tabWrite"), tabUpload = $("tabUpload");
const panelWrite = $("panelWrite"), panelUpload = $("panelUpload");
tabWrite.onclick = () => {
  tabWrite.classList.add("active"); tabUpload.classList.remove("active");
  panelWrite.classList.remove("hidden"); panelUpload.classList.add("hidden");
};
tabUpload.onclick = () => {
  tabUpload.classList.add("active"); tabWrite.classList.remove("active");
  panelUpload.classList.remove("hidden"); panelWrite.classList.add("hidden");
};

// ---------- Segmented: Structured/Freeform ----------
const segStructured = $("segStructured"), segFreeform = $("segFreeform");
const structuredWrap = $("structuredWrap"), freeformWrap = $("freeformWrap");
segStructured.onclick = () => {
  segStructured.classList.add("active"); segFreeform.classList.remove("active");
  structuredWrap.classList.remove("hidden"); freeformWrap.classList.add("hidden");
};
segFreeform.onclick = () => {
  segFreeform.classList.add("active"); segStructured.classList.remove("active");
  freeformWrap.classList.remove("hidden"); structuredWrap.classList.add("hidden");
};

// ---------- Parties dynamic list ----------
let partySeq = 0;
function newParty(defaultRole){
  partySeq += 1;
  return { id: "p" + partySeq, role: defaultRole || "원고", name:"", addr:"" };
}
const parties = [ newParty("원고"), newParty("피고") ];

function partyCard(p, idx){
  const div = document.createElement("div");
  div.className = "partyCard";
  div.dataset.pid = p.id;

  div.innerHTML = `
      <div class="partyHdr">
        <div class="partyIdx">당사자 #${idx+1}</div>
        <button class="smBtn danger" data-remove="${p.id}" title="삭제">-</button>
      </div>

      <div class="three" style="margin-top:10px">
        <div>
          <div class="label">구분</div>
          <select data-role="${p.id}">
            <option ${p.role==="원고"?"selected":""}>원고</option>
            <option ${p.role==="피고"?"selected":""}>피고</option>
          </select>
        </div>
        <div>
          <div class="label">성명/명칭</div>
          <input data-name="${p.id}" placeholder="예: 홍길동 / 주식회사 ○○" value="${escapeHtml(p.name)}">
        </div>
        <div>
          <div class="label">주소</div>
          <input data-addr="${p.id}" placeholder="예: 서울시 ○○구 ○○로 …" value="${escapeHtml(p.addr)}">
        </div>
      </div>
      <div class="note">※ 주민번호/상세주소가 민감하면 일부 마스킹 권장</div>
    `;
  return div;
}

function renderParties(){
  const wrap = $("partyList");
  wrap.innerHTML = "";
  parties.forEach((p, i) => wrap.appendChild(partyCard(p, i)));

  wrap.querySelectorAll("select[data-role]").forEach(sel=>{
    sel.addEventListener("change", ()=>{
      const id = sel.getAttribute("data-role");
      const p = parties.find(x=>x.id===id);
      if(p) p.role = sel.value;
    });
  });
  wrap.querySelectorAll("input[data-name]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const id = inp.getAttribute("data-name");
      const p = parties.find(x=>x.id===id);
      if(p) p.name = inp.value;
    });
  });
  wrap.querySelectorAll("input[data-addr]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const id = inp.getAttribute("data-addr");
      const p = parties.find(x=>x.id===id);
      if(p) p.addr = inp.value;
    });
  });

  wrap.querySelectorAll("button[data-remove]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-remove");
      const idx = parties.findIndex(x=>x.id===id);
      if(idx >= 0){
        parties.splice(idx,1);
        renderParties();
        toast("당사자 삭제");
      }
    });
  });
}

$("btnAddParty").addEventListener("click", ()=>{
  const last = parties[parties.length-1];
  const nextRole = last && last.role === "원고" ? "피고" : "원고";
  parties.push(newParty(nextRole));
  renderParties();
  toast("당사자 추가");
});

function validateStructured(){
  const hasW = parties.some(p=>p.role==="원고");
  const hasP = parties.some(p=>p.role==="피고");
  if(!hasW || !hasP) return "원고/피고가 최소 1명씩 필요합니다.";
  for(const p of parties){
    if(!p.name.trim()) return "당사자 성명/명칭을 입력해 주세요.";
    if(!p.addr.trim()) return "당사자 주소를 입력해 주세요.";
  }
  if(!$("claimPurpose").value.trim()) return "청구취지를 입력해 주세요.";
  if(!$("claimReason").value.trim()) return "청구원인을 입력해 주세요.";
  return "";
}

function buildDocText(){
  const err = validateStructured();
  if(err){
    alert(err);
    return null;
  }

  const plaintiffs = parties.filter(p=>p.role==="원고");
  const defendants = parties.filter(p=>p.role==="피고");

  const lines = [];
  lines.push("【당사자】");
  lines.push("원고");
  plaintiffs.forEach((p,i)=> lines.push(`  ${i+1}. ${p.name} / 주소: ${p.addr}`));
  lines.push("");
  lines.push("피고");
  defendants.forEach((p,i)=> lines.push(`  ${i+1}. ${p.name} / 주소: ${p.addr}`));
  lines.push("");
  lines.push("【청구취지】");
  lines.push($("claimPurpose").value.trim());
  lines.push("");
  lines.push("【청구원인】");
  lines.push($("claimReason").value.trim());
  const ev = $("evidenceList").value.trim();
  if(ev){
    lines.push("");
    lines.push("【증거】");
    lines.push(ev);
  }
  return lines.join("\n");
}

$("btnBuildDoc").addEventListener("click", ()=>{
  const doc = buildDocText();
  if(!doc) return;
  $("finalDoc").value = doc;
  toast("문서 생성 완료");
});

$("btnUseFreeform").addEventListener("click", ()=>{
  const t = $("docText").value.trim();
  if(!t){ toast("자유 입력 내용이 없습니다"); return; }
  $("finalDoc").value = t;
  toast("최종 문서에 적용 완료");
});

renderParties();

// ---------- PDF.js setup ----------
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js";
}

async function extractTextFromPdf(arrayBuffer){
  if(!window.pdfjsLib) throw new Error("PDF.js 로드 실패");
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;

  let out = [];
  for(let i=1;i<=total;i++){
    $("status").textContent = `PDF 텍스트 추출 중… (${i}/${total})`;
    setProg(Math.round((i/total)*100));
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(it => it.str).filter(Boolean);
    out.push(strings.join(" "));
  }
  return out.join("\n\n");
}

// ---------- OCR API call ----------
async function callOcrApi(file){
  const endpoint = "/api/ocr";
  const fd = new FormData();
  fd.append("file", file);

  $("status").textContent = "OCR 요청 중… (서버 처리)";
  setProg(15);

  const res = await fetch(endpoint, { method:"POST", body: fd });
  if(!res.ok){
    const msg = await res.text().catch(()=> "");
    throw new Error("OCR API 오류: " + res.status + " " + msg);
  }
  const data = await res.json();
  if(!data || typeof data.text !== "string") throw new Error("OCR API 응답 형식 오류");
  return data.text;
}

// ---------- File handling ----------
let currentFile = null;
let extractedText = "";

function setUploadUI(on){
  $("prog").classList.toggle("hidden", !on);
  $("status").classList.toggle("hidden", !on);
  if(!on){ setProg(0); $("status").textContent=""; }
}

function enableOcrButtons(){
  $("btnTryOcr").disabled = !currentFile;
  $("btnFillText").disabled = !extractedText;
}

$("fileInput").addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  currentFile = file;
  extractedText = "";
  enableOcrButtons();
  setUploadUI(true);
  setProg(0);

  const name = (file.name || "").toLowerCase();

  try{
    if(name.endsWith(".txt")){
      $("status").textContent = "TXT 읽는 중…";
      setProg(20);
      extractedText = await file.text();
      $("status").textContent = "✅ TXT 로드 완료";
      setProg(100);
      enableOcrButtons();
      toast("TXT 준비 완료");
      return;
    }

    if(name.endsWith(".pdf")){
      $("status").textContent = "PDF 로드 중…";
      setProg(10);
      const buf = await file.arrayBuffer();
      const text = await extractTextFromPdf(buf);

      const compact = (text || "").replace(/\s+/g,"");
      if(compact.length < 200){
        $("status").textContent = "⚠️ 텍스트가 거의 없습니다. 스캔 PDF일 가능성이 높아요. → OCR 버튼을 눌러주세요.";
        setProg(30);
        extractedText = "";
        enableOcrButtons();
        toast("OCR 필요");
      } else {
        $("status").textContent = "✅ PDF 텍스트 추출 완료(텍스트형)";
        setProg(100);
        extractedText = text;
        enableOcrButtons();
        toast("PDF 텍스트 준비 완료");
      }
      return;
    }

    if(file.type && file.type.startsWith("image/")){
      $("status").textContent = "이미지 업로드 완료 → OCR 버튼을 눌러주세요.";
      setProg(25);
      enableOcrButtons();
      toast("이미지 OCR 준비");
      return;
    }

    alert("지원 파일: TXT / PDF / 이미지");
    setUploadUI(false);
  }catch(err){
    console.error(err);
    $("status").textContent = "❌ 파일 처리 실패: " + err.message;
    setProg(0);
    toast("처리 실패");
  }
});

$("btnTryOcr").addEventListener("click", async ()=>{
  if(!currentFile) return;
  try{
    $("btnTryOcr").disabled = true;
    $("status").textContent = "OCR 시작…";
    setProg(5);

    const text = await callOcrApi(currentFile);
    extractedText = text || "";

    const compact = extractedText.replace(/\s+/g,"");
    $("status").textContent = (compact.length < 50)
      ? "⚠️ OCR 결과 텍스트가 너무 짧습니다. 해상도/기울기/언어 설정을 확인하세요."
      : "✅ OCR 완료. ‘추출 텍스트를 최종 문서에 넣기’를 눌러 반영하세요.";
    setProg(100);

    enableOcrButtons();
    toast("OCR 완료");
  }catch(err){
    console.error(err);
    $("status").textContent = "❌ OCR 실패: " + err.message + " (서버 /api/ocr 구현 필요)";
    $("btnTryOcr").disabled = false;
    setProg(0);
    toast("OCR 실패");
    enableOcrButtons();
  }
});

$("btnFillText").addEventListener("click", ()=>{
  if(!extractedText){ toast("적용할 텍스트가 없습니다"); return; }
  $("finalDoc").value = extractedText;
  toast("최종 문서에 적용 완료");
});

// ---------- AI demo review ----------
let lastAIReportText = "";
function runDemoReview(){
  const text = $("finalDoc").value.trim();
  const goal = $("goal").value;

  let result = "=== AI 1차 검토 결과(데모) ===\n";
  result += `사건유형: ${$("caseType").value} / 목표: ${$("goal").selectedOptions[0].text}\n\n`;

  result += "✔ 기본 형식 점검\n";
  if(!text.includes("원고") || !text.includes("피고")) result += "- ⚠ 당사자 표시(원고/피고)가 명확하지 않습니다\n";
  if(!text.includes("청구취지")) result += "- ⚠ 청구취지 항목이 보이지 않습니다\n";
  if(!text.includes("청구원인")) result += "- ⚠ 청구원인 항목이 보이지 않습니다\n";
  if(!text.includes("증거")) result += "- ⚠ 증거/첨부 관련 기재가 부족할 수 있습니다\n";

  result += "\n📌 개선 제안\n";
  result += "- 주장 → 사실 → 증거(증거번호) 구조로 소제목을 나누어 정리\n";
  if(goal === "evidence") result += "- 핵심 주장 5개를 뽑아 ‘주장/사실/증거/설명’ 표로 매핑\n";
  if(goal === "format") result += "- 문서 상단에 목차(당사자/청구취지/청구원인/증거목록)를 넣어 누락 방지\n";
  if(goal === "logic") result += "- 요건(A/B/C)별로 사실을 배치하고, 각 사실에 증거를 붙여 논리 강화\n";

  result += "\n면책: 본 결과는 법률자문이 아닌 참고용 점검 자료입니다.";
  return result;
}

$("btnReview").onclick = () => {
  const text = $("finalDoc").value.trim();
  if(text.length < 200){
    alert("최종 문서 내용이 너무 짧습니다. (최소 200자 이상 권장)\n구조화 입력이라면 ‘문서 생성(합치기)’ 버튼을 먼저 눌러주세요.");
    return;
  }
  lastAIReportText = runDemoReview();
  $("report").textContent = lastAIReportText;
  toast("AI 검토 완료");
};

$("btnCopyAI").onclick = async () => {
  if(!lastAIReportText){ toast("복사할 리포트가 없습니다"); return; }
  try{ await navigator.clipboard.writeText(lastAIReportText); toast("AI 리포트 복사 완료"); }
  catch{ toast("복사 권한이 필요합니다"); }
};

$("btnDownloadAI").onclick = () => {
  if(!lastAIReportText){ toast("저장할 리포트가 없습니다"); return; }
  const blob = new Blob([lastAIReportText], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ai_review_report.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("TXT 저장 완료");
};

function startApp(){
  document.getElementById("splash").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  showReview();
  window.scrollTo(0,0);
}

const stageTips = {
  "소송 시작 단계 (소장·신청서)":"관할·청구취지 오류는 전체 소송에 영향을 줄 수 있습니다.",
  "상대방 대응 단계 (답변서)":"인정/부인 판단 실수가 가장 많이 발생합니다.",
  "주장·반박 정리 단계 (준비서면)":"요건별 사실 정리와 증거 연결이 핵심입니다.",
  "절차 보완 단계 (보정서)":"보정 기한을 놓치면 각하 위험이 있습니다.",
  "증거·입증 단계 (증거·문서제출명령)":"증거 제출 시기와 입증취지 기재가 중요합니다.",
  "변론·기일 대응 단계 (기일 관련 서류)":"재판부의 질문(석명)에 대비한 정리가 필요합니다.",
  "판결 이후 대응 단계 (항소·집행)":"항소·집행 등 다음 선택을 검토해야 합니다."
};
const stageSel = document.getElementById("caseStage");
const guide = document.getElementById("stageGuide");
if(stageSel){
  stageSel.addEventListener("change", ()=>{
    guide.textContent = stageTips[stageSel.value] || 
      "소송의 현재 위치를 선택하면, 이 단계에서 주의할 점을 안내합니다.";
  });
}

// ===== Stage/DocType-aware AI review (rule-based, no external call) =====
function _hasAny(t, arr){ return arr.some(k => t.includes(k)); }
function _countAny(t, arr){ return arr.reduce((n,k)=> n + (t.includes(k)?1:0), 0); }

function generateAiReview(text, docType){
  const t = (text||"").trim();
  const lines = [];
  const risks = [];
  const addRisk = (lvl,msg)=>{ risks.push({lvl,msg}); };

  // Common checks
  const hasParty = _hasAny(t, ["원고","피고","신청인","상대방"]);
  const hasDates = /20\d{2}\.\s*\d{1,2}\.\s*\d{1,2}/.test(t) || /20\d{2}[-/]\d{1,2}[-/]\d{1,2}/.test(t);
  const hasMoney = /(\d[\d,]*\s*원)/.test(t);
  const hasEvidence = _hasAny(t, ["증거","갑","을","첨부","계약서","입금","계좌이체","카톡","메시지"]);

  lines.push("=== AI 검토 요약(문서 종류 반영) ===");
  lines.push("");

  function section(title){ lines.push("■ " + title); }
  function item(ok, label, detail){
    lines.push(`- ${ok ? "✅" : "❌"} ${label}${detail? " : "+detail:""}`);
    if(!ok) addRisk("warn", label + (detail? " ("+detail+")":""));
  }

  // Doc-type specific logic
  if(docType === "complaint"){ // 소장
    section("소장 핵심 구성");
    item(t.includes("청구취지"), "청구취지 기재", "청구취지가 명시돼야 합니다.");
    item(t.includes("청구원인"), "청구원인 기재", "사실관계를 시간순으로 정리하세요.");
    item(hasParty, "당사자 표시", "원고/피고 표시 및 주소·명칭 확인");
    item(hasDates, "주요 일자 특정", "대여/계약/발생/최종 통지 등 날짜");
    item(hasMoney, "금액 특정", "원금/손해액/이자 등 금액 명시");
    item(hasEvidence, "증거 연결", "증거(갑/을)와 주장 연결");

    section("표현·형식");
    item(_countAny(t, ["따라서","그러므로","이에","이유로"])>=1, "논리 연결어", "원인→결론 흐름이 보이는지");
    item(_countAny(t, ["별지","첨부","증거목록"])>=1, "부속서류 안내", "증거목록/별지 존재 여부");

  } else if(docType === "answer"){ // 답변서
    section("답변서 핵심(인부·항변)");
    item(_hasAny(t, ["인정","부인","다툰다","모른다"]), "인부(인정/부인) 구조", "각 주장별로 인정/부인/다툼을 구분");
    item(_hasAny(t, ["항변","소멸시효","상계","변제","채무부존재","동시이행","하자"]), "항변 제시", "핵심 항변 1~3개를 명확히");
    item(hasEvidence, "증거 계획", "증거(을)와 항변 연결");

    section("법리/근거");
    const lawHit = _countAny(t, ["민법","민사소송법","판례","대법원","제","조"]);
    item(lawHit>=2, "법률근거 제시", "조문/판례/법리를 최소 1~2개 이상 연결");
    item(_countAny(t, ["첫째","둘째","가.","나.","1.","2."])>=2, "구조화된 주장", "번호/소제목으로 정리");

  } else if(docType === "brief"){ // 준비서면
    section("준비서면 핵심(쟁점·법리·반박)");
    item(_hasAny(t, ["쟁점","요지","핵심","정리"]), "쟁점 제시", "쟁점을 2~4개로 요약");
    item(_hasAny(t, ["주장","반박","부인","다툰다","재반박"]), "공방 구조", "상대방 주장→반박 순서");
    const lawHit = _countAny(t, ["민법","민사소송법","판례","대법원","제","조","법리"]);
    item(lawHit>=2, "법리·근거", "조문/판례/법리를 주장과 연결");
    item(hasEvidence, "증거 연결", "갑/을 증거와 각 주장 매칭");
    item(true, "일관성 점검(권장)", "날짜/금액/사실관계 충돌 여부");

    section("유의사항");
    lines.push("- ℹ️ 준비서면은 ‘청구취지’ 자체보다 ‘쟁점/주장/근거/증거’를 중점으로 봅니다.");

  } else if(docType === "correction"){ // 보정서
    section("보정서 핵심(명령 반영·기한)");
    item(_hasAny(t, ["보정","보완","정정","명령"]), "보정명령 반영", "명령 항목을 그대로 따라 수정");
    item(_hasAny(t, ["기한","까지","제출","송달"]), "기한 언급", "제출기한 준수");
    item(_countAny(t, ["전","후","변경","수정"])>=1, "수정 전/후 표시", "무엇을 어떻게 고쳤는지");

  } else if(docType === "evidence"){ // 증거·입증
    section("증거·입증 핵심");
    item(_hasAny(t, ["증거목록","입증취지","갑","을"]), "증거목록/입증취지", "증거와 입증취지 연결");
    item(_hasAny(t, ["문서제출명령","사실조회","감정","증인"]), "신청 유형 명시", "필요한 신청을 구체화");
    item(_hasAny(t, ["특정","기간","작성자","보유","관리"]), "대상 특정성", "문서/사실을 특정");

  } else if(docType === "hearing"){ // 기일
    section("기일 관련 핵심");
    item(_hasAny(t, ["기일","변론","연기","변경","지정"]), "신청 취지", "무엇을 요청하는지");
    item(_hasAny(t, ["사유","불가피","질병","출장","일정","충돌"]), "사유 구체성", "객관적 사유 기재");
    item(_hasAny(t, ["진단서","확인서","증빙","첨부"]), "증빙 첨부", "가능하면 첨부");

  } else if(docType === "post"){ // 항소·집행
    section("판결 이후 핵심");
    item(_hasAny(t, ["항소","상고","불복"]), "불복 의사/종류", "항소/상고 구분");
    item(_hasAny(t, ["기간","14일","2주","항소기간","상고기간"]), "기간 인식", "제소기간/불복기간");
    item(_hasAny(t, ["집행","강제집행","집행문","송달","재산조회"]), "집행 관련", "집행 준비 요소");

  } else {
    section("기본 점검");
    item(hasParty, "당사자 표시", "");
    item(hasDates, "주요 일자", "");
    item(hasEvidence, "증거 연결", "");
  }

  // Overall risk
  const warnCount = risks.length;
  lines.push("");
  lines.push("=== 위험 신호(누락 의심) ===");
  if(warnCount === 0){
    lines.push("- ✅ 큰 누락은 보이지 않습니다. (상세는 추가 검토 권장)");
  }else{
    risks.slice(0,8).forEach(r=> lines.push("- ⚠️ " + r.msg));
    if(warnCount>8) lines.push(`- … 외 ${warnCount-8}건`);
  }

  lines.push("");
  lines.push("=== 다음 단계 추천 ===");
  // Use stage selection if available
  const stageSel = document.getElementById("caseStage");
  const stageLabel = stageSel ? stageSel.value : "";
  if(docType==="complaint"){
    lines.push("- 전문가 첨삭(소장) 추천: 청구취지/청구원인/증거 매칭을 정밀 점검");
  } else if(docType==="brief"){
    lines.push("- 전문가 첨삭(준비서면) 추천: 쟁점별 법리·판례 연결 및 반박 누락 점검");
  } else if(docType==="answer"){
    lines.push("- 전문가 검토 추천: 인부 구조 및 핵심 항변(시효/변제 등) 정리");
  } else {
    lines.push("- 제출기한/형식 요건을 우선 확인하세요.");
  }
  if(stageLabel) lines.push("- 선택한 단계 기준 유의사항도 함께 확인하세요.");

  return lines.join("\n");
}

function _getEffectiveDocType(){
  const stageSel = document.getElementById("caseStage");
  const docSel = document.getElementById("docType");
  const stageLabel = stageSel ? stageSel.value : "";
  const mapped = (typeof STAGE_TO_DOCTYPE !== "undefined") ? (STAGE_TO_DOCTYPE[stageLabel]||"") : "";
  return (docSel && docSel.value) ? docSel.value : mapped;
}

// Hook: override report content on review click
window.addEventListener("DOMContentLoaded", ()=>{
  const btn = document.getElementById("btnReview");
  const reportEl = document.getElementById("report");
  const finalDoc = document.getElementById("finalDoc");
  if(btn && reportEl && finalDoc){
    btn.addEventListener("click", ()=>{
      setTimeout(()=>{
        const dt = _getEffectiveDocType();
        const txt = (finalDoc.value||"");
        if(dt){
          reportEl.textContent = generateAiReview(txt, dt);
        }
        // keep addendum if exists
        if(typeof stageAwareAddendum === "function"){
          stageAwareAddendum();
        }
      }, 120);
    }, true);
  }
});

// ===== Expert recommendation & connect =====
let _selectedExpert = null;
let _selectedService = null;
let _lastReviewMeta = { docType:"", stage:"", riskCount:0, summary:"" };

function _docTypeLabel(dt){
  return ({
    complaint:"소장",
    answer:"답변서",
    brief:"준비서면",
    correction:"보정서",
    evidence:"증거·입증 서류",
    hearing:"기일 관련 서류",
    post:"항소·집행 서류"
  })[dt] || dt || "-";
}

function _stageLabel(){
  const s = document.getElementById("caseStage");
  return s ? (s.value || "-") : "-";
}

function _computeRiskCount(reportText){
  const t = reportText || "";
  const misses = (t.match(/^- ❌/gm) || []).length;
  const warns = (t.match(/^- ⚠️/gm) || []).length;
  return Math.max(misses, warns);
}

function recommendExpert(){
  const reportEl = document.getElementById("report");
  const recEl = document.getElementById("expertRecommend");
  const svcEl = document.getElementById("serviceRecommend");
  const sumEl = document.getElementById("expertSummary");
  const dt = (typeof _getEffectiveDocType === "function") ? _getEffectiveDocType() : "";
  const stage = _stageLabel();
  const text = reportEl ? (reportEl.textContent || "") : "";
  const riskCount = _computeRiskCount(text);

  let expert = "lawyer";
  let service = "review";

  // 문서 종류 기반 추천
  if(dt === "complaint"){
    expert = "lawyer";
    service = riskCount >= 3 ? "draft" : "review";
  } else if(dt === "brief"){
    expert = "lawyer";
    service = riskCount >= 3 ? "draft" : "review";
  } else if(dt === "answer"){
    expert = "lawyer";
    service = "review";
  } else if(dt === "correction"){
    expert = "judicial"; // 서식·절차 보완은 법무사 적합(다만 난이도 높으면 변호사)
    service = riskCount >= 2 ? "review" : "review";
    if(riskCount >= 3) expert = "lawyer";
  } else if(dt === "evidence" || dt === "hearing" || dt === "post"){
    expert = "lawyer";
    service = "review";
  }

  // 노동/노무 키워드가 있으면 노무사 우선
  const finalDoc = document.getElementById("finalDoc");
  const docText = (finalDoc ? finalDoc.value : "") || "";
  if(/근로|임금|해고|산재|휴업|퇴직금|노동|부당/.test(docText)){
    expert = "labor";
    service = "review";
  }

  const expertName = expert==="lawyer" ? "변호사" : (expert==="judicial" ? "법무사" : "노무사");
  const serviceName = service==="draft" ? "전문가 서면 작성" : "기존 서면 첨삭·검토";

  if(recEl) recEl.innerHTML = `<b>${expertName}</b> 추천 (문서: ${_docTypeLabel(dt)})` + (riskCount? `<br><span class="note">누락/위험 신호: ${riskCount}건</span>`:"");
  if(svcEl) svcEl.innerHTML = `<b>${serviceName}</b> 추천` + (stage? `<br><span class="note">단계: ${stage}</span>`:"");

  _selectedExpert = expert;
  _selectedService = service;

  const caseNo = document.getElementById("caseNo");
  const contact = document.getElementById("userContact");
  const note = document.getElementById("userNote");
  const summary = [
    "=== 전문가 연결 요청 요약 ===",
    `사건번호: ${(caseNo && caseNo.value.trim()) || "-"}`, 
    `현재 단계: ${stage}`,
    `문서 종류: ${_docTypeLabel(dt)}`,
    `추천 전문가: ${expertName}`,
    `추천 서비스: ${serviceName}`,
    "",
    "— AI 검토 요약 —",
    (text ? text.slice(0, 2000) : "AI 검토 결과 없음"),
    "",
    "— 사용자 메모 —",
    `연락처: ${(contact && contact.value.trim()) || "-"}`, 
    `추가요청: ${(note && note.value.trim()) || "-"}`, 
  ].join("\n");
  _lastReviewMeta = { docType:dt, stage, riskCount, summary };
  if(sumEl) sumEl.textContent = summary;
}

function selectExpert(type){
  _selectedExpert = type;
  const name = type==="lawyer" ? "변호사" : (type==="judicial" ? "법무사" : "노무사");
  const recEl = document.getElementById("expertRecommend");
  if(recEl) recEl.innerHTML = `<b>${name}</b> 선택됨 (추천은 참고용)`;
}

function selectService(type){
  _selectedService = type;
  const name = type==="draft" ? "전문가 서면 작성" : "기존 서면 첨삭·검토";
  const svcEl = document.getElementById("serviceRecommend");
  if(svcEl) svcEl.innerHTML = `<b>${name}</b> 선택됨 (추천은 참고용)`;
}

function requestExpert(){
  if(!_selectedExpert || !_selectedService){
    alert("전문가 유형과 서비스를 선택해주세요.");
    return;
  }
  const sum = _lastReviewMeta.summary || (document.getElementById("expertSummary")?.textContent || "");
  if(navigator.clipboard && sum){
    navigator.clipboard.writeText(sum).then(()=>{
      alert("요청 요약이 클립보드에 복사되었습니다.\n\n(현재는 MVP라서 제출 대신 복사로 제공됩니다)");
    }).catch(()=>{
      alert("요청 요약을 복사하지 못했습니다. 아래 요약을 직접 복사해 주세요.");
    });
  }else{
    alert("아래 요약을 복사해서 전달해 주세요.");
  }
}

window.addEventListener("DOMContentLoaded", ()=>{
  const btn = document.getElementById("btnReview");
  if(btn){
    btn.addEventListener("click", ()=>{ setTimeout(recommendExpert, 220); }, true);
  }
});