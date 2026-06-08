/**
 * Client-Side Session & Authentication Handler
 */

const API_BASE = '/api';

// Check if user is logged in
function isAuthenticated() {
  return localStorage.getItem('rrl_token') !== null;
}

// Retrieve auth token
function getAuthToken() {
  return localStorage.getItem('rrl_token');
}

// Retrieve logged in user info
function getLoggedInUser() {
  const userJson = localStorage.getItem('rrl_user');
  return userJson ? JSON.parse(userJson) : null;
}

// Save session
function setSession(token, user) {
  localStorage.setItem('rrl_token', token);
  localStorage.setItem('rrl_user', JSON.stringify(user));
}

// Clear session and redirect to home
function logout() {
  const token = getAuthToken();
  if (token) {
    // Fire logout request (ignore response as we clear locally regardless)
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(err => console.error("Logout request error", err));
  }
  
  localStorage.removeItem('rrl_token');
  localStorage.removeItem('rrl_user');
  window.location.href = 'index.html';
}

// Global fetch wrapper with automatic bearer token inject
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    // Session expired
    localStorage.removeItem('rrl_token');
    localStorage.removeItem('rrl_user');
    window.location.href = 'index.html?error=session_expired';
    throw new Error("Session expired");
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  
  return data;
}

// Protect current page based on role requirements
function protectRoute(requiredRole = null) {
  const user = getLoggedInUser();
  
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'lender') {
      window.location.href = 'lender.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  }
}

// Populate user-specific navbar fields
function setupNavbar() {
  const user = getLoggedInUser();
  if (!user) return;
  
  const userDisplayEl = document.getElementById('nav-user-name');
  if (userDisplayEl) {
    userDisplayEl.textContent = user.name;
  }
  
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// Helper to show alert banners in container
function showAlert(containerId, message, type = 'danger') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="alert-banner alert-banner-${type}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' 
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' 
          : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
      </svg>
      <span>${message}</span>
    </div>
  `;
}
