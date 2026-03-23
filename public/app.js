document.addEventListener('DOMContentLoaded', () => {
    initClock();
    loadEmployees();
});

function initClock() {
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    
    setInterval(() => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour12: true });
        dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }, 1000);
}

let employees = [];

async function loadEmployees() {
    try {
        const res = await fetch('/api/employees');
        employees = await res.json();
        
        const select = document.getElementById('employee-select');
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.name;
            select.appendChild(option);
        });

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
    } catch (error) {
        document.getElementById('loading').textContent = "Failed to load employees. Please contact Admin.";
    }
}

async function markAttendance(type) {
    const employee_id = document.getElementById('employee-select').value;
    const statusMsg = document.getElementById('attendance-status');

    if (!employee_id) {
        showStatus(statusMsg, 'Please select your name first.', 'error');
        return;
    }

    const now = new Date();
    // Use local YYYY-MM-DD
    const date = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,'0') + "-" + String(now.getDate()).padStart(2,'0');
    // Using simple format string
    const time = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');

    const endpoint = type === 'in' ? '/api/attendance/in' : '/api/attendance/out';
    const payload = type === 'in' 
        ? { employee_id, date, time_in: time } 
        : { employee_id, date, time_out: time };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            showStatus(statusMsg, data.message, 'success');
        } else {
            showStatus(statusMsg, data.error, 'error');
        }
    } catch (err) {
        showStatus(statusMsg, 'Network error.', 'error');
    }
}

async function applyLeave(e) {
    e.preventDefault();
    const employee_id = document.getElementById('employee-select').value;
    const statusMsg = document.getElementById('leave-status');

    if (!employee_id) {
        showStatus(statusMsg, 'Please select your name first.', 'error');
        return;
    }

    const start_date = document.getElementById('leave-start').value;
    const end_date = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value;

    try {
        const res = await fetch('/api/leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id, start_date, end_date, reason })
        });
        const data = await res.json();
        
        if (data.success) {
            showStatus(statusMsg, data.message, 'success');
            document.getElementById('leave-form').reset();
        } else {
            showStatus(statusMsg, data.error, 'error');
        }
    } catch (err) {
        showStatus(statusMsg, 'Network error.', 'error');
    }
}

function showStatus(element, message, type) {
    element.textContent = message;
    element.style.color = type === 'success' ? '#10B981' : '#EF4444';
    setTimeout(() => { element.textContent = ''; }, 3000);
}
