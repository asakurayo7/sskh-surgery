document.addEventListener('DOMContentLoaded', () => {

    // --- SUPABASE SETUP ---
    const SUPABASE_URL = 'https://rsvlykazztecrqejppsk.supabase.co'; // << URL ของคุณ (ใส่ให้แล้ว)
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdmx5a2F6enRlY3JxZWpwcHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODEwMzQsImV4cCI6MjA2ODY1NzAzNH0.9ZMwVOuCt6OoZclJ9TPRSh0AVPyN9tegQ5_GZpOHdu4'; // << ใส่ Anon Key ของคุณที่นี่

    // บรรทัดที่แก้ไข: เปลี่ยนชื่อตัวแปรที่เราสร้างเป็น 'supabaseClient'
    // เพื่อไม่ให้ซ้ำกับ 'supabase' ที่มาจาก Library
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- GLOBAL VARIABLES & DOM ELEMENTS ---
    let calendar;
    let currentUserProfile = null;

    // (ส่วนนี้เหมือนเดิม)
    const authScreen = document.getElementById('auth-screen');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authError = document.getElementById('auth-error');
    const appScreen = document.getElementById('app-screen');
    const welcomeMessage = document.getElementById('welcome-message');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const roomFilter = document.getElementById('room-filter');
    const bookingModal = document.getElementById('booking-modal');
    const bookingForm = document.getElementById('booking-form');
    const modalTitle = document.getElementById('modal-title');
    const bookingIdInput = document.getElementById('booking-id');
    const patientHnInput = document.getElementById('patient-hn');
    const patientNameInput = document.getElementById('patient-name');
    const diagnosisInput = document.getElementById('diagnosis');
    const operationInput = document.getElementById('operation');
    const bookingDateInput = document.getElementById('booking-date');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const roomSelect = document.getElementById('room-select');
    const recorderInfoDiv = document.getElementById('recorder-info');
    const recorderNameInput = document.getElementById('recorder-name');
    const deleteBtn = document.getElementById('delete-btn');
    const saveBtn = document.getElementById('save-btn');
    const formError = document.getElementById('form-error');
    const adminModal = document.getElementById('admin-modal');
    const inviteUserForm = document.getElementById('invite-user-form');
    const userListContainer = document.getElementById('user-list-container');


    // --- AUTHENTICATION (แก้ไขให้ใช้ supabaseClient) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        console.log('Attempting login...', email);
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        if (error) {
            console.error('Login error:', error);
            authError.textContent = `Login ไม่สำเร็จ: ${error.message}`;
        } else {
            console.log('Login successful:', data);
            authError.textContent = '';
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const username = document.getElementById('signup-username').value;
        const fullName = document.getElementById('signup-full-name').value;
        
        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { username, full_name: fullName } }
        });

        if (error) {
            authError.textContent = `สมัครไม่สำเร็จ: ${error.message}`;
        } else {
            Swal.fire({
                icon: 'success',
                title: 'สมัครสมาชิกสำเร็จ!',
                text: 'กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ',
                confirmButtonText: 'ตกลง'
            }).then(() => {
                document.getElementById('show-login').click();
            });
        }
    });

    logoutBtn.addEventListener('click', async () => {
        const result = await Swal.fire({
            title: 'ยืนยันการออกจากระบบ',
            text: 'คุณต้องการออกจากระบบใช่หรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ออกจากระบบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            await supabaseClient.auth.signOut();
            
            // แสดงข้อความยืนยันการออกจากระบบ
            Swal.fire({
                icon: 'success',
                title: 'ออกจากระบบสำเร็จ',
                text: 'คุณได้ออกจากระบบเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session && session.user) {
            try {
                console.log('Trying to fetch profile for user:', session.user.id);
                
                // เพิ่ม timeout สำหรับ database query
                const profilePromise = supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database query timeout')), 5000)
                );
                
                let profile, error;
                try {
                    const result = await Promise.race([profilePromise, timeoutPromise]);
                    profile = result.data;
                    error = result.error;
                } catch (timeoutError) {
                    console.log('Database query timed out or failed:', timeoutError.message);
                    error = timeoutError;
                }
                
                console.log('Profile query result:', { profile, error, errorCode: error?.code, errorMessage: error?.message });
                
                // ถ้ามี error ใดๆ (รวมถึง timeout) ให้ใช้ fallback
                if (error) {
                    console.log('Database error or timeout, using fallback profile');
                    currentUserProfile = {
                        id: session.user.id,
                        username: session.user.user_metadata?.username || session.user.email.split('@')[0],
                        full_name: session.user.user_metadata?.full_name || session.user.email,
                        role: 'doctor'
                    };
                    console.log('Fallback profile created:', currentUserProfile);
                    showApp();
                    return;
                }
                
                if (!profile) {
                    console.log('Creating new profile...');
                    // สร้าง profile ใหม่จาก user metadata
                    const { data: newProfile, error: insertError } = await supabaseClient.from('profiles').insert({
                        id: session.user.id,
                        username: session.user.user_metadata?.username || session.user.email.split('@')[0],
                        full_name: session.user.user_metadata?.full_name || session.user.email,
                        role: 'doctor'
                    }).select().single();
                    
                    if (insertError) {
                        console.error('Error creating profile:', insertError);
                        // ถ้าไม่สามารถสร้าง profile ได้ ให้ใช้ข้อมูลจาก session แทน
                        currentUserProfile = {
                            id: session.user.id,
                            username: session.user.user_metadata?.username || session.user.email.split('@')[0],
                            full_name: session.user.user_metadata?.full_name || session.user.email,
                            role: 'doctor'
                        };
                    } else {
                        profile = newProfile;
                        currentUserProfile = profile;
                    }
                } else {
                    currentUserProfile = profile;
                }
                
                console.log('Current user profile:', currentUserProfile);
                showApp();
            } catch (err) {
                console.error('Unexpected error in auth state change:', err);
                // ถ้ามี error ก็ยังให้ login ได้ แต่ใช้ข้อมูลจาก session
                currentUserProfile = {
                    id: session.user.id,
                    username: session.user.user_metadata?.username || session.user.email.split('@')[0],
                    full_name: session.user.user_metadata?.full_name || session.user.email,
                    role: 'doctor'
                };
                showApp();
            }
        } else {
            currentUserProfile = null;
            showAuth();
        }
    });

    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.remove('active'); signupForm.classList.add('active'); authError.textContent = ''; });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.remove('active'); loginForm.classList.add('active'); authError.textContent = ''; });

    // Room filter event listener
    roomFilter.addEventListener('change', refreshData);


    // --- UI Management ---
    function showAuth() { 
        authScreen.classList.add('active'); 
        appScreen.classList.remove('active'); 
        
        // รีเซ็ตฟอร์มเมื่อกลับมาหน้า login
        loginForm.reset();
        signupForm.reset();
        authError.textContent = '';
        
        // แสดงฟอร์ม login เป็นค่าเริ่มต้น
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    }
    function showApp() {
        authScreen.classList.remove('active');
        appScreen.classList.add('active');
        welcomeMessage.textContent = `ยินดีต้อนรับ, ${currentUserProfile.full_name}`;
        
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = currentUserProfile.role === 'admin' ? 'inline-block' : 'none');
        
        if (!calendar) {
            initializeCalendar();
            renderBookingTable(); // แสดงตารางครั้งแรก
        }
        refreshData();
    }
    
    // --- Calendar & Data ---
    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        
        // ตรวจสอบขนาดหน้าจอเพื่อกำหนด initial view
        const isMobile = window.innerWidth <= 768;
        const initialView = 'dayGridMonth'; // ใช้ view เดียวกันทั้งมือถือและเดสก์ท็อป
        
        // กำหนด header toolbar สำหรับมือถือและเดสก์ท็อป
        const headerToolbar = isMobile 
            ? { left: 'prev,next', center: 'title', right: 'today' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' };
        
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: initialView,
            headerToolbar: headerToolbar,
            locale: 'th',
            selectable: true,
            height: isMobile ? 'auto' : 600,
            aspectRatio: isMobile ? 0.8 : 1.35,
            eventDisplay: 'block',
            dayMaxEvents: isMobile ? 1 : 3,
            moreLinkClick: 'popover',
            dayMaxEventRows: isMobile ? 2 : false,
            dateClick: (info) => openBookingModal(info.dateStr),
            eventClick: (info) => openBookingModal(null, info.event.id),
            datesSet: function(info) {
                // เมื่อปฏิทินเปลี่ยนเดือน ให้อัพเดตตารางด้วย
                // ใช้วันที่กลางเดือนแทน info.start เพื่อให้แน่ใจว่าเป็นเดือนที่ถูกต้อง
                const midMonth = new Date(info.start.getTime() + (info.end.getTime() - info.start.getTime()) / 2);
                renderBookingTable(midMonth);
            },
            // เพิ่มการจัดการขนาดหน้าจอแบบ responsive
            windowResize: function() {
                const newIsMobile = window.innerWidth <= 768;
                if (newIsMobile !== isMobile) {
                    // รีเฟรชปฏิทินเมื่อขนาดหน้าจอเปลี่ยน
                    location.reload();
                }
            }
        });
        calendar.render();
    }

    async function refreshData() {
        const events = await getBookingsForCalendar();
        calendar.removeAllEvents();
        calendar.addEventSource(events);
        // ไม่เรียก renderBookingTable() ที่นี่ เพราะจะเรียกจาก datesSet แทน
    }

    async function getBookingsForCalendar() {
        // รับวันที่จากปฏิทิน
        const currentDate = calendar ? calendar.getDate() : new Date();
        const filter = roomFilter.value;
        
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        let query = supabaseClient
            .from('bookings')
            .select('*')
            .gte('startTime', startOfMonth)
            .lte('startTime', endOfMonth);
            
        if (filter !== 'all') query = query.eq('room', filter);

        const { data: bookings, error } = await query;
        if (error) { console.error("Error fetching bookings:", error); return []; }

        return bookings.map(b => ({
            id: b.id,
            title: b.patientName,
            start: b.startTime,
            end: b.endTime,
            extendedProps: { ...b, doctorName: currentUserProfile?.full_name || 'แพทย์' },
            backgroundColor: b.room === 'OR5' ? '#3788d8' : '#34a853',
            borderColor: b.room === 'OR5' ? '#3788d8' : '#34a853'
        }));
    }

    // --- Table View ---
    async function renderBookingTable(calendarDate = null) {
        const tableContainer = document.getElementById('booking-table');
        
        // ใช้วันที่จากปฏิทินหรือวันที่ปัจจุบัน
        const targetDate = calendarDate || (calendar ? calendar.getDate() : new Date());
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString();
        const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        const { data: bookings } = await supabaseClient
            .from('bookings')
            .select('*')
            .gte('startTime', startOfMonth)
            .lte('startTime', endOfMonth)
            .order('startTime', { ascending: false });
            
        // ดึงข้อมูลแพทย์แยกต่างหาก
        if (bookings && bookings.length > 0) {
            const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];
            const { data: profiles } = await supabaseClient
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);
                
            // เพิ่มข้อมูลแพทย์เข้าไปใน bookings
            bookings.forEach(booking => {
                const profile = profiles?.find(p => p.id === booking.user_id);
                booking.doctorName = profile?.full_name || 'แพทย์';
            });
        }
            
        if (!bookings || bookings.length === 0) { 
            tableContainer.innerHTML = `<p>ไม่มีรายการนัดผ่าตัดในเดือน ${targetDate.toLocaleDateString('th-TH', {month: 'long', year: 'numeric'})}</p>`; 
            return; 
        }

        // ตรวจสอบว่าเป็นมือถือหรือไม่ เพื่อปรับตาราง
        const isMobile = window.innerWidth <= 768;
        
        let tableHTML;
        if (isMobile) {
            // รูปแบบการ์ดสำหรับมือถือ
            tableHTML = `<div class="mobile-cards">`;
            bookings.forEach(b => {
                const start = new Date(b.startTime);
                const end = new Date(b.endTime);
                tableHTML += `<div class="booking-card" data-id="${b.id}">
                    <div class="card-header">
                        <span class="patient-name">${b.patientName}</span>
                        <span class="room-badge ${b.room.toLowerCase()}">${b.room}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <strong>วันที่:</strong> ${start.toLocaleDateString('th-TH')}
                        </div>
                        <div class="card-row">
                            <strong>เวลา:</strong> ${start.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}
                        </div>
                        <div class="card-row">
                            <strong>HN:</strong> ${b.patientHn || '-'}
                        </div>
                        <div class="card-row">
                            <strong>Operation:</strong> ${b.operation}
                        </div>
                        <div class="card-row">
                            <strong>แพทย์:</strong> ${b.doctorName}
                        </div>
                    </div>
                </div>`;
            });
            tableHTML += '</div>';
        } else {
            // รูปแบบตารางปกติสำหรับเดสก์ท็อป
            tableHTML = `<table><thead><tr><th>วันที่</th><th>เวลา</th><th>ห้อง</th><th>HN</th><th>ชื่อผู้ป่วย</th><th>Operation</th><th>แพทย์</th></tr></thead><tbody>`;
            bookings.forEach(b => {
                const start = new Date(b.startTime);
                tableHTML += `<tr data-id="${b.id}">
                    <td>${start.toLocaleDateString('th-TH')}</td>
                    <td>${start.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} - ${new Date(b.endTime).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</td>
                    <td>${b.room}</td>
                    <td>${b.patientHn || '-'}</td>
                    <td>${b.patientName}</td>
                    <td>${b.operation}</td>
                    <td>${b.doctorName}</td>
                </tr>`;
            });
            tableHTML += '</tbody></table>';
        }
        
        tableContainer.innerHTML = tableHTML;
        
        // เพิ่ม event listeners สำหรับทั้งตารางและการ์ด
        if (isMobile) {
            tableContainer.querySelectorAll('.booking-card[data-id]').forEach(card => 
                card.addEventListener('click', () => openBookingModal(null, card.dataset.id))
            );
        } else {
            tableContainer.querySelectorAll('tr[data-id]').forEach(row => 
                row.addEventListener('click', () => openBookingModal(null, row.dataset.id))
            );
        }
    }


    // --- Booking Modal Logic ---
    async function openBookingModal(dateStr, bookingId = null) {
        bookingForm.reset();
        formError.textContent = '';
        saveBtn.disabled = false;
        
        if (bookingId) {
            const { data: booking } = await supabaseClient
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            if (!booking) return;
            
            // ดึงข้อมูลแพทย์ผู้บันทึกแยกต่างหาก
            let doctorName = 'แพทย์';
            if (booking.user_id) {
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('full_name')
                    .eq('id', booking.user_id)
                    .single();
                if (profile) {
                    doctorName = profile.full_name;
                }
            }

            modalTitle.textContent = 'รายละเอียดการจอง';
            bookingIdInput.value = booking.id;
            patientHnInput.value = booking.patientHn || '';
            patientNameInput.value = booking.patientName;
            diagnosisInput.value = booking.diagnosis;
            operationInput.value = booking.operation;
            
            // แยกวันที่และเวลา
            const startDate = new Date(booking.startTime);
            const endDate = new Date(booking.endTime);
            bookingDateInput.value = startDate.toISOString().slice(0, 10);
            startTimeInput.value = startDate.toTimeString().slice(0, 5);
            endTimeInput.value = endDate.toTimeString().slice(0, 5);
            
            roomSelect.value = booking.room;
            
            // แสดงข้อมูลผู้บันทึก
            recorderInfoDiv.style.display = 'block';
            recorderNameInput.value = doctorName;

            const canEdit = currentUserProfile.role === 'admin' || currentUserProfile.id === booking.user_id;
            deleteBtn.style.display = 'none'; // ซ่อนปุ่มลบไว้ก่อน
            saveBtn.style.display = 'none';   // ซ่อนปุ่มบันทึกไว้ก่อน
            Array.from(bookingForm.elements).forEach(el => el.disabled = true); // ปิดการแก้ไขทุกฟิลด์
            
            // เพิ่มปุ่มแก้ไข
            if (canEdit) {
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.id = 'edit-btn';
                editBtn.textContent = 'แก้ไข';
                editBtn.className = 'edit-btn';
                editBtn.addEventListener('click', () => {
                    // เปิดการแก้ไข
                    modalTitle.textContent = 'แก้ไขการจอง';
                    Array.from(bookingForm.elements).forEach(el => el.disabled = false);
                    deleteBtn.style.display = 'inline-block';
                    saveBtn.style.display = 'inline-block';
                    editBtn.style.display = 'none';
                });
                
                // เพิ่มปุ่มแก้ไขเข้าไปใน form-buttons
                const formButtons = document.querySelector('.form-buttons');
                if (document.getElementById('edit-btn')) {
                    document.getElementById('edit-btn').remove();
                }
                formButtons.insertBefore(editBtn, formButtons.firstChild);
            }

        } else {
            modalTitle.textContent = 'บันทึกตารางผ่าตัด';
            bookingDateInput.value = dateStr;
            startTimeInput.value = '08:00';
            endTimeInput.value = '10:00';
            
            // ซ่อนข้อมูลผู้บันทึกเมื่อสร้างใหม่
            recorderInfoDiv.style.display = 'none';
            
            deleteBtn.style.display = 'none';
            saveBtn.style.display = 'inline-block';
            Array.from(bookingForm.elements).forEach(el => el.disabled = false);
        }
        bookingModal.style.display = 'flex';
    }

    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        saveBtn.disabled = true;

        // รวมวันที่และเวลา
        const startDateTime = new Date(`${bookingDateInput.value}T${startTimeInput.value}:00`);
        const endDateTime = new Date(`${bookingDateInput.value}T${endTimeInput.value}:00`);
        
        const bookingData = {
            patientHn: patientHnInput.value,
            patientName: patientNameInput.value,
            diagnosis: diagnosisInput.value,
            operation: operationInput.value,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            room: roomSelect.value,
            user_id: currentUserProfile.id
        };
        
        if (new Date(bookingData.endTime) <= new Date(bookingData.startTime)) {
            formError.textContent = 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น';
            saveBtn.disabled = false;
            return;
        }

        const query = bookingIdInput.value
            ? supabaseClient.from('bookings').update(bookingData).eq('id', bookingIdInput.value)
            : supabaseClient.from('bookings').insert(bookingData);
        
        const { error } = await query;
        if (error) {
            console.error('Booking save error:', error);
            formError.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
        } else {
            closeAllModals();
            refreshData();
            renderBookingTable(); // อัพเดทตารางหลังจากบันทึก
            
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'รายการถูกบันทึกเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
        }
        saveBtn.disabled = false;
    });

    deleteBtn.addEventListener('click', async function() {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบรายการนี้ใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) return;

        const { error } = await supabaseClient.from('bookings').delete().eq('id', bookingIdInput.value);
        if (error) {
            console.error('Booking delete error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message,
                confirmButtonText: 'ตกลง'
            });
        } else {
            closeAllModals(); 
            refreshData();
            renderBookingTable(); // อัพเดทตารางหลังจากลบ
            
            Swal.fire({
                icon: 'success',
                title: 'ลบสำเร็จ',
                text: 'รายการถูกลบเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });

    // --- Admin Panel Logic (Simplified) ---
    adminPanelBtn.addEventListener('click', () => {
        // ปิดการใช้งาน admin panel ชั่วคราว
        Swal.fire({
            icon: 'info',
            title: 'ฟีเจอร์ยังไม่พร้อม',
            text: 'ฟีเจอร์จัดการผู้ใช้ยังไม่พร้อมใช้งาน',
            confirmButtonText: 'ตกลง'
        });
    });

    // --- General ---
    function closeAllModals() {
        bookingModal.style.display = 'none';
        adminModal.style.display = 'none';
    }
    document.querySelectorAll('.modal .close-btn').forEach(btn => btn.addEventListener('click', closeAllModals));
    window.addEventListener('click', (event) => { if (event.target.classList.contains('modal')) closeAllModals(); });
});
