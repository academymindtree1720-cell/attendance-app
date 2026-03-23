document.addEventListener('DOMContentLoaded', () => {
    loadAttendance();
    loadLeaves();
    loadEmployees();
});

function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById('sec-' + sectionId).classList.remove('hidden');
    document.getElementById('sec-' + sectionId).classList.add('active');
}

// Attendance
async function loadAttendance() {
    const res = await fetch('/api/attendance');
    const data = await res.json();
    const tbody = document.getElementById('attendance-tbody');
    tbody.innerHTML = '';
    data.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td>${row.date}</td>
                <td>${row.employee_name}</td>
                <td>${row.time_in || '--:--'}</td>
                <td>${row.time_out || '--:--'}</td>
                <td>
                    <button class="btn-small btn-danger" onclick="deleteAttendance(${row.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function deleteAttendance(id) {
    if(!confirm("Are you sure you want to delete this record?")) return;
    await fetch('/api/attendance/' + id, { method: 'DELETE' });
    loadAttendance();
}

// Leaves
async function loadLeaves() {
    const res = await fetch('/api/leaves/all');
    const data = await res.json();
    const tbody = document.getElementById('leaves-tbody');
    tbody.innerHTML = '';
    data.forEach(row => {
        let statusColor = row.status === 'Approved' ? 'color:#10B981' : row.status === 'Rejected' ? 'color:#EF4444' : 'color:#F59E0B';
        tbody.innerHTML += `
            <tr>
                <td>${row.employee_name}</td>
                <td>${row.start_date}</td>
                <td>${row.end_date}</td>
                <td>${row.reason}</td>
                <td style="font-weight:bold; ${statusColor}">${row.status}</td>
                <td>
                    ${row.status === 'Pending' ? `
                        <button class="btn-small btn-primary" onclick="updateLeave(${row.id}, 'Approved')">Approve</button>
                        <button class="btn-small btn-danger" onclick="updateLeave(${row.id}, 'Rejected')">Reject</button>
                    ` : 'Reviewed'}
                </td>
            </tr>
        `;
    });
}

async function updateLeave(id, status) {
    await fetch('/api/leaves/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    loadLeaves();
}

// Employees
async function loadEmployees() {
    const res = await fetch('/api/employees');
    const data = await res.json();
    const tbody = document.getElementById('employees-tbody');
    tbody.innerHTML = '';
    data.forEach(emp => {
        tbody.innerHTML += `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.name}</td>
                <td>
                    <button class="btn-small btn-danger" onclick="deleteEmployee(${emp.id})">Remove</button>
                </td>
            </tr>
        `;
    });
}

async function addEmployee() {
    const nameInput = document.getElementById('new-emp-name');
    const name = nameInput.value.trim();
    if (!name) return alert('Enter a name');

    await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    nameInput.value = '';
    loadEmployees();
}

async function deleteEmployee(id) {
    if(!confirm("Are you sure you want to remove this employee?")) return;
    await fetch('/api/employees/' + id, { method: 'DELETE' });
    loadEmployees();
    loadAttendance(); // Refresh relationships
    loadLeaves();
}
