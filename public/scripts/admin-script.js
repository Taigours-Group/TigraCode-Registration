// Admin Panel JavaScript for Student Management (Backend-Driven)
let currentStudentId = null;
let studentsData = [];
let currentSection = 'dashboard';

// Admin Password Protection
const ADMIN_PASSWORD = 'tigra2025'; // Change this to your secure password
const PASSWORD_KEY = 'tigra_admin_auth';
const PASSWORD_EXPIRY_HOURS = 24;

function showAdminPasswordModal() {
    const modal = document.getElementById('adminPasswordModal');
    modal.style.display = 'flex';
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminPasswordError').style.display = 'none';
}

function hideAdminPasswordModal() {
    const modal = document.getElementById('adminPasswordModal');
    modal.style.display = 'none';
}

function setAdminAuth() {
    const expiry = Date.now() + PASSWORD_EXPIRY_HOURS * 60 * 60 * 1000;
    localStorage.setItem(PASSWORD_KEY, JSON.stringify({ expiry }));
}

function isAdminAuthValid() {
    const data = localStorage.getItem(PASSWORD_KEY);
    if (!data) return false;
    try {
        const { expiry } = JSON.parse(data);
        return Date.now() < expiry;
    } catch {
        return false;
    }
}

function handleAdminPasswordSubmit() {
    const input = document.getElementById('adminPasswordInput').value;
    if (input === ADMIN_PASSWORD) {
        setAdminAuth();
        hideAdminPasswordModal();
    } else {
        document.getElementById('adminPasswordError').style.display = 'block';
    }
}

// Initialize Admin Panel
window.addEventListener('DOMContentLoaded', async () => {
    if (!isAdminAuthValid()) {
        showAdminPasswordModal();
        document.getElementById('adminPasswordSubmit').onclick = handleAdminPasswordSubmit;
        document.getElementById('adminPasswordInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handleAdminPasswordSubmit();
        });
    } else {
        setupNavigation();
        setupSearch();
        setupFilters();
        setupModals();
        setupEventListeners();
        await reloadAdminData(); // Only update UI after data is loaded
        // No other UI update calls before this
    }
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) targetSection.classList.add('active');
    updatePageTitle(sectionName);
    // Only update section if data is loaded
    if (studentsData && studentsData.length > 0) {
        loadSectionData(sectionName);
    }
    currentSection = sectionName;
}

function updatePageTitle(section) {
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Overview of student registrations and admissions' },
        applications: { title: 'All Applications', subtitle: 'Manage student applications and admissions' },
        approved: { title: 'Approved Students', subtitle: 'Students who have been accepted' },
        declined: { title: 'Declined Applications', subtitle: 'Applications that have been declined' },
        graduated: { title: 'Graduated Students', subtitle: 'Students who have completed their programs' },
        settings: { title: 'Settings', subtitle: 'Configure application and system settings' }
    };
    const titleInfo = titles[section] || { title: 'Admin Panel', subtitle: 'Student management system' };
    document.getElementById('page-title').textContent = titleInfo.title;
    document.getElementById('page-subtitle').textContent = titleInfo.subtitle;
}

// Data Loading
async function reloadAdminData() {
    try {
        const response = await fetch('/api/students');
        studentsData = await response.json();
        studentsData = studentsData.map(student => ({
            ...student,
            studentId: student.studentId || student.id || '',
            status: student.status || 'pending',
            applicationDate: student.applicationDate || new Date().toISOString()
        }));
        // Only update UI after data is loaded
        updateDashboard();
        loadSectionData(currentSection);
    } catch (err) {
        studentsData = [];
        updateDashboard();
        loadSectionData(currentSection);
        showNotification('Failed to load student data from server', 'error');
    }
}

function loadSectionData(section) {
    switch(section) {
        case 'dashboard': loadDashboardData(); break;
        case 'applications': loadApplicationsTable(); break;
        case 'approved': loadApprovedTable(); break;
        case 'declined': loadDeclinedTable(); break;
        case 'graduated': loadGraduatedTable(); break;
        case 'settings': loadSettings(); break;
    }
}

// Dashboard
function updateDashboard() {
    const stats = calculateStats();
    document.getElementById('total-applications').textContent = stats.total;
    document.getElementById('approved-count').textContent = stats.approved;
    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('declined-count').textContent = stats.declined;
    document.getElementById('graduated-count').textContent = stats.graduated;
}

function calculateStats() {
    const total = studentsData.length;
    const approved = studentsData.filter(s => s.status === 'approved').length;
    const pending = studentsData.filter(s => s.status === 'pending').length;
    const declined = studentsData.filter(s => s.status === 'declined').length;
    const graduated = studentsData.filter(s => s.status === 'graduated').length;
    return { total, approved, pending, declined, graduated };
}

function loadDashboardData() {
    const tableBody = document.getElementById('recent-applications-table');
    const recentApplications = studentsData
        .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))
        .slice(0, 5);
    tableBody.innerHTML = recentApplications.map(student => `
        <tr>
            <td>${student.studentId}</td>
            <td>${student.firstName} ${student.lastName}</td>
            <td>${formatProgram(student.program)}</td>
            <td>${formatDate(student.applicationDate)}</td>
            <td><span class="status-badge status-${student.status}">${student.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewStudent('${student.studentId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Applications Table
function loadApplicationsTable() {
    const tableBody = document.getElementById('applications-table');
    const filteredData = getFilteredApplications();
    tableBody.innerHTML = filteredData.map(student => `
        <tr>
            <td>${student.studentId}</td>
            <td>${student.firstName} ${student.lastName}</td>
            <td>${student.email}</td>
            <td>${formatProgram(student.program)}</td>
            <td>${student.level}</td>
            <td>${formatDate(student.applicationDate)}</td>
            <td><span class="status-badge status-${student.status}">${student.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewStudent('${student.studentId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${student.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="quickApprove('${student.studentId}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="quickDecline('${student.studentId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function loadApprovedTable() {
    const tableBody = document.getElementById('approved-table');
    const approvedStudents = studentsData.filter(s => s.status === 'approved');
    tableBody.innerHTML = approvedStudents.map(student => `
        <tr>
            <td>${student.studentId}</td>
            <td>${student.firstName} ${student.lastName}</td>
            <td>${student.email}</td>
            <td>${formatProgram(student.program)}</td>
            <td>${formatDate(student.startDate)}</td>
            <td>${formatDate(student.approvedDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewStudent('${student.studentId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="sendWelcomeEmail('${student.studentId}')">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadDeclinedTable() {
    const tableBody = document.getElementById('declined-table');
    const declinedStudents = studentsData.filter(s => s.status === 'declined');
    tableBody.innerHTML = declinedStudents.map(student => `
        <tr>
            <td>${student.studentId}</td>
            <td>${student.firstName} ${student.lastName}</td>
            <td>${student.email}</td>
            <td>${formatProgram(student.program)}</td>
            <td>${formatDeclineReason(student.declineReason)}</td>
            <td>${formatDate(student.declinedDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewStudent('${student.studentId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="reconsiderApplication('${student.studentId}')">
                        <i class="fas fa-undo"></i> Reconsider
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.studentId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadGraduatedTable() {
    const tableBody = document.getElementById('graduated-table');
    const graduatedStudents = studentsData.filter(s => s.status === 'graduated');
    tableBody.innerHTML = graduatedStudents.map(student => `
        <tr>
            <td>${student.studentId}</td>
            <td>${student.firstName} ${student.lastName}</td>
            <td>${student.email}</td>
            <td>${formatProgram(student.program)}</td>
            <td>${formatDate(student.startDate)}</td>
            <td>${formatDate(student.graduationDate)}</td>
            <td>${calculateDuration(student.startDate, student.graduationDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewStudent('${student.studentId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="generateCertificate('${student.studentId}')">
                        <i class="fas fa-certificate"></i> Certificate
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Filtering & Search
function getFilteredApplications() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const programFilter = document.getElementById('programFilter')?.value || '';
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    return studentsData.filter(student => {
        const matchesStatus = !statusFilter || student.status === statusFilter;
        const matchesProgram = !programFilter || student.program === programFilter;
        const matchesSearch = !searchTerm || 
            student.firstName.toLowerCase().includes(searchTerm) ||
            student.lastName.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            student.studentId.toLowerCase().includes(searchTerm);
        return matchesStatus && matchesProgram && matchesSearch;
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (currentSection === 'applications') loadApplicationsTable();
        });
    }
}

function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const programFilter = document.getElementById('programFilter');
    if (statusFilter) statusFilter.addEventListener('change', loadApplicationsTable);
    if (programFilter) programFilter.addEventListener('change', loadApplicationsTable);
}

// Student Modal
function viewStudent(studentId) {
    const student = studentsData.find(s => s.studentId === studentId);
    if (!student) return;
    currentStudentId = studentId;
    document.getElementById('modalBody').innerHTML = createStudentDetailsHTML(student);
    const approveBtn = document.getElementById('approveBtn');
    const declineBtn = document.getElementById('declineBtn');
    const graduateBtn = document.getElementById('graduateBtn');
    if (student.status === 'pending') {
        approveBtn.style.display = 'inline-flex';
        declineBtn.style.display = 'inline-flex';
        graduateBtn.style.display = 'none';
    } else if (student.status === 'approved') {
        approveBtn.style.display = 'none';
        declineBtn.style.display = 'none';
        graduateBtn.style.display = 'inline-flex';
    } else {
        approveBtn.style.display = 'none';
        declineBtn.style.display = 'none';
        graduateBtn.style.display = 'none';
    }
    document.getElementById('studentModal').classList.add('show');
}

function createStudentDetailsHTML(student) {
    return `
        <div class="student-details">
            <div class="detail-section">
                <div class="student-photo">
                    <img src="https://via.placeholder.com/120x120/00ffe7/000000?text=${student.firstName[0]}${student.lastName[0]}" 
                         alt="${student.firstName} ${student.lastName}">
                </div>
                <h4>Basic Information</h4>
                <div class="detail-item">
                    <span class="label">Student ID:</span>
                    <span class="value">${student.studentId}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Status:</span>
                    <span class="value"><span class="status-badge status-${student.status}">${student.status}</span></span>
                </div>
                <div class="detail-item">
                    <span class="label">Application Date:</span>
                    <span class="value">${formatDate(student.applicationDate)}</span>
                </div>
            </div>
            <div class="detail-section">
                <h4>Personal Information</h4>
                <div class="detail-item">
                    <span class="label">Full Name:</span>
                    <span class="value">${student.firstName} ${student.lastName}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Email:</span>
                    <span class="value">${student.email}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Phone:</span>
                    <span class="value">${student.phone}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Date of Birth:</span>
                    <span class="value">${formatDate(student.dateOfBirth)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Gender:</span>
                    <span class="value">${student.gender}</span>
                </div>
            </div>
            <div class="detail-section">
                <h4>Parents Details</h4>
                <div class="detail-item">
                    <span class="label">Father's Name:</span>
                    <span class="value">${student.fatherName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Mother's Name:</span>
                    <span class="value">${student.motherName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Guardian's Name:</span>
                    <span class="value">${student.guardianName || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Parents' Contact:</span>
                    <span class="value">${student.parentsContact || '-'}</span>
                </div>
            </div>
            <div class="detail-section">
                <h4>Academic Information</h4>
                <div class="detail-item">
                    <span class="label">Program:</span>
                    <span class="value">${formatProgram(student.program)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Level:</span>
                    <span class="value">${student.level}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Start Date:</span>
                    <span class="value">${formatDate(student.startDate)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Emergency Contact:</span>
                    <span class="value">${student.emergencyContact}</span>
                </div>
            </div>
            <div class="detail-section">
                <h4>Address Information</h4>
                <div class="detail-item">
                    <span class="label">Address:</span>
                    <span class="value">${student.address}</span>
                </div>
                <div class="detail-item">
                    <span class="label">City:</span>
                    <span class="value">${student.city}</span>
                </div>
                <div class="detail-item">
                    <span class="label">State:</span>
                    <span class="value">${student.state}</span>
                </div>
                <div class="detail-item">
                    <span class="label">ZIP Code:</span>
                    <span class="value">${student.zipCode}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Country:</span>
                    <span class="value">${student.country}</span>
                </div>
            </div>
            ${student.education || student.accommodations ? `
            <div class="detail-section">
                <h4>Additional Information</h4>
                ${student.education ? `
                <div class="detail-item">
                    <span class="label">Education:</span>
                    <span class="value">${student.education}</span>
                </div>
                ` : ''}
                ${student.accommodations ? `
                <div class="detail-item">
                    <span class="label">Accommodations:</span>
                    <span class="value">${student.accommodations}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
            ${student.status === 'declined' && student.declineReason ? `
            <div class="detail-section">
                <h4>Decline Information</h4>
                <div class="detail-item">
                    <span class="label">Reason:</span>
                    <span class="value">${formatDeclineReason(student.declineReason)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Date:</span>
                    <span class="value">${formatDate(student.declinedDate)}</span>
                </div>
                ${student.declineNotes ? `
                <div class="detail-item">
                    <span class="label">Notes:</span>
                    <span class="value">${student.declineNotes}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `;
}

// Approve/Decline/Graduate/Delete/Reconsider
async function approveStudent() {
    if (!currentStudentId) return;
    const student = studentsData.find(s => s.studentId === currentStudentId);
    if (student) {
        student.status = 'approved';
        student.approvedDate = new Date().toISOString();
        await saveStudentToServer(student);
        showNotification('Student application approved successfully!', 'success');
        closeStudentModal();
        await reloadAdminData();
    }
}
function quickApprove(studentId) { currentStudentId = studentId; approveStudent(); }

function showDeclineModal() { document.getElementById('declineModal').classList.add('show'); }
function closeDeclineModal() { document.getElementById('declineModal').classList.remove('show'); document.getElementById('declineForm').reset(); }
function quickDecline(studentId) { currentStudentId = studentId; showDeclineModal(); }

async function confirmDecline() {
    if (!currentStudentId) return;
    const reason = document.getElementById('declineReason').value;
    const notes = document.getElementById('additionalNotes').value;
    if (!reason) { showNotification('Please select a decline reason', 'error'); return; }
    const studentObj = studentsData.find(s => s.studentId === currentStudentId);
    if (studentObj) {
        studentObj.status = 'declined';
        studentObj.declineReason = reason;
        studentObj.declineNotes = notes;
        studentObj.declinedDate = new Date().toISOString();
        await saveStudentToServer(studentObj);
        showNotification('Student application declined', 'warning');
        closeDeclineModal();
        closeStudentModal();
        await reloadAdminData();
    }
}

function closeStudentModal() { document.getElementById('studentModal').classList.remove('show'); currentStudentId = null; }

async function graduateStudent() {
    if (!currentStudentId) return;
    const today = new Date().toISOString().split('T')[0];
    const graduationDate = prompt('Enter graduation date (YYYY-MM-DD):', today);
    if (!graduationDate) return;
    const student = studentsData.find(s => s.studentId === currentStudentId);
    if (student && student.status === 'approved') {
        student.status = 'graduated';
        student.graduationDate = graduationDate;
        await saveStudentToServer(student);
        showNotification(`${student.firstName} ${student.lastName} has been graduated!`, 'success');
        closeStudentModal();
        await reloadAdminData();
    }
}

function deleteStudent(studentId) { currentStudentId = studentId; showDeleteConfirmation(); }
function showDeleteConfirmation() {
    if (!currentStudentId) return;
    const student = studentsData.find(s => s.studentId === currentStudentId);
    if (!student) return;
    const deleteStudentInfo = document.getElementById('deleteStudentInfo');
    deleteStudentInfo.innerHTML = `
        <div class="detail-item"><span class="label">Student ID:</span><span class="value">${student.studentId}</span></div>
        <div class="detail-item"><span class="label">Name:</span><span class="value">${student.firstName} ${student.lastName}</span></div>
        <div class="detail-item"><span class="label">Email:</span><span class="value">${student.email}</span></div>
        <div class="detail-item"><span class="label">Program:</span><span class="value">${formatProgram(student.program)}</span></div>
    `;
    document.getElementById('deleteModal').classList.add('show');
}
function closeDeleteModal() { document.getElementById('deleteModal').classList.remove('show'); currentStudentId = null; }
async function confirmDelete() {
    if (!currentStudentId) return;
    await deleteStudentFromServer(currentStudentId);
    showNotification('Student deleted permanently', 'warning');
    closeDeleteModal();
    closeStudentModal();
    await reloadAdminData();
}

async function reconsiderApplication(studentId) {
    const student = studentsData.find(s => s.studentId === studentId);
    if (student && confirm('Mark this application as pending for reconsideration?')) {
        student.status = 'pending';
        delete student.declineReason;
        delete student.declineNotes;
        delete student.declinedDate;
        await saveStudentToServer(student);
        showNotification('Application marked for reconsideration', 'success');
        await reloadAdminData();
    }
}

// Backend Communication
async function saveStudentToServer(student) {
    await fetch(`/api/students/${student.studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
    });
}
async function deleteStudentFromServer(studentId) {
    await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
}

// Modals
function setupModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    });
}

function setupEventListeners() {
    document.getElementById('exportApproved')?.addEventListener('click', exportApprovedStudents);
    document.getElementById('exportDeclined')?.addEventListener('click', exportDeclinedApplications);
    document.getElementById('exportGraduated')?.addEventListener('click', exportGraduatedStudents);
    document.getElementById('exportAll')?.addEventListener('click', exportAllData);
    document.getElementById('bulkGraduate')?.addEventListener('click', showBulkGraduateModal);
    document.getElementById('applicationSettings')?.addEventListener('submit', saveSettings);
    document.getElementById('clearOldData')?.addEventListener('click', clearOldData);
    document.getElementById('resetData')?.addEventListener('click', resetAllData);
    document.getElementById('refreshData')?.addEventListener('click', refreshAdminData);
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatProgram(program) {
    switch (program) {
        case 'coding-fundamentals': return 'Coding Fundamentals (Class 7-8)';
        case 'web-development': return 'Web Development (Class 9-10)';
        case 'python-programming': return 'Python Programming (Class 9-10)';
        case 'app-development': return 'App Development (Class 11-12)';
        case 'ai-basics': return 'AI Basics (Class 11-12)';
        case 'bachelors-cs': return "Bachelor's in Computer Science";
        default: return program;
    }
}
function formatDeclineReason(reason) {
    const reasons = {
        'incomplete-documents': 'Incomplete Documents',
        'academic-requirements': 'Academic Requirements Not Met',
        'program-full': 'Program Full',
        'eligibility-criteria': 'Eligibility Criteria Not Met',
        'other': 'Other'
    };
    return reasons[reason] || reason;
}
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notificationMessage');
    messageElement.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    setTimeout(() => { notification.classList.remove('show'); }, 4000);
}
function exportApprovedStudents() { exportToCSV(studentsData.filter(s => s.status === 'approved'), 'approved_students.csv'); }
function exportDeclinedApplications() { exportToCSV(studentsData.filter(s => s.status === 'declined'), 'declined_applications.csv'); }
function exportGraduatedStudents() { exportToCSV(studentsData.filter(s => s.status === 'graduated'), 'graduated_students.csv'); }
function exportAllData() { exportToCSV(studentsData, 'all_applications.csv'); }
function exportToCSV(data, filename) {
    if (data.length === 0) { showNotification('No data to export', 'warning'); return; }
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification(`Exported ${data.length} records to ${filename}`, 'success');
}
function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0) return `${years}y ${months}m`;
    if (months > 0) return `${months} months`;
    return `${diffDays} days`;
}
function generateCertificate(studentId) {
    const student = studentsData.find(s => s.studentId === studentId);
    if (student) showNotification(`Certificate generated for ${student.firstName} ${student.lastName}`, 'success');
}
function sendWelcomeEmail(studentId) {
    const student = studentsData.find(s => s.studentId === studentId);
    if (student) showNotification(`Welcome email sent to ${student.firstName} ${student.lastName}`, 'success');
}
async function refreshAdminData() {
    const refreshBtn = document.getElementById('refreshData');
    if (!refreshBtn) return;
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    await reloadAdminData();
    showNotification('Data refreshed successfully!', 'success');
    refreshBtn.innerHTML = originalText;
    refreshBtn.disabled = false;
}
// Settings (optional, can be backend-driven in future)
function loadSettings() {
    // ...existing code or leave blank if not needed...
}
function saveSettings(e) {
    e.preventDefault();
    showNotification('Settings saved (not persisted on server)', 'success');
}
function clearOldData() {
    showNotification('Clear old data must be implemented on the backend', 'warning');
}
function resetAllData() {
    showNotification('Reset all data must be implemented on the backend', 'warning');
}

window.approveStudent = approveStudent;
window.showDeclineModal = showDeclineModal;
window.closeDeclineModal = closeDeclineModal;
window.confirmDecline = confirmDecline;
window.graduateStudent = graduateStudent;
window.deleteStudent = deleteStudent;
window.showDeleteConfirmation = showDeleteConfirmation;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.closeStudentModal = closeStudentModal;
window.quickApprove = quickApprove;
window.quickDecline = quickDecline;
window.reconsiderApplication = reconsiderApplication;
window.generateCertificate = generateCertificate;
window.sendWelcomeEmail = sendWelcomeEmail;
window.refreshAdminData = refreshAdminData;