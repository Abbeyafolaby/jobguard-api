// Configuration
const API_BASE_URL = window.location.origin + '/api/v1';
const STORAGE_KEY = 'jobguard_admin_token';

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const adminEmail = document.getElementById('adminEmail');

// Initialize app
function init() {
    const token = localStorage.getItem(STORAGE_KEY);

    if (token) {
        showDashboard();
        loadDashboardData();
    } else {
        showLogin();
    }

    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    refreshBtn.addEventListener('click', loadDashboardData);
}

// Show/Hide screens
function showLogin() {
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
}

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'flex';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>Signing in...</span>';
    loginError.classList.remove('show');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Check if user has admin role
        if (data.data?.user?.role !== 'admin') {
            throw new Error('Access denied. Admin privileges required.');
        }

        // Store token
        localStorage.setItem(STORAGE_KEY, data.data.token);

        // Show dashboard
        adminEmail.textContent = email;
        showDashboard();
        loadDashboardData();

    } catch (error) {
        loginError.textContent = error.message;
        loginError.classList.add('show');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Sign In</span>';
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    showLogin();
    loginForm.reset();
}

// Load dashboard data
async function loadDashboardData() {
    const token = localStorage.getItem(STORAGE_KEY);

    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                handleLogout();
                throw new Error('Session expired. Please login again.');
            }
            throw new Error('Failed to load dashboard data');
        }

        const result = await response.json();
        const data = result.data;

        // Update overview stats
        updateOverviewStats(data.overview, data.riskLevels, data.statusCounts);

        // Update last update time
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = new Date().toLocaleString();
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data: ' + error.message);
    }
}

// Update overview statistics
function updateOverviewStats(overview, riskLevels, statusCounts) {
    if (document.getElementById('totalUsers')) document.getElementById('totalUsers').textContent = formatNumber(overview.totalUsers);
    if (document.getElementById('verifiedUsers')) document.getElementById('verifiedUsers').textContent = formatNumber(overview.verifiedUsers);
    if (document.getElementById('totalScans')) document.getElementById('totalScans').textContent = formatNumber(overview.totalScans);
    if (document.getElementById('activeUsers')) document.getElementById('activeUsers').textContent = formatNumber(overview.activeUsers);
    if (document.getElementById('highRiskScans')) document.getElementById('highRiskScans').textContent = formatNumber(riskLevels.high);

    const highRiskPercent = overview.totalScans > 0
        ? ((riskLevels.high / overview.totalScans) * 100).toFixed(1)
        : 0;
    if (document.getElementById('highRiskPercent')) document.getElementById('highRiskPercent').textContent = highRiskPercent;

    if (document.getElementById('avgScamProb')) document.getElementById('avgScamProb').textContent =
        overview.averageScamProbability.toFixed(1) + '%';

    // Update status counts
    if (statusCounts) {
        if (document.getElementById('completedScans'))
            document.getElementById('completedScans').textContent = formatNumber(statusCounts.completed || 0);

        if (document.getElementById('failedScans'))
            document.getElementById('failedScans').textContent = formatNumber(statusCounts.failed || 0);
    }
}

// Utility functions
function formatNumber(num) {
    return num.toLocaleString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
