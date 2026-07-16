    // =========================================================
    // JAVASCRIPT: QUẢN LÝ MOCK TEST (GIAO DIỆN & LÕI THUẬT TOÁN) 
    // =========================================================
    

    let mockIndexData = []; 
    let currentMockGroup = ""; 
    let currentMockDataLink = ""; 

    let currentMockQuestions = [];
    let examPages = []; 
    let currentExamPageIndex = 0;
    
    window.examUserAnswers = {}; 
    window.examMarkedQuestions = {};
    let realMockInterval = null;
    let realMockTimeLeft = 7200;

    // --- 1. MỞ MÀN HÌNH DANH SÁCH ĐỀ (HUB) ---
    async function openMockTestHub() {
        setDisplay('dashboardArea', 'none');
        setDisplay('mockTestHubScreen', 'flex');
        await loadMockTestIndex(); 
        renderMockTestUI(); 
    }

    function closeMockTestHub() {
        setDisplay('mockTestHubScreen', 'none');
        setDisplay('dashboardArea', 'block');
    }
    function returnToMockSetup() {
        setDisplay('mockResultScreen', 'none');
        setDisplay('realMockTestRoom', 'none'); 
        
        // Hiện lại Hub nền và Modal chọn chế độ
        setDisplay('mockTestHubScreen', 'flex');
        setDisplay('mockTestSetupModal', 'flex');
        // THÊM DÒNG NÀY: Ép Modal phải vẽ lại để ẩn nút "Làm tiếp" đi
        renderMockSetupOptions();
        
        // Tắt triệt để âm thanh nếu có
        let audioPlayer = document.getElementById('globalMockAudioPlayer');
        if(audioPlayer) audioPlayer.pause();
    }
    // --- ĐỘNG CƠ MỚI: TẢI DANH SÁCH ĐỀ TRỰC TIẾP TỪ DATABASE SUPABASE ---
    async function loadMockTestIndex() {
        if (mockIndexData.length > 0) return; 
        try {
            document.getElementById('mockTestGridContainer').innerHTML = '<div class="spinner"></div><p style="color: var(--text-main); font-weight: 800;">Đang tải danh sách đề thi...</p>';
            
            // 🚀 GỌI DATA TỪ BẢNG 'mocktest_index' VỪA TẠO
            const { data: tests, error } = await supabaseClient
                .from('mocktest_index')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            
            mockIndexData = [];
            
            if (tests && tests.length > 0) {
                tests.forEach(row => {
                    // Bỏ qua dòng trống
                    if (!row.BookName && !row.Title) return;

                    // Ánh xạ dữ liệu từ Database vào hệ thống của App
                    mockIndexData.push({
                        id: row.TestID || row.id, // ID duy nhất
                        group: row.BookName || "Khác", 
                        title: row.Title,
                        qs: parseInt(row.Questions) || 200,
                        time: parseInt(row.Time) || 120,
                        // Xử lý an toàn vì CSV import có thể là chữ 'TRUE' hoặc boolean true
                        isPro: row.IsPro === true || String(row.IsPro).trim().toUpperCase() === 'TRUE',
                        dataLink: (row.Data_URL || "").trim()
                    });
                });
            }

        } catch (e) {
            console.error("Lỗi tải Index từ Database:", e);
            document.getElementById('mockTestGridContainer').innerHTML = '<p style="color:var(--danger)">Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại!</p>';
        }
    }
    function renderMockTestUI() {
        let grid = document.getElementById('mockTestGridContainer');
        if (!mockIndexData || mockIndexData.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-light); font-weight: 800;">Chưa có dữ liệu đề thi.</p>';
            return;
        }

        // Lấy từ khóa tìm kiếm hiện tại (nếu có)
        let input = document.getElementById('searchMockInput') ? document.getElementById('searchMockInput').value.toLowerCase() : '';
        let groups = [...new Set(mockIndexData.map(item => item.group))];
        let filteredGroups = input ? groups.filter(g => g.toLowerCase().includes(input)) : groups;

        // Nếu không có nhóm nào đang được chọn, hoặc nhóm đang chọn bị loại bỏ bởi bộ lọc, thì lấy nhóm đầu tiên
        if (!currentMockGroup || (filteredGroups.length > 0 && !filteredGroups.includes(currentMockGroup))) {
             currentMockGroup = filteredGroups.length > 0 ? filteredGroups[0] : null;
        }

        let tabsContainer = document.getElementById('mockTestTabsContainer');
        if (tabsContainer) {
            if (filteredGroups.length === 0) {
                 tabsContainer.innerHTML = '';
            } else {
                tabsContainer.innerHTML = filteredGroups.map(g => {
                    let count = mockIndexData.filter(i => i.group === g).length;
                    let isActive = (g === currentMockGroup) ? 'active' : '';
                    return `<button class="mock-nav-tab ${isActive}" onclick="changeMockGroup('${g}')">${g} (${count})</button>`;
                }).join('');
            }
        }
        
        if(currentMockGroup){
            renderFilteredMockTestGrid();
        } else {
             if (grid) grid.innerHTML = '<p style="color: var(--text-light); font-weight: 800;">Không tìm thấy bộ đề phù hợp.</p>';
        }
    }
// --- HÀM TÌM KIẾM BỘ ĐỀ (CẬP NHẬT) ---
    function filterMockTests() {
        let input = document.getElementById('searchMockInput').value.toLowerCase();
        
        // Tạo một mảng mới chỉ chứa các nhóm (bộ đề) khớp với từ khóa tìm kiếm
        let allGroups = [...new Set(mockIndexData.map(item => item.group))];
        let filteredGroups = allGroups.filter(g => g.toLowerCase().includes(input));
        
        let tabsContainer = document.getElementById('mockTestTabsContainer');
        let grid = document.getElementById('mockTestGridContainer');

        if (filteredGroups.length === 0) {
            if (tabsContainer) tabsContainer.innerHTML = '';
            if (grid) grid.innerHTML = '<p style="color: var(--text-light); font-weight: 800;">Không tìm thấy bộ đề phù hợp.</p>';
            return;
        }

        // Vẽ lại thanh Tabs chỉ với các bộ đề tìm được
        if (tabsContainer) {
            tabsContainer.innerHTML = filteredGroups.map(g => {
                let count = mockIndexData.filter(i => i.group === g).length;
                // Ưu tiên chọn nhóm đầu tiên trong danh sách tìm kiếm làm nhóm active
                let isActive = (g === filteredGroups[0]) ? 'active' : '';
                return `<button class="mock-nav-tab ${isActive}" onclick="changeMockGroup('${g}')">${g} (${count})</button>`;
            }).join('');
        }

        // Đặt nhóm hiển thị hiện tại thành nhóm đầu tiên trong kết quả tìm kiếm
        currentMockGroup = filteredGroups[0];
        
        // Gọi lại hàm render để vẽ các Test thuộc nhóm đó
        renderFilteredMockTestGrid(); 
    }

    // Hàm phụ trợ để vẽ lưới grid sau khi đã lọc (Tách ra từ renderMockTestUI để tái sử dụng)
    function renderFilteredMockTestGrid() {
         let grid = document.getElementById('mockTestGridContainer');
         if (!grid) return;

         let filteredTests = mockIndexData.filter(item => item.group === currentMockGroup);
         
         grid.innerHTML = filteredTests.map(t => {
            // --- THUẬT TOÁN QUÉT LỊCH SỬ LÀM BÀI ---
            let status = 'Chưa làm'; 
            let doneClass = '';
            let scoreHtml = '';

            // Kiểm tra xem đã từng nộp bài này chưa
            if (studentStats.mockTestHistory) {
                // Chỉ công nhận "Đã hoàn thành" nếu làm chế độ Full Test (đủ 7 part)
                let fullTests = studentStats.mockTestHistory.filter(h => h.title === t.title && h.selectedParts && h.selectedParts.length === 7);
                
                if (fullTests.length > 0) {
                    doneClass = 'done'; // Kích hoạt đổi viền và nền sang Xanh lá
                    status = '<span style="color: var(--success);">✔️ Đã hoàn thành</span>';
                    
                    // Ưu tiên hiện điểm thi thật cao nhất
                    let highestExam = fullTests.filter(h => h.mode === 'exam').sort((a, b) => b.score - a.score)[0];
                    if (highestExam) {
                        scoreHtml = `<div style="color: #F57F17; font-weight: 900; font-size: 15px; margin-top: 5px;">🏆 ${highestExam.score}/990</div>`;
                    } else {
                        // Nếu chưa thi thật, hiện số câu đúng của chế độ Luyện tập
                        let highestPrac = fullTests.sort((a, b) => b.totalCorrect - a.totalCorrect)[0];
                        scoreHtml = `<div style="color: #0ea5e9; font-weight: 900; font-size: 14px; margin-top: 5px;">🎯 Đúng ${highestPrac.totalCorrect}/${highestPrac.totalQs}</div>`;
                    }
                }
            }
            // ----------------------------------------

            return `
            <div class="mock-card ${doneClass}" style="padding: 15px; display: flex; flex-direction: column; justify-content: space-between;">
                ${t.isPro ? '<div class="mock-pro-badge" style="font-size: 10px; padding: 2px 6px;">👑 PRO</div>' : ''}
                <div>
                    <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 900; color: var(--text-main); line-height: 1.2;">${t.title}</h3>
                    <div style="font-size: 11px; font-weight: 800; color: var(--text-light); display: flex; gap: 10px; margin-bottom: 6px;">
                        <span>📝 ${t.qs} câu</span> <span>⏱️ ${t.time} phút</span>
                    </div>
                    <div style="color: var(--text-light); font-weight: 800; font-size: 11px;">
                        ${status}
                        ${scoreHtml ? scoreHtml.replace('font-size: 15px', 'font-size: 13px').replace('font-size: 14px', 'font-size: 12px').replace('margin-top: 5px', 'margin-top: 3px') : ''}
                    </div>
                </div>
                <!-- ĐÃ ĐIỀU CHỈNH GIAO DIỆN NÚT Ở ĐÂY -->
                <div class="mock-card-actions" style="margin-top: 10px; display: flex; gap: 4px; flex-wrap: wrap;">
                    <button class="mock-btn-outline test" style="flex: 1; padding: 6px 4px; font-size: 12px; height: 32px; white-space: nowrap; min-width: 0;" onclick="${t.isPro && studentID !== 'CHARLIE' && window.studentRole !== 'PRO' ? "showToast('🔒 Đề thi này cần nâng cấp PRO!')" : `openMockSetupModal(event, '${t.group} - ${t.title}', 'exam', '${t.dataLink}')`}"><span style="font-size:12px;">▷</span> Luyện thi</button>
                    <button class="mock-btn-outline prac" style="flex: 1; padding: 6px 4px; font-size: 12px; height: 32px; white-space: nowrap; min-width: 0;" onclick="${t.isPro && studentID !== 'CHARLIE' && window.studentRole !== 'PRO' ? "showToast('🔒 Đề thi này cần nâng cấp PRO!')" : `openMockSetupModal(event, '${t.group} - ${t.title}', 'practice', '${t.dataLink}')`}"><span style="font-size:12px;">📖</span> Luyện tập</button>
                </div>
            </div>
            `;
        }).join('');
    }
    function changeMockGroup(groupName) { currentMockGroup = groupName; renderMockTestUI(); }

    // --- 2. MODAL CHỌN CHẾ ĐỘ THI (V26 UPDATE) ---
    let currentSetupMode = 'exam'; 
    let currentSelectionMode = 'full'; 
    let mockSelectedParts = []; 
    let isCustomTimeEnabled = false;
    let customTimeValue = 120; 

    const timePerPart = { 1: 5, 2: 10, 3: 20, 4: 15, 5: 10, 6: 10, 7: 55 };
    const questionsPerPart = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 }; // Đảm bảo không thiếu dòng này
    
    // 🚀 BỘ BIẾN MỚI CHO THUẬT TOÁN QUÉT ĐỀ ĐỘNG
    let currentAvailableParts = [];
    let currentAvailableQuestionsPerPart = {};
    let isFetchingSetup = false;

    async function openMockSetupModal(e, title, mode, dataLink) {
        if (e) e.stopPropagation(); 
        document.getElementById('setupTestNameTitle').innerText = title; 
        currentMockDataLink = dataLink;
        setDisplay('mockTestSetupModal', 'flex');
        
        // Hiện UI Đang quét để học viên không bấm lung tung
        document.getElementById('setupOptionsArea').innerHTML = '<div style="padding: 40px; text-align: center;"><div class="spinner"></div><p style="color: var(--text-light); font-weight: 800; margin-top: 15px;">Đang phân tích cấu trúc đề thi...</p></div>';
        
        isFetchingSetup = true;

        try {
            // Kéo file CSV về để soi xem có những Part nào
            const { data: mockBlob, error } = await supabaseClient.storage.from('app_data').download(dataLink);
            if (error) throw error;
            const csvText = await mockBlob.text();
            const rows = parseCSVData(csvText);

            currentAvailableParts = [];
            currentAvailableQuestionsPerPart = {};

            // Quét dọc cột đầu tiên (Cột Part)
            for(let i = 1; i < rows.length; i++) {
                if(!rows[i][1]) continue;
                let p = parseInt(rows[i][0]);
                if (!isNaN(p)) {
                    if (!currentAvailableParts.includes(p)) currentAvailableParts.push(p);
                    currentAvailableQuestionsPerPart[p] = (currentAvailableQuestionsPerPart[p] || 0) + 1;
                }
            }
            currentAvailableParts.sort((a,b) => a-b);

            // Mặc định chọn tất cả các Part đang có thực tế
            mockSelectedParts = [...currentAvailableParts];
            isCustomTimeEnabled = false;

            // 🚀 BỘ LỌC ĐẦU NÃO: Kiểm tra xem đề có đủ 7 Part không
            let hasFull7Parts = (currentAvailableParts.length === 7);

            // Nếu đề KHÔNG đủ 7 Part mà người dùng lại bấm nút "Luyện thi" ở ngoài
            // -> ÉP CHUYỂN SANG CHẾ ĐỘ LUYỆN TẬP
            if (!hasFull7Parts && mode === 'exam') {
                mode = 'practice';
                showToast("⚠️ Đề thi này không đủ 7 Part, hệ thống tự chuyển sang chế độ Luyện Tập.");
            }

            // Nếu đề có đủ 7 part -> Mặc định UI là Full Test. Nếu thiếu -> Mặc định UI là Thi theo Part.
            if (hasFull7Parts) currentSelectionMode = 'full';
            else currentSelectionMode = 'part';

            isFetchingSetup = false;
            switchSetupMode(mode);

        } catch (err) {
            console.error("Lỗi soi đề:", err);
            document.getElementById('setupOptionsArea').innerHTML = '<div style="text-align:center; color:var(--danger); font-weight:800; padding:20px;">Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối!</div>';
            isFetchingSetup = false;
        }
    }

    function switchSetupMode(mode) {
        let hasFull7Parts = (currentAvailableParts.length === 7);

        // 🚀 CHỐT CHẶN BÊN TRONG: Nếu người dùng bấm tab Luyện Thi mà đề không đủ 7 Part -> Báo lỗi và dừng lại
        if (mode === 'exam' && !hasFull7Parts) {
            showToast("⚠️ Tính năng Luyện Thi chỉ dành cho đề có đủ 7 Part!");
            return; // Dừng hàm, không cho chuyển sang tab Luyện thi
        }

        currentSetupMode = mode;
        let btnThi = document.getElementById('tabLuyenThiBtn');
        let btnTap = document.getElementById('tabLuyenTapBtn');
        let btnTienDo = document.getElementById('tabTienDoBtn');
        
        // Reset tất cả các nút
        btnThi.className = 'setup-mode-btn';
        btnTap.className = 'setup-mode-btn';
        btnTienDo.className = 'setup-mode-btn';

        // Bật nút được chọn
        if (mode === 'exam') {
            btnThi.classList.add('active');
            currentSelectionMode = 'full'; // Mặc định mở Full Test
        } else if (mode === 'practice') {
            btnTap.classList.add('active');
            // Nếu có đủ 7 Part thì giữ nguyên lựa chọn trước đó (Full/Part), nếu không thì ép về 'part'
            currentSelectionMode = hasFull7Parts ? currentSelectionMode : 'part'; 
        } else if (mode === 'progress') {
            btnTienDo.classList.add('active');
        }
        
        renderMockSetupOptions();
    }

    function toggleSelectionCard(type) {
        // Nếu chọn Full Test mà đề không đủ 7 Part thì cấm luôn
        if (type === 'full' && currentAvailableParts.length !== 7) return;

        currentSelectionMode = type;
        if (type === 'full') {
            mockSelectedParts = [...currentAvailableParts];
        }
        renderMockSetupOptions();
    }

    function toggleMockPart(partNum, e) {
        if(e) e.stopPropagation();
        let idx = mockSelectedParts.indexOf(partNum);
        if (idx > -1) mockSelectedParts.splice(idx, 1); 
        else mockSelectedParts.push(partNum); 
        
        mockSelectedParts.sort();
        if (mockSelectedParts.length === 0) {
            showToast("Vui lòng chọn ít nhất 1 Part!");
            mockSelectedParts = [partNum]; 
        }
        renderMockSetupOptions();
    }

    function selectAllMockParts(e) {
        if(e) e.stopPropagation();
        if (mockSelectedParts.length === currentAvailableParts.length) {
            // Đang chọn full -> Bỏ hết, chỉ giữ lại Part đầu tiên có trong đề
            mockSelectedParts = [currentAvailableParts[0]];
        } else {
            // Bấm phát chọn tất cả các Part hiện có
            mockSelectedParts = [...currentAvailableParts];
        }
        renderMockSetupOptions();
    }

    function toggleCustomTime(e) {
        isCustomTimeEnabled = e.target.checked;
        let timeInput = document.getElementById('customTimeInputField');
        if (isCustomTimeEnabled) {
            timeInput.disabled = false;
            timeInput.focus();
        } else {
            timeInput.disabled = true;
        }
    }

    function updateCustomTimeValue(e) {
        let val = parseInt(e.target.value);
        if (val > 0) customTimeValue = val;
    }

    function renderMockSetupOptions() {
        if (isFetchingSetup) return; // Đang tải thì không vẽ gì cả
        
        let modal = document.getElementById('mockTestSetupModal');
        let currentScroll = modal.scrollTop; 
        let area = document.getElementById('setupOptionsArea');
        
        // ======= XỬ LÝ GIAO DIỆN TAB TIẾN ĐỘ =======
        if (currentSetupMode === 'progress') {
            if (!studentStats.mockTestHistory) studentStats.mockTestHistory = [];
            let currentTestTitle = document.getElementById('setupTestNameTitle').innerText;
            // Lọc các lần làm của Đề hiện tại
            let historyList = studentStats.mockTestHistory.filter(h => h.title === currentTestTitle);

            if (historyList.length === 0) {
                area.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: var(--text-light); font-weight: 700; font-style: italic; background: white; border-radius: 15px; border: 1px dashed var(--border-color);">Bạn chưa làm đề này lần nào. Hãy bắt đầu Luyện tập hoặc Luyện thi nhé!</div>`;
                return;
            }

            let histHTML = historyList.map((h, i) => {
                let d = new Date(h.date);
                let dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} - ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                let modeText = h.mode === 'exam' ? '📝 Luyện thi' : '🎯 Luyện tập';
                let modeColor = h.mode === 'exam' ? 'var(--primary)' : 'var(--info)';
                
                return `
                <div class="mock-setup-card" style="padding: 15px;" onclick="reviewPastMockTest('${h.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e5e7eb; padding-bottom: 10px; margin-bottom: 10px;">
                        <div style="font-weight: 900; font-size: 14px; color: var(--text-main);">${dateStr}</div>
                        <div style="font-size: 11px; font-weight: 900; color: ${modeColor}; background: rgba(0,0,0,0.05); padding: 3px 10px; border-radius: 12px;">${modeText}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-light); font-weight: 800;">Listening: ${h.lCorrect} | Reading: ${h.rCorrect}</div>
                            <div style="font-size: 13px; font-weight: 900; color: var(--text-main); margin-top: 5px;">Đúng: <span style="color: var(--success);">${h.totalCorrect}/${h.totalQs}</span> (${h.accuracy}%)</div>
                        </div>
                        <div style="text-align: right;">
                            ${h.mode === 'exam' ? `<div style="font-size: 24px; font-weight: 900; color: var(--primary); line-height: 1;">${h.score}</div><div style="font-size: 11px; color: var(--text-light); font-weight: 800;">điểm</div>` : `<div style="font-size: 14px; font-weight: 900; color: var(--text-main);">👁️ Xem lại</div>`}
                        </div>
                    </div>
                </div>`;
            }).join('');
            area.innerHTML = `<div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">${histHTML}</div>`;
            return;
        }

        let isExam = (currentSetupMode === 'exam'); 
        let hasFull7Parts = (currentAvailableParts.length === 7);

        // Chặn lỗi: Nếu đang ở tab Luyện thi mà đề không đủ 7 part -> Ép xuống Luyện theo Part
        if (isExam && !hasFull7Parts && currentSelectionMode === 'full') {
            currentSelectionMode = 'part';
        }
        
        // Tính toán số liệu tổng DỰA TRÊN DỮ LIỆU ĐÃ QUÉT ĐƯỢC
        let totalQs = 0;
        mockSelectedParts.forEach(p => totalQs += (currentAvailableQuestionsPerPart[p] || 0));
        let isAllSelected = (mockSelectedParts.length === currentAvailableParts.length);
        
        // Tính thời gian đề xuất
        let suggestedTime = 0;
        mockSelectedParts.forEach(p => suggestedTime += (timePerPart[p] || 0));
        let timeToDisplay = isCustomTimeEnabled ? customTimeValue : suggestedTime;

        // 🚀 CHỈ SINH HTML CHO NHỮNG PART THỰC TẾ ĐANG TỒN TẠI
        let listeningPartsHTML = "";
        let readingPartsHTML = "";

        currentAvailableParts.forEach(p => {
            let isSel = mockSelectedParts.includes(p);
            let partHtml = `
            <div class="part-select-row ${isSel ? 'selected' : ''}" onclick="toggleMockPart(${p}, event)">
                <div style="display: flex; align-items: center;">
                    <div class="mock-custom-checkbox"></div> 
                    <span style="font-weight: 800; color: ${isSel ? '#0f172a' : '#4b5563'}">Part ${p}</span>
                </div>
                <span style="font-size: 12px; color: #94a3b8; font-weight: 700;">${currentAvailableQuestionsPerPart[p]} câu</span>
            </div>`;
            
            if (p <= 4) listeningPartsHTML += partHtml;
            else readingPartsHTML += partHtml;
        });

        // Nút Bắt đầu / Làm tiếp
        let startBtnHTML = '';
        let savedProg = (studentStats.savedMockProgress && studentStats.savedMockProgress[currentMockDataLink]) ? studentStats.savedMockProgress[currentMockDataLink] : null;

        if (savedProg && savedProg.selectionMode === currentSelectionMode && savedProg.mode === currentSetupMode) {
            startBtnHTML = `
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="res-btn outline" style="margin: 0; padding: 8px 12px; border-radius: 8px; border-color: var(--text-light); color: var(--text-light); font-size: 13px;" onclick="clearMockProgressAndStart(event)">🔄 Làm lại</button>
                    <button class="res-btn solid" style="margin: 0; padding: 8px 20px; border-radius: 8px; background: var(--info); border-color: var(--info); font-size: 14px;" onclick="resumeRealMockTestRoom(event)">▶ Làm tiếp</button>
                </div>`;
        } else {
            let currentTestTitle = document.getElementById('setupTestNameTitle').innerText;
            let hasDoneBefore = studentStats.mockTestHistory && studentStats.mockTestHistory.some(h => h.title === currentTestTitle && h.mode === currentSetupMode);
            let btnText = hasDoneBefore ? "🔄 Làm lại từ đầu" : "▶ Bắt đầu";
            startBtnHTML = `<button class="res-btn solid" style="margin: 0; padding: 10px 25px; border-radius: 8px; background: var(--primary); border-color: var(--primary);" onclick="enterRealMockTestRoom(event)">${btnText}</button>`;
        }

        // 🚀 KIỂM SOÁT HIỂN THỊ KHỐI FULL TEST
        let fullTestHTML = "";
        let partTitle = isExam ? "Thi theo Part" : "Luyện tập theo Part";
        let partDesc = isExam ? "Chọn Part cụ thể để thi thử" : "Chọn Part cụ thể để luyện tập";

        // CHỈ HIỆN KHỐI FULL TEST NẾU LÀ LUYỆN THI VÀ ĐỀ ĐÓ PHẢI CÓ ĐỦ 7 PART
        if (isExam && hasFull7Parts) {
            fullTestHTML = `
            <div class="mock-setup-card ${currentSelectionMode === 'full' ? 'active' : ''}" onclick="toggleSelectionCard('full')">
                <div class="mock-setup-header">
                    <div style="display: flex;">
                        <div class="mock-setup-icon">📄</div>
                        <div>
                            <h4 class="mock-setup-title">Full Test (200 câu)</h4>
                            <p class="mock-setup-desc">Làm đầy đủ đề thi như thi thật - 2 tiếng</p>
                            <div class="mock-setup-badges">
                                <span class="mock-s-badge">🕒 120 phút</span>
                                <span class="mock-s-badge" style="background: #f1f5f9; color: #475569;">📄 200 câu</span>
                            </div>
                        </div>
                    </div>
                    ${currentSelectionMode === 'full' ? startBtnHTML : ''}
                </div>
            </div>`;
        }

        let totalAvailableQs = currentAvailableParts.reduce((sum, p) => sum + currentAvailableQuestionsPerPart[p], 0);

        // KHỐI CHỌN PART (LUÔN HIỂN THỊ NHƯNG CHỈ CHỨA NHỮNG PART CÓ THẬT)
        let partTestHTML = `
            <div class="mock-setup-card ${currentSelectionMode === 'part' ? 'active' : ''}" onclick="toggleSelectionCard('part')">
                <div class="mock-setup-header">
                    <div style="display: flex;">
                        <div class="mock-setup-icon" style="background: var(--extra-bg); color: var(--primary-dark);">🎯</div>
                        <div>
                            <h4 class="mock-setup-title">${partTitle}</h4>
                            <p class="mock-setup-desc">${partDesc}</p>
                        </div>
                    </div>
                    ${currentSelectionMode === 'part' ? startBtnHTML : ''}
                </div>

                <div class="mock-part-selector-area" onclick="event.stopPropagation()">
                    
                    <div class="part-select-row ${isAllSelected ? 'selected' : ''}" style="border: 2px solid ${isAllSelected ? 'var(--primary)' : '#e5e7eb'}; background: ${isAllSelected ? 'rgba(255,182,193,0.1)' : 'white'};" onclick="selectAllMockParts(event)">
                        <div style="display: flex; align-items: center;">
                            <div class="mock-custom-checkbox"></div> 
                            <span style="font-weight: 900; color: ${isAllSelected ? 'var(--primary-dark)' : '#374151'}">Chọn tất cả ${currentAvailableParts.length} Part hiện có</span>
                        </div>
                        <span style="font-size: 13px; font-weight: 800; color: #94a3b8;">${totalAvailableQs} câu</span>
                    </div>

                    ${listeningPartsHTML ? `
                    <div class="part-section-title">LISTENING</div>
                    <div class="part-select-grid">
                        ${listeningPartsHTML}
                    </div>` : ''}

                    ${readingPartsHTML ? `
                    <div class="part-section-title">READING</div>
                    <div class="part-select-grid">
                        ${readingPartsHTML}
                    </div>` : ''}

                    ${isExam ? `
                    <div class="time-setting-box">
                        <div class="time-setting-header">
                            <span style="font-weight: 900; color: #333; font-size: 14px; display: flex; align-items: center; gap: 8px;">⏱️ Thời gian làm bài</span>
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #64748b; font-weight: 700;">
                                Tự đặt
                                <label class="toggle-switch">
                                    <input type="checkbox" onchange="toggleCustomTime(event)" ${isCustomTimeEnabled ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="time-input-wrapper">
                            <input type="number" id="customTimeInputField" class="time-input-field" value="${timeToDisplay}" ${isCustomTimeEnabled ? '' : 'disabled'} onchange="updateCustomTimeValue(event)">
                            <span style="font-size: 14px; font-weight: 700; color: #64748b;">phút</span>
                            ${!isCustomTimeEnabled ? `<span style="font-size: 13px; color: #94a3b8; font-style: italic; margin-left: 10px;">(thời gian đề xuất)</span>` : ''}
                        </div>
                    </div>` : ''}

                    <div class="summary-footer">
                        <span class="mock-s-badge" style="background: var(--extra-bg); color: var(--primary-dark);">📄 ${totalQs} câu</span>
                        <span style="font-size: 13px; font-weight: 700; color: #64748b;">Đã chọn ${mockSelectedParts.length} part</span>
                    </div>

                </div>
            </div>
        `;
        
        area.innerHTML = fullTestHTML + partTestHTML;
        modal.scrollTop = currentScroll;
    }

    async function enterRealMockTestRoom(e) {
        // 🧹 RESET SẠCH SẼ TRẠNG THÁI (CHỮA BỆNH DÍNH ĐÁP ÁN)
        window.isMockReviewMode = false; 
        window.examUserAnswers = {};
        window.examMarkedQuestions = {};
        // Cập nhật lại số phút nếu người dùng đang gõ dở
        if (currentSelectionMode === 'part' && currentSetupMode === 'exam' && isCustomTimeEnabled) {
            let inputField = document.getElementById('customTimeInputField');
            if(inputField && inputField.value) customTimeValue = parseInt(inputField.value);
        }

        setDisplay('mockTestSetupModal', 'none');
        setDisplay('mockTestHubScreen', 'none');
        setDisplay('realMockTestRoom', 'flex'); 
        await fetch200Questions(currentMockDataLink); 
    }
    async function clearMockProgressAndStart(e) {
        if(e) e.stopPropagation();
        if(confirm("Bạn có chắc muốn làm lại từ đầu? Tiến độ lưu tạm trước đó sẽ bị xóa sạch!")) {
            if (studentStats.savedMockProgress && studentStats.savedMockProgress[currentMockDataLink]) {
                delete studentStats.savedMockProgress[currentMockDataLink];
                saveStats();
            }
            enterRealMockTestRoom(e);
        }
    }

    async function resumeRealMockTestRoom(e) {
        if(e) e.stopPropagation();
        
        let savedProg = studentStats.savedMockProgress[currentMockDataLink];
        if(!savedProg) return enterRealMockTestRoom(e);

        // Phục hồi lại Cấu hình lúc đang làm dở
        currentSetupMode = savedProg.mode;
        currentSelectionMode = savedProg.selectionMode;
        mockSelectedParts = [...savedProg.parts];
        
        setDisplay('mockTestSetupModal', 'none');
        setDisplay('mockTestHubScreen', 'none');
        setDisplay('realMockTestRoom', 'flex'); 
        
        // Bật cờ Báo hiệu đang Resume để hàm fetch tải lại đáp án cũ
        window.isMockResumeMode = true; 
        window.tempSavedProg = savedProg; 
        
        await fetch200Questions(currentMockDataLink); 
    }
    
    // --- 3. LÕI THUẬT TOÁN TẢI DỮ LIỆU & LỌC THEO PART ---
    async function fetch200Questions(fileName) {
        showToast("⏳ Đang nạp đề thi, vui lòng đợi...");
        try {
            // 🚀 DÙNG CHÌA KHÓA SUPABASE LẤY FILE CHI TIẾT ĐỀ THI
            // Biến 'fileName' lúc này sẽ nhận giá trị từ cột dataLink (VD: "de_so_1.csv")
            const { data: mockBlob, error: mErr } = await supabaseClient.storage.from('app_data').download(fileName);
            
            if (mErr) throw new Error("Lỗi tải đề thi từ kho bảo mật");
            
            const csvText = await mockBlob.text();
            const rows = parseCSVData(csvText);
            
            currentMockQuestions = [];
            for(let i = 1; i < rows.length; i++) {
                if(!rows[i][1]) continue;
                let partNum = parseInt(rows[i][0]);
                
                // 🌟 BỘ LỌC ĐỈNH CAO: Chỉ lấy những câu thuộc Part được chọn
                if (!mockSelectedParts.includes(partNum)) continue;

                currentMockQuestions.push({
                    part: partNum, qNo: parseInt(rows[i][1]),
                    audio: rows[i][2], image: rows[i][3], passage: rows[i][4],
                    question: rows[i][5],
                    a: rows[i][6], b: rows[i][7], c: rows[i][8], d: rows[i][9],
                    correct: rows[i][10] ? rows[i][10].trim().toUpperCase() : '',
                    dir: rows[i][11] ? rows[i][11].trim() : '',
                    explain: rows[i][12] ? rows[i][12].trim() : '',
                    // --- CÁC CỘT GIẢI THÍCH MỞ RỘNG ---
                    transcript: rows[i][13] ? rows[i][13].trim() : '',
                    translate_passage: rows[i][14] ? rows[i][14].trim() : '',
                    translate_question: rows[i][15] ? rows[i][15].trim() : '',
                    vocab: rows[i][16] ? rows[i][16].trim() : '',
                    paraphrase: rows[i][17] ? rows[i][17].trim() : '',
                    note: rows[i][18] ? rows[i][18].trim() : ''
                });
            }
            
            // THUẬT TOÁN GOM TRANG BẢN CHUẨN XÁC NHẤT
            examPages = [];
            let tempGroup = [];
            
            for (let i = 0; i < currentMockQuestions.length; i++) {
                let q = currentMockQuestions[i];
                
                if (q.part === 1 || q.part === 2 || q.part === 5) {
                    if (tempGroup.length > 0) {
                        let groupImg = tempGroup.find(item => item.image)?.image || "";
                        let groupPas = tempGroup.find(item => item.passage)?.passage || "";
                        let groupDir = tempGroup.find(item => item.dir)?.dir || "";
                        examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: groupImg, passage: groupPas, dir: groupDir });
                        tempGroup = []; 
                    }
                    examPages.push({ type: 'question', part: q.part, questions: [q], audio: q.audio, image: q.image, passage: q.passage, dir: q.dir });
                } else {
                    let isNewListeningGroup = (q.part === 3 || q.part === 4) && (q.audio && q.audio.trim() !== "");
                    let isNewReadingGroup = (q.part === 6 || q.part === 7) && ((q.passage && q.passage.trim() !== "") || (q.image && q.image.trim() !== "") || (q.dir && q.dir.trim() !== ""));
                    
                    if (isNewListeningGroup || isNewReadingGroup) {
                        if (tempGroup.length > 0) {
                            let groupImg = tempGroup.find(item => item.image)?.image || "";
                            let groupPas = tempGroup.find(item => item.passage)?.passage || "";
                            let groupDir = tempGroup.find(item => item.dir)?.dir || ""; 
                            examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: groupImg, passage: groupPas, dir: groupDir });
                        }
                        tempGroup = [q]; 
                    } else {
                        if (tempGroup.length > 0 && tempGroup[0].part !== q.part) {
                            let groupImg = tempGroup.find(item => item.image)?.image || "";
                            let groupPas = tempGroup.find(item => item.passage)?.passage || "";
                            let groupDir = tempGroup.find(item => item.dir)?.dir || "";
                            examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: groupImg, passage: groupPas, dir: groupDir });
                            tempGroup = [q];
                        } else {
                            tempGroup.push(q);
                        }
                    }
                }
            }
            
            if (tempGroup.length > 0) {
                let groupImg = tempGroup.find(item => item.image)?.image || "";
                let groupPas = tempGroup.find(item => item.passage)?.passage || "";
                let groupDir = tempGroup.find(item => item.dir)?.dir || "";
                examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: groupImg, passage: groupPas, dir: groupDir });
            }

            // CHỈ CHÈN AUDIO INTRO KHI CHỌN FULL 7 PART VÀ Ở CHẾ ĐỘ EXAM (BỎ QUA KHI XEM LẠI)
            if (mockSelectedParts.length === 7 && currentSetupMode === 'exam' && !window.isMockReviewMode) {
                // 🚀 GẮN LINK GỐC CỦA SUPABASE VÀO ĐÂY (Sếp thay [mã-dự-án-của-sếp] thành mã thật nhé)
                const BASE_MEDIA_URL = "https://ngcapkjakeyxksugcysw.supabase.co/storage/v1/object/public/mocktest_media/";
                
                const AUDIO_INTRO_LISTENING = BASE_MEDIA_URL + "audiointro/intro.mp3";
                const AUDIO_INTRO_PART1 = BASE_MEDIA_URL + "audiointro/huongdanpart1.mp3";
                const AUDIO_INTRO_PART2 = BASE_MEDIA_URL + "audiointro/huongdanpart2.mp3";
                const AUDIO_INTRO_PART3 = BASE_MEDIA_URL + "audiointro/huongdanpart3.mp3";
                const AUDIO_INTRO_PART4 = BASE_MEDIA_URL + "audiointro/huongdanpart4.mp3";

                // Chèn Part 1 và Intro chung lên đầu (Vẫn giữ màn hình riêng vì Part 1 có ảnh ví dụ)
                examPages.unshift({ type: 'intro_part1', audio: AUDIO_INTRO_PART1 });
                examPages.unshift({ type: 'intro_listening', audio: AUDIO_INTRO_LISTENING });

                // Hàm tìm trang chứa câu hỏi đầu tiên của Part và "nhét lén" introAudio vào đó
                function attachIntroToQuestionPage(qNo, audioLink) {
                    let targetPage = examPages.find(p => p.questions && p.questions[0].qNo === qNo);
                    if (targetPage) {
                        targetPage.introAudio = audioLink;
                    }
                }

                // Gắn Audio Intro chìm vào cùng trang với câu 7, 32, 71
                attachIntroToQuestionPage(7, AUDIO_INTRO_PART2);
                attachIntroToQuestionPage(32, AUDIO_INTRO_PART3);
                attachIntroToQuestionPage(71, AUDIO_INTRO_PART4);
            }

            showToast("✅ Đã chuẩn bị xong Đề thi!");
            
           // XỬ LÝ: NẾU ĐANG LÀM TIẾP (RESUME) HAY LÀM MỚI TỪ ĐẦU
            if (window.isMockResumeMode) {
                window.examUserAnswers = window.tempSavedProg.answers || {};
                window.examMarkedQuestions = window.tempSavedProg.marked || {};
                currentExamPageIndex = window.tempSavedProg.pageIndex || 0;
                window.currentMockTimeSeconds = window.tempSavedProg.timeLeft;
                
                window.isMockResumeMode = false; // Tắt cờ
                window.tempSavedProg = null; // Xóa tạm
            } else if (window.isMockReviewMode) {
                // Nếu đang tải lại để Xem lịch sử -> Không xóa Answers, chỉ chốt Page 1
                currentExamPageIndex = 0;
            } else {
                // Xóa sổ lưu tạm và bắt đầu thi mới
                window.examUserAnswers = {};
                window.examMarkedQuestions = {};
                currentExamPageIndex = 0;
                
                let totalMinutes = 120;
                if (currentSelectionMode === 'part') {
                    if (isCustomTimeEnabled) {
                        totalMinutes = customTimeValue;
                    } else {
                        totalMinutes = 0;
                        mockSelectedParts.forEach(p => totalMinutes += timePerPart[p]); 
                    }
                }
                window.currentMockTimeSeconds = totalMinutes * 60;
            }
            
            // Nếu là Luyện thi VÀ KHÔNG PHẢI XEM LẠI thì mới bật đồng hồ
            if (currentSetupMode === 'exam' && !window.isMockReviewMode) {
                document.getElementById('examTimerDisplay').parentElement.style.display = 'flex';
                startRealMockTimer(window.currentMockTimeSeconds); 
            } else {
                // Nếu là Luyện tập hoặc đang Xem lại bài -> Ẩn và tắt hẳn đếm ngược
                document.getElementById('examTimerDisplay').parentElement.style.display = 'none'; 
                clearInterval(realMockInterval); 
            }
            
            renderExamPage(); 
            
        } catch(e) {
            showToast("❌ Lỗi tải đề thi!"); console.error(e);
        }
    }

   // --- 4. RENDER GIAO DIỆN PHÒNG THI ---
    function renderExamPage() {
        if (examPages.length === 0) return;
        let page = examPages[currentExamPageIndex];
        
        let headerMain = document.getElementById('examMainHeader');
        let headerDir = document.getElementById('examDirectionTopBar');
        let footerArea = document.getElementById('examFooterArea');
        let leftPane = document.getElementById('examLeftPane');
        let rightPane = document.getElementById('examRightPane');
        let audioPlayer = document.getElementById('globalMockAudioPlayer');

        try {
            audioPlayer.pause();
            if (!isNaN(audioPlayer.duration)) audioPlayer.currentTime = 0;
        } catch(e) {}

        // --- NẾU LÀ TRANG INTRO ---
        if (page.type && page.type.startsWith('intro')) {
            headerMain.style.display = 'none'; headerDir.style.display = 'flex';
            leftPane.style.flex = "none"; leftPane.style.width = "100%"; leftPane.style.border = "none";
            rightPane.style.display = "none"; 

            if (studentID === 'CHARLIE') {
                footerArea.style.display = 'flex';
                document.getElementById('examFooterRight').style.display = 'flex';
                document.getElementById('btnMarkCurrent').style.display = 'none';
            } else {
                footerArea.style.display = 'none';
            }

            if (page.type === 'intro_listening') {
                leftPane.innerHTML = `<div style="max-width: 800px; margin: 50px auto; text-align: center;"><h1 style="color: #1f2937; font-size: 32px; font-weight: 900; margin-bottom: 30px;">LISTENING TEST</h1><div style="background: white; border-radius: 15px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); font-size: 17px; color: #4b5563; line-height: 1.8; text-align: justify;">In the Listening test, you will be asked to demonstrate how well you understand spoken English. The entire Listening test will last approximately 45 minutes. There are four parts, and directions are given for each part. You must mark your answers on the separate answer sheet. Do not write your answers in your test book.</div></div>`;
            } else if (page.type === 'intro_part1') {
                leftPane.innerHTML = `
                <div style="max-width: 800px; margin: 20px auto; text-align: center;">
                    <h2 style="color: #1f2937; font-size: 28px; font-weight: 900; margin-bottom: 20px;">PART 1</h2>
                    <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: left;">
                        <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin-top: 0;"><b>Directions:</b> For each question in this part, you will hear four statements about a picture in your test book. When you hear the statements, you must select the one statement that best describes what you see in the picture. Then find the number of the question on your answer sheet and mark your answer. The statements will not be printed in your test book and will be spoken only one time.</p>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <img src="https://ngcapkjakeyxksugcysw.supabase.co/storage/v1/object/public/mocktest_media/audiointro/intro.png" style="max-height: 250px; border-radius: 10px; border: 1px solid #e5e7eb; object-fit: cover;">
                        </div>
                        
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; font-size: 14px; color: #1e3a8a; font-style: italic;">Statement (C), "They're sitting at a table," is the best description of the picture, so you should select answer (C) and mark it on your answer sheet.</div>
                    </div>
                </div>`;
            }

            if(page.audio) {
                audioPlayer.src = page.audio;
                audioPlayer.play().catch(e => console.log("Trình duyệt chặn Autoplay"));
                audioPlayer.onended = () => { nextExamPage(); };
            }
            return; 
        }

        // --- NẾU LÀ CÂU HỎI BÌNH THƯỜNG ---
        headerMain.style.display = 'flex'; headerDir.style.display = 'none'; footerArea.style.display = 'flex';
        leftPane.style.flex = "1"; leftPane.style.width = "auto"; leftPane.style.borderRight = "1px solid #e5e7eb";
        rightPane.style.display = "block"; 
        document.getElementById('btnMarkCurrent').style.display = 'flex'; 
        
        leftPane.innerHTML = `<div class="ets-direction-text" id="examDirectionText"></div><div class="ets-image-container" id="examMediaArea"></div>`;

        let footerRight = document.getElementById('examFooterRight');
        // Chế độ luyện tập hoặc Xem lại thì mở tự do cho mọi Part, luyện thi thì khóa Part Nghe.
        if (studentID === 'CHARLIE' || page.part > 4 || currentSetupMode === 'practice' || window.isMockReviewMode) {
            footerRight.style.display = 'flex'; 
        } else {
            footerRight.style.display = 'none'; 
        }

        // Đếm lại tổng số câu dựa trên số Part đã lọc
        let isReading = page.part >= 5;
        let sectionName = isReading ? "Reading" : "Listening";
        let totalInSection = currentMockQuestions.filter(q => isReading ? q.part >= 5 : q.part <= 4).length; 
        
        let titleText = "";
        if (page.questions.length === 1) { 
            titleText = `${sectionName}: Question ${page.questions[0].qNo} of ${totalInSection}`; 
        } else {
            titleText = `${sectionName}: Questions ${page.questions[0].qNo} - ${page.questions[page.questions.length - 1].qNo} of ${totalInSection}`;
        }
        document.getElementById('examTopTitle').innerText = titleText;
        updateExamProgress();

        // Xử lý Audio (ĐÃ FIX: Chỉ tự động phát khi ở chế độ Luyện Thi)
        if (page.part <= 4) {
            // Hàm phụ: Phát Audio chính của Câu hỏi
            let playMainAudio = () => {
                if (page.audio) {
                    audioPlayer.src = page.audio;
                    
                    // CHỈ PHÁT TỰ ĐỘNG NẾU ĐANG LÀ CHẾ ĐỘ LUYỆN THI (EXAM)
                    if (currentSetupMode === 'exam' && !window.isMockReviewMode) {
                        audioPlayer.play().catch(e => console.log("Cần tương tác"));
                    }
                    
                    if (studentID !== 'CHARLIE' && currentSetupMode === 'exam' && !window.isMockReviewMode) {
                        audioPlayer.onended = () => { nextExamPage(); };
                        audioPlayer.onerror = () => { setTimeout(() => nextExamPage(), 3000); }; 
                    } else {
                        audioPlayer.onended = null; 
                    }
                } else {
                    if (studentID !== 'CHARLIE' && currentSetupMode === 'exam' && !window.isMockReviewMode) setTimeout(() => nextExamPage(), 5000);
                }
            };

            // Audio Hướng dẫn cũng chỉ phát khi ở chế độ Luyện Thi
            if (page.introAudio && currentSetupMode === 'exam' && !window.isMockReviewMode) {
                audioPlayer.src = page.introAudio;
                audioPlayer.play().catch(e => console.log("Cần tương tác"));
                
                // Khi hát xong bài Hướng dẫn -> Tự động gọi hàm hát bài Câu hỏi
                audioPlayer.onended = () => { playMainAudio(); };
            } else {
                // Không có bài Hướng dẫn, hoặc đang ở Luyện tập / Xem lại -> Bỏ qua intro, nạp bài chính
                playMainAudio();
            }
        } else {
            audioPlayer.onended = null;
        }

        let dirText = document.getElementById('examDirectionText');
        if (page.dir && page.dir !== "") {
            dirText.innerHTML = page.dir;
        } else {
            if (page.part === 1) dirText.innerText = "Select the one statement that best describes what you see in the picture.";
            else if (page.part === 5) dirText.innerHTML = "Select the best answer to complete the sentence.";
            else if (page.part === 6) dirText.innerHTML = "Read the texts that follow. A word, phrase, or sentence is missing in parts of each text.";
            else if (page.part === 7) dirText.innerHTML = "Questions refer to the following text(s).";
            else dirText.innerText = "Select the best response to each question.";
        }

        let mediaHTML = "";
        
        // 1. TẠO THANH AUDIO PLAYER (LUÔN Ở TRÊN CÙNG)
        if ((window.isMockReviewMode || currentSetupMode === 'practice') && page.audio) {
            mediaHTML += `
            <div class="review-audio-container" style="background: var(--card-bg); border: 2px solid var(--extra-bg); padding: 15px; border-radius: 16px; box-shadow: 0 5px 15px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <strong style="color: var(--text-main); font-size: 15px; display: flex; align-items: center; gap: 5px;">🎧 Nghe lại Audio</strong>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px; font-weight: 800; color: var(--text-light);">Tốc độ:</span>
                        <select onchange="document.getElementById('reviewAudioPlayer').playbackRate = this.value" style="padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border-color); outline: none; color: var(--primary-dark); font-weight: bold; font-family: 'Nunito', sans-serif; cursor: pointer; background: white; margin: 0;">
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                </div>
                <audio id="reviewAudioPlayer" src="${page.audio}" controls controlsList="nodownload" style="width: 100%; height: 40px; outline: none; border-radius: 20px;"></audio>
            </div>`;
        }

        // 2. CHÈN ẢNH VÀ ĐOẠN VĂN
        if (page.image) mediaHTML += `<img src="${page.image}">`;
        if (page.passage) mediaHTML += `<div class="ets-passage-box" style="margin-bottom: 0;">${page.passage.replace(/\n/g, '<br>')}</div>`;
        
        // 3. CHÈN TRANSCRIPT, DỊCH ĐOẠN VĂN & TỪ VỰNG DÙNG CHUNG (CỘT TRÁI)
        // MỚI: Bật cho cả Review Mode và Practice Mode
        if (window.isMockReviewMode || currentSetupMode === 'practice') {
            let sharedTrans = page.questions.find(q => q.transcript)?.transcript;
            let sharedPassageTrans = page.questions.find(q => q.translate_passage)?.translate_passage;
            let sharedHTML = "";
            
            if (sharedTrans) sharedHTML += `<div class="review-box rev-transcript" style="margin-top: 0;"><strong>🎙️ Transcript:</strong><br><div style="margin-top: 5px;">${sharedTrans.replace(/\n/g, '<br>')}</div></div>`;
            if (sharedPassageTrans) sharedHTML += `<div class="review-box rev-trans-passage" style="margin-top: 0;"><strong>📖 Dịch nghĩa Passage:</strong><br><div style="margin-top: 5px;">${sharedPassageTrans.replace(/\n/g, '<br>')}</div></div>`;
            
            // Gộp Từ vựng nếu là nhóm câu hỏi (Part 3, 4, 6, 7)
            if (page.questions.length > 1) {
                let allVocab = page.questions.map(q => q.vocab).filter(v => v).join(' | ');
                if (allVocab) {
                    let uniqueTags = [...new Set(allVocab.split('|').map(v => v.trim()).filter(v => v))];
                    let tagsHTML = uniqueTags.map(v => `<div class="vocab-tag">${v}</div>`).join('');
                    sharedHTML += `<div class="review-box rev-vocab" style="margin-top: 0;"><strong>📚 Từ vựng chung của đoạn:</strong><div class="vocab-tag-container">${tagsHTML}</div></div>`;
                }
            }

            if (sharedHTML !== "") {
                // Nếu đang Review Mode thì hiện luôn. Nếu Luyện tập thì Tạm Ẩn.
                let displayStyle = window.isMockReviewMode ? 'block' : 'none';
                
                // MỚI: Nếu người dùng back lại trang đã làm xong thì cũng hiện luôn
                let isAllAnswered = page.questions.every(q => window.examUserAnswers[q.qNo]);
                if (currentSetupMode === 'practice' && isAllAnswered) displayStyle = 'block';

                mediaHTML += `<div id="sharedExplainContainer" style="display: ${displayStyle}; animation: fadeIn 0.4s ease-out;">${sharedHTML}</div>`;
            }
        }
        
        document.getElementById('examMediaArea').innerHTML = mediaHTML;

        let firstQNo = page.questions[0].qNo;
        let markBtn = document.getElementById('btnMarkCurrent');
        if (window.examMarkedQuestions[firstQNo]) { markBtn.classList.add('active'); } 
        else { markBtn.classList.remove('active'); }

        // Vẽ Câu hỏi bên Phải
        // Vẽ Câu hỏi bên Phải
        let qCount = page.questions.length;
        let groupPill = qCount > 1 
            ? `<div class="group-title-pill">Nhóm câu ${page.questions[0].qNo}-${page.questions[qCount-1].qNo} <span style="font-weight: normal;">(${qCount} câu hỏi)</span></div>` 
            : "";

        let questionsHTML = page.questions.map(q => {
            let userAns = window.examUserAnswers[q.qNo] || ""; 
            
            // XÁC ĐỊNH VIỆC ẨN/HIỆN TEXT (Dành riêng cho Part 1 và Part 2)
            let showOptText = window.isMockReviewMode || (page.part !== 1 && page.part !== 2);
            
            // TÍNH NĂNG MỚI: Nếu đang ở Luyện Tập và câu này ĐÃ ĐƯỢC CHỌN ĐÁP ÁN thì bật text lên
            if (currentSetupMode === 'practice' && userAns !== "") {
                showOptText = true;
            }

            let hideStyle = showOptText ? '' : 'display: none;';
            let textClass = `p12-text-${q.qNo}`;
            
            // --- BẮT ĐẦU CHÈN NÚT NOTE CHO MOCK TEST ---
            let noteKey = `MOCK_${currentMockDataLink}_${q.qNo}`;
            let hasNote = studentStats.userNotes && studentStats.userNotes[noteKey];
            let noteBtnBg = hasNote ? 'var(--warning)' : 'var(--card-bg)';
            let noteBtnCol = hasNote ? '#fff' : 'var(--text-main)';
            let noteBtnText = hasNote ? '📝 Xem Note' : '📝 Note';
            let noteBorder = hasNote ? 'var(--warning)' : 'var(--primary)';
            
            let showNoteBtn = window.isMockReviewMode || currentSetupMode === 'practice';
            let noteBtnHTML = showNoteBtn ? `<button id="mockNoteBtn_${q.qNo}" onclick="openMockNoteModal(${q.qNo})" style="background: ${noteBtnBg}; color: ${noteBtnCol}; border: 2px solid ${noteBorder}; border-radius: 8px; font-size: 13px; font-family: 'Nunito', sans-serif; cursor: pointer; outline: none; padding: 4px 12px; z-index: 10; font-weight: 800; transition: 0.2s; box-shadow: 0 4px 10px rgba(255, 182, 193, 0.2); white-space: nowrap;">${noteBtnText}</button>` : '';

            // Nhúng span chứa Text vào câu hỏi để có thể ẩn/hiện bằng JS
            let qStr = q.question ? `<span class="${textClass}" style="${hideStyle}"> ${q.question}</span>` : "";
            let qTextHTML = `<div class="ets-question-text" style="width: 100%; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; overflow: visible; gap: 10px;"><div style="flex: 1;">${q.qNo}.${qStr}</div>${noteBtnHTML ? `<div>${noteBtnHTML}</div>` : ''}</div>`;
            // --- KẾT THÚC CHÈN NÚT NOTE ---
            
            // Xử lý text đáp án (Bọc span ẩn/hiện vào)
            let textA = q.a ? `<span class="${textClass}" style="${hideStyle}"> ${q.a}</span>` : "";
            let textB = q.b ? `<span class="${textClass}" style="${hideStyle}"> ${q.b}</span>` : "";
            let textC = q.c ? `<span class="${textClass}" style="${hideStyle}"> ${q.c}</span>` : "";
            let textD = q.d ? `<span class="${textClass}" style="${hideStyle}"> ${q.d}</span>` : "";

            // Thu hẹp khoảng cách giữa các đáp án A B C D cho gọn gàng
            let optStyle = "margin-bottom: 0 !important;"; 
            let containerStyle = "display: flex; flex-direction: column; gap: 6px;";

            let optD_HTML = "";
            if (page.part !== 2) { 
                optD_HTML = `<label class="ets-option-label" style="${optStyle}" id="lbl_${q.qNo}_D"><input type="radio" name="q_${q.qNo}" value="D" onchange="saveExamAnswer(${q.qNo}, 'D', '${q.correct}', \`${(q.explain || "").replace(/"/g, '&quot;')}\`)" ${userAns === 'D' ? 'checked' : ''}> (D)&nbsp;&nbsp;${textD}</label>`; 
            }

            // GIAO DIỆN DÀNH RIÊNG CHO CHẾ ĐỘ XEM LẠI VÀ LUYỆN TẬP
            let reviewAddons = "";
            let addonsInner = "";
            
            // Dịch nghĩa câu hỏi
            if (q.translate_question) addonsInner += `<div class="review-box rev-trans-question"><strong>🇻🇳 Dịch nghĩa (Câu ${q.qNo}):</strong>${q.translate_question.replace(/\n/g, '<br>')}</div>`;
            
            // Giải thích + Paraphrase + Note gộp chung vào 1 thẻ Tím cho gọn đẹp
            if (q.explain || q.paraphrase || q.note) {
                let explainHTML = "";
                if (q.explain) explainHTML += `<div style="margin-bottom: 10px; line-height: 1.6;">${q.explain.replace(/\n/g, '<br>')}</div>`;
                
                if (q.paraphrase) explainHTML += `<div style="margin-bottom: 10px; color: #6A1B9A;"><strong style="font-weight: 900;">🔄 Paraphrase:</strong><div style="font-weight: 600; line-height: 1.5; margin-top: 4px;">${q.paraphrase.replace(/\n/g, '<br>')}</div></div>`;
                
                if (q.note) explainHTML += `<div style="margin-bottom: 0; color: #D84315; padding: 12px; background: rgba(255,138,128,0.1); border-left: 3px solid #D84315; border-radius: 8px;"><strong style="font-weight: 900;">⚠️ Lưu ý bẫy đề:</strong><div style="font-weight: 600; line-height: 1.6; margin-top: 6px;">${q.note.replace(/\n/g, '<br>')}</div></div>`;
                
                addonsInner += `<div class="review-box rev-explain"><strong>💡 Giải thích chi tiết (Câu ${q.qNo}):</strong><div style="margin-top: 8px;">${explainHTML}</div></div>`;
            }
            
            // Từ vựng (Cho các Part đơn)
            if (q.vocab && page.questions.length === 1) {
                let tags = q.vocab.split('|').map(v => `<div class="vocab-tag">${v.trim().replace(/(?:\r\n|\r|\n)/g, '')}</div>`).join('');
                addonsInner += `<div class="review-box rev-vocab"><strong>📚 Từ vựng nên học:</strong><div class="vocab-tag-container">${tags}</div></div>`;
            }

            if (window.isMockReviewMode) {
                // Đang xem lại -> Hiện thẳng luôn
                reviewAddons = addonsInner;
            } else if (currentSetupMode === 'practice') {
                // Đang Luyện tập -> Bọc vào Div ẩn, đợi click đáp án mới hiện
                reviewAddons = `<div id="explain_${q.qNo}" style="display: none; animation: fadeIn 0.4s ease-out;">${addonsInner}</div>`;
            }

            return `
            <div class="ets-question-block" id="qblock_${q.qNo}">
                ${qTextHTML}
                <div style="${containerStyle}">
                    <label class="ets-option-label" style="${optStyle}" id="lbl_${q.qNo}_A"><input type="radio" name="q_${q.qNo}" value="A" onchange="saveExamAnswer(${q.qNo}, 'A', '${q.correct}', \`${(q.explain || "").replace(/"/g, '&quot;')}\`)" ${userAns === 'A' ? 'checked' : ''}> (A)&nbsp;&nbsp;${textA}</label>
                    <label class="ets-option-label" style="${optStyle}" id="lbl_${q.qNo}_B"><input type="radio" name="q_${q.qNo}" value="B" onchange="saveExamAnswer(${q.qNo}, 'B', '${q.correct}', \`${(q.explain || "").replace(/"/g, '&quot;')}\`)" ${userAns === 'B' ? 'checked' : ''}> (B)&nbsp;&nbsp;${textB}</label>
                    <label class="ets-option-label" style="${optStyle}" id="lbl_${q.qNo}_C"><input type="radio" name="q_${q.qNo}" value="C" onchange="saveExamAnswer(${q.qNo}, 'C', '${q.correct}', \`${(q.explain || "").replace(/"/g, '&quot;')}\`)" ${userAns === 'C' ? 'checked' : ''}> (C)&nbsp;&nbsp;${textC}</label>
                    ${optD_HTML}
                </div>
                ${reviewAddons}
            </div>`;
        }).join('');
        
        document.getElementById('examQuestionsArea').innerHTML = groupPill + questionsHTML;

        // Xử lý phục hồi màu sắc nếu đang ở chế độ Luyện Tập HOẶC Review Mode
        if (currentSetupMode === 'practice' || window.isMockReviewMode) {
            page.questions.forEach(q => {
                if (window.examUserAnswers[q.qNo] || window.isMockReviewMode) {
                    evaluatePracticeAnswer(q.qNo, window.examUserAnswers[q.qNo] || "", q.correct, q.explain);
                }
            });
        }
    }

    // --- 5. LƯU ĐÁP ÁN & ĐÁNH GIÁ (LUYỆN TẬP / XEM LẠI) ---
    window.saveExamAnswer = function(qNo, answer, correctAns, explainText) {
        window.examUserAnswers[qNo] = answer;
        updateExamProgress();
        
        if (currentSetupMode === 'practice') {
            evaluatePracticeAnswer(qNo, answer, correctAns, explainText);
        }
    };

    function evaluatePracticeAnswer(qNo, userAns, correctAns, explainText) {
        let block = document.getElementById(`qblock_${qNo}`);
        if (!block) return;

        // TÍNH NĂNG MỚI: Bật hiển thị text của Part 1, 2 ngay khi chọn đáp án
        let hiddenTexts = document.querySelectorAll(`.p12-text-${qNo}`);
        hiddenTexts.forEach(el => el.style.display = 'inline');

        // Khóa tất cả các nút
        ['A', 'B', 'C', 'D'].forEach(opt => {
            let lbl = document.getElementById(`lbl_${qNo}_${opt}`);
            if(lbl) lbl.classList.add('disabled');
        });

        // Tô màu Đúng / Sai
        if (userAns === correctAns && userAns !== "") {
            let lbl = document.getElementById(`lbl_${qNo}_${userAns}`);
            if(lbl) lbl.classList.replace('disabled', 'correct');
        } else {
            if (userAns !== "") {
                let lblW = document.getElementById(`lbl_${qNo}_${userAns}`);
                if(lblW) lblW.classList.replace('disabled', 'wrong');
            }
            if(correctAns && document.getElementById(`lbl_${qNo}_${correctAns}`)) {
                document.getElementById(`lbl_${qNo}_${correctAns}`).classList.replace('disabled', 'correct');
            }
        }

        // Hiển thị khung giải thích (Chỉ việc gọi nó hiện ra)
        let expBox = document.getElementById(`explain_${qNo}`);
        if (expBox) {
            expBox.style.display = 'block';
        }
    // --- TÍNH NĂNG MỚI: BẬT GIẢI THÍCH CHUNG (TRANSCRIPT/TỪ VỰNG) NẾU ĐÃ LÀM XONG CẢ NHÓM ---
        let currentPage = examPages[currentExamPageIndex];
        if (currentPage && currentPage.questions) {
            // Quét xem tất cả các câu trên trang hiện tại đã được tick đáp án chưa
            let isAllAnswered = currentPage.questions.every(q => window.examUserAnswers[q.qNo]);
            
            if (isAllAnswered) {
                let sharedContainer = document.getElementById('sharedExplainContainer');
                if (sharedContainer) {
                    sharedContainer.style.display = 'block';
                }
            }
        }
    }

    // --- 6. CÁC HÀM ĐIỀU KHIỂN PHÒNG THI ---
    function changeExamVolume() {
        let slider = document.getElementById('examVolumeSlider');
        let player = document.getElementById('globalMockAudioPlayer');
        if(player && slider) player.volume = slider.value;
    }

    function startRealMockTimer(secondsLeft = 7200) {
        clearInterval(realMockInterval);
        
        // Nhận thời gian truyền vào (hoặc mặc định là 7200s = 120 phút nếu không có)
        realMockTimeLeft = secondsLeft; 
        
        let timerDisplay = document.getElementById('examTimerDisplay');
        
        // Hiển thị ngay lập tức thời gian ban đầu trước khi đếm (Tránh bị delay 1 giây)
        let h_init = Math.floor(realMockTimeLeft / 3600); 
        let m_init = Math.floor((realMockTimeLeft % 3600) / 60); 
        let s_init = realMockTimeLeft % 60;
        timerDisplay.innerText = `${String(h_init).padStart(2,'0')}:${String(m_init).padStart(2,'0')}:${String(s_init).padStart(2,'0')}`;

        realMockInterval = setInterval(() => {
            realMockTimeLeft--;
            let h = Math.floor(realMockTimeLeft / 3600); 
            let m = Math.floor((realMockTimeLeft % 3600) / 60); 
            let s = realMockTimeLeft % 60;
            
            timerDisplay.innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            
            if(realMockTimeLeft <= 0) { 
                clearInterval(realMockInterval); 
                showToast("⏳ Đã hết thời gian làm bài!");
                submitMockTest(); // Hết giờ tự động nộp bài
            }
        }, 1000);
    }

    function skipExamInstruction() { nextExamPage(); }

    function nextExamPage() {
        let noteModal = document.getElementById('mockNoteModal');
        if (noteModal) noteModal.style.display = 'none';
        if (currentExamPageIndex < examPages.length - 1) {
            currentExamPageIndex++; renderExamPage();
        }
    }

    function prevExamPage() {
        let noteModal = document.getElementById('mockNoteModal');
        if (noteModal) noteModal.style.display = 'none';
        if (currentExamPageIndex > 0) {
            if(examPages[currentExamPageIndex - 1].type && examPages[currentExamPageIndex - 1].type.startsWith('intro')) return;
            currentExamPageIndex--; renderExamPage();
        }
    }

    function exitMockTest() {
        // NẾU ĐANG Ở CHẾ ĐỘ XEM LẠI -> Thoát thẳng về bảng Chọn chế độ
        if (window.isMockReviewMode) {
            clearInterval(realMockInterval);
            let audioPlayer = document.getElementById('globalMockAudioPlayer');
            if(audioPlayer) audioPlayer.pause();

            setDisplay('realMockTestRoom', 'none');
            setDisplay('mockResultScreen', 'none');
            
            // Hiện lại Hub nền và Modal chọn chế độ
            setDisplay('mockTestHubScreen', 'flex');
            setDisplay('mockTestSetupModal', 'flex');
            renderMockSetupOptions(); // Vẽ lại Modal cho chắc chắn
            return;
        }

        // LUỒNG CŨ: Dành cho khi đang làm bài thi thật / luyện tập
        if(confirm("⏳ Bạn có muốn tạm dừng? Tiến độ và thời gian làm bài sẽ được lưu lại!")) {
            clearInterval(realMockInterval);
            let audioPlayer = document.getElementById('globalMockAudioPlayer');
            if(audioPlayer) audioPlayer.pause();

            // LƯU TOÀN BỘ TRẠNG THÁI VÀO BỘ NHỚ MÁY
            if (!studentStats.savedMockProgress) studentStats.savedMockProgress = {};
            studentStats.savedMockProgress[currentMockDataLink] = {
                mode: currentSetupMode,
                selectionMode: currentSelectionMode,
                parts: [...mockSelectedParts],
                answers: JSON.parse(JSON.stringify(window.examUserAnswers)),
                marked: JSON.parse(JSON.stringify(window.examMarkedQuestions)),
                timeLeft: realMockTimeLeft,
                pageIndex: currentExamPageIndex
            };
            saveStats(); // Cập nhật localStorage

            // Đóng phòng thi
            setDisplay('realMockTestRoom', 'none');
            setDisplay('mockResultScreen', 'none');
            
            // Hiện lại Bảng chọn và Nhảy thẳng sang Tab TIẾN ĐỘ
            setDisplay('mockTestHubScreen', 'flex');
            setDisplay('mockTestSetupModal', 'flex');
            switchSetupMode('progress');
        }
    }

    // --- BẢNG ĐIỂM CHUẨN TOEIC (0 - 100 câu) ĐÃ CHUẨN HÓA THEO YÊU CẦU ---
    const TOEIC_LISTENING_SCORE = [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,475,480,485,490,495,495,495];
    const TOEIC_READING_SCORE = [0,5,5,5,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,480,485,495];

    window.isMockReviewMode = false;

    function submitMockTest() {
        try {
            clearInterval(realMockInterval);
            // Nộp bài xong thì xóa File lưu tạm đi
        if (studentStats.savedMockProgress && studentStats.savedMockProgress[currentMockDataLink]) {
            delete studentStats.savedMockProgress[currentMockDataLink];
            saveStats();
        }
            let audioPlayer = document.getElementById('globalMockAudioPlayer');
            if(audioPlayer) audioPlayer.pause();
            
            let lCorrect = 0; let rCorrect = 0;
            let lTotal = 0; let rTotal = 0;
            
            let partStats = {
                1: { total: 0, correct: 0 }, 2: { total: 0, correct: 0 }, 3: { total: 0, correct: 0 },
                4: { total: 0, correct: 0 }, 5: { total: 0, correct: 0 }, 6: { total: 0, correct: 0 }, 7: { total: 0, correct: 0 }
            };

            const PART_NAMES = {
                1: "Photos", 2: "Question-Response", 3: "Conversations",
                4: "Talks", 5: "Incomplete Sentences", 6: "Text Completion", 7: "Reading Comprehension"
            };

            currentMockQuestions.forEach(q => {
                let isListening = q.part <= 4;
                if (isListening) lTotal++; else rTotal++;
                partStats[q.part].total++;
                
                let userAns = window.examUserAnswers[q.qNo];
                if (userAns && userAns === q.correct) {
                    if (isListening) lCorrect++; else rCorrect++;
                    partStats[q.part].correct++;
                }
            });
            
            let totalCorrect = lCorrect + rCorrect;
            let totalQs = lTotal + rTotal;
            let wrongCount = totalQs - totalCorrect;
            let accuracy = Math.round((totalCorrect / totalQs) * 100) || 0;
            
            // Tính điểm TOEIC và XP
            let finalLScore = typeof TOEIC_LISTENING_SCORE !== 'undefined' ? (TOEIC_LISTENING_SCORE[lCorrect] || 5) : 5;
            let finalRScore = typeof TOEIC_READING_SCORE !== 'undefined' ? (TOEIC_READING_SCORE[rCorrect] || 5) : 5;
            let totalScore = finalLScore + finalRScore;
            let xpEarned = currentSetupMode === 'exam' ? Math.floor(totalScore / 3) : totalCorrect * 5;

            // 💾 ======= LƯU LỊCH SỬ LÀM BÀI VÀO TIẾN ĐỘ =======
            // Không lưu nếu đang ở chế độ xem lại
            if (!window.isMockReviewMode) {
                if (!studentStats.mockTestHistory) studentStats.mockTestHistory = [];
                // TÍNH TOÁN THỜI GIAN LÀM BÀI (Đơn vị: Giây)
                let timeSpent = 0;
                if (currentSetupMode === 'exam') {
                    // Nếu là chế độ thi, lấy Tổng thời gian quy định trừ đi thời gian còn lại
                    timeSpent = window.currentMockTimeSeconds - realMockTimeLeft;
                } else {
                    // Chế độ luyện tập không cần đua thời gian
                    timeSpent = 0; 
                }

                let historyRecord = {
                    id: 'MOCK_' + Date.now(),
                    title: document.getElementById('setupTestNameTitle').innerText,
                    mode: currentSetupMode,
                    date: Date.now(),
                    lCorrect: lCorrect,
                    rCorrect: rCorrect,
                    totalCorrect: totalCorrect,
                    totalQs: totalQs,
                    score: totalScore,
                    accuracy: accuracy,
                    // --- BỔ SUNG 3 CHỈ SỐ QUAN TRỌNG ĐỂ XẾP HẠNG ---
                    listScore: finalLScore,
                    readScore: finalRScore,
                    timeTaken: timeSpent, 
                    // ------------------------------------------------
                    userAnswers: JSON.parse(JSON.stringify(window.examUserAnswers)), 
                    dataLink: currentMockDataLink, 
                    selectedParts: [...mockSelectedParts]
                };
                studentStats.mockTestHistory.unshift(historyRecord); // Đẩy lên đầu
                
                // Nâng giới hạn lên 100 lần thi để học viên yên tâm
if (studentStats.mockTestHistory.length > 100) studentStats.mockTestHistory.pop();
                saveStats(); // Lưu vào bộ nhớ máy
            }

            // 1. Ghi Title & Subtitle
            document.getElementById('resMainTitle').innerText = currentSetupMode === 'practice' ? "Hoàn thành luyện tập!" : "Hoàn thành bài thi!";
            let setupTitleEl = document.getElementById('setupTestNameTitle');
            let subtitleStr = setupTitleEl ? setupTitleEl.innerText : "Mock Test";
            
            if (currentSelectionMode === 'part') subtitleStr += " — " + mockSelectedParts.map(p => "Part " + p).join(", ");
            else subtitleStr += " — Full Test";
            
            document.getElementById('resSubTitle').innerText = subtitleStr;

            // 2. ẨN/HIỆN LAYOUT VÀ BƠM DỮ LIỆU TƯƠNG ỨNG
            let pracLayout = document.getElementById('practiceResultLayout');
            let examLayout = document.getElementById('examResultLayout');
            
            if (currentSetupMode === 'exam') {
                pracLayout.style.display = 'none';
                examLayout.style.display = 'block';
                
                document.getElementById('examBigScore').innerText = totalScore;
                document.getElementById('examListScore').innerText = finalLScore;
                document.getElementById('examListDetail').innerText = `Listening (${lCorrect}/${lTotal})`;
                document.getElementById('examReadScore').innerText = finalRScore;
                document.getElementById('examReadDetail').innerText = `Reading (${rCorrect}/${rTotal})`;
                
                document.getElementById('examAccuracy').innerText = `Độ chính xác: ${accuracy}%`;
                document.getElementById('examCorrectCount').innerText = `${totalCorrect}/${totalQs} câu đúng`;
                
                // Đổi màu nút Quay lại thành Hồng khi Thi thử
                document.getElementById('btnReturnMock').style.background = 'var(--primary)';
                document.getElementById('btnReturnMock').style.borderColor = 'var(--primary)';
                
            } else {
                examLayout.style.display = 'none';
                pracLayout.style.display = 'block';
                
                document.getElementById('pracBigScore').innerText = totalCorrect;
                document.getElementById('pracTotalQs').innerText = `/ ${totalQs} câu đúng`;
                document.getElementById('pracAccuracyTxt').innerText = `(${accuracy}% chính xác)`;
                
                document.getElementById('pracBoxCorrect').innerText = totalCorrect;
                document.getElementById('pracBoxWrong').innerText = wrongCount;
                document.getElementById('pracBoxXP').innerText = `⚡ ${xpEarned}`;
                
                // Đổi màu nút Quay lại thành Xanh khi Luyện tập
                document.getElementById('btnReturnMock').style.background = '#0ea5e9';
                document.getElementById('btnReturnMock').style.borderColor = '#0ea5e9';
            }

            document.getElementById('btnRedoWrong').innerText = `🔄 Làm lại câu sai (${wrongCount})`;

            // 3. Vẽ Progress Bar cho từng Part
            let partHTML = "";
            mockSelectedParts.forEach(p => {
                if (partStats[p].total === 0) return; 
                let pAcc = Math.round((partStats[p].correct / partStats[p].total) * 100) || 0;
                let icon = (p <= 4) ? "🎧" : "📖";
                
                partHTML += `
                <div class="res-part-item">
                    <div class="res-part-header">
                        <span>${icon} Part ${p}: ${PART_NAMES[p]}</span>
                        <span>${partStats[p].correct}/${partStats[p].total} (${pAcc}%)</span>
                    </div>
                    <div class="res-part-bar-bg" style="background: var(--extra-bg); height: 10px; border-radius: 10px; width: 100%; overflow: hidden; box-shadow: inset 0 2px 6px rgba(0,0,0,0.05);">
                        <div class="res-part-bar-fill" style="width: ${pAcc}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--warning)); border-radius: 10px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 10px rgba(255, 182, 193, 0.5);"></div>
                    </div>
                </div>`;
            });
            document.getElementById('partAnalysisContainer').innerHTML = partHTML;

            // Hiển thị màn hình
            setDisplay('realMockTestRoom', 'none');
            setDisplay('mockResultScreen', 'block');
            
            if (typeof addXP === 'function') addXP(xpEarned);
            
            if ((currentSetupMode === 'exam' && totalScore >= 500) || (currentSetupMode === 'practice' && accuracy >= 70)) {
                if (typeof confetti !== 'undefined') {
                    setTimeout(() => confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, zIndex: 9999999 }), 500);
                }
            }

        } catch (err) {
            console.error("Lỗi Submit:", err);
            alert("❌ Charnishere Cảnh báo: Nút Submit gặp lỗi!\n\nLý do: " + err.message);
        }
    }
async function reviewPastMockTest(recordId) {
        if (!studentStats.mockTestHistory) return;
        let record = studentStats.mockTestHistory.find(h => h.id === recordId);
        if (!record) return showToast("Không tìm thấy dữ liệu bài thi!");
        
        if (!record.dataLink) {
            return showToast("⚠️ Bài thi này thuộc phiên bản cũ, vui lòng thi lại đề mới để xem!");
        }

        showToast("⏳ Đang tải lại dữ liệu đề thi...");

        // Phục hồi trạng thái từ lịch sử
        window.examUserAnswers = record.userAnswers;
        mockSelectedParts = record.selectedParts || [1,2,3,4,5,6,7];
        currentSetupMode = record.mode;
        currentMockDataLink = record.dataLink; // Nạp lại Link gốc

        window.isMockReviewMode = true; // Bật cờ Review
        currentExamPageIndex = 0;
        
        setDisplay('mockTestSetupModal', 'none');
        setDisplay('mockTestHubScreen', 'none');
        setDisplay('realMockTestRoom', 'flex');
        
        document.getElementById('examTimerDisplay').parentElement.style.display = 'none'; 
        
        // Gọi lệnh tải lại Đề thi trực tiếp từ Link Google Sheets
        await fetch200Questions(currentMockDataLink);
    }
    function reviewMockTest() {
        window.isMockReviewMode = true;
        setDisplay('mockResultScreen', 'none');
        setDisplay('realMockTestRoom', 'flex');
        
        document.getElementById('examTimerDisplay').parentElement.style.display = 'none'; 
        currentExamPageIndex = 0; 
        renderExamPage(); 
    }

    function redoMockTest() {
        if(confirm("Bạn có chắc muốn làm lại từ đầu? Toàn bộ đáp án cũ sẽ bị xóa!")) {
            setDisplay('mockResultScreen', 'none');
            window.examUserAnswers = {};
            window.examMarkedQuestions = {};
            currentExamPageIndex = 0;
            window.isMockReviewMode = false;
            
            setDisplay('realMockTestRoom', 'flex');
            // Dùng lại thời gian chuẩn đã lưu thay vì gọi rỗng (gọi rỗng sẽ bị mặc định 120 phút)
            if (currentSetupMode === 'exam') startRealMockTimer(window.currentMockTimeSeconds);
            renderExamPage();
        }
    }
    function redoWrongMockTest() {
        // Lọc ra danh sách những câu đã chọn sai hoặc chưa chọn
        let wrongQs = currentMockQuestions.filter(q => window.examUserAnswers[q.qNo] !== q.correct);
        
        if (wrongQs.length === 0) {
            return showToast("🎉 Chúc mừng! Bạn không có câu sai nào để làm lại.");
        }

        if (confirm(`Bạn có chắc muốn làm lại ${wrongQs.length} câu sai này?`)) {
            setDisplay('mockResultScreen', 'none');
            
            // Ép bộ đề chỉ còn lại các câu sai
            currentMockQuestions = wrongQs;
            window.examUserAnswers = {};
            window.examMarkedQuestions = {};
            currentExamPageIndex = 0;
            window.isMockReviewMode = false;
            
            // Chạy lại thuật toán chia trang dựa trên list câu sai
            rebuildPagesForRedo(); 
            
            setDisplay('realMockTestRoom', 'flex');
            // Tắt đồng hồ khi chỉ làm lại câu sai
            document.getElementById('examTimerDisplay').parentElement.style.display = 'none'; 
            renderExamPage();
        }
    }

    // Hàm phụ trợ: Nhóm lại các trang y hệt thuật toán fetch ban đầu
    function rebuildPagesForRedo() {
        examPages = [];
        let tempGroup = [];
        for (let i = 0; i < currentMockQuestions.length; i++) {
            let q = currentMockQuestions[i];
            if (q.part === 1 || q.part === 2 || q.part === 5) {
                if (tempGroup.length > 0) {
                    examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: tempGroup[0].image, passage: tempGroup[0].passage, dir: tempGroup[0].dir });
                    tempGroup = []; 
                }
                examPages.push({ type: 'question', part: q.part, questions: [q], audio: q.audio, image: q.image, passage: q.passage, dir: q.dir });
            } else {
                let isNewListeningGroup = (q.part === 3 || q.part === 4) && (q.audio && q.audio.trim() !== "");
                let isNewReadingGroup = (q.part === 6 || q.part === 7) && ((q.passage && q.passage.trim() !== "") || (q.image && q.image.trim() !== "") || (q.dir && q.dir.trim() !== ""));
                
                if (isNewListeningGroup || isNewReadingGroup) {
                    if (tempGroup.length > 0) examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: tempGroup[0].image, passage: tempGroup[0].passage, dir: tempGroup[0].dir });
                    tempGroup = [q]; 
                } else {
                    if (tempGroup.length > 0 && tempGroup[0].part !== q.part) {
                        examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: tempGroup[0].image, passage: tempGroup[0].passage, dir: tempGroup[0].dir });
                        tempGroup = [q];
                    } else {
                        tempGroup.push(q);
                    }
                }
            }
        }
        if (tempGroup.length > 0) examPages.push({ type: 'question', part: tempGroup[0].part, questions: tempGroup, audio: tempGroup[0].audio, image: tempGroup[0].image, passage: tempGroup[0].passage, dir: tempGroup[0].dir });
    }

    // --- 7. NAVIGATOR ---
    function toggleMarkCurrent() {
        let page = examPages[currentExamPageIndex];
        if (!page || !page.questions || page.questions.length === 0) return;
        let qNo = page.questions[0].qNo;
        
        if (window.examMarkedQuestions[qNo]) {
            delete window.examMarkedQuestions[qNo];
            document.getElementById('btnMarkCurrent').classList.remove('active');
        } else {
            window.examMarkedQuestions[qNo] = true;
            document.getElementById('btnMarkCurrent').classList.add('active');
        }
        renderNavigator(); 
    }

    function updateExamProgress() {
        let answeredCount = Object.keys(window.examUserAnswers).length;
        let badge = document.getElementById('examProgressBadge');
        let footerText = document.getElementById('footerProgressText');
        
        if (badge) badge.innerText = `${answeredCount}/${currentMockQuestions.length}`;
        if (footerText) footerText.innerText = `${answeredCount}/${currentMockQuestions.length}`;
        
        renderNavigator();
    }

    function toggleExamNavigator() {
        let nav = document.getElementById('examNavigatorOverlay');
        if (nav.style.display === 'flex') {
            nav.classList.remove('show');
            setTimeout(() => nav.style.display = 'none', 300);
        } else {
            nav.style.display = 'flex';
            setTimeout(() => nav.classList.add('show'), 10);
        }
    }

    function renderNavigator() {
        let gridArea = document.getElementById('examNavigatorGrid');
        if(!gridArea) return;

        let html = ""; let currentPart = 0;
        currentMockQuestions.forEach((q) => {
            if (q.part !== currentPart) {
                currentPart = q.part;
                html += `</div><div class="nav-part-title">Part ${q.part}</div><div class="nav-grid">`;
            }

            let isAns = window.examUserAnswers[q.qNo] ? 'ans' : '';
            let isMark = window.examMarkedQuestions[q.qNo] ? 'mark' : '';
            let isCur = '';
            
            // Highlight màu đỏ hoặc xanh trong Review Mode
            if (window.isMockReviewMode) {
                let uAns = window.examUserAnswers[q.qNo];
                if (uAns === q.correct) {
                    isAns = 'ans'; // Đúng thì xanh
                } else {
                    isAns = 'mark'; // Sai hoặc bỏ trống thì mượn màu cam đỏ của mark
                }
            }

            let currentPage = examPages[currentExamPageIndex];
            if (currentPage && currentPage.questions && currentPage.questions.some(item => item.qNo === q.qNo)) {
                isCur = 'cur';
            }
            html += `<button class="nav-btn ${isAns} ${isMark} ${isCur}" onclick="jumpToExamQuestion(${q.qNo})">${q.qNo}</button>`;
        });
        
        html += "</div>"; 
        gridArea.innerHTML = html.replace('</div></div>', '</div>'); 
    }

    function jumpToExamQuestion(qNo) {
        let noteModal = document.getElementById('mockNoteModal');
        if (noteModal) noteModal.style.display = 'none';
        let targetPageIndex = examPages.findIndex(page => page.questions && page.questions.some(q => q.qNo === qNo));
        if (targetPageIndex > -1) {
            currentExamPageIndex = targetPageIndex;
            renderExamPage();
            if(window.innerWidth <= 800) toggleExamNavigator(); 
        }
    }
    function showSubmitConfirmModal() {
        // NẾU ĐANG Ở CHẾ ĐỘ XEM LẠI -> Bấm Submit thì đóng vai trò như nút Exit
        if (window.isMockReviewMode) {
            exitMockTest(); 
            return;
        }
        
        // LUỒNG CŨ: Đang làm bài thì hiện Popup xác nhận
        document.getElementById('submitConfirmModal').style.display = 'flex';
    }

    // Tự động đóng Question Navigator khi click ra ngoài bảng
    window.addEventListener('click', function(e) {
        let nav = document.getElementById('examNavigatorOverlay');
        let btnToggle = document.getElementById('footerNavBtnToggle');
        
        // Nếu Bảng 200 câu đang mở
        if (nav && nav.classList.contains('show')) {
            // Nếu click KHÔNG nằm trong Bảng và KHÔNG nằm trong nút Mở bảng -> Đóng bảng lại
            if (!nav.contains(e.target) && btnToggle && !btnToggle.contains(e.target)) {
                toggleExamNavigator();
            }
        }
    });
