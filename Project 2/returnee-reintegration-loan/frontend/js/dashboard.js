/**
 * OFW Dashboard Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Secure route to OFW role only
  protectRoute('ofw');
  
  // 2. Setup user info & navbar
  function refreshUserProfile() {
    setupNavbar();
    const user = getLoggedInUser();
    if (user) {
      document.getElementById('user-fullname').textContent = user.name;
      document.getElementById('user-email').textContent = user.email;
      document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
    }
  }
  refreshUserProfile();

  // 3. Page state
  let currentActivePanel = 'wallet';
  let chartInstance = null;
  let activeLoan = null;

  // 5. Sidebar Navigation toggling
  const navLinks = {
    wallet: document.getElementById('nav-wallet'),
    credit: document.getElementById('nav-credit'),
    apply: document.getElementById('nav-apply'),
    status: document.getElementById('nav-status')
  };

  const panels = {
    wallet: document.getElementById('panel-wallet'),
    credit: document.getElementById('panel-credit'),
    apply: document.getElementById('panel-apply'),
    status: document.getElementById('panel-status')
  };

  function switchPanel(panelId) {
    // Hide all panels
    Object.keys(panels).forEach(k => {
      panels[k].style.display = 'none';
      if (navLinks[k]) navLinks[k].classList.remove('active');
    });

    // Show target
    if (panelId === 'credit') {
      panels.credit.style.display = 'flex';
    } else {
      panels[panelId].style.display = 'block';
    }
    if (navLinks[panelId]) navLinks[panelId].classList.add('active');
    
    currentActivePanel = panelId;
    window.location.hash = panelId;

    // Trigger load functions
    if (panelId === 'credit') {
      loadCreditAnalytics();
    } else if (panelId === 'apply') {
      setupLoanFormLimits();
    } else if (panelId === 'status') {
      loadLoanStatus();
    }
  }

  // Bind navigation click events
  Object.keys(navLinks).forEach(k => {
    if (navLinks[k]) {
      navLinks[k].addEventListener('click', (e) => {
        e.preventDefault();
        switchPanel(k);
      });
    }
  });

  // Handle URL hash routing
  const hash = window.location.hash.substring(1);
  if (hash && panels[hash]) {
    // Allow going directly if wallet is connected
    const hasWallet = getLoggedInUser().walletAddress !== null;
    if (hasWallet || hash === 'wallet') {
      switchPanel(hash);
    }
  }

  // 4. Check linked wallet
  updateSidebarWalletBadge();

  function updateSidebarWalletBadge() {
    const freshUser = getLoggedInUser();
    const badge = document.getElementById('sidebar-wallet-badge');
    
    if (freshUser.walletAddress) {
      badge.textContent = `Wallet: ${freshUser.walletAddress.substring(0, 10)}...`;
      badge.style.color = 'var(--accent-cyan)';
      
      // Reveal other tabs
      navLinks.credit.style.display = 'flex';
      
      // Check if user has loan first to decide showing Apply vs Status
      checkExistingLoans();
    } else {
      badge.textContent = 'No Wallet Linked';
      badge.style.color = 'var(--danger)';
      navLinks.credit.style.display = 'none';
      navLinks.apply.style.display = 'none';
      navLinks.status.style.display = 'none';
      switchPanel('wallet');
    }
  }

  async function checkExistingLoans() {
    try {
      const loans = await apiRequest('/loans/my-loans');
      if (loans.length > 0) {
        // User has an application/loan, reveal status tab
        activeLoan = loans[0]; // Simple prototype picks the latest one
        navLinks.status.style.display = 'flex';
        navLinks.apply.style.display = 'none';
      } else {
        // No loans, show apply tab
        navLinks.apply.style.display = 'flex';
        navLinks.status.style.display = 'none';
      }
    } catch (e) {
      console.error("Failed to check active loans:", e.message);
    }
  }

  // ---------------- PRESSETS LINK CLICKS ----------------
  const presets = document.querySelectorAll('.preset-card');
  presets.forEach(p => {
    p.addEventListener('click', () => {
      const key = p.getAttribute('data-key');
      document.getElementById('stellar-key-input').value = key;
      // Trigger submission
      document.getElementById('form-connect-wallet').dispatchEvent(new Event('submit'));
    });
  });

  // ---------------- CONNECT WALLET ----------------
  const walletForm = document.getElementById('form-connect-wallet');
  walletForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const walletAddress = document.getElementById('stellar-key-input').value.trim();

    try {
      showAlert('dashboard-alert-container', 'Connecting & cryptographically auditing Stellar wallet history...', 'success');
      
      const res = await apiRequest('/wallet/connect', {
        method: 'POST',
        body: JSON.stringify({ walletAddress })
      });

      // Update session
      localStorage.setItem('rrl_user', JSON.stringify(res.user));

      // Refresh navbar & profile UI dynamically
      refreshUserProfile();

      showAlert('dashboard-alert-container', 'Wallet connected successfully. Credit grade established.', 'success');
      
      // Update UI tabs
      updateSidebarWalletBadge();
      
      // Delay switch slightly so user sees success alert
      setTimeout(() => {
        switchPanel('credit');
      }, 1000);

    } catch (error) {
      showAlert('dashboard-alert-container', error.message, 'danger');
    }
  });

  // ---------------- CREDIT ANALYTICS ----------------
  async function loadCreditAnalytics() {
    try {
      const analysis = await apiRequest('/wallet/analysis');
      
      // Animate score ring
      animateScoreGauge(analysis.score, analysis.grade);

      // Populate details
      document.getElementById('metric-longevity').textContent = analysis.metrics.longevity;
      document.getElementById('metric-consistency').textContent = analysis.metrics.consistency;
      document.getElementById('metric-inflow').textContent = analysis.metrics.avgInflow;
      document.getElementById('metric-savings').textContent = analysis.metrics.savingsRate;

      // Populate text summary
      let summaryText = "";
      if (analysis.grade === 'A') {
        summaryText = `Outstanding ledger profile! Direct access to loans up to PHP 100,000 at a premium interest rate of 3% p.a.`;
      } else if (analysis.grade === 'B') {
        summaryText = `Very consistent remittance habits. Pre-qualified for loans up to PHP 50,000 at 5% p.a.`;
      } else if (analysis.grade === 'C') {
        summaryText = `Fair Stellar history. Eligible for micro-loans up to PHP 25,000 at 8% p.a. Keep transfers steady to improve score.`;
      } else {
        summaryText = `Minimal activity history on the Stellar network. Currently ineligible for local micro-loans. Please establish a recurring transfer pattern.`;
      }
      document.getElementById('credit-score-summary').textContent = summaryText;

      // Draw Cashflow Chart
      drawRemittanceChart(analysis.history);

    } catch (error) {
      showAlert('dashboard-alert-container', 'Failed to retrieve credit analysis: ' + error.message, 'danger');
    }
  }

  function animateScoreGauge(score, grade) {
    const scoreVal = document.getElementById('credit-score-val');
    const badge = document.getElementById('credit-grade-badge');
    const ring = document.getElementById('score-ring');
    
    // Set score badge grade class
    badge.textContent = `Grade ${grade}`;
    badge.className = 'score-badge'; // reset
    badge.classList.add(`badge-${grade.toLowerCase()}`);

    // Animate score counter text
    let current = 0;
    const interval = setInterval(() => {
      if (current >= score) {
        scoreVal.textContent = score;
        clearInterval(interval);
      } else {
        current += Math.ceil(score / 30);
        if (current > score) current = score;
        scoreVal.textContent = current;
      }
    }, 25);

    // Circle circumference = 2 * PI * r = 2 * 3.14159 * 50 = 314.16
    const circ = 314.16;
    const offset = circ - (score / 1000) * circ;
    ring.style.strokeDashoffset = offset;
  }

  function drawRemittanceChart(historyData) {
    if (!window.Chart) return;
    
    const ctx = document.getElementById('remittanceChart').getContext('2d');
    
    // Destroy previous chart to prevent overlaps
    if (chartInstance) {
      chartInstance.destroy();
    }

    const labels = historyData.map(h => h.month);
    const inflows = historyData.map(h => h.inflow);
    const outflows = historyData.map(h => h.outflow);
    const balances = historyData.map(h => h.balance);

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Inflows (XLM)',
            data: inflows,
            backgroundColor: 'rgba(0, 242, 254, 0.45)',
            borderColor: 'hsl(182, 100%, 50%)',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Outflows (XLM)',
            data: outflows,
            backgroundColor: 'rgba(139, 92, 246, 0.25)',
            borderColor: 'hsl(280, 85%, 60%)',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Running Balance (XLM)',
            data: balances,
            type: 'line',
            borderColor: 'hsl(250, 100%, 66%)',
            borderWidth: 3,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: 'hsl(250, 100%, 66%)',
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'hsl(210, 40%, 98%)',
              font: { family: 'Plus Jakarta Sans', size: 11 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: 'hsl(215, 20%, 65%)' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: 'hsl(215, 20%, 65%)' },
            position: 'left'
          }
        }
      }
    });
  }

  // ---------------- LOAN APPLICATION SETUP ----------------
  const amountSlider = document.getElementById('loan-amount-slider');
  const amountDisplay = document.getElementById('loan-amount-display');
  const maxDisplay = document.getElementById('loan-max-display');
  const termSelect = document.getElementById('loan-term');
  const rateDisplay = document.getElementById('summary-rate');
  const monthlyDisplay = document.getElementById('summary-monthly');
  const totalDisplay = document.getElementById('summary-total');

  let currentRate = 8; // Default interest rate

  async function setupLoanFormLimits() {
    try {
      const analysis = await apiRequest('/wallet/analysis');
      
      let maxLimit = 25000;
      currentRate = 8;
      
      if (analysis.grade === 'A') {
        maxLimit = 100000;
        currentRate = 3;
      } else if (analysis.grade === 'B') {
        maxLimit = 50000;
        currentRate = 5;
      } else if (analysis.grade === 'D') {
        // Ineligible, deny accessing loan form
        showAlert('dashboard-alert-container', 'Your Credit Grade (Grade D) does not qualify for micro-loans at this time. Focus on building Stellar transactions.', 'danger');
        switchPanel('credit');
        return;
      }

      // Configure slider boundaries
      amountSlider.max = maxLimit;
      amountSlider.value = Math.min(amountSlider.value, maxLimit);
      maxDisplay.textContent = `PHP ${maxLimit.toLocaleString()}`;
      rateDisplay.textContent = `${currentRate}% p.a.`;

      updateLoanCalculations();
    } catch (e) {
      console.error("Failed to load loan boundaries:", e.message);
    }
  }

  function updateLoanCalculations() {
    const amount = parseFloat(amountSlider.value);
    const term = parseInt(termSelect.value);

    // Simple interest formula: Interest = Principal * Rate * TimeInYears
    const termYears = term / 12;
    const totalRepay = amount + (amount * (currentRate / 100) * termYears);
    const monthlyRepay = totalRepay / term;

    amountDisplay.textContent = `PHP ${amount.toLocaleString()}`;
    monthlyDisplay.textContent = `PHP ${Math.round(monthlyRepay).toLocaleString()}`;
    totalDisplay.textContent = `PHP ${Math.round(totalRepay).toLocaleString()}`;
  }

  // Slider & term changes updates calculations
  amountSlider.addEventListener('input', updateLoanCalculations);
  termSelect.addEventListener('change', updateLoanCalculations);

  // Application Submission
  const applyForm = document.getElementById('form-apply-loan');
  applyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(amountSlider.value);
    const termMonths = parseInt(termSelect.value);
    const businessCategory = document.getElementById('loan-category').value;
    const businessDescription = document.getElementById('loan-description').value.trim();

    try {
      const res = await apiRequest('/loans/apply', {
        method: 'POST',
        body: JSON.stringify({ amount, termMonths, businessCategory, businessDescription })
      });

      showAlert('dashboard-alert-container', res.message, 'success');
      activeLoan = res.loan;
      
      // Update sidebar tabs
      await checkExistingLoans();
      
      setTimeout(() => {
        switchPanel('status');
      }, 1200);

    } catch (error) {
      showAlert('dashboard-alert-container', error.message, 'danger');
    }
  });

  // ---------------- ACTIVE LOAN PANEL ----------------
  async function loadLoanStatus() {
    try {
      const loans = await apiRequest('/loans/my-loans');
      if (loans.length === 0) {
        switchPanel('apply');
        return;
      }

      activeLoan = loans[0];

      // Set titles
      const date = new Date(activeLoan.appliedDate).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
      document.getElementById('loan-status-subtitle').textContent = `Applied on ${date} | Sector: ${activeLoan.businessCategory}`;
      
      const badge = document.getElementById('loan-status-badge');
      badge.textContent = activeLoan.status;
      badge.className = 'score-badge';
      
      const activeContainer = document.getElementById('loan-active-container');
      const deniedContainer = document.getElementById('loan-denied-message');

      if (activeLoan.status === 'applied') {
        badge.classList.add('badge-c'); // orange
        document.getElementById('loan-status-title').textContent = "Micro-Loan Application Pending Review";
        activeContainer.style.display = 'none';
        deniedContainer.style.display = 'none';
        showAlert('dashboard-alert-container', 'Your application has been received and is waiting for review by our lending partners.', 'warning');
      } 
      else if (activeLoan.status === 'disbursed') {
        badge.classList.add('badge-a'); // green
        document.getElementById('loan-status-title').textContent = "Active Reintegration Micro-Loan";
        activeContainer.style.display = 'block';
        deniedContainer.style.display = 'none';

        // Populate fields
        document.getElementById('status-amount').textContent = `PHP ${activeLoan.amount.toLocaleString()}`;
        document.getElementById('status-balance').textContent = `PHP ${Math.round(activeLoan.remainingBalance).toLocaleString()}`;
        document.getElementById('status-monthly').textContent = `PHP ${Math.round(activeLoan.monthlyRepayment).toLocaleString()}`;

        // Populate repayment lists
        populateRepayments(activeLoan.repaymentHistory);
      }
      else if (activeLoan.status === 'repaid') {
        badge.classList.add('badge-a');
        document.getElementById('loan-status-title').textContent = "Loan Repaid In Full!";
        activeContainer.style.display = 'block';
        deniedContainer.style.display = 'none';
        document.getElementById('status-amount').textContent = `PHP ${activeLoan.amount.toLocaleString()}`;
        document.getElementById('status-balance').textContent = `PHP 0`;
        document.getElementById('status-monthly').textContent = `-`;
        
        populateRepayments(activeLoan.repaymentHistory);
        showAlert('dashboard-alert-container', 'Congratulations! You have repaid this reintegration micro-loan. You are pre-qualified for secondary expansion financing.', 'success');
      }
      else if (activeLoan.status === 'rejected') {
        badge.classList.add('badge-d'); // red
        document.getElementById('loan-status-title').textContent = "Application Rejected";
        activeContainer.style.display = 'none';
        deniedContainer.style.display = 'block';
        document.getElementById('denied-feedback-text').textContent = activeLoan.lenderFeedback || "No additional feedback provided by the lender.";
      }

    } catch (error) {
      showAlert('dashboard-alert-container', 'Failed to retrieve active loan status: ' + error.message, 'danger');
    }
  }

  function populateRepayments(history) {
    const list = document.getElementById('payment-logs-list');
    if (history.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No repayments logged yet.</div>`;
      return;
    }

    list.innerHTML = history.map(h => {
      const d = new Date(h.date).toLocaleDateString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="payment-history-item">
          <div>
            <div style="font-weight: 700;">PHP ${h.amount.toLocaleString()}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${d}</div>
          </div>
          <span class="tx-hash" title="${h.txHash}">${h.txHash.substring(0, 12)}...</span>
        </div>
      `;
    }).join('');
  }

  // Submit Repayment Simulation
  const repayForm = document.getElementById('form-repay-loan');
  repayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeLoan) return;

    const amount = parseFloat(document.getElementById('repay-amount-input').value);
    
    try {
      showAlert('dashboard-alert-container', 'Processing repayment transaction on Stellar...', 'success');
      
      const res = await apiRequest(`/loans/${activeLoan.id}/repay`, {
        method: 'POST',
        body: JSON.stringify({ amount })
      });

      showAlert('dashboard-alert-container', res.message, 'success');
      document.getElementById('repay-amount-input').value = '';

      // Reload Status panel
      loadLoanStatus();

    } catch (error) {
      showAlert('dashboard-alert-container', error.message, 'danger');
    }
  });

});
