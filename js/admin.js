if (!DJRTenda.checkUserRole('admin')) {}

let employees = [];
let withdrawals = [];
let transactions = [];
let salaryChartInstance = null;

let transactionQueryState = {
    lastVisible: null,
    firstVisible: null,
    currentPage: 1,
    pageSize: 10
};

const totalEmployeesEl = document.getElementById('totalEmployees');
const totalSalaryDistributedEl = document.getElementById('totalSalaryDistributed');
const pendingWithdrawalsEl = document.getElementById('pendingWithdrawals');
const monthlyTransactionsEl = document.getElementById('monthlyTransactions');

document.addEventListener('DOMContentLoaded', function() {
    const adminName = localStorage.getItem('userName') || 'Admin';
    document.getElementById('adminName').textContent = adminName;
    loadDashboardData();
    setupEventListeners();
    setupTabs();

    // Popstate listener untuk back button ketika modal terbuka
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.modal === 'addEmployee') {
            hideAddEmployeeModal();
        }
    });
});


function setupEventListeners() {
    document.getElementById('distributeSalaryBtn').addEventListener('click', showDistributeSalaryModal);
    document.getElementById('addEmployeeBtn').addEventListener('click', showAddEmployeeModal);
    document.getElementById('cancelAddEmployee').addEventListener('click', hideAddEmployeeModal);
    document.getElementById('cancelDistributeSalary').addEventListener('click', hideDistributeSalaryModal);
    document.getElementById('distributeSalaryForm').addEventListener('submit', handleDistributeSalary);
    document.getElementById('addEmployeeForm').addEventListener('submit', handleAddEmployee);
    document.getElementById('searchEmployee').addEventListener('input', filterEmployees);
    document.getElementById('transactionFilter').addEventListener('change', filterTransactions);
    document.getElementById('exportPdfBtn').addEventListener('click', exportTransactionsToPDF);
    document.getElementById('prevPageBtn').addEventListener('click', () => loadTransactions('prev'));
    document.getElementById('nextPageBtn').addEventListener('click', () => loadTransactions('next'));
    document.getElementById('addSalaryForm').addEventListener('submit', handleAddIndividualSalary);
    document.getElementById('individualSalaryAmount').addEventListener('input', function() { DJRTenda.formatNumberInput(this); });
    document.getElementById('salaryAmount').addEventListener('input', function() { DJRTenda.formatNumberInput(this); });
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.add('active', 'border-blue-500', 'text-blue-600');
            button.classList.remove('border-transparent', 'text-gray-500');
            tabContents.forEach(content => content.classList.add('hidden'));
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');

            if (tabName === 'employees') loadEmployees();
            else if (tabName === 'withdrawals') loadWithdrawals();
            else if (tabName === 'transactions') {
                transactionQueryState = { lastVisible: null, firstVisible: null, currentPage: 1, pageSize: 10 };
                loadTransactions();
            }
        });
    });
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}

async function loadDashboardData() {
    try {
        const snapshot = await db.collection('transactions').orderBy('createdAt', 'desc').get();
        transactions = [];
        for (const doc of snapshot.docs) {
            transactions.push({ id: doc.id, ...doc.data() });
        }
        updateDashboardStats();
    } catch (error) {
        console.error('Error loading initial dashboard data:', error);
        DJRTenda.showError('Gagal memuat data dashboard.');
    }
}

async function loadEmployees() {
    try {
        db.collection('users').where('role', '==', 'employee').orderBy('name', 'asc')
          .onSnapshot(snapshot => {
            employees = [];
            snapshot.forEach(doc => employees.push({ id: doc.id, ...doc.data() }));
            renderEmployeesTable();
            updateDashboardStats();
          }, error => {
              console.error('Error listening to employees:', error);
              DJRTenda.showError('Gagal memuat data karyawan secara real-time.');
          });
    } catch (error) { console.error('Error setting up employee listener:', error); }
}

async function loadWithdrawals() {
    try {
        db.collection('withdrawals').orderBy('createdAt', 'desc')
          .onSnapshot(async (snapshot) => {
            let tempWithdrawals = [];
            for (const doc of snapshot.docs) {
                const withdrawalData = doc.data();
                const employeeDoc = await db.collection('users').doc(withdrawalData.employeeId).get();
                const employeeName = employeeDoc.exists ? employeeDoc.data().name : 'Karyawan Dihapus';
                tempWithdrawals.push({ id: doc.id, employeeName, ...withdrawalData });
            }
            withdrawals = tempWithdrawals;
            renderWithdrawalsTable();
            updateDashboardStats();
          }, error => {
              console.error('Error listening to withdrawals:', error);
              DJRTenda.showError('Gagal memuat data penarikan secara real-time.');
          });
    } catch (error) { console.error('Error setting up withdrawal listener:', error); }
}

async function loadTransactions(direction = 'first') {
    const loadingButton = direction === 'next' ? document.getElementById('nextPageBtn') : document.getElementById('prevPageBtn');
    if (loadingButton) DJRTenda.setButtonLoadingState(loadingButton, true, '...');
    
    try {
        let query = db.collection('transactions').orderBy('createdAt', 'desc');

        const filter = document.getElementById('transactionFilter').value;
        if (filter !== 'all') {
            query = query.where('type', '==', filter);
        }

        if (direction === 'next' && transactionQueryState.lastVisible) {
            query = query.startAfter(transactionQueryState.lastVisible);
        } else if (direction === 'prev' && transactionQueryState.firstVisible) {
            query = query.endBefore(transactionQueryState.firstVisible).limitToLast(transactionQueryState.pageSize);
        }
        
        query = query.limit(transactionQueryState.pageSize);

        const snapshot = await query.get();

        if (snapshot.empty) {
            if (direction !== 'first') DJRTenda.showError('Sudah di halaman terakhir/pertama.');
            if (direction === 'first') renderTransactionsTable([]);
            return;
        }

        transactionQueryState.firstVisible = snapshot.docs[0];
        transactionQueryState.lastVisible = snapshot.docs[snapshot.docs.length - 1];

        if (direction === 'next') transactionQueryState.currentPage++;
        if (direction === 'prev' && transactionQueryState.currentPage > 1) transactionQueryState.currentPage--;

        let loadedTransactions = [];
        for (const doc of snapshot.docs) {
            const transactionData = doc.data();
            const employeeDoc = await db.collection('users').doc(transactionData.employeeId).get();
            const employeeName = employeeDoc.exists ? employeeDoc.data().name : 'Sistem/Dihapus';
            loadedTransactions.push({ id: doc.id, employeeName, ...transactionData });
        }
        
        renderTransactionsTable(loadedTransactions);

    } catch (error) {
        console.error('Error loading transactions:', error);
        DJRTenda.showError('Gagal memuat data transaksi.');
    } finally {
        if (loadingButton) DJRTenda.setButtonLoadingState(loadingButton, false);
    }
}

function updateDashboardStats() {
    if (totalEmployeesEl) totalEmployeesEl.textContent = employees.length;
    if (totalSalaryDistributedEl) {
        const totalSalary = transactions.filter(t => t.type === 'salary').reduce((sum, t) => sum + t.amount, 0);
        totalSalaryDistributedEl.textContent = DJRTenda.formatCurrency(totalSalary);
    }
    if (pendingWithdrawalsEl) pendingWithdrawalsEl.textContent = withdrawals.filter(w => w.status === 'pending').length;
    if (monthlyTransactionsEl) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        monthlyTransactionsEl.textContent = transactions.filter(t => { 
            if (!t.createdAt) return false;
            const transactionDate = t.createdAt.toDate();
            return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear; 
        }).length;
    }
    renderSalaryChart();
}

function renderSalaryChart() {
    if (transactions.length === 0) return;
    const ctx = document.getElementById('salaryChart');
    if (!ctx) return;

    const salaryData = transactions.filter(t => t.type === 'salary');
    const monthlyTotals = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
        const d = new Date(sixMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyTotals[monthKey] = {
            total: 0,
            label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
        };
    }

    salaryData.forEach(t => {
        if (t.createdAt && t.createdAt.toDate() >= sixMonthsAgo) {
            const date = t.createdAt.toDate();
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (monthlyTotals[monthKey]) {
                monthlyTotals[monthKey].total += t.amount;
            }
        }
    });

    const labels = Object.values(monthlyTotals).map(m => m.label);
    const data = Object.values(monthlyTotals).map(m => m.total);

    if (salaryChartInstance) {
        salaryChartInstance.destroy();
    }

    salaryChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total Gaji',
                data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value, index, values) {
                            return 'Rp ' + (value / 1000) + 'k';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += DJRTenda.formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function exportTransactionsToPDF() {
    DJRTenda.showConfirmDialog({
        title: 'Export Laporan Transaksi?',
        message: 'Laporan akan dibuat dari 100 transaksi terakhir berdasarkan filter yang aktif. Lanjutkan?',
        confirmText: 'Ya, Export',
        confirmColor: 'blue',
        onConfirm: async () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            let query = db.collection('transactions').orderBy('createdAt', 'desc').limit(100);
            const filter = document.getElementById('transactionFilter').value;
            if (filter !== 'all') {
                query = query.where('type', '==', filter);
            }
            const snapshot = await query.get();

            const tableColumn = ["Tanggal", "Karyawan", "Jenis", "Jumlah", "Keterangan"];
            const tableRows = [];

            for (const doc of snapshot.docs) {
                const t = doc.data();
                const user = employees.find(e => e.id === t.employeeId);
                const rowData = [
                    DJRTenda.formatDate(t.createdAt.toDate()),
                    user ? user.name : 'Sistem/Dihapus',
                    t.type === 'salary' ? 'Gaji' : 'Penarikan',
                    DJRTenda.formatCurrency(t.amount),
                    t.description || '-'
                ];
                tableRows.push(rowData);
            }
            
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 20
            });
            doc.text("Laporan Transaksi - DJR Tenda", 14, 15);
            doc.save(`laporan_transaksi_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`);
            DJRTenda.showNotification('Laporan PDF berhasil dibuat!', true);
        }
    });
}

async function handleDistributeSalary(e) {
    e.preventDefault();
    const amount = parseInt(document.getElementById('salaryAmount').value.replace(/\./g, ''));
    const description = document.getElementById('salaryDescription').value.trim();
    if (!amount || amount <= 0) return DJRTenda.showError('Mohon masukkan jumlah gaji yang valid.');

    const button = e.target.querySelector('button[type="submit"]');

    const processDistribute = async () => {
        DJRTenda.setButtonLoadingState(button, true, 'Membagikan...');
        try {
            const batch = db.batch();
            employees.forEach(employee => {
                const employeeRef = db.collection('users').doc(employee.id);
                batch.update(employeeRef, { balance: firebase.firestore.FieldValue.increment(amount), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                const transactionRef = db.collection('transactions').doc();
                batch.set(transactionRef, { employeeId: employee.id, type: 'salary', amount: amount, description: description || 'Pembagian gaji', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            await batch.commit();
            hideDistributeSalaryModal();
            loadDashboardData();
            DJRTenda.showNotification('Gaji berhasil dibagikan!', true);
        } catch (error) {
            console.error('Error distributing salary:', error);
            DJRTenda.showError('Gagal membagikan gaji.');
        } finally {
            DJRTenda.setButtonLoadingState(button, false);
        }
    };
    
    DJRTenda.showConfirmDialog({
        title: 'Bagikan Gaji Serentak?',
        message: `Anda akan membagikan gaji sebesar ${DJRTenda.formatCurrency(amount)} kepada semua karyawan. Lanjutkan?`,
        confirmText: 'Ya, Bagikan',
        confirmColor: 'blue',
        onConfirm: processDistribute
    });
}

function deleteEmployee(employeeId, buttonElement) {
    const processDelete = async () => {
        DJRTenda.setButtonLoadingState(buttonElement, true, 'Menghapus...');
        try {
            await db.collection('users').doc(employeeId).delete();
            DJRTenda.showNotification('Karyawan berhasil dihapus.', true);
        } catch (error) {
            console.error('Error deleting employee:', error);
            DJRTenda.showError('Gagal menghapus karyawan.');
        } finally {
            DJRTenda.setButtonLoadingState(buttonElement, false);
        }
    };

    DJRTenda.showConfirmDialog({
        title: 'Hapus Karyawan?',
        message: 'Tindakan ini hanya menghapus profil, bukan riwayat transaksi. Yakin ingin menghapus?',
        confirmText: 'Hapus',
        onConfirm: processDelete
    });
}

function approveWithdrawal(withdrawalId, buttonElement) {
    const processApprove = async () => {
        DJRTenda.setButtonLoadingState(buttonElement, true, 'Menyetujui...');
        try {
            const withdrawal = withdrawals.find(w => w.id === withdrawalId);
            const batch = db.batch();
            const userRef = db.collection('users').doc(withdrawal.employeeId);
            const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
            const transactionRef = db.collection('transactions').doc();
            
            batch.update(userRef, { balance: firebase.firestore.FieldValue.increment(-withdrawal.amount) });
            batch.update(withdrawalRef, { status: 'approved', approvedAt: firebase.firestore.FieldValue.serverTimestamp() });
            batch.set(transactionRef, { employeeId: withdrawal.employeeId, type: 'withdrawal', amount: withdrawal.amount, description: `Penarikan: ${withdrawal.reason}`, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            
            await batch.commit();
            
            loadDashboardData();
            DJRTenda.showNotification('Permintaan penarikan disetujui.', true);
        } catch (error) {
            console.error('Error approving withdrawal:', error);
            DJRTenda.showError('Gagal menyetujui permintaan penarikan.');
        } finally {
            DJRTenda.setButtonLoadingState(buttonElement, false);
        }
    };

    DJRTenda.showConfirmDialog({
        title: 'Setujui Penarikan?',
        message: 'Saldo karyawan akan dipotong dan transaksi akan dicatat. Lanjutkan?',
        confirmText: 'Ya, Setuju',
        confirmColor: 'blue',
        onConfirm: processApprove
    });
}

function rejectWithdrawal(withdrawalId, buttonElement) {
    const processReject = async () => {
        DJRTenda.setButtonLoadingState(buttonElement, true, 'Menolak...');
        try {
            await db.collection('withdrawals').doc(withdrawalId).update({ status: 'rejected', rejectedAt: firebase.firestore.FieldValue.serverTimestamp() });
            DJRTenda.showNotification('Permintaan penarikan ditolak.', true);
        } catch (error) {
            console.error('Error rejecting withdrawal:', error);
            DJRTenda.showError('Gagal menolak permintaan penarikan.');
        } finally {
            DJRTenda.setButtonLoadingState(buttonElement, false);
        }
    };

    DJRTenda.showConfirmDialog({
        title: 'Tolak Penarikan?',
        message: 'Permintaan penarikan ini akan ditandai sebagai ditolak. Lanjutkan?',
        confirmText: 'Ya, Tolak',
        onConfirm: processReject
    });
}

async function deleteWithdrawal(withdrawalId, buttonElement) {
    const processDelete = async () => {
        DJRTenda.setButtonLoadingState(buttonElement, true, 'Menghapus...');
        try {
            await db.collection('withdrawals').doc(withdrawalId).delete();
            DJRTenda.showNotification('Log penarikan berhasil dihapus.', true);
        } catch (error) {
            DJRTenda.showError('Gagal menghapus log penarikan.');
            console.error('Error deleting withdrawal log:', error);
        } finally {
            DJRTenda.setButtonLoadingState(buttonElement, false);
        }
    };
    
    DJRTenda.showConfirmDialog({
        title: 'Hapus Log Penarikan?',
        message: 'Anda yakin ingin menghapus log permintaan penarikan ini secara permanen?',
        confirmText: 'Hapus',
        onConfirm: processDelete
    });
}

async function deleteTransaction(transactionId, buttonElement) {
    const processDelete = async () => {
        DJRTenda.setButtonLoadingState(buttonElement, true, 'Menghapus...');
        try {
            await db.collection('transactions').doc(transactionId).delete();
            DJRTenda.showNotification('Log transaksi berhasil dihapus.', true);
            loadTransactions('first'); 
        } catch (error) {
            DJRTenda.showError('Gagal menghapus log transaksi.');
            console.error('Error deleting transaction log:', error);
        } finally {
            DJRTenda.setButtonLoadingState(buttonElement, false);
        }
    };
    
    DJRTenda.showConfirmDialog({
        title: 'Hapus Log Transaksi?',
        message: 'Tindakan ini tidak bisa dibatalkan. Yakin ingin menghapus log ini secara permanen?',
        confirmText: 'Hapus',
        onConfirm: processDelete
    });
}

async function handleAddIndividualSalary(e) {
    e.preventDefault();
    const employeeId = document.getElementById('individualEmployeeId').value;
    const amount = parseInt(document.getElementById('individualSalaryAmount').value.replace(/\./g, ''));
    const description = document.getElementById('individualSalaryDescription').value.trim();
    if (!employeeId || !amount || amount <= 0) return DJRTenda.showError('ID Karyawan atau Jumlah tidak valid.');

    const button = e.target.querySelector('button[type="submit"]');
    DJRTenda.setButtonLoadingState(button, true, 'Menambahkan...');
    
    try {
        const employeeRef = db.collection('users').doc(employeeId);
        const transactionRef = db.collection('transactions').doc();
        const batch = db.batch();
        batch.update(employeeRef, { balance: firebase.firestore.FieldValue.increment(amount), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.set(transactionRef, { employeeId: employeeId, type: 'salary', amount: amount, description: description || 'Pemberian gaji', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await batch.commit();
        hideAddSalaryModal();
        loadDashboardData(); 
        DJRTenda.showNotification('Gaji berhasil ditambahkan!', true);
    } catch (error) {
        DJRTenda.showError('Gagal menambahkan gaji.');
        console.error(error);
    } finally {
        DJRTenda.setButtonLoadingState(button, false);
    }
}

function renderEmployeesTable() {
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = '';
    const filteredEmployees = employees.filter(employee => {
        const searchTerm = document.getElementById('searchEmployee').value.toLowerCase();
        return employee.name.toLowerCase().includes(searchTerm);
    });

    if (filteredEmployees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-gray-500">Tidak ada data karyawan atau tidak ditemukan.</td></tr>';
        return;
    }
    
    filteredEmployees.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <i class="fas fa-user text-blue-600"></i>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${employee.name}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${DJRTenda.formatCurrency(employee.balance || 0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${DJRTenda.formatDate(employee.createdAt?.toDate())}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="showAddSalaryModal('${employee.id}', '${employee.name}')" class="text-blue-600 hover:text-blue-900 mr-3"><i class="fas fa-plus-circle mr-1"></i>Gaji</button>
                <button onclick="deleteEmployee('${employee.id}', this)" class="text-red-600 hover:text-red-900"><i class="fas fa-trash mr-1"></i>Hapus</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderWithdrawalsTable() {
    const tbody = document.getElementById('withdrawalsTableBody');
    tbody.innerHTML = '';

    if (withdrawals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-500">Tidak ada permintaan penarikan.</td></tr>';
        return;
    }

    withdrawals.forEach(withdrawal => {
        const row = document.createElement('tr');
        const statusColor = withdrawal.status === 'pending' ? 'yellow' : (withdrawal.status === 'approved' ? 'green' : 'red');
        const statusText = withdrawal.status === 'pending' ? 'Menunggu' : (withdrawal.status === 'approved' ? 'Disetujui' : 'Ditolak');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${withdrawal.employeeName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${DJRTenda.formatCurrency(withdrawal.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${withdrawal.reason}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${DJRTenda.formatDate(withdrawal.createdAt.toDate())}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800">${statusText}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                ${withdrawal.status === 'pending'
                    ? `<button onclick="approveWithdrawal('${withdrawal.id}', this)" class="text-green-600 hover:text-green-900 mr-3"><i class="fas fa-check mr-1"></i>Setuju</button>
                       <button onclick="rejectWithdrawal('${withdrawal.id}', this)" class="text-red-600 hover:text-red-900"><i class="fas fa-times mr-1"></i>Tolak</button>`
                    : `<button onclick="deleteWithdrawal('${withdrawal.id}', this)" class="text-gray-500 hover:text-red-700"><i class="fas fa-trash-alt mr-1"></i>Hapus</button>`
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterTransactions() {
    transactionQueryState = { lastVisible: null, firstVisible: null, currentPage: 1, pageSize: 10 };
    loadTransactions('first');
}

function filterEmployees() {
    renderEmployeesTable();
}

function showAddEmployeeModal() {
    document.getElementById('addEmployeeModal').classList.remove('hidden');
    history.pushState({ modal: 'addEmployee' }, 'Tambah Karyawan');
}

function hideAddEmployeeModal() {
    const modal = document.getElementById('addEmployeeModal');
    if (!modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        document.getElementById('addEmployeeForm').reset();
        document.getElementById('addEmployeeForm').classList.remove('hidden', 'opacity-0');
        document.getElementById('linkGeneratedContainer').classList.add('hidden');
    }
}


function showDistributeSalaryModal() {
    document.getElementById('distributeSalaryModal').classList.remove('hidden');
}

function hideDistributeSalaryModal() {
    const modal = document.getElementById('distributeSalaryModal');
    if (!modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        document.getElementById('distributeSalaryForm').reset();
    }
}

function handleAddEmployee(e) {
    e.preventDefault(); // Mencegah form submit default
    
    // 1. Ambil data dari form
    const name = document.getElementById('employeeName').value.trim();
    const password = document.getElementById('employeePassword').value;

    // Validasi input
    if (!name || !password) {
        DJRTenda.showError('Nama dan Password wajib diisi.');
        return;
    }

    // 2. Siapkan link WhatsApp
    const waNumber = "6285254597065";
    const messageText = `*CREATE USER*\n--------------------------\nNama: *${name}*\nPassword: *${password}*`;
    const waLink = `https://api.whatsapp.com/send/?phone=${waNumber}&text=${encodeURIComponent(messageText)}`;
    
    hideAddEmployeeModal(); 
    
    DJRTenda.showNotification('Membuka WhatsApp untuk mengirim kredensial...', true);

    window.open(waLink, '_blank');
}

function showAddSalaryModal(employeeId, employeeName) {
    document.getElementById('individualEmployeeId').value = employeeId;
    document.getElementById('individualEmployeeName').textContent = employeeName;
    document.getElementById('addSalaryModal').classList.remove('hidden');
}

function hideAddSalaryModal() {
    const modal = document.getElementById('addSalaryModal');
    if (!modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        document.getElementById('addSalaryForm').reset();
    }
}

function renderTransactionsTable(dataToRender) {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';
    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-500">Tidak ada data transaksi untuk halaman ini.</td></tr>';
        document.getElementById('pageInfo').textContent = `Halaman ${transactionQueryState.currentPage}`;
        document.getElementById('prevPageBtn').disabled = transactionQueryState.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = false;
        return;
    }
    dataToRender.forEach(transaction => {
        const row = document.createElement('tr');
        const typeIcon = transaction.type === 'salary' ? 'fa-plus text-green-600' : 'fa-minus text-red-600';
        const typeText = transaction.type === 'salary' ? 'Pembagian Gaji' : 'Penarikan';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${DJRTenda.formatDate(transaction.createdAt.toDate())}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${transaction.employeeName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><i class="fas ${typeIcon} mr-2"></i>${typeText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${DJRTenda.formatCurrency(transaction.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.description || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="deleteTransaction('${transaction.id}', this)" class="text-gray-500 hover:text-red-700"><i class="fas fa-trash-alt mr-1"></i>Hapus</button>
            </td>`;
        tbody.appendChild(row);
    });
    
    document.getElementById('pageInfo').textContent = `Halaman ${transactionQueryState.currentPage}`;
    document.getElementById('prevPageBtn').disabled = transactionQueryState.currentPage === 1;
    document.getElementById('nextPageBtn').disabled = dataToRender.length < transactionQueryState.pageSize;
}
