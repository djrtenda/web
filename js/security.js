const Security = {
    sanitizeInput: function(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    },
    
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    validatePassword: function(password) {
        return {
            isValid: password.length >= 6,
            message: password.length < 6 ? 'Password minimal 6 karakter' : ''
        };
    },
    
    validateAmount: function(amount) {
        const numAmount = parseFloat(amount);
        return {
            isValid: !isNaN(numAmount) && numAmount > 0 && numAmount <= 999999999,
            message: isNaN(numAmount) || numAmount <= 0 ? 'Jumlah harus lebih dari 0' : 
                    numAmount > 999999999 ? 'Jumlah terlalu besar' : ''
        };
    },
    
    rateLimiter: {
        actions: {},
        
        canPerformAction: function(actionKey, maxAttempts = 5, timeWindow = 60000) {
            const now = Date.now();
            
            if (!this.actions[actionKey]) {
                this.actions[actionKey] = [];
            }
            
            this.actions[actionKey] = this.actions[actionKey].filter(
                timestamp => now - timestamp < timeWindow
            );
            
            if (this.actions[actionKey].length >= maxAttempts) {
                return false;
            }
            
            this.actions[actionKey].push(now);
            return true;
        }
    },
    
    session: {
        isSessionValid: function() {
            const loginTime = localStorage.getItem('loginTime');
            if (!loginTime) return false;
            
            const sessionDuration = 8 * 60 * 60 * 1000; // 8 hours
            const now = Date.now();
            
            return (now - parseInt(loginTime)) < sessionDuration;
        },
        
        updateSession: function() {
            localStorage.setItem('loginTime', Date.now().toString());
        },
        
        clearSession: function() {
            localStorage.removeItem('loginTime');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            localStorage.removeItem('userId');
        }
    },
    
    encrypt: function(data) {
        try {
            return btoa(JSON.stringify(data));
        } catch (e) {
            return data;
        }
    },
    
    decrypt: function(encryptedData) {
        try {
            return JSON.parse(atob(encryptedData));
        } catch (e) {
            return encryptedData;
        }
    }
};

function validateForm(formId, rules) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    const errors = [];
    
    for (const fieldName in rules) {
        const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!field) continue;
        
        const value = field.value.trim();
        const rule = rules[fieldName];
        
        if (rule.required && !value) {
            errors.push(`${rule.label} wajib diisi`);
            field.classList.add('border-red-500');
            isValid = false;
            continue;
        }
        
        if (!value && !rule.required) continue;
        
        if (rule.type === 'email' && !Security.validateEmail(value)) {
            errors.push(`${rule.label} tidak valid`);
            field.classList.add('border-red-500');
            isValid = false;
        }
        
        if (rule.type === 'password') {
            const validation = Security.validatePassword(value);
            if (!validation.isValid) {
                errors.push(`${rule.label}: ${validation.message}`);
                field.classList.add('border-red-500');
                isValid = false;
            }
        }
        
        if (rule.type === 'amount') {
            const validation = Security.validateAmount(value);
            if (!validation.isValid) {
                errors.push(`${rule.label}: ${validation.message}`);
                field.classList.add('border-red-500');
                isValid = false;
            }
        }
        
        if (rule.minLength && value.length < rule.minLength) {
            errors.push(`${rule.label} minimal ${rule.minLength} karakter`);
            field.classList.add('border-red-500');
            isValid = false;
        }
        
        if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`${rule.label} maksimal ${rule.maxLength} karakter`);
            field.classList.add('border-red-500');
            isValid = false;
        }
        
        if (rule.custom && !rule.custom(value)) {
            errors.push(`${rule.label} tidak valid`);
            field.classList.add('border-red-500');
            isValid = false;
        }
        
        if (isValid) {
            field.classList.remove('border-red-500');
        }
    }
    
    if (errors.length > 0) {
        DJRTenda.showError(errors.join('\n'));
    }
    
    return isValid;
}

// =========================================================================
// RUMAH DIMULAI DI SINI. Semua kode yang perlu jalan setelah halaman siap,
// dimasukkan ke dalam sini.
// =========================================================================
document.addEventListener('DOMContentLoaded', function() {

    const currentPagePath = window.location.pathname;

    // --- BLOK PENGECEKAN SESI (SATU-SATUNYA YANG KITA DEBATIN) ---
    if (!currentPagePath.endsWith('/index.html') && currentPagePath !== '/' && currentPagePath.split('/').pop() !== '') {
        if (!Security.session.isSessionValid()) {
            // Tampilkan alert hanya jika session benar-benar tidak valid
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            Security.session.clearSession();
            window.location.href = 'index.html';
            return; // Sekarang ini legal karena ada di dalam fungsi
        }

        // Perbarui timestamp session jika valid
        Security.session.updateSession();
    }

    // --- BLOK ANTI KLIK KANAN & DEVTOOLS ---
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
            }
        });
    }

    // --- EVENT LISTENER LAINNYA ---
    window.addEventListener('beforeunload', function() {
        // Bisa diisi sesuatu nanti jika perlu
    });

    document.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            const originalValue = e.target.value;
            const sanitizedValue = Security.sanitizeInput(originalValue);
            
            if (originalValue !== sanitizedValue) {
                e.target.value = sanitizedValue;
            }
        }
    });

    document.addEventListener('submit', function(e) {
        const form = e.target;
        const formId = form.id || 'unknown';
        
        if (!Security.rateLimiter.canPerformAction(`form_${formId}`, 3, 30000)) {
            e.preventDefault();
            DJRTenda.showError('Terlalu banyak percobaan. Silakan tunggu 30 detik.');
            return false;
        }
    });
});


function logSecurityEvent(event, details) {
    console.warn(`Security Event: ${event}`, details);
    
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    }
}

window.Security = Security;
window.validateForm = validateForm;
window.logSecurityEvent = logSecurityEvent;
