if (!DJRTenda.checkUserRole('employee')) {}

let currentUser = null;
let userBalance = 0;
let transactions = [];
let withdrawals = [];

const currentBalanceEl = document.getElementById('currentBalance');
const lastUpdatedEl = document.getElementById('lastUpdated');
const totalReceivedEl = document.getElementById('totalReceived');
const totalWithdrawnEl = document.getElementById('totalWithdrawn');
const pendingWithdrawalsEl = document.getElementById('pendingWithdrawals');

document.addEventListener('DOMContentLoaded', function() {
    const employeeName = localStorage.getItem('userName') || 'Karyawan';
    document.getElementById('employeeName').textContent = employeeName;
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            setupRealtimeListeners();
        }
    });
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('requestWithdrawalBtn').addEventListener('click', showWithdrawalModal);
    document.getElementById('viewTransactionsBtn').addEventListener('click', scrollToTransactions);
    document.getElementById('cancelWithdrawal').addEventListener('click', hideWithdrawalModal);
    document.getElementById('withdrawalForm').addEventListener('submit', handleWithdrawalRequest);
    document.getElementById('withdrawalAmount').addEventListener('input', function() {
        DJRTenda.formatNumberInput(this);
    });
}

function setupRealtimeListeners() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                userBalance = userData.balance || 0;
                currentBalanceEl.textContent = DJRTenda.formatCurrency(userBalance);
                lastUpdatedEl.textContent = userData.updatedAt ? DJRTenda.formatDate(userData.updatedAt.toDate()) : 'Belum pernah diperbarui';
            }
        }, (error) => {
            console.error("Error listening to user data:", error);
            DJRTenda.showError('Gagal memuat saldo secara real-time.');
        });

    db.collection('transactions').where('employeeId', '==', currentUser.uid).where('type', '==', 'salary').orderBy('createdAt', 'desc').limit(50)
        .onSnapshot((snapshot) => {
            transactions = [];
            snapshot.forEach(doc => transactions.push({
                id: doc.id,
                ...doc.data()
            }));
            renderTransactionsTable();
            updateDashboardStats();
        }, (error) => {
            console.error("Error listening to transactions:", error);
            DJRTenda.showError('Gagal memuat transaksi secara real-time.');
        });

    db.collection('withdrawals').where('employeeId', '==', currentUser.uid).orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            withdrawals = [];
            snapshot.forEach(doc => withdrawals.push({
                id: doc.id,
                ...doc.data()
            }));
            renderTransactionsTable();
            updateDashboardStats();
        }, (error) => {
            console.error("Error listening to withdrawals:", error);
            DJRTenda.showError('Gagal memuat data penarikan secara real-time.');
        });
}


function updateDashboardStats() {
    const totalReceived = transactions.filter(t => t.type === 'salary').reduce((sum, t) => sum + t.amount, 0);
    totalReceivedEl.textContent = DJRTenda.formatCurrency(totalReceived);

    const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved');
    const totalWithdrawnAmount = approvedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    totalWithdrawnEl.textContent = DJRTenda.formatCurrency(totalWithdrawnAmount);

    pendingWithdrawalsEl.textContent = withdrawals.filter(w => w.status === 'pending').length;
}


function renderTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    const noTransactionsEl = document.getElementById('noTransactions');
    tbody.innerHTML = '';

    if (transactions.length === 0 && withdrawals.length === 0) {
        noTransactionsEl.classList.remove('hidden');
        return;
    }
    noTransactionsEl.classList.add('hidden');

    let displayItems = [
        ...transactions.map(t => ({ ...t,
            displayType: 'salary'
        })),
        ...withdrawals.map(w => ({ ...w,
            displayType: 'withdrawal'
        }))
    ].sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

    displayItems.slice(0, 10).forEach(item => {
        const row = document.createElement('tr');
        let typeIcon, typeText, amountClass, amountPrefix, amount, statusBadge, description, date;

        date = DJRTenda.formatDate(item.createdAt.toDate());
        amount = item.amount;
        description = item.description || item.reason || '-';

        if (item.displayType === 'salary') {
            typeIcon = 'fa-plus text-green-600';
            typeText = 'Gaji Masuk';
            amountClass = 'text-green-600';
            amountPrefix = '+';
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Selesai</span>';
        } else {
            typeIcon = 'fa-minus text-red-600';
            typeText = 'Penarikan';
            amountClass = 'text-red-600';
            amountPrefix = '-';
            const status = item.status || 'approved';
            const statusColor = status === 'pending' ? 'yellow' : status === 'approved' ? 'green' : 'red';
            const statusText = status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Disetujui' : 'Ditolak';
            statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800">${statusText}</span>`;
        }

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><i class="fas ${typeIcon} mr-2"></i>${typeText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${amountClass}">${amountPrefix}${DJRTenda.formatCurrency(amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${description}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

function showWithdrawalModal() {
    document.getElementById('availableBalance').textContent = DJRTenda.formatCurrency(userBalance);
    document.getElementById('withdrawalModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('withdrawalAmount').focus(), 100);
}

function hideWithdrawalModal() {
    document.getElementById('withdrawalModal').classList.add('hidden');
    document.getElementById('withdrawalForm').reset();
}

async function handleWithdrawalRequest(e) {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    DJRTenda.setButtonLoadingState(button, true, 'Mengajukan...');

    const timeout = setTimeout(() => {
        DJRTenda.setButtonLoadingState(button, false);
        DJRTenda.showError('Waktu tunggu habis. Periksa koneksi internet Anda.');
    }, 15000);

    try {
        const amount = parseInt(document.getElementById('withdrawalAmount').value.replace(/\./g, ''));
        const reason = document.getElementById('withdrawalReason').value.trim();
        if (!amount || amount <= 0 || amount > userBalance) {
            throw new Error('Jumlah penarikan tidak valid atau melebihi saldo.');
        }

        document.getElementById('confirmAmount').textContent = DJRTenda.formatCurrency(amount);
        const confirmModal = document.getElementById('confirmWithdrawalModal');
        confirmModal.classList.remove('hidden');

        document.getElementById('cancelConfirmWithdrawal').onclick = () => {
            confirmModal.classList.add('hidden');
            clearTimeout(timeout);
            DJRTenda.setButtonLoadingState(button, false);
        };

        document.getElementById('proceedConfirmWithdrawal').onclick = async () => {
            try {
                confirmModal.classList.add('hidden');
                await db.collection('withdrawals').add({
                    employeeId: currentUser.uid,
                    amount: amount,
                    reason: reason || 'Tidak ada alasan',
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                hideWithdrawalModal();
                DJRTenda.showNotification('Permintaan penarikan berhasil diajukan.', true);
            } catch (error) {
                console.error('Error creating withdrawal request:', error);
                DJRTenda.showError('Gagal mengajukan permintaan penarikan.');
            } finally {
                clearTimeout(timeout);
                DJRTenda.setButtonLoadingState(button, false);
            }
        };
    } catch (error) {
        clearTimeout(timeout);
        DJRTenda.setButtonLoadingState(button, false);
        DJRTenda.showError(error.message);
    }
}

function scrollToTransactions() {
    document.querySelector('#transactionsTableBody').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}