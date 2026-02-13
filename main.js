
document.addEventListener('DOMContentLoaded', function() {

    // --- 페이지 전환 ---
    function showHome() {
        document.getElementById('home').classList.remove('hidden');
        document.getElementById('review').classList.add('hidden');
        window.scrollTo(0,0);
    }

    function showReview() {
        document.getElementById('review').classList.remove('hidden');
        document.getElementById('home').classList.add('hidden');
        window.scrollTo(0,0);
    }
    
    // --- 공통 UI ---
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    function setupPageNavigation() {
        document.getElementById('startBtn').addEventListener('click', showReview);
        document.getElementById('backToHome').addEventListener('click', showHome);
        document.getElementById('goHome').addEventListener('click', showHome);
        document.getElementById('goReview').addEventListener('click', showReview);
        document.getElementById('scrollFAQ').addEventListener('click', () => {
            document.getElementById('faq').scrollIntoView({ behavior: 'smooth' });
        });
    }

    function setupTabs() {
        const tabWrite = document.getElementById('tabWrite');
        const tabUpload = document.getElementById('tabUpload');
        const panelWrite = document.getElementById('panelWrite');
        const panelUpload = document.getElementById('panelUpload');
        
        const segStructured = document.getElementById('segStructured');
        const segFreeform = document.getElementById('segFreeform');
        const structuredWrap = document.getElementById('structuredWrap');
        const freeformWrap = document.getElementById('freeformWrap');

        tabWrite.addEventListener('click', () => {
            tabWrite.classList.add('active');
            tabUpload.classList.remove('active');
            panelWrite.classList.remove('hidden');
            panelUpload.classList.add('hidden');
        });

        tabUpload.addEventListener('click', () => {
            tabUpload.classList.add('active');
            tabWrite.classList.remove('active');
            panelUpload.classList.remove('hidden');
            panelWrite.classList.add('hidden');
        });

        segStructured.addEventListener('click', () => {
            segStructured.classList.add('active');
            segFreeform.classList.remove('active');
            structuredWrap.classList.remove('hidden');
            freeformWrap.classList.add('hidden');
        });

        segFreeform.addEventListener('click', () => {
            segFreeform.classList.add('active');
            segStructured.classList.remove('active');
            freeformWrap.classList.remove('hidden');
            structuredWrap.classList.add('hidden');
        });
    }

    // --- 구조화 입력 ---
    let partyCount = 0;
    function setupStructuredEditor() {
        const partyList = document.getElementById('partyList');
        document.getElementById('btnAddParty').addEventListener('click', () => {
            partyCount++;
            const partyId = `party-${partyCount}`;
            const newParty = document.createElement('div');
            newParty.className = 'partyCard';
            newParty.id = partyId;
            newParty.innerHTML = `
                <div class="partyHdr">
                    <b class="partyIdx">당사자 ${partyCount}</b>
                    <button class="smBtn danger" onclick="removeParty('${partyId}')">삭제</button>
                </div>
                <div class="two" style="margin-top:8px">
                    <div>
                        <label class="label">구분</label>
                        <select class="partyType">
                            <option value="원고">원고</option>
                            <option value="피고">피고</option>
                        </select>
                    </div>
                    <div>
                        <label class="label">이름</label>
                        <input type="text" class="partyName" placeholder="홍길동">
                    </div>
                </div>
                <div style="margin-top:8px">
                    <label class="label">주소</label>
                    <input type="text" class="partyAddress" placeholder="서울중앙지방법원 관할">
                </div>
            `;
            partyList.appendChild(newParty);
        });

        document.getElementById('btnBuildDoc').addEventListener('click', () => {
            let finalText = "";
            let plaintiffs = [];
            let defendants = [];

            document.querySelectorAll('.partyCard').forEach(p => {
                const type = p.querySelector('.partyType').value;
                const name = p.querySelector('.partyName').value || '이름없음';
                const address = p.querySelector('.partyAddress').value || '주소없음';
                const partyInfo = `${name} (주소: ${address})`;
                if (type === '원고') {
                    plaintiffs.push(partyInfo);
                } else {
                    defendants.push(partyInfo);
                }
            });

            finalText += "원고:\n" + (plaintiffs.length ? plaintiffs.join('\n') : '입력필요') + "\n\n";
            finalText += "피고:\n" + (defendants.length ? defendants.join('\n') : '입력필요') + "\n\n";
            finalText += "--- 청구취지 ---\n" + document.getElementById('claimPurpose').value + "\n\n";
            finalText += "--- 청구원인 ---\n" + document.getElementById('claimReason').value + "\n\n";
            finalText += "--- 증거목록 ---\n" + document.getElementById('evidenceList').value;
            
            document.getElementById('finalDoc').value = finalText;
            showToast('구조화된 입력으로 문서가 생성되었습니다.');
        });
    }

    window.removeParty = (id) => {
        document.getElementById(id).remove();
        // re-index parties if needed, for now just remove
    };

    // --- 자유 입력 ---
    function setupFreeformEditor() {
        document.getElementById('btnUseFreeform').addEventListener('click', () => {
            document.getElementById('finalDoc').value = document.getElementById('docText').value;
            showToast('자유 입력 내용이 최종 문서에 적용되었습니다.');
        });
    }

    // --- 파일 업로드 / OCR ---
    let extractedText = '';
    function setupFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const btnTryOcr = document.getElementById('btnTryOcr');
        const btnFillText = document.getElementById('btnFillText');
        const statusDiv = document.getElementById('status');
        const progBar = document.getElementById('progBar');
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                btnTryOcr.disabled = false;
                statusDiv.textContent = `선택된 파일: ${file.name}`;
                statusDiv.classList.remove('hidden');
                btnFillText.disabled = true;
                extractedText = '';
            }
        });

        btnTryOcr.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) return;

            btnTryOcr.disabled = true;
            progBar.parentElement.classList.remove('hidden');
            progBar.style.width = '0%';
            
            try {
                if (file.type === 'text/plain') {
                    statusDiv.textContent = 'TXT 파일을 읽는 중...';
                    progBar.style.width = '50%';
                    extractedText = await file.text();
                    progBar.style.width = '100%';
                    statusDiv.textContent = 'TXT 파일 읽기 완료.';
                } else if (file.type === 'application/pdf') {
                    statusDiv.textContent = 'PDF 텍스트 추출 중...';
                    extractedText = await readPdfFile(file);
                    statusDiv.textContent = 'PDF 텍스트 추출 완료.';
                } else if (file.type.startsWith('image/')) {
                    statusDiv.textContent = '이미지 OCR 요청 중...';
                    extractedText = await ocrRequest(file);
                    statusDiv.textContent = 'OCR 완료.';
                } else {
                    throw new Error('지원하지 않는 파일 형식입니다.');
                }
                btnFillText.disabled = false;
                showToast('텍스트 추출 성공!');
            } catch (err) {
                statusDiv.textContent = `오류: ${err.message}`;
                showToast('텍스트 추출 실패.');
            } finally {
                btnTryOcr.disabled = false;
            }
        });

        btnFillText.addEventListener('click', () => {
            if (extractedText) {
                document.getElementById('finalDoc').value = extractedText;
                showToast('추출된 텍스트를 최종 문서에 적용했습니다.');
            }
        });
    }

    async function readPdfFile(file) {
        const progBar = document.getElementById('progBar');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let textContent = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(s => s.str).join(' ');
            progBar.style.width = `${(i / pdf.numPages) * 100}%`;
        }
        return textContent;
    }

    async function ocrRequest(file) {
        const progBar = document.getElementById('progBar');
        progBar.style.width = '30%';
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/ocr', {
            method: 'POST',
            body: formData,
        });
        
        progBar.style.width = '80%';
        if (!response.ok) {
            throw new Error(`OCR 서버 오류: ${response.statusText}`);
        }
        const result = await response.json();
        progBar.style.width = '100%';
        return result.text;
    }

    // --- AI 검토 ---
    function setupAiReview() {
        document.getElementById('btnReview').addEventListener('click', () => runAiReview('default'));
        document.getElementById('btnAiOcrReview').addEventListener('click', () => runAiReview('ocr'));
    }

    function runAiReview(type) {
        const docText = document.getElementById('finalDoc').value;
        const docType = document.getElementById('docType').value;
        const caseStage = document.getElementById('caseStage').value;

        if (docText.trim().length < 50) {
            showToast('검토할 문서 내용이 너무 짧습니다.');
            document.getElementById('report').textContent = '검토할 내용이 부족합니다. 문서를 50자 이상 작성해주세요.';
            return;
        }

        const reportDiv = document.getElementById('report');
        reportDiv.innerHTML = 'AI가 문서를 분석하고 있습니다...';

        // MVP: Rule-based analysis
        setTimeout(() => {
            let findings = [];
            if (!docText.includes('원고')) findings.push({level: 'error', text: '문서에 "원고"가 명시되지 않았습니다. 당사자 정보가 누락되었을 수 있습니다.'});
            if (!docText.includes('피고')) findings.push({level: 'error', text: '문서에 "피고"가 명시되지 않았습니다. 당사자 정보가 누락되었을 수 있습니다.'});
            if (!docText.includes('청구취지')) findings.push({level: 'error', text: '문서에 "청구취지"가 명시되지 않았습니다. 소송의 핵심 요구사항이 누락되었습니다.'});
            if (!docText.includes('청구원인')) findings.push({level: 'error', text: '문서에 "청구원인"가 명시되지 않았습니다. 주장의 근거가 되는 사실관계 설명이 필요합니다.'});
            if (docText.match(/금액|금 [0-9,]+원/g) == null) findings.push({level: 'warn', text: '금전 청구액이 명확하게 기재되지 않은 것 같습니다. "금 OOO원" 형식으로 기재해야 합니다.'});
            if (!docText.includes('입증방법') && !docText.includes('증거')) findings.push({level: 'info', text: '증거(입증방법) 목록이 없습니다. 주장을 뒷받침할 증거를 첨부하고 목록을 작성하는 것이 좋습니다.'});

            // DocType specific rules
            if (docType === 'complaint') {
                if (!docText.includes('소장')) findings.push({level: 'warn', text: '문서 종류를 "소장"으로 선택했지만, 문서 내에 "소장"이라는 단어가 없습니다. 문서 제목을 확인하세요.'});
                if (findings.filter(f=>f.level==='error').length === 0) findings.push({level: 'info', text: '소장의 기본 구성요소(당사자, 청구취지, 청구원인)가 모두 포함된 것으로 보입니다.'});
            } else if (docType === 'answer') {
                if (!docText.includes('답변서')) findings.push({level: 'warn', text: '문서 종류를 "답변서"로 선택했지만, 문서 내에 "답변서"라는 단어가 없습니다.'});
                if (!docText.includes('청구취지에 대한 답변')) findings.push({level: 'error', text: '답변서의 핵심인 "청구취지에 대한 답변" 부분이 명시되지 않았습니다.'});
                if (!docText.includes('청구원인에 대한 답변')) findings.push({level: 'error', text: '답변서의 핵심인 "청구원인에 대한 답변" 부분이 명시되지 않았습니다.'});
            }

            // Stage specific advice
            let stageAdvice = '';
            if (caseStage.includes('시작')) {
                stageAdvice = '소송 시작 단계에서는 소장의 형식적 요건(당사자, 주소, 청구취지 등)을 명확히 하는 것이 매우 중요합니다. 요건이 누락되면 보정명령을 받을 수 있습니다.';
            } else if (caseStage.includes('대응')) {
                stageAdvice = '답변서 제출 기한(소장 부본 송달 후 30일)을 반드시 지켜야 합니다. 기한 내에 답변하지 않으면 무변론 판결로 패소할 수 있습니다.';
            }

            // Generate report
            let report = `## AI 문서 검토 리포트\n\n`;
            report += `### 1. 기본 항목 체크\n`;
            if (findings.length > 0) {
                findings.forEach(f => {
                    let icon = '✅';
                    if (f.level === 'error') icon = '❌';
                    if (f.level === 'warn') icon = '⚠️';
                    if (f.level === 'info') icon = 'ℹ️';
                    report += `${icon} ${f.text}\n`;
                });
            } else {
                report += '✅ 문서의 기본 구조(당사자, 청구취지, 청구원인)가 잘 갖추어져 있습니다.\n';
            }

            report += `\n### 2. 소송 단계별 조언\n`;
            if (stageAdvice) {
                report += `ℹ️ 현재 '${caseStage}' 단계입니다. ${stageAdvice}\n`;
            } else {
                report += 'ℹ️ 소송 단계를 선택하시면 더 구체적인 조언을 얻을 수 있습니다.\n';
            }

            report += `\n### 3. 종합 의견\n`;
            const errorCount = findings.filter(f => f.level === 'error').length;
            if (errorCount > 0) {
                report += `⚠️ 중요 항목(${errorCount}개)이 누락되어 소송 진행에 차질이 생길 수 있습니다. "기본 항목 체크" 목록을 반드시 확인하고 문서를 보완하세요.`;
            } else {
                report += '👍 문서의 전체적인 구조는 양호합니다. 주장의 논리를 강화하고, 증거 자료를 충분히 준비하는 데 집중하세요.';
            }

            reportDiv.textContent = report;
            showToast('AI 검토 완료!');
            updateExpertRecommendations(findings);
        }, 1000);
    }
    
    // --- 전문가 연결 ---
    let selectedExpert = '';
    let selectedService = '';
    
    window.selectExpert = (type) => {
        selectedExpert = type;
        // visual feedback
        document.querySelectorAll('#expertConnectCard .btn[onclick^="selectExpert"]').forEach(b => b.classList.remove('active'));
        document.querySelector(`[onclick="selectExpert('${type}')"]`).classList.add('active');
    };
    
    window.selectService = (type) => {
        selectedService = type;
        // visual feedback
        document.querySelectorAll('#expertConnectCard .btn[onclick^="selectService"]').forEach(b => b.classList.remove('active'));
        document.querySelector(`[onclick="selectService('${type}')"]`).classList.add('active');
    };

    function setupExpertConnect() {
        document.getElementById('btnExpertRequest').addEventListener('click', () => {
            if (!selectedExpert || !selectedService) {
                showToast('전문가 유형과 서비스 유형을 모두 선택해주세요.');
                return;
            }
            const summary = document.getElementById('expertSummary').textContent;
            const userContact = document.getElementById('userContact').value;
            const userNote = document.getElementById('userNote').value;
            
            console.log("--- 전문가 연결 요청 ---");
            console.log("요청 요약:", summary);
            console.log("선택 전문가:", selectedExpert);
            console.log("선택 서비스:", selectedService);
            console.log("연락처:", userContact);
            console.log("추가 요청:", userNote);

            showToast('전문가 연결이 요청되었습니다. (데모)');
        });
    }

    function updateExpertRecommendations(findings) {
        const errorCount = findings ? findings.filter(f => f.level === 'error').length : 0;
        const caseType = document.getElementById('caseType').value;

        let expert = '변호사';
        if (caseType === '노동') {
            expert = '노무사';
        } else if (errorCount === 0) {
            expert = '법무사';
        }
        
        let service = errorCount > 0 ? '기존 서면 첨삭·검토' : '전문가 서면 작성';

        document.getElementById('expertRecommend').textContent = `${expert} (${caseType} 사건 전문)`
        document.getElementById('serviceRecommend').textContent = service;
        
        const summary = `사건 유형: ${document.getElementById('caseType').value}\n` +
                      `소송 단계: ${document.getElementById('caseStage').value}\n` +
                      `문서 종류: ${document.getElementById('docType').value}\n` +
                      `검토 목표: ${document.getElementById('goal').value}\n\n` +
                      `--- AI 검토 요약 ---\n` +
                      (findings && findings.length > 0 ? findings.map(f => `- ${f.text}`).join('\n') : '특별한 이슈 없음');
        document.getElementById('expertSummary').textContent = summary;
    }


    // --- 초기화 ---
    setupPageNavigation();
    setupTabs();
    setupStructuredEditor();
    setupFreeformEditor();
    setupFileUpload();
    setupAiReview();
    setupExpertConnect();
});

// App-wide functions that are called from HTML
function startApp(){
  document.getElementById("splash").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  // Default to review page
  document.getElementById('review').classList.remove('hidden');
  document.getElementById('home').classList.add('hidden');
  window.scrollTo(0,0);
}
