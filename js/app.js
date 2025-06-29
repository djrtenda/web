let toastTimeout;
function showNotification(message, isSuccess = false) {
    const toast = document.getElementById('notificationToast');
    const messageEl = document.getElementById('notificationMessage');
    if (!toast || !messageEl) return;
    clearTimeout(toastTimeout);
    messageEl.textContent = message;
    if (isSuccess) {
        toast.classList.remove('bg-red-600');
        toast.classList.add('bg-green-600');
    } else {
        toast.classList.remove('bg-green-600');
        toast.classList.add('bg-red-600');
    }
    toast.classList.remove('translate-y-20', 'opacity-0');
    toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

function showError(message) {
    showNotification(message, false);
}

function showLoginError(message) {
    const errorContainer = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorContainer && errorText) {
        errorText.textContent = message;
        errorContainer.classList.remove('hidden');
    }
}

function hideLoginError() {
    const errorContainer = document.getElementById('errorMessage');
    if (errorContainer) {
        errorContainer.classList.add('hidden');
    }
}

function showLoading(show = true) {
    const loadingState = document.getElementById('loadingState');
    const loginBtn = document.getElementById('loginBtn');
    if (loadingState && loginBtn) {
        if (show) {
            loadingState.classList.remove('hidden');
            loginBtn.disabled = true;
            loginBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            loadingState.classList.add('hidden');
            loginBtn.disabled = false;
            loginBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

async function loginUser(email, password) {
    showLoading(true);
    hideLoginError();

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) throw new Error('Data pengguna tidak ditemukan.');
        const userData = userDoc.data();
        const userRole = userData.role;
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userName', userData.name || user.email);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('loginTime', Date.now().toString());
        if (userRole === 'admin') window.location.href = 'admin.html';
        else if (userRole === 'employee') window.location.href = 'karyawan.html';
        else throw new Error('Role pengguna tidak valid.');
    } catch (error) {
        showLoading(false);
        console.error('Login error:', error);
        let errorMessage;

        switch (error.code) {
            case 'auth/invalid-login-credentials':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Email atau Password yang Anda masukkan salah.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Format email tidak valid.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Terlalu banyak percobaan. Akun Anda diblokir sementara. Coba lagi nanti.';
                break;
            default:
                errorMessage = 'Terjadi kesalahan. Silakan periksa koneksi internet Anda.';
                console.error("Login error tidak terduga:", error);
        }
        
        showLoginError(errorMessage);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(date) {
    if (!date) return 'Tanggal tidak valid';
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function formatNumberInput(inputElement) {
    let value = inputElement.value.replace(/[^,\d]/g, '').toString();
    let split = value.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    inputElement.value = rupiah;
}

function showConfirmDialog({ title, message, confirmText = 'Ya', confirmColor = 'red', onConfirm }) {
    const modal = document.getElementById('genericConfirmModal');
    const modalTitle = document.getElementById('confirmModalTitle');
    const modalMessage = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalConfirmBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');
    const iconContainer = document.getElementById('confirmModalIconContainer');
    const icon = document.getElementById('confirmModalIcon');

    if (!modal) return;

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = confirmText;

    confirmBtn.className = 'px-4 py-2 text-white rounded-md w-24';
    iconContainer.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full';
    icon.className = 'text-xl';
    
    if (confirmColor === 'red') {
        confirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        iconContainer.classList.add('bg-red-100');
        icon.classList.add('fas', 'fa-exclamation-triangle', 'text-red-600');
    } else {
        confirmBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        iconContainer.classList.add('bg-blue-100');
        icon.classList.add('fas', 'fa-question-circle', 'text-blue-600');
    }
    
    modal.classList.remove('hidden');

    const handleCancel = () => {
        modal.classList.add('hidden');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    const handleConfirm = () => {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
        handleCancel();
    };

    cancelBtn.onclick = handleCancel;
    confirmBtn.onclick = handleConfirm;
}

function setButtonLoadingState(buttonElement, isLoading, loadingText = null) {
    if (!buttonElement) return;

    const spinner = `<i class="fas fa-spinner fa-spin mr-2"></i>`;
    
    if (isLoading) {
        buttonElement.dataset.originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = spinner + (loadingText || 'Memproses...');
        buttonElement.disabled = true;
        buttonElement.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
        buttonElement.innerHTML = buttonElement.dataset.originalText || buttonElement.innerHTML;
        buttonElement.disabled = false;
        buttonElement.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        const currentPage = window.location.pathname.split('/').pop();
        if (user) {
            if (currentPage === 'index.html' || currentPage === '') {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userRole = userDoc.data().role;
                        if (userRole === 'admin') window.location.href = 'admin.html';
                        else if (userRole === 'employee') window.location.href = 'karyawan.html';
                    } else { await auth.signOut(); }
                } catch (error) { console.error('Error getting user data:', error); }
            }
        } else {
            if (currentPage !== 'index.html' && currentPage !== '') window.location.href = 'index.html';
        }
    });
}

function logoutUser() {
    const processLogout = () => {
        auth.signOut().then(() => {
            localStorage.clear();
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Logout error:', error);
            showError('Terjadi kesalahan saat logout.');
        });
    };

    showConfirmDialog({
        title: 'Konfirmasi Logout',
        message: 'Apakah Anda yakin ingin keluar dari sesi ini?',
        confirmText: 'Keluar',
        confirmColor: 'red',
        onConfirm: processLogout
    });
}

function checkUserRole(requiredRole) {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== requiredRole) {
        alert('Akses ditolak. Anda tidak memiliki izin untuk mengakses halaman ini.');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            if (!email || !password) return showLoginError('Mohon isi email dan password.');
            loginUser(email, password);
        });

        if(emailInput) emailInput.addEventListener('input', hideLoginError);
        if(passwordInput) passwordInput.addEventListener('input', hideLoginError);
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    }
});

window.DJRTenda = {
    formatCurrency,
    formatDate,
    formatNumberInput,
    showError,
    showNotification,
    showLoading,
    checkUserRole,
    logoutUser,
    showConfirmDialog,
    setButtonLoadingState
};