    // ==========================================
    // MODULE NGỮ PHÁP TOEIC (GRAMMAR) 
    // ==========================================
    function openGrammarMenu() { localStorage.setItem('last_screen', 'grammar'); setDisplay('dashboardArea', 'none'); setDisplay('grammarMenuModal', 'flex'); }
    function closeGrammarMenu() { 
        setDisplay('grammarMenuModal', 'none'); 
        setDisplay('dashboardArea', 'block'); 
        updateStatsDashboard();
        
        // Gắn tự động lưu:
        pushToCloud(); 
    }
    function backToGrammarMenu() { setDisplay('grammarTheoryScreen', 'none'); setDisplay('grammarMenuModal', 'flex'); }
    
    const THEORY_PDF_LIST = [
        { title: "Bài 1: Danh từ", link: "https://drive.google.com/file/d/1TEuJmQCqlIqnWZeIH0svIDy86jYeC8GO/preview" },
        { title: "Bài 2: Tính từ", link: "https://drive.google.com/file/d/1Snz0_QrMyf1tpx5sdo3ANU8PkIHyW6CM/preview" },
        { title: "Bài 3: Trạng từ", link: "https://drive.google.com/file/d/1I7OLInY-T4YGAYtWA3j2QDPzvd899XM_/preview" },
        { title: "Bài 4: Đại từ", link: "https://drive.google.com/file/d/1DvQKWn0jUiwZFhPdYiDmasEkwi7ICY-P/preview" }
    ];

    function openGrammarTheory() { 
        setDisplay('grammarMenuModal', 'none'); setDisplay('grammarTheoryScreen', 'flex'); 
        let select = document.getElementById('theoryTopicSelect');
        if (select.options.length === 0) { select.innerHTML = THEORY_PDF_LIST.map((item, index) => `<option value="${index}">${item.title}</option>`).join(''); }
        changeTheoryPDF();
    }

    function changeTheoryPDF() {
        let select = document.getElementById('theoryTopicSelect'); let index = select.value; let iframe = document.getElementById('theoryIframe');
        if (THEORY_PDF_LIST[index]) { iframe.style.opacity = '0.5'; iframe.src = THEORY_PDF_LIST[index].link; iframe.onload = () => { iframe.style.opacity = '1'; }; }
    }

    // 1. Mở màn hình chọn 2 chế độ
    function startGrammarTest() {
        if(grammarData.length === 0) return showToast("Chưa có dữ liệu Ngữ Pháp!");
        setDisplay('grammarMenuModal', 'none'); 
        setDisplay('grammarComprehensiveSetupScreen', 'flex');
        renderExamHistory(); // Vẽ lịch sử
    }

    function backFromCompSetup() {
        setDisplay('grammarComprehensiveSetupScreen', 'none');
        setDisplay('grammarMenuModal', 'flex');
    }

    // 2. Chạy chế độ LUYỆN TẬP
    function startCompPractice() {
        currentGrammarTestMode = 'practice';
        isGrammarPracticeMode = false; 
        let limit = parseInt(document.getElementById('compPracticeCount').value) || 20;
        
        grammarQuestions = [...grammarData].sort(() => 0.5 - Math.random()).slice(0, limit); 
        grammarScore = 0; currentGrammarIndex = 0; grammarUserAnswers = [];
        window.grammarPracticeState = {};
        document.getElementById('grammarQuizTitle').innerText = "🎯 LUYỆN TẬP TỔNG HỢP";
        setDisplay('grammarComprehensiveSetupScreen', 'none'); 
        setDisplay('grammarQuizScreen', 'flex');
        renderGrammarQuestion();
    }

    // 3. Chạy chế độ LUYỆN THI (Thuật toán rải đều chủ đề)
    function startCompExam() {
        currentGrammarTestMode = 'exam';
        isGrammarPracticeMode = false; 
        
        // BƯỚC A: Gom nhóm toàn bộ câu hỏi theo Chủ đề
        let topicsMap = {};
        grammarData.forEach(q => {
            let mainTopic = q.topic ? q.topic.split(',')[0].trim() : 'Khác';
            if(!topicsMap[mainTopic]) topicsMap[mainTopic] = [];
            topicsMap[mainTopic].push(q);
        });

        let examPool = [];
        let topicKeys = Object.keys(topicsMap);

        // BƯỚC B: Vét 3-5 câu mỗi chủ đề
        topicKeys.forEach(t => {
            let shuffled = topicsMap[t].sort(() => 0.5 - Math.random());
            // Lấy ngẫu nhiên từ 3 đến 5 câu (hoặc lấy hết nếu chủ đề đó ít câu hơn)
            let takeCount = Math.floor(Math.random() * 3) + 3; // 3, 4, hoặc 5
            let taken = shuffled.slice(0, takeCount);
            examPool.push(...taken);
            
            // Xóa những câu đã lấy ra khỏi kho tạm để lát lỡ thiếu không bị bốc trùng
            topicsMap[t] = shuffled.slice(takeCount); 
        });

        // BƯỚC C: Chốt đúng 30 câu
        examPool = examPool.sort(() => 0.5 - Math.random()); // Trộn tung lên
        if (examPool.length > 30) {
            // Nếu dư thì cắt lấy đúng 30
            examPool = examPool.slice(0, 30);
        } else if (examPool.length < 30) {
            // Nếu thiếu (do database ít), bốc bù từ các câu còn thừa ở Bước B
            let remainders = [];
            topicKeys.forEach(t => remainders.push(...topicsMap[t]));
            remainders = remainders.sort(() => 0.5 - Math.random());
            
            while (examPool.length < 30 && remainders.length > 0) {
                examPool.push(remainders.pop());
            }
        }

        grammarQuestions = examPool.sort(() => 0.5 - Math.random()); // Trộn chót trước khi làm
        grammarScore = 0; currentGrammarIndex = 0; grammarUserAnswers = [];
        window.examMarkedQuestions = {};
        window.tempExamAnswersList = [];
        
        document.getElementById('grammarQuizTitle').innerText = "⏱️ LUYỆN THI (30 CÂU)";
        setDisplay('grammarComprehensiveSetupScreen', 'none'); 
        setDisplay('grammarQuizScreen', 'flex');
        
        // Ẩn thanh đếm giờ vì luyện thi cần tập trung (Hoặc bạn có thể tự thiết lập 15 phút nếu muốn)
        document.getElementById('grammarTimerDisplay').style.display = 'none'; 
        renderGrammarQuestion();
    }

    function openGrammarPracticeSetup() {
        if(grammarData.length === 0) return showToast("Chưa có dữ liệu Ngữ Pháp!");
        let allTopics = [];
        grammarData.forEach(item => { if (item.topic) { let splitTopics = item.topic.split(',').map(t => t.trim()).filter(t => t !== ""); allTopics.push(...splitTopics); } });
        let uniqueTopics = [...new Set(allTopics)];

        const PREFERRED_ORDER = ["Từ loại", "Đại từ", "Động từ", "Câu điều kiện", "Giới từ", "Liên từ", "So sánh", "Từ vựng", "Cơ bản", "600+", "800+"];
        uniqueTopics.sort((a, b) => {
            let indexA = PREFERRED_ORDER.indexOf(a); let indexB = PREFERRED_ORDER.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        let grid = document.getElementById('grammarTopicGrid'); grid.innerHTML = ''; 
        if (studentStats.savedGrammar && studentStats.savedGrammar.length > 0) {
            let savedBtn = document.createElement('button');
            savedBtn.className = `mode-card grammar-topic-btn`; savedBtn.style.backgroundColor = '#FFD54F'; savedBtn.style.padding = '20px 10px';
            savedBtn.innerHTML = `<div class="mode-icon grammar-topic-icon" style="background: rgba(0,0,0,0.1);">⭐</div><p class="mode-title grammar-topic-title" style="font-size: 15px;">Câu hỏi đã lưu (${studentStats.savedGrammar.length})</p>`;
            savedBtn.onclick = () => startGrammarPractice('SAVED_QUESTIONS');
            grid.appendChild(savedBtn);
        }
        uniqueTopics.forEach((topic, index) => {
         // Đếm số câu tổng & đã làm
         let topicQuestions = grammarData.filter(q => q.topic && q.topic.split(',').map(t=>t.trim()).includes(topic));
         let totalQ = topicQuestions.length;
         let doneQ = 0;
         topicQuestions.forEach(q => {
             if (studentStats.grammarTracker && studentStats.grammarTracker[q.question] && studentStats.grammarTracker[q.question].attempts > 0) doneQ++;
         });

         let btn = document.createElement('button');
         btn.className = `mode-card grammar-topic-btn ets-color-${index % 10}`; btn.style.padding = '20px 10px';
         btn.innerHTML = `<div class="mode-icon grammar-topic-icon">🎯</div>
                          <p class="mode-title grammar-topic-title" style="font-size: 15px; margin-bottom: 5px;">${topic}</p>
                          <p style="margin: 0; font-size: 12px; font-weight: 900; color: var(--text-main); background: rgba(255,255,255,0.6); padding: 3px 10px; border-radius: 12px; display: inline-block;">${doneQ}/${totalQ}</p>`;
         btn.onclick = () => startGrammarPractice(topic);
         grid.appendChild(btn);
     });

        setDisplay('grammarMenuModal', 'none'); setDisplay('grammarPracticeSetupScreen', 'flex');
        // --- KÍCH HOẠT BÓNG THOẠI CHO NÚT TIẾN ĐỘ ---
        setTimeout(() => {
            startCustomTour('tour_grammar_prog_v1', [
                {
                    target: 'tourTarget_grammarProgress', icon: '📊', title: 'Bảng Đo Lường', position: 'bottom',
                    text: 'Nhấn vào đây để xem tỷ lệ % làm đúng/sai và lịch sử chọn đáp án chi tiết của từng chủ đề nhé!'
                }
            ]);
        }, 300); // Chờ màn hình mở ra hoàn toàn mới chạy bóng thoại
    }

    function backToGrammarMenuFromSetup() { setDisplay('grammarPracticeSetupScreen', 'none'); setDisplay('grammarMenuModal', 'flex'); }
// BIẾN LƯU TRẠNG THÁI CÁC CÂU ĐÃ LÀM KHI ĐIỀU HƯỚNG
    window.grammarPracticeState = {};

    // HÀM VẼ THANH TRÁI TIM
    function renderGrammarHeartProgress() {
        let container = document.getElementById('grammarHeartProgress');
        if(!container) return;
        
        // Chỉ vẽ trái tim nếu đang ở chế độ Thực hành / Ôn lại (Không dùng cho thi thật)
        if(currentGrammarTestMode === 'exam' && !window.isGrammarReviewMode) {
            container.style.display = 'none';
            return;
        }

        // TỰ ĐỘNG ẨN THANH TRÁI TIM NẾU QUÁ DÀI (TRÁNH BÓP NGHẸT KHUNG CÂU HỎI)
        if (grammarQuestions.length > 40) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'flex';
        let html = '';
        
        for(let i = 0; i < grammarQuestions.length; i++) {
            let state = window.grammarPracticeState[i];
            let heartColor = 'var(--text-light)'; // Mặc định xám (Chưa làm)
            let icon = '♡'; // Tim rỗng
            let isCurrent = (i === currentGrammarIndex) ? 'transform: scale(1.3); text-shadow: 0 2px 5px rgba(0,0,0,0.2);' : '';
            
            if (state) {
                icon = '♥'; // Tim đặc
                if (state.isRight) {
                    heartColor = 'var(--primary)'; // Màu Hồng nếu đúng
                } else {
                    heartColor = 'var(--text-light)'; // Đổi màu xanh lá thành màu đen khi sai
                }
            }
            
            html += `<span style="color: ${heartColor}; cursor: pointer; transition: 0.2s; ${isCurrent}" onclick="jumpToGrammarQuestion(${i})">${icon}</span>`;
        }
        container.innerHTML = html;
    }

    // Cho phép bấm vào trái tim để nhảy đến câu đó
    function jumpToGrammarQuestion(index) {
        currentGrammarIndex = index;
        renderGrammarQuestion();
    }
    function startGrammarPractice(selectedTopic) {
        currentGrammarTestMode = 'practice'; // Ép hệ thống về chế độ luyện tập (Hiện giải thích)
        isGrammarPracticeMode = true; let fullPool = [];
        if (selectedTopic === 'SAVED_QUESTIONS') { fullPool = grammarData.filter(q => studentStats.savedGrammar.includes(q.question)); } 
        else { fullPool = grammarData.filter(q => { if (!q.topic) return false; let qTags = q.topic.split(',').map(t => t.trim()); return qTags.includes(selectedTopic); }); }

        let limitInput = parseInt(document.getElementById('grammarCountInput').value);
        let limit = (limitInput > 0) ? limitInput : 20; 
        if (selectedTopic === 'SAVED_QUESTIONS') limit = Math.min(limit, fullPool.length);
        
        grammarQuestions = fullPool.sort(() => 0.5 - Math.random()).slice(0, limit);
        grammarScore = 0; currentGrammarIndex = 0; grammarUserAnswers = []; 
        window.grammarPracticeState = {};
        document.getElementById('grammarQuizTitle').innerText = "🎯 THỰC HÀNH";
        setDisplay('grammarPracticeSetupScreen', 'none'); setDisplay('grammarQuizScreen', 'flex');
        
        startGrammarTimer(); renderGrammarQuestion();
    }

    function renderGrammarQuestion() {
        let d = grammarQuestions[currentGrammarIndex];
        document.getElementById('grammarProgressText').innerText = `Câu ${currentGrammarIndex + 1} / ${grammarQuestions.length}`;
        document.getElementById('grammarTopicTag').innerText = `Chủ đề: ${d.topic}`;
        document.getElementById('grammarQuestionText').innerHTML = d.question.replace(/_+/g, (match) => `<span style="color:var(--primary); font-weight:900;">${match}</span>`);
        
        setDisplay('grammarExplanationBox', 'none'); 
        setDisplay('inlineGrammarNoteArea', 'none');
        setDisplay('grQuizSaveBtn', 'none'); 
        
        // Hiện nút Back nếu không phải câu đầu tiên
        setDisplay('grammarPrevBtn', currentGrammarIndex > 0 ? 'inline-block' : 'none');
        // MỚI: LUÔN hiện nút Next để học viên có thể skip câu trong mọi chế độ
        setDisplay('grammarNextBtn', 'inline-block');
        
        // KIỂM SOÁT HIỂN THỊ DẤU CHẤM (CHỈ THI THỰC) VÀ TRÁI TIM (CHỈ THỰC HÀNH)
        if (currentGrammarTestMode === 'exam' && !window.isGrammarReviewMode) {
            setDisplay('grammarHeartProgress', 'none');
            setDisplay('grammarDotsPagination', 'flex');
            // 🚀 KIỂM TRA AN TOÀN TRƯỚC KHI VẼ CHẤM TRÒN TIẾN ĐỘ
if (typeof renderGrammarDots === 'function') {
    renderGrammarDots();
}
        } else {
            setDisplay('grammarDotsPagination', 'none');
            renderGrammarHeartProgress();
        }
        // --- LOGIC GHI CHÚ: ĐỔI MÀU NÚT NẾU ĐÃ CÓ NOTE ---
        let noteBtn = document.getElementById('grammarNoteBtn');
        if (noteBtn) {
            if (studentStats.userNotes && studentStats.userNotes[d.question]) {
                // Đã có ghi chú: Vàng nổi bật
                noteBtn.style.background = 'var(--warning)';
                noteBtn.style.color = '#fff';
                noteBtn.style.borderColor = 'var(--warning)';
                noteBtn.innerText = "📝 Xem Note";
            } else {
                // Chưa có: Về màu động theo Mode Sáng/Tối
                noteBtn.style.background = 'var(--card-bg)';
                noteBtn.style.color = 'var(--text-main)';
                noteBtn.style.borderColor = 'var(--border-color)';
                noteBtn.innerText = "📝 Note";
            }
        }
        // ------------------------------------------------

        let correctText = "";
        if (d.correctChar === 'A') correctText = d.optA; else if (d.correctChar === 'B') correctText = d.optB; else if (d.correctChar === 'C') correctText = d.optC; else if (d.correctChar === 'D') correctText = d.optD;

        let rawOptions = [d.optA, d.optB, d.optC, d.optD].filter(Boolean);
        
        // MỚI: Chỉ xáo trộn 1 lần đầu tiên rồi lưu lại vào biến d để không bị nhảy vị trí khi Back lại
        if (!d.shuffledOptions) {
            d.shuffledOptions = [...rawOptions].sort(() => 0.5 - Math.random());
        }
        let shuffledOptions = d.shuffledOptions;

        const optArea = document.getElementById('grammarOptionsArea'); optArea.innerHTML = ''; let answered = false;

        let savedExamAns = window.tempExamAnswersList ? window.tempExamAnswersList[currentGrammarIndex] : null;
        
        // MỚI: Đọc lại trạng thái đã chọn ở chế độ Luyện tập
        let savedPracState = window.grammarPracticeState ? window.grammarPracticeState[currentGrammarIndex] : null;
        if (savedPracState && currentGrammarTestMode === 'practice') {
            answered = true; // Khóa không cho chọn lại nếu câu này đã làm
        }

        shuffledOptions.forEach(optText => {
            let btn = document.createElement('button'); 
            btn.className = 'grammar-menu-btn';  
            
            // Ép nhỏ kích thước nút đáp án
            btn.style.margin = '0'; 
            btn.style.padding = '14px 15px'; 
            btn.style.fontSize = '15px'; 
            btn.style.justifyContent = 'center'; 
            
            btn.innerText = optText;

            // Phục hồi màu sắc cho chế độ Luyện thi
            if (currentGrammarTestMode === 'exam' && savedExamAns === optText) {
                btn.style.backgroundColor = 'var(--primary)'; 
                btn.style.borderColor = 'var(--primary)'; 
                btn.style.color = 'white';
            }

            // MỚI: Phục hồi màu sắc cho chế độ Luyện tập
            if (savedPracState && currentGrammarTestMode === 'practice') {
                btn.disabled = true;
                btn.style.opacity = 0.6;
                
                if (optText === savedPracState.user) {
                    btn.style.opacity = 1;
                    if (savedPracState.isRight) {
                        btn.style.backgroundColor = 'var(--success)'; btn.style.borderColor = 'var(--success)'; btn.style.color = '#222';
                    } else {
                        btn.style.backgroundColor = 'var(--danger)'; btn.style.borderColor = 'var(--danger)'; btn.style.color = 'white';
                    }
                }
                
                if (optText === savedPracState.correct) {
                    btn.style.opacity = 1;
                    btn.style.backgroundColor = 'var(--success)'; btn.style.borderColor = 'var(--success)'; btn.style.color = '#222';
                    btn.style.borderWidth = '4px';
                }
            }
            
            btn.onclick = () => {
                if (currentGrammarTestMode === 'exam') {
                    // Trả lại màu gốc cho tất cả các nút khác
                    Array.from(optArea.children).forEach(b => { 
                        b.style.backgroundColor = 'var(--extra-bg)'; 
                        b.style.borderColor = 'var(--primary)'; 
                        b.style.color = 'var(--text-main)'; 
                    });
                    
                    // Tô màu nổi bật cho nút vừa chọn
                    btn.style.backgroundColor = 'var(--primary)'; 
                    btn.style.borderColor = 'var(--primary)'; 
                    btn.style.color = 'white';
                    
                    // LƯU ĐÁP ÁN VÀO MẢNG THEO VỊ TRÍ CÂU HỎI
                    if (!window.tempExamAnswersList) window.tempExamAnswersList = [];
                    window.tempExamAnswersList[currentGrammarIndex] = optText;
                    
                } else {
                    // --- 2. CHẾ ĐỘ LUYỆN TẬP: CHỐT NGAY VÀ HIỆN GIẢI THÍCH (Như cũ) ---
                    if(answered) return; answered = true;
                    let isCorrect = (optText === correctText);
                    
                    if (!studentStats.wrongGrammar) studentStats.wrongGrammar = [];
                    // GỌI TRACKER GHI NHẬN:
                 recordGrammarAnswer(d.question, optText, isCorrect);
                    if (isCorrect) { 
                        grammarScore++; 
                        let idx = studentStats.wrongGrammar.indexOf(d.question); 
                        if (idx > -1) { studentStats.wrongGrammar.splice(idx, 1); saveStats(); } 
                    } else { 
                        if (!studentStats.wrongGrammar.includes(d.question)) { studentStats.wrongGrammar.push(d.question); saveStats(); } 
                    }
                    
                    // MỚI: Lưu lại trạng thái của câu này vào cache để dùng khi Back lại
                    if (!window.grammarPracticeState) window.grammarPracticeState = {};
                    window.grammarPracticeState[currentGrammarIndex] = {
                        originalData: d, question: d.question, correct: correctText, user: optText, isRight: isCorrect
                    };
                    // Lưu thẳng vào grammarUserAnswers theo đúng index để nếu có Skip câu cũng không bị lệch
                    grammarUserAnswers[currentGrammarIndex] = window.grammarPracticeState[currentGrammarIndex];
                    
                    Array.from(optArea.children).forEach(b => { b.disabled = true; b.style.opacity = 0.6; }); 
                    btn.style.opacity = 1;

                    let expBox = document.getElementById('grammarExplanationBox'); 
                    expBox.style.display = 'block';
                    setDisplay('grQuizSaveBtn', 'block');
                    updateQuizSaveBtnState();
                    
                    if (isCorrect) {
                        btn.style.backgroundColor = 'var(--success)'; btn.style.borderColor = 'var(--success)'; btn.style.color = '#222';
                        btn.classList.add('correct-pop'); // <--- Lệnh mới: Nảy nút lên!
                        expBox.className = 'grammar-explanation'; 
                        let formattedExplain = d.explain ? d.explain.replace(/\r?\n/g, '<br>') : "";
                        expBox.innerHTML = `✔️ <b>CHÍNH XÁC!</b><br><br>${formattedExplain}`;
                    } else {
                        // Nút chọn sai biến thành Đỏ
                        btn.style.backgroundColor = 'var(--danger)'; btn.style.borderColor = 'var(--danger)'; btn.style.color = 'white';
                        
                        // Quét tìm nút Đúng để tô thành Xanh lá cây
                        Array.from(optArea.children).forEach(b => { 
                            if(b.innerText === correctText) { 
                                b.style.opacity = 1; 
                                b.style.backgroundColor = 'var(--success)'; // Thêm nền xanh
                                b.style.borderColor = 'var(--success)'; 
                                b.style.color = '#222'; // Chữ đen cho dễ đọc
                                b.style.borderWidth = '4px'; 
                            } 
                        });
                        
                        expBox.className = 'grammar-explanation wrong'; 
                        let formattedExplain = d.explain ? d.explain.replace(/\r?\n/g, '<br>') : "";
                        expBox.innerHTML = `❌ <b>SAI RỒI!</b> Đáp án đúng là: <b>${correctText}</b><br><br>${formattedExplain}`;
                    }
                    setDisplay('grammarNextBtn', 'inline-block');
                }
            };
            optArea.appendChild(btn);
        });
        // MỚI: Phục hồi hiển thị bảng Giải thích nếu học viên quay lại câu đã làm
        if (savedPracState && currentGrammarTestMode === 'practice') {
            let expBox = document.getElementById('grammarExplanationBox'); 
            expBox.style.display = 'block';
            setDisplay('grQuizSaveBtn', 'block');
            updateQuizSaveBtnState();
            
            let formattedExplain = d.explain ? d.explain.replace(/\r?\n/g, '<br>') : "";
            if (savedPracState.isRight) {
                expBox.className = 'grammar-explanation'; 
                expBox.innerHTML = `✔️ <b>CHÍNH XÁC!</b><br><br>${formattedExplain}`;
            } else {
                expBox.className = 'grammar-explanation wrong'; 
                expBox.innerHTML = `❌ <b>SAI RỒI!</b> Đáp án đúng là: <b>${savedPracState.correct}</b><br><br>${formattedExplain}`;
            }
        }
    }
function prevGrammarQuestion() {
        if (currentGrammarIndex > 0) {
            currentGrammarIndex--;
            renderGrammarQuestion();
        }
    }

    function nextGrammarQuestion() {
        if (currentGrammarIndex < grammarQuestions.length - 1) { 
            currentGrammarIndex++; 
            renderGrammarQuestion(); 
        } 
        else {
            // NỘP BÀI!
            setDisplay('grammarQuizScreen', 'none'); 
            setDisplay('quizResultScreen', 'flex');
            
            // Xử lý CHỐT ĐIỂM HÀNG LOẠT cho chế độ Luyện Thi (Exam)
            if (currentGrammarTestMode === 'exam') {
                grammarScore = 0;
                grammarUserAnswers = [];
                
                grammarQuestions.forEach((q, idx) => {
                    let correctText = "";
                    if (q.correctChar === 'A') correctText = q.optA; else if (q.correctChar === 'B') correctText = q.optB; else if (q.correctChar === 'C') correctText = q.optC; else if (q.correctChar === 'D') correctText = q.optD;
                    
                    let userAns = window.tempExamAnswersList ? window.tempExamAnswersList[idx] : null;
                    let isCorrect = (userAns === correctText);
                    
                    if (isCorrect) grammarScore++;
                    
                    // Ghi nhận vào Tracker & Lịch sử câu sai
                    if (!studentStats.wrongGrammar) studentStats.wrongGrammar = [];
                    recordGrammarAnswer(q.question, userAns, isCorrect);
                    
                    if (isCorrect) { 
                        let wIdx = studentStats.wrongGrammar.indexOf(q.question); 
                        if (wIdx > -1) { studentStats.wrongGrammar.splice(wIdx, 1); saveStats(); } 
                    } else { 
                        if (!studentStats.wrongGrammar.includes(q.question)) { studentStats.wrongGrammar.push(q.question); saveStats(); } 
                    }
                    
                    grammarUserAnswers.push({ originalData: q, question: q.question, correct: correctText, user: userAns, isRight: isCorrect });
                });
            }

            // Tính toán XP và Hiển thị kết quả
            let xpEarned = grammarScore * 15; 
            addXP(xpEarned); 
            let accuracy = Math.round((grammarScore / grammarQuestions.length) * 100);
            
            // Cộng điểm số tích lũy cho profile
            studentStats.grammarCorrectCount = (studentStats.grammarCorrectCount || 0) + grammarScore; 
            
            // LƯU LỊCH SỬ BÀI THI (Đã Fix lỗi không lưu)
            if (currentGrammarTestMode === 'exam') {
                if (!studentStats.examHistory) studentStats.examHistory = [];
                studentStats.examHistory.unshift({
                    date: Date.now(),
                    score: grammarScore,
                    total: grammarQuestions.length,
                    accuracy: accuracy,
                    questions: JSON.parse(JSON.stringify(grammarQuestions)),
                    userAnswers: JSON.parse(JSON.stringify(grammarUserAnswers))
                });
                if (studentStats.examHistory.length > 20) studentStats.examHistory.pop();
                saveStats();
            }

            // Ghi text ra màn hình
            document.getElementById('quizResultTitle').innerHTML = "📊 TỔNG KẾT NGỮ PHÁP";
            document.getElementById('quizScoreText').innerHTML = `Đúng: ${grammarScore}/${grammarQuestions.length} câu (${accuracy}%)`;
            document.getElementById('quizXPReward').innerText = `Thưởng: +${xpEarned} XP`;

            // === VẼ DANH SÁCH CÂU HỎI VÀ ĐÁP ÁN CHI TIẾT ===
            let reviewHTML = grammarUserAnswers.map((item, i) => `
                <div class="review-item ${item.isRight ? 'correct' : 'incorrect'}" style="cursor: pointer; transition: 0.2s;" onclick="showGrammarReviewDetail(${i})" onmouseover="this.style.transform='scale(0.98)'" onmouseout="this.style.transform='scale(1)'">
                    <p style="font-size: 15px; margin: 0 0 8px 0; font-weight:800; color: var(--text-main);"><b>Câu ${i + 1}:</b> ${item.question.replace(/_+/g, '___')}</p>
                    <div style="font-size: 13px; font-weight: 700;">
                        <span style="color: var(--text-light);">Đáp án đúng: <span style="color: var(--success);">${item.correct}</span></span><br>
                        <span style="color: var(--text-light);">Bạn chọn: <span style="color: ${item.isRight ? 'var(--success)' : 'var(--danger)'};">${item.user || "Bỏ qua"}</span> ${item.isRight ? '✔️' : '❌'}</span>
                    </div>
                </div>
            `).join('');
            
            let hintNote = `
                <div style="background: rgba(255, 182, 193, 0.15); border: 2px dashed var(--primary); padding: 10px 20px; border-radius: 20px; color: var(--primary-dark); font-weight: 900; font-size: 14px; width: fit-content; max-width: 90%; margin: 0 auto 15px auto; text-align: center; animation: pulse 2s infinite;">
                    💡 Nhấn vào từng câu bên dưới để xem giải thích chi tiết
                </div>
            `;
            document.getElementById('quizReviewList').innerHTML = hintNote + reviewHTML;

            // Xử lý nút Return
            let returnBtn = document.getElementById('quizResultReturnBtn');
            if (returnBtn) {
                returnBtn.onclick = function() { 
                    setDisplay('quizResultScreen', 'none');
                    
                    if (window.isSearchModeActive) {
                        window.isSearchModeActive = false; returnToMain(); executeGlobalSearch(); return;
                    }
                    if (window.isSavedGrammarDirectMode) {
                        window.isSavedGrammarDirectMode = false; returnToMain(); return; 
                    }
                    if (window.isGrammarReviewMode) {
                        window.isGrammarReviewMode = false; returnToMain(); return;
                    }
                    if (currentGrammarTestMode === 'exam') {
                        setDisplay('grammarComprehensiveSetupScreen', 'flex'); renderExamHistory(); return;
                    }
                    
                    setDisplay('grammarPracticeSetupScreen', 'flex'); updateStatsDashboard();
                };
            }
        }
    }

    // Lệnh thoát nhanh bằng nút Back mũi tên
    function forceExitGrammarQuiz() { 
        setDisplay('grammarQuizScreen', 'none'); 
        // 🚀 THÊM DÒNG NÀY ĐỂ ĐÓNG BẢNG NOTE NẾU ĐANG MỞ DỞ
        setDisplay('inlineGrammarNoteArea', 'none');
        // Nếu đi vào từ Tìm kiếm hoặc mục Đã lưu -> Về trang chủ
        if (window.isSearchModeActive || window.isSavedGrammarDirectMode) {
            window.isSearchModeActive = false;
            window.isSavedGrammarDirectMode = false;
            returnToMain(); 
            return;
        }

        // Nếu đang Ôn lại câu sai -> Về trang chủ
        if (window.isGrammarReviewMode) { 
            window.isGrammarReviewMode = false;
            returnToMain();
            return;
        } 
        
        // Nếu đang Thực hành theo chủ đề -> Về trang chọn chủ đề
        if (isGrammarPracticeMode) { 
            setDisplay('grammarPracticeSetupScreen', 'flex'); 
            updateStatsDashboard();
            return;
        } 
        
        // Nếu đang Luyện thi -> Về trang chọn hình thức thi
        setDisplay('grammarComprehensiveSetupScreen', 'flex'); 
        renderExamHistory();
    }

    // Hàm vẽ Lịch sử Luyện thi
    function renderExamHistory() {
        let box = document.getElementById('examHistoryList');
        if(!box) return;
        if (!studentStats.examHistory || studentStats.examHistory.length === 0) {
            box.innerHTML = `<p style="color: var(--text-light); font-size: 13px; font-style: italic; margin: 0;">Chưa có dữ liệu thi.</p>`;
            return;
        }
        
        box.innerHTML = studentStats.examHistory.map((h, i) => {
            let d = new Date(h.date);
            let dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} - ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            let color = h.accuracy >= 80 ? 'var(--success)' : (h.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)');
            let colorText = h.accuracy >= 80 ? '#1b4332' : '#333';
            
            return `
            <div onclick="reviewPastExam(${i})" style="display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); padding: 10px 15px; border-radius: 12px; border-left: 4px solid ${color}; border-right: 1px solid var(--border-color); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); cursor: pointer; transition: 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';" title="Nhấn để xem chi tiết">
                <div>
                    <div style="font-weight: 900; font-size: 14px; color: var(--text-main);">Lần thi ${studentStats.examHistory.length - i}</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-light);">${dateStr}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 900; font-size: 18px; color: ${color};">${h.score}/${h.total}</div>
                    <div style="font-size: 12px; font-weight: 800; background: ${color}; color: ${colorText}; padding: 2px 8px; border-radius: 10px; display: inline-block;">Đúng ${h.accuracy}%</div>
                </div>
            </div>`;
        }).join('');
    }
    function startGrammarTimer() {
        clearInterval(grammarTimerInterval);
        const timeInput = parseInt(document.getElementById('grammarTimePerQ').value) || 0;
        const timerEl = document.getElementById('grammarTimerDisplay');
        
        if (timeInput <= 0) { timerEl.style.display = 'none'; return; }
        
        timerEl.style.display = 'block'; grammarTimeLeft = grammarQuestions.length * timeInput; 
        grammarTimerInterval = setInterval(() => {
            grammarTimeLeft--;
            let m = Math.floor(grammarTimeLeft / 60); let s = grammarTimeLeft % 60;
            timerEl.innerText = `⏱️ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            if (grammarTimeLeft <= 0) { clearInterval(grammarTimerInterval); showToast("⌛ Hết giờ làm bài!"); currentGrammarIndex = grammarQuestions.length; nextGrammarQuestion(); }
        }, 1000);
    }

    function showGrammarReviewDetail(index) {
        let item = grammarUserAnswers[index]; currentReviewingQuestion = item.originalData.question; 
        let qText = item.originalData.question.replace(/_+/g, '___');
        document.getElementById('grDetailQuestion').innerHTML = qText;
        
        let expBox = document.getElementById('grDetailExplanation');
        let formattedExplain = item.originalData.explain ? item.originalData.explain.replace(/\r?\n/g, '<br>') : "Không có giải thích chi tiết.";
        
        if (item.isRight) { expBox.className = 'grammar-explanation'; expBox.innerHTML = `✔️ <b>BẠN ĐÃ LÀM ĐÚNG!</b><br><br>${formattedExplain}`; } 
        else { expBox.className = 'grammar-explanation wrong'; expBox.innerHTML = `❌ <b>SAI RỒI!</b> Đáp án đúng là: <b>${item.correct}</b><br><br>${formattedExplain}`; }
        
        checkSaveButtonState(); 
        updateStatsDashboard();
        setDisplay('grammarReviewDetailModal', 'flex');
    }

    function checkSaveButtonState() {
        let btn = document.getElementById('grSaveBtn'); if (!studentStats.savedGrammar) studentStats.savedGrammar = [];
        if (studentStats.savedGrammar.includes(currentReviewingQuestion)) { btn.innerHTML = "❌ BỎ LƯU CÂU NÀY"; btn.style.backgroundColor = "var(--danger)"; btn.style.borderColor = "var(--danger)"; btn.style.color = "white"; } 
        else { btn.innerHTML = "⭐ LƯU CÂU HỎI NÀY"; btn.style.backgroundColor = "var(--card-bg)"; btn.style.borderColor = "var(--primary)"; btn.style.color = "var(--primary)"; }
    }

    function toggleSaveCurrentGrammar() {
        if(!currentReviewingQuestion) return; if (!studentStats.savedGrammar) studentStats.savedGrammar = [];
        let idx = studentStats.savedGrammar.indexOf(currentReviewingQuestion);
        if (idx > -1) { 
            studentStats.savedGrammar.splice(idx, 1); 
            showToast("🗑️ Đã bỏ lưu câu hỏi!"); 
            // Cập nhật lại số đếm ở Sidebar và Menu Đã lưu
            if (typeof updateStatsDashboard === 'function') updateStatsDashboard(); 
        } 
        else { studentStats.savedGrammar.push(currentReviewingQuestion); showToast("⭐ Đã lưu thành công!"); }
        saveStats(); checkSaveButtonState();
    }
// HÀM 1: Đẩy dữ liệu lên Lô cốt Supabase
    async function pushToCloud() {
        if(!studentID) return;
        
        let compactProgress = allData.filter(w => w.isStudied).map(w => [w.groupKey + "|||" + w.vocab + "|||" + w.type, w.srsLevel, w.nextReviewDate]); 
        let payload = LZString.compressToEncodedURIComponent(JSON.stringify({ s: studentStats, p: compactProgress }));
        
        let userName = localStorage.getItem('charnishere_user_name') || studentID;
        let learnedVocab = allData ? allData.filter(w => w.isStudied).length : 0;
        let correctGrammar = studentStats.grammarCorrectCount || 0;

        let highestMockScore = 0;
        let bestMockTestName = "";
        let bestMockList = 0;
        let bestMockRead = 0;
        let bestMockTime = 0;

        if (studentStats.mockTestHistory && studentStats.mockTestHistory.length > 0) {
            // NỚI LỎNG: Chỉ cần là thi thật (exam) và có điểm là đủ điều kiện lên dĩa!
            let validExams = studentStats.mockTestHistory.filter(h => h.mode === 'exam' && h.score > 0);
            if (validExams.length > 0) {
                // Sắp xếp: Ưu tiên Điểm cao nhất -> Điểm bằng nhau thì chọn bài có Thời gian ngắn nhất
                validExams.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return (a.timeTaken || 999999) - (b.timeTaken || 999999); 
                });
                highestMockScore = validExams[0].score;
                bestMockTestName = validExams[0].title || "ETS 2026 - Test 1";
                bestMockList = validExams[0].listScore || 0;
                bestMockRead = validExams[0].readScore || 0;
                bestMockTime = validExams[0].timeTaken || 0;
            }
        }
        try {
            // ĐẨY LÊN SUPABASE (Dùng lệnh upsert: Có rồi thì ghi đè, chưa có thì tạo mới)
            const { error } = await supabaseClient
                .from('legacy_progress')
                .upsert({
                    email: studentID,
                    full_name: userName,
                    score_c: studentStats.xp || 0,
                    score_d: learnedVocab,
                    score_e: correctGrammar,
                    mock_score: highestMockScore,
                    col_i: bestMockTestName, 
                    mock_list: bestMockList,  // 🎧 Bơm điểm Listening vào kho mới
                    mock_read: bestMockRead,  // 📖 Bơm điểm Reading vào kho mới
                    mock_time: bestMockTime,  // ⏱️ Bơm thời gian làm bài vào kho mới
                    total_time: studentStats.totalTime || 0,
                    save_data: payload,
                    last_active: new Date().toISOString()
                }, { onConflict: 'email' });

            if (error) throw error;
            console.log("☁️ Supabase: Đã lưu tiến độ an toàn kèm điểm phụ!");
        } catch (err) {
    console.error("Lỗi đẩy dữ liệu Supabase:", err);
    // Thay vì Alert chặn màn hình, ta dùng Toast bật lên 3 giây rồi tắt
    if (typeof showToast === 'function') {
        showToast("⚠️ Mạng đang yếu! Tiến độ đã được lưu tạm vào máy, sẽ đồng bộ sau.");
    }
}
    }

    // HÀM 2: Tải và So sánh dữ liệu từ Supabase
    async function pullFromCloud() {
        if(!studentID) return;
        
        try {
            // HÚT DỮ LIỆU TỪ SUPABASE
            const { data: cloudDataRow, error } = await supabaseClient
                .from('legacy_progress')
                .select('save_data')
                .eq('email', studentID)
                .single();

            // Bỏ qua nếu là user mới tinh chưa có dữ liệu (PGRST116 là mã lỗi không tìm thấy dòng nào)
            if (error && error.code !== 'PGRST116') throw error; 

            if (cloudDataRow && cloudDataRow.save_data) {
                // 1. Giải mã dữ liệu
                let decompressed = LZString.decompressFromEncodedURIComponent(cloudDataRow.save_data);
                let cloudData = JSON.parse(decompressed); 
                
                let cloudStats = cloudData.s || {};
                let localStats = studentStats || {};
                
                // 2. So sánh tổng thời gian học (Giữ nguyên logic tuyệt vời của sếp)
                let cloudTime = cloudStats.totalTime || 0;
                let localTime = localStats.totalTime || 0;

                if (cloudTime > localTime) {
                    // Cloud mới hơn -> Kéo về máy
                    studentStats = cloudStats; 
                    saveStats(); 
                    
                    if(cloudData.p && Array.isArray(cloudData.p)) { 
                        cloudData.p.forEach(item => { 
                            let parts = item[0].split("|||");
                            let gKey = parts[0]; let voc = parts[1]; let typ = parts[2] || ""; 
                            let match = allData.find(w => w.vocab === voc && w.type === typ) || allData.find(w => w.vocab === voc);
                            if(match) { match.isStudied = true; match.srsLevel = item[1]; match.nextReviewDate = item[2]; }
                        }); 
                        saveStudentData(); 
                        
                        // Lọc lại danh sách ôn tập cho chính xác sau khi kéo Cloud về
                        if (typeof prepareModeSelection === 'function') {
                             let reviewPool = allData.filter(w => w.isStudied && w.nextReviewDate <= Date.now());
                             window.tempDueVocab = reviewPool.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
                        }
                    }
                    updateStatsDashboard();
                    console.log("☁️ Supabase: Kéo thành công tiến độ cũ!");
                    
                } else if (localTime > cloudTime) {
                    // Máy mới hơn -> Đẩy lên
                    pushToCloud();
                }
            } else {
                // User chưa có save_data -> Tạo bản lưu đầu tiên
                pushToCloud();
            }
        } catch(e) { 
            console.error("Supabase: Lỗi đồng bộ ngầm: ", e); 
        }
    }
 

   // ==========================================
    // HỆ THỐNG CÀI ĐẶT & THANH ĐIỀU HƯỚNG
    // ==========================================
    
    function openSettingsModal() {
        closeMobileMenu(); // Đóng sidebar nếu đang xem trên mobile
        document.getElementById('settingUserId').innerText = studentID;
        
        // Render ngày tạo
        if (studentStats.creationDate) {
            let d = new Date(studentStats.creationDate);
            document.getElementById('settingCreateDate').innerText = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        }
        
        // Đồng bộ nút Radio với trạng thái hiện tại
        let currentMode = localStorage.getItem('charnishere_nav_mode');
        if (!currentMode) currentMode = window.innerWidth > 800 ? 'pinned' : 'hidden'; // Mặc định: PC cố định, Mobile ẩn
        
        let radios = document.getElementsByName('navMode');
        radios.forEach(r => { if(r.value === currentMode) r.checked = true; });

        document.getElementById('settingsModal').style.display = 'flex';
    }

    function closeSettingsModal() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    function changeNavMode(mode) {
        localStorage.setItem('charnishere_nav_mode', mode);
        applyNavMode();
        showToast("✅ Đã cập nhật giao diện!");
    }

   // Hàm gốc: Áp dụng CSS Class lên thẻ Body để điều khiển toàn bộ Web
    function applyNavMode() {
        let mode = localStorage.getItem('charnishere_nav_mode');

        // Lần đầu vào App: Mặc định trên PC là Cố định, trên Mobile là Ẩn
        if (!mode) {
            mode = window.innerWidth > 800 ? 'pinned' : 'hidden';
            localStorage.setItem('charnishere_nav_mode', mode);
        }

        let body = document.body;
        let sidebar = document.getElementById('quickSidebar');

        if (mode === 'hidden') {
            body.classList.add('nav-hidden-pc');
            body.classList.remove('nav-pinned-mobile');
            
            // Xóa bỏ lệnh ép buộc của JS để trả quyền điều khiển cho nút Bật/Tắt
            if (sidebar) {
                sidebar.classList.remove('open-temp');
                sidebar.style.transform = ''; 
            }
            
            let toggleBtn = document.getElementById('pcNavToggle');
            if (toggleBtn) {
                toggleBtn.innerText = '❯';
                toggleBtn.style.left = '0';
            }
        } else { // 'pinned'
            body.classList.remove('nav-hidden-pc');
            body.classList.add('nav-pinned-mobile');
            
            if (sidebar) {
                // ÉP BUỘC THANH MENU NỔI LÊN BẰNG JS TRÊN ĐIỆN THOẠI (Chống lỗi trình duyệt)
                if (window.innerWidth <= 800) {
                    sidebar.style.transform = 'translateY(0)';
                } else {
                    sidebar.style.transform = '';
                }
            }
        }
    }

    // Nút trượt dành cho Máy tính (Khi cài đặt chế độ Ẩn)
    function togglePcNavTemp(e) {
        e.stopPropagation();
        let sidebar = document.getElementById('quickSidebar');
        let btn = document.getElementById('pcNavToggle');
        
        if (sidebar.classList.contains('open-temp')) {
            sidebar.classList.remove('open-temp');
            btn.innerText = '❯';
            btn.style.left = '0';
        } else {
            sidebar.classList.add('open-temp');
            btn.innerText = '❮';
            btn.style.left = '80px';
        }
    }

    // Tự động đóng thanh menu PC (Nếu đang mở tạm) khi click ra ngoài màn hình
    document.addEventListener('click', function(e) {
        if (window.innerWidth > 800 && localStorage.getItem('charnishere_nav_mode') === 'hidden') {
            let sidebar = document.getElementById('quickSidebar');
            let pcBtn = document.getElementById('pcNavToggle');
            if (sidebar.classList.contains('open-temp') && !sidebar.contains(e.target) && !pcBtn.contains(e.target)) {
                sidebar.classList.remove('open-temp');
                pcBtn.innerText = '❯';
                pcBtn.style.left = '0';
            }
        }
    });

    // Chạy áp dụng Layout ngay khi tải xong web (Gắn vào cuối hàm checkAutoLogin và login)
    window.addEventListener('DOMContentLoaded', () => { applyNavMode(); });
    // ==========================================
    // TÍNH NĂNG GHI CHÚ NGỮ PHÁP (USER NOTES)
    // ==========================================
    function openGrammarNoteModal() {
        let d = grammarQuestions[currentGrammarIndex];
        let noteInput = document.getElementById('inlineGrammarNoteInput');
        let noteArea = document.getElementById('inlineGrammarNoteArea');

        // 1. Tính năng Tắt/Bật (Đã cập nhật để nhận diện flex)
        if (noteArea.style.display === 'flex' || noteArea.style.display === 'block') {
            noteArea.style.display = 'none';
            return;
        }

        // 2. Load lại note cũ
        if (studentStats.userNotes && studentStats.userNotes[d.question]) {
            noteInput.value = studentStats.userNotes[d.question];
        } else {
            noteInput.value = "";
        }

        // 3. Giải cứu bảng Note ra thẳng ngoài Body
        if (noteArea.parentNode !== document.body) {
            document.body.appendChild(noteArea);
        }

        // 4. Ép hiển thị
        noteArea.style.opacity = '1';
        noteArea.style.visibility = 'visible';
        
        // 🚀 LỆNH QUAN TRỌNG: Đổi thành 'flex' để kết hợp với CSS giúp ô chữ giãn nở
        noteArea.style.display = 'flex'; 

        // 5. Thuật toán đưa ra giữa màn hình
        let screenW = window.innerWidth;
        let screenH = window.innerHeight;
        let noteW = noteArea.offsetWidth || 350;
        let noteH = noteArea.offsetHeight || 250;

        noteArea.style.transform = 'none';
        noteArea.style.left = (screenW / 2 - noteW / 2) + 'px';
        noteArea.style.top = (screenH / 2 - noteH / 2) + 'px';

        noteInput.focus();

        // 6. Kích hoạt mô tơ Kéo thả
        if (!noteArea.dataset.draggable) {
            makeElementDraggable(noteArea);
            noteArea.dataset.draggable = "true";
        }
    }

    function saveGrammarNote() {
        let d = grammarQuestions[currentGrammarIndex];
        let noteVal = document.getElementById('inlineGrammarNoteInput').value.trim();
        
        if (!studentStats.userNotes) studentStats.userNotes = {};
        
        if (noteVal === "") {
            delete studentStats.userNotes[d.question];
            showToast("🗑️ Đã xóa ghi chú!");
        } else {
            studentStats.userNotes[d.question] = noteVal;
            showToast("💾 Đã lưu ghi chú thành công!");
        }
        
        saveStats(); 
        document.getElementById('inlineGrammarNoteArea').style.display = 'none'; 
        
        // THUẬT TOÁN MỚI: Chỉ đổi màu nút Note, tuyệt đối không reset lại câu hỏi
        let noteBtn = document.getElementById('grammarNoteBtn');
        if (noteBtn) {
            if (noteVal !== "") {
                noteBtn.style.background = 'var(--warning)';
                noteBtn.style.color = '#fff';
                noteBtn.style.borderColor = 'var(--warning)';
                noteBtn.innerText = "📝 Xem Note";
            } else {
                noteBtn.style.background = 'var(--card-bg)';
                noteBtn.style.color = 'var(--text-main)';
                noteBtn.style.borderColor = 'var(--border-color)';
                noteBtn.innerText = "📝 Note";
            }
        }
    }

// ==========================================
    // HÀM BÁC SĨ CODE: KÉO THẢ (DRAG & DROP) TƯƠNG THÍCH HOÀN HẢO VỚI RESIZE
    // ==========================================
    function makeElementDraggable(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        elmnt.onmousedown = dragMouseDown;
        elmnt.ontouchstart = dragTouchStart; // Hỗ trợ cảm ứng Mobile

        function dragMouseDown(e) {
            // 1. Chặn kéo nếu bấm vào ô gõ chữ hoặc nút bấm
            if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;

            // 2. 🚀 THUẬT TOÁN BẢO VỆ GÓC RESIZE: 
            // Tính toán tạo ra một vùng cấm 30x30 pixel ở góc dưới cùng bên phải.
            let rect = elmnt.getBoundingClientRect();
            let isResizeZone = (e.clientX >= rect.right - 30) && (e.clientY >= rect.bottom - 30);
            
            // Nếu bấm trúng góc này -> Tắt mô tơ kéo thả, nhường quyền cho CSS Phóng to/Thu nhỏ!
            if (isResizeZone) return; 

            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null;
        }

        function dragTouchStart(e) {
            if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;

            // Bảo vệ góc Resize trên thiết bị di động cảm ứng
            let rect = elmnt.getBoundingClientRect();
            let touch = e.touches[0];
            let isResizeZone = (touch.clientX >= rect.right - 30) && (touch.clientY >= rect.bottom - 30);
            if (isResizeZone) return;

            pos3 = touch.clientX; pos4 = touch.clientY;
            document.ontouchend = closeDragElementTouch;
            document.ontouchmove = elementDragTouch;
        }

        function elementDragTouch(e) {
            pos1 = pos3 - e.touches[0].clientX; pos2 = pos4 - e.touches[0].clientY;
            pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY;
            
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElementTouch() {
            document.ontouchend = null; document.ontouchmove = null;
        }
    }
// ==========================================
    // 🚀 TÍNH NĂNG NHẢY CÓC TỪ GHI CHÚ ĐẾN CÂU HỎI GỐC (GRAMMAR & MOCK TEST)
    // ==========================================
    function jumpToNoteTarget(noteKey) {
        
        // ====================================================
        // 🌌 VŨ TRỤ 1: XỬ LÝ NHẢY CÓC CHO MOCK TEST (LUYỆN THI)
        // ====================================================
        if (noteKey.startsWith("MOCK_")) {
            let parts = noteKey.split('_');
            let qNo = parseInt(parts.pop()); 
            let dataLink = parts.slice(1).join('_'); 

            let noteModal = document.getElementById('myNotesHubModal'); 
            if (noteModal) noteModal.style.display = 'none';
            let savedMenu = document.getElementById('savedDropdown'); 
            if (savedMenu) savedMenu.classList.remove('show');
            let dashboard = document.getElementById('dashboardArea');
            if (dashboard) dashboard.style.display = 'none';

            showToast(`⏳ Đang dịch chuyển đến Đề thi - Câu ${qNo}...`);

            // 🚀 LỆNH CỨU MẠNG: Bơm đầy đủ nhiên liệu vào Biến Toàn Cục trước khi chạy động cơ
            currentMockDataLink = dataLink;
            currentSetupMode = 'practice';
            currentSelectionMode = 'full';
            mockSelectedParts = [1, 2, 3, 4, 5, 6, 7];

            // Đổi tên tiêu đề hiển thị
            let testName = "Xem lại Ghi chú";
            if (typeof mockIndexData !== 'undefined') {
                let testObj = mockIndexData.find(item => item.dataLink === dataLink);
                if (testObj) testName = `${testObj.group} - ${testObj.title}`;
            }
            let setupTitleEl = document.getElementById('setupTestNameTitle');
            if(setupTitleEl) setupTitleEl.innerText = testName;

            // Gọi hàm vào phòng thi (Truyền null vì không cần sự kiện click chuột)
            if (typeof enterRealMockTestRoom === 'function') {
                enterRealMockTestRoom(null).then(() => {
                    
                    // Đợi 0.8 giây cho Supabase tải xong 200 câu
                    setTimeout(() => {
                        // 🚀 THUẬT TOÁN TÌM TRANG CHỨA CÂU HỎI (Do Mock Test bị chia làm nhiều trang)
                        if (typeof examPages !== 'undefined') {
                            let targetIdx = examPages.findIndex(p => p.questions && p.questions.some(q => q.qNo === qNo));
                            if (targetIdx > -1) {
                                currentExamPageIndex = targetIdx; // Chuyển đến trang đó
                                if (typeof renderExamPage === 'function') renderExamPage();
                            }
                        }
                        
                        // Đồng bộ lại Bảng lưới Navigator
                        if (typeof updateExamProgress === 'function') updateExamProgress();

                        // Mở bung bảng Note đó ra giữa màn hình
                        if (typeof openMockNoteModal === 'function') {
                            setTimeout(() => { openMockNoteModal(qNo); }, 300);
                        }
                    }, 800); 

                }).catch(e => {
                    console.error(e);
                    showToast("❌ Lỗi: Không thể tải dữ liệu đề thi từ Supabase!");
                });
            }
            return; 
        }

        // ====================================================
        // 🌌 VŨ TRỤ 2: XỬ LÝ NHẢY CÓC CHO NGỮ PHÁP (GIỮ NGUYÊN)
        // ====================================================
        let targetQ = grammarData.find(q => q.question === noteKey);
        
        if (!targetQ) {
            return showToast("❌ Không tìm thấy dữ liệu gốc của câu hỏi này!");
        }

        let noteModal = document.getElementById('myNotesHubModal'); 
        if (noteModal) noteModal.style.display = 'none';
        
        let savedMenu = document.getElementById('savedDropdown'); 
        if (savedMenu) savedMenu.classList.remove('show');

        let dashboard = document.getElementById('dashboardArea');
        if (dashboard) dashboard.style.display = 'none';

        grammarQuestions = [targetQ]; 
        currentGrammarIndex = 0;
        currentGrammarTestMode = 'practice';
        isGrammarPracticeMode = true;
        
        window.isSavedGrammarDirectMode = true; 
        grammarScore = 0;
        grammarUserAnswers = [];
        window.grammarPracticeState = {};
        
        let titleEl = document.getElementById('grammarQuizTitle');
        if(titleEl) titleEl.innerText = "📝 XEM LẠI CÂU HỎI GỐC";
        
        let quizScreen = document.getElementById('grammarQuizScreen');
        if(quizScreen) {
            quizScreen.style.display = 'flex';
            renderGrammarQuestion();
        }
    }
