document.addEventListener('DOMContentLoaded', function() {

    // --- State Management ---
    let selectedExpert = '';
    let selectedService = '';
    let extractedText = '';
    let partyCount = 0;

    // --- DOM Elements ---
    const toastEl = document.getElementById('toast');

    // --- Core Functions ---

    function showToast(message) {
        toastEl.textContent = message;
        toastEl.style.display = 'block';
        setTimeout(() => {
            toastEl.style.display = 'none';
        }, 2500);
    }

    // --- Event Listener Setup ---

    // Tabs
    const tabWrite = document.getElementById('tabWrite');
    const tabUpload = document.getElementById('tabUpload');
    const panelWrite = document.getElementById('panelWrite');
    const panelUpload = document.getElementById('panelUpload');
    
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

    const segStructured = document.getElementById('segStructured');
    const segFreeform = document.getElementById('segFreeform');
    const structuredWrap = document.getElementById('structuredWrap');
    const freeformWrap = document.getElementById('freeformWrap');

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

    // Structured Editor
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
                <button type="button" class="smBtn danger" data-remove-id="${partyId}">삭제</button>
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

    partyList.addEventListener('click', (e) => {
        if(e.target.matches('[data-remove-id]')){
            const id = e.target.getAttribute('data-remove-id');
            document.getElementById(id).remove();
        }
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

    // Freeform Editor
    document.getElementById('btnUseFreeform').addEventListener('click', () => {
        document.getElementById('finalDoc').value = document.getElementById('docText').value;
        showToast('자유 입력 내용이 최종 문서에 적용되었습니다.');
    });

    // File Upload / OCR
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

    async function readPdfFile(file) {
        const progBar = document.getElementById('progBar');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
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
        
        const response = await fetch('https://ocr.ww.pe.kr/api/ocr', {
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

    // AI Review
    const stageGuides = {
        '소송 시작 단계 (소장·신청서)': '관할 법원, 소가, 인지대/송달료, 필수적 기재사항 등 소장 요건을 정확히 확인해야 합니다.',
        '상대방 대응 단계 (답변서)': '청구취지에 대한 답변과 청구원인에 대한 구체적인 인정/부인/항변이 가장 중요하며, 30일 이내 제출해야 합니다.',
        '주장·반박 정리 단계 (준비서면)': '핵심 쟁점에 집중하고, 주장을 뒷받침하는 증거(갑/을 호증)를 명확히 연결하는 것이 중요합니다.',
        '절차 보완 단계 (보정서)': '법원의 보정명령 내용을 정확히 파악하고, 기한 내에 요구 사항을 모두 충족시키는 것이 절대적으로 중요합니다.',
        '판결 이후 대응 단계 (항소·집행)': '판결문 송달일로부터 14일 이내에 항소장을 제출해야 하며, 항소취지와 이유를 명확히 밝혀야 합니다.',
    };

    document.getElementById('btnReview').addEventListener('click', () => runAiReview('default'));
    document.getElementById('btnAiOcrReview').addEventListener('click', () => runAiReview('ocr'));
    
    document.getElementById('caseStage').addEventListener('change', (e) => {
        const guide = stageGuides[e.target.value] || '소송의 현재 위치를 선택하면, 이 단계에서 주의할 점을 안내합니다.';
        document.getElementById('stageGuide').textContent = guide;
    });
    
    document.getElementById('btnCopyAI').addEventListener('click', () => {
        const reportText = document.getElementById('report').textContent;
        navigator.clipboard.writeText(reportText).then(() => {
            showToast('AI 리포트가 클립보드에 복사되었습니다.');
        });
    });

    document.getElementById('btnDownloadAI').addEventListener('click', () => {
        const reportText = document.getElementById('report').textContent;
        const blob = new Blob([reportText], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'AI_정밀검토_리포트.txt';
        link.click();
        URL.revokeObjectURL(link.href);
    });

    function runAiReview() {
        const docText = document.getElementById('finalDoc').value;
        const caseStage = document.getElementById('caseStage').value;

        if (docText.trim().length < 50) {
            showToast('검토할 문서 내용이 너무 짧습니다.');
            document.getElementById('report').textContent = '검토할 내용이 부족합니다. 문서를 50자 이상 작성해주세요.';
            return;
        }

        const reportDiv = document.getElementById('report');
        reportDiv.innerHTML = 'AI가 소송 단계별로 문서를 정밀 분석하고 있습니다...';

        setTimeout(() => {
            let findings = [];
            if (!docText.includes('원고')) findings.push({level: 'error', text: '문서에 "원고"가 명시되지 않았습니다.'});
            if (!docText.includes('피고')) findings.push({level: 'error', text: '문서에 "피고"가 명시되지 않았습니다.'});
            if (!docText.includes('청구취지')) findings.push({level: 'error', text: '문서에 "청구취지"가 명시되지 않았습니다.'});
            if (!docText.includes('청구원인')) findings.push({level: 'error', text: '문서에 "청구원인"이 명시되지 않았습니다.'});

            const stageRules = {
                '소송 시작 단계 (소장·신청서)': [
                    { regex: /관할|법원/, message: '관할 법원(예: 서울중앙지방법원)이 명시되었는지 확인하세요.', level: 'warn' },
                    { regex: /소송비용은 피고(?:들)?의 부담으로 한다/, message: ''소송비용 부담'에 대한 문구가 누락되었을 수 있습니다.', level: 'info' },
                    { regex: /가집행할 수 있다/, message: '판결 확정 전 강제집행을 위한 '가집행' 문구가 있는지 확인하세요.', level: 'info' }
                ],
                '상대방 대응 단계 (답변서)': [
                    { regex: /청구취지에 대한 답변/, message: '답변서의 핵심인 "청구취지에 대한 답변" 항목이 누락되었습니다.', level: 'error' },
                    { regex: /청구원인에 대한 답변/, message: '답변서의 핵심인 "청구원인에 대한 답변" 항목이 누락되었습니다.', level: 'error' },
                    { regex: /인정|부인|항변/, message: '원고의 주장에 대해 인정, 부인, 항변하는 내용이 명확하지 않을 수 있습니다.', level: 'warn' }
                ],
                '주장·반박 정리 단계 (준비서면)': [
                    { regex: /(갑|을) 제[0-9]+호증/, message: '주장을 뒷받침하는 증거(예: 갑 제1호증)가 인용되었는지 확인하세요.', level: 'info' }
                ],
                '판결 이후 대응 단계 (항소·집행)': [
                    { regex: /항소취지/, message: '항소장의 필수 요소인 "항소취지"(원판결의 변경을 구하는 내용)가 누락되었습니다.', level: 'error' },
                    { regex: /항소이유/, message: '항소장의 필수 요소인 "항소이유"(원판결의 부당함을 주장하는 이유)가 누락되었습니다.', level: 'error' },
                    { regex: /원판결의 표시/, message: '어떤 판결에 불복하는지 특정하기 위한 "원판결의 표시"가 있는지 확인하세요.', level: 'warn' }
                ]
            };

            const rulesForCurrentStage = stageRules[caseStage];
            let stageFindings = [];
            if (rulesForCurrentStage) {
                rulesForCurrentStage.forEach(rule => {
                    if (!rule.regex.test(docText)) {
                        stageFindings.push({ level: rule.level, text: rule.message });
                    }
                });
            }
            
            let report = `## AI 문서 정밀 검토 리포트\n\n`;
            const basicErrors = findings.filter(f => f.level === 'error');
            
            report += `### 1. 기본 구조 체크\n`;
            if (basicErrors.length > 0) {
                basicErrors.forEach(f => { report += `❌ ${f.text}\n`; });
            } else {
                report += '✅ 필수 항목(원고, 피고, 청구취지, 청구원인)이 모두 포함되어 있습니다.\n';
            }

            report += `\n### 2. 소송 단계별 핵심 사항 체크 ('${caseStage || '단계 미선택'}')\n`;
            if (caseStage && rulesForCurrentStage) {
                if (stageFindings.length > 0) {
                    stageFindings.forEach(f => {
                        const icon = f.level === 'error' ? '❌' : (f.level === 'warn' ? '⚠️' : 'ℹ️');
                        report += `${icon} ${f.text}\n`;
                    });
                } else {
                    report += `✅ 선택하신 단계에서 요구되는 핵심 사항들이 잘 포함된 것으로 보입니다.\n`;
                }
            } else {
                report += 'ℹ️ 소송 단계를 선택하시면, 해당 단계에 맞는 정밀 분석을 추가로 제공합니다.\n';
            }

            const allFindings = findings.concat(stageFindings);
            const totalErrors = allFindings.filter(f => f.level === 'error').length;
            report += `\n### 3. 종합 의견\n`;
            if (totalErrors > 0) {
                report += `⚠️ 문서의 법적 효력에 영향을 줄 수 있는 중요 항목(${totalErrors}개)이 누락되었습니다. 보고서의 ❌ 표시 항목을 반드시 수정·보완하세요.`;
            } else {
                report += '👍 문서의 전체적인 구조가 안정적입니다. 이제 주장의 논리적 흐름과 증거의 타당성을 높이는 데 집중하세요.';
            }

            reportDiv.textContent = report;
            showToast('AI 정밀 검토 완료!');
            updateExpertRecommendations(allFindings);
        }, 1000);
    }
    
    // Expert Connect
    document.querySelector('.expert-buttons').addEventListener('click', (e) => {
        if(e.target.matches('[data-expert-type]')) {
            selectedExpert = e.target.dataset.expertType;
            document.querySelectorAll('[data-expert-type]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    document.querySelector('.service-buttons').addEventListener('click', (e) => {
        if(e.target.matches('[data-service-type]')) {
            selectedService = e.target.dataset.serviceType;
            document.querySelectorAll('[data-service-type]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    document.getElementById('btnExpertRequest').addEventListener('click', () => {
        if (!selectedExpert || !selectedService) {
            showToast('전문가 유형과 서비스 유형을 모두 선택해주세요.');
            return;
        }
        const summary = document.getElementById('expertSummary').textContent;
        const userContact = document.getElementById('userContact').value;
        const userNote = document.getElementById('userNote').value;
        
        const requestSummary = `--- 전문가 연결 요청 ---\n- 희망 전문가: ${selectedExpert}\n- 희망 서비스: ${selectedService}\n- 연락처: ${userContact || '미입력'}\n- 추가 요청: ${userNote || '없음'}\n\n--- 전달될 문서 요약 ---\n${summary}`;
        
        navigator.clipboard.writeText(requestSummary).then(() => {
            showToast('전문가 요청 정보가 클립보드에 복사되었습니다.');
        });
    });

    function updateExpertRecommendations(findings) {
        const errorCount = findings ? findings.filter(f => f.level === 'error').length : 0;
        const caseType = document.getElementById('caseType').value;

        let expert = '변호사';
        if (caseType === '노동') expert = '노무사';
        else if (errorCount === 0) expert = '법무사';
        
        let service = errorCount > 0 ? '기존 서면 첨삭·검토' : '전문가 서면 작성';

        document.getElementById('expertRecommend').textContent = `${expert} (${caseType} 사건 전문)`
        document.getElementById('serviceRecommend').textContent = service;
        
        const summary = `사건 유형: ${document.getElementById('caseType').value}\n` +
                      `소송 단계: ${document.getElementById('caseStage').value}\n` +
                      `문서 종류: ${document.getElementById('docType').value}\n` +
                      `검토 목표: ${document.getElementById('goal').value}\n\n` +
                      `--- AI 검토 주요 발견사항 ---\n` +
                      (findings && findings.length > 0 ? findings.map(f => `- (${f.level.toUpperCase()}) ${f.text}`).join('\n') : '특별한 이슈 없음');
        document.getElementById('expertSummary').textContent = summary;
    }

});