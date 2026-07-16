const APP_VERSION = "v133";
// ==========================================
// 🚀 TRẠM KIỂM LÂM PHIÊN BẢN (BỌC THÉP CHỐNG CRASH)
// ==========================================
async function checkVersionAndForceLogout() {
    let currentLocalVersion = localStorage.getItem('charnishere_app_version');

    if (currentLocalVersion !== APP_VERSION) {
        console.log(`🔄 Phát hiện bản cập nhật mới (${APP_VERSION}). Đang ép đăng xuất...`);

        // 1. CHỐT PHIÊN BẢN MỚI NGAY LẬP TỨC để bẻ gãy vòng lặp F5 chết chóc
        localStorage.setItem('charnishere_app_version', APP_VERSION);

        // 2. Thu hồi thẻ đăng nhập cũ
        localStorage.removeItem('charnishere_active_user');

        // 3. Dọn dẹp với áo giáp Try-Catch (Lỗi kệ nó, web vẫn sống!)
        try {
            if (typeof localforage !== 'undefined') await localforage.clear();
        } catch(e) { console.log("Bỏ qua lỗi Forage"); }

        try {
            if (typeof supabaseClient !== 'undefined') await supabaseClient.auth.signOut();
        } catch(e) { console.log("Bỏ qua lỗi Supabase"); }

        // 4. Ép tải lại trang an toàn
        window.location.reload(true);
    }
}

// Kích hoạt trạm kiểm lâm ngay khi web vừa tải xong
window.addEventListener('load', checkVersionAndForceLogout);

// KHỞI TẠO LÔ CỐT SUPABASE
const supabaseUrl = 'https://ngcapkjakeyxksugcysw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nY2Fwa2pha2V5eGtzdWdjeXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NTU3MzYsImV4cCI6MjA5MDQzMTczNn0.GNAaX_TImNaKWKp9jcOoBAaYgk6XNEwcJ8X46pzbks0';

// Tạo cổng kết nối
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("✅ Đã thiết lập kết nối an toàn với Supabase!");
// 1. LỆNH MỞ CỬA: Đăng nhập bằng Google qua Supabase
async function loginWithSupabase() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
    });
    if (error) alert("Lỗi đăng nhập: " + error.message);
}

// ==========================================
// 2. HỆ THỐNG XỬ LÝ ĐĂNG NHẬP LÕI (Dùng chung cho cả F5 và Login)
// ==========================================
async function processUserLogin(session) {
    const user = session.user;
    const userEmail = user.email.toLowerCase();
    const userName = user.user_metadata?.full_name || userEmail.split('@')[0];
    
    // 🪪 ĐÓNG MỘC GHI DANH NGAY LẬP TỨC KHI VỪA BƯỚC VÀO CỬA
    try {
        await supabaseClient.from('legacy_progress').upsert({
            email: userEmail,
            full_name: userName,
            last_active: new Date().toISOString()
        }, { onConflict: 'email', ignoreDuplicates: true }); 
        // ignoreDuplicates: true -> Giúp bảo vệ dữ liệu cũ, chỉ tạo mới nếu là người lần đầu tiên vào web
    } catch(e) { console.log("Lỗi ghi danh ban đầu"); }
    
    // 🔍 KIỂM TRA HỒ SƠ VIP TRÊN SUPABASE
    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(); 
        
    if (profileError) console.log("Bỏ qua lỗi profile:", profileError.message);
        
    let userRole = profile ? profile.role : 'FREE';
    
    // 👑 ĐẶC QUYỀN TỐI THƯỢNG: Định danh Charlie Admin
    if (userEmail === 'thienythienty@gmail.com') {
        userRole = 'ADMIN';
    }
    
    // 🚀 BƯỚC QUAN TRỌNG NHẤT: Khai báo biến toàn cục để các file khác (như mocktest.js) đọc được
    window.studentRole = userRole; 

    // Cấp thẻ tên cho trình duyệt nhớ
    studentID = userEmail;
    localStorage.setItem('charnishere_active_user', studentID);
    localStorage.setItem('charnishere_user_name', userName);
    localStorage.setItem('charnishere_user_role', userRole);

    // 👑 MỞ KHÓA TÍNH NĂNG NẾU LÀ TÀI KHOẢN PRO
    if (userRole === 'PRO') {
        const mockBtn = document.querySelector('.choice-btn.locked');
        if(mockBtn) {
            mockBtn.classList.remove('locked'); 
            mockBtn.onclick = function() { openMockTestHub(); }; 
            
            const badge = mockBtn.querySelector('.coming-soon-badge');
            if(badge) {
                badge.innerHTML = '👑 PRO';
                badge.style.background = '#F59E0B'; 
            }
        }
    }
    // 👁️‍🗨️ HIỆN NÚT QUẢN TRỊ NẾU LÀ ADMIN CHARLIE
    if (userRole === 'ADMIN') {
        const adminBtn = document.getElementById('adminDashboardBtn');
        if (adminBtn) adminBtn.style.display = 'flex';
    }
    // Xóa màn hình chờ và cho phép vào App
    let loginScreen = document.getElementById('loginScreen');
    if(loginScreen) loginScreen.style.display = 'none';
    
    if (typeof proceedToApp === "function") {
        proceedToApp(userName, userRole);
    // 🚀 KÍCH HOẠT KIỂM TRA "ÔN TẬP NHANH" (Chỉ gọi sau khi đã vào App an toàn)
        setTimeout(() => {
            if (typeof checkQuickReviewTrigger === 'function') checkQuickReviewTrigger();
        }, 1500); // Trì hoãn 1.5s để Data kịp tải xong
    }
}

// ==========================================
// 2A. ĐÓN KHÁCH KHI BẤM NÚT GOOGLE ĐĂNG NHẬP
// ==========================================
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    // Chỉ phản ứng khi có hành động Login trực tiếp
    if (event === 'SIGNED_IN' && session) {
        console.log("👋 Chào mừng khách mới đăng nhập!");
        processUserLogin(session);
    }
});

// ==========================================
// 2B. KHÔI PHỤC TRÍ NHỚ KHI ẤN F5 TẢI LẠI TRANG
// ==========================================
async function restoreSessionOnF5() {
    // Ép Supabase quét lại ổ cứng xem có thẻ đăng nhập cũ không
    const { data, error } = await supabaseClient.auth.getSession();
    
    if (data.session) {
        console.log("✅ Đã nhớ ra bạn! Khôi phục phiên đăng nhập...");
        processUserLogin(data.session);
    } else {
        console.log("⚠️ Không có thẻ. Vui lòng đăng nhập.");
        let loginScreen = document.getElementById('loginScreen');
        if (loginScreen) loginScreen.style.display = 'flex';
    }
}

// Gọi chức năng kiểm tra trí nhớ ngay khi web vừa load xong
window.addEventListener('DOMContentLoaded', restoreSessionOnF5);
// 3. LỆNH ĐÓNG CỬA: Đăng xuất an toàn tuyệt đối (Có hẹn giờ chống kẹt)
async function logoutSupabase() {
    if(confirm("Bạn có chắc chắn muốn đăng xuất khỏi thiết bị?")) {
        
        // Cú chốt: Đặt bom hẹn giờ 3 giây. Nếu mạng lag/kẹt, ép đăng xuất luôn!
        let forceLogout = () => {
            localStorage.removeItem('charnishere_active_user'); 
            window.location.href = window.location.pathname; 
        };
        let timeout = setTimeout(forceLogout, 3000);

        try { await pushToCloud(); } catch(e) { console.log("Bỏ qua lỗi lưu"); }
        try { await supabaseClient.auth.signOut(); } catch(e) { console.log("Bỏ qua lỗi Supabase"); }
        
        // Nếu lưu mượt mà trước 3 giây thì tắt bom và ra ngoài
        clearTimeout(timeout);
        forceLogout();
    }
}
