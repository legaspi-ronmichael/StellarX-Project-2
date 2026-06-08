/**
 * Lender Console Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Secure route to Lender role only
  protectRoute('lender');

  // 2. Setup user info & navbar
  setupNavbar();
  const user = getLoggedInUser();
  
  // 3. Page state
  let selectedLoan = null;
  let auditChartInstance = null;

  // 4. Initial load
  loadLenderMetrics();
  loadLoansPipeline();

  // ---------------- PORTFOLIO METRICS ----------------
  async function loadLenderMetrics() {
    try {
      const metrics = await apiRequest('/lender/metrics');
      
      document.getElementById('metric-total-apps').textContent = metrics.totalApplications;
      document.getElementById('metric-disbursed').textContent = `PHP ${Math.round(metrics.totalDisbursed).toLocaleString()}`;
      document.getElementById('metric-outstanding').textContent = `PHP ${Math.round(metrics.totalOutstanding).toLocaleString()}`;
      document.getElementById('metric-avg-score').textContent = metrics.avgScore;

    } catch (e) {
      console.error("Failed to load portfolio metrics:", e.message);
    }
  }

  // ---------------- APPLICATIONS PIPELINE ----------------
  async function loadLoansPipeline() {
    const tableBody = document.getElementById('loans-table-body');
    
    try {
      const loans = await apiRequest('/loans/all');
      
      if (loans.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">No micro-loan applications in the pipeline.</td>
          </tr>
        `;
        return;
      }

      // Sort: 'applied' first, then by date descending
      loans.sort((a, b) => {
        if (a.status === 'applied' && b.status !== 'applied') return -1;
        if (a.status !== 'applied' && b.status === 'applied') return 1;
        return new Date(b.appliedDate) - new Date(a.appliedDate);
      });

      tableBody.innerHTML = loans.map(loan => {
        let statusClass = 'badge-c'; // orange for applied
        if (loan.status === 'disbursed' || loan.status === 'repaid') {
          statusClass = 'badge-a'; // green
        } else if (loan.status === 'rejected') {
          statusClass = 'badge-d'; // red
        }

        const date = new Date(loan.appliedDate).toLocaleDateString('default', { month: 'short', day: 'numeric' });
        const btnText = loan.status === 'applied' ? 'Audit Credit' : 'View Details';
        const btnClass = loan.status === 'applied' ? 'btn-primary' : 'btn-secondary';

        return `
          <tr>
            <td>
              <div style="font-weight: 700;">${loan.applicantName}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${date}</div>
            </td>
            <td>
              <div style="font-weight: 700; color: var(--accent-cyan);">${loan.creditScore}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Grade ${loan.creditGrade}</div>
            </td>
            <td>
              <div style="font-weight: 700;">PHP ${loan.amount.toLocaleString()}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${loan.termMonths} Months</div>
            </td>
            <td>
              <div style="font-size: 0.9rem;">${loan.businessCategory}</div>
            </td>
            <td>
              <span class="score-badge ${statusClass}">${loan.status}</span>
            </td>
            <td>
              <button class="btn ${btnClass} btn-audit" data-id="${loan.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                ${btnText}
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Add click listeners to Audit buttons
      const auditButtons = tableBody.querySelectorAll('.btn-audit');
      auditButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const loanId = btn.getAttribute('data-id');
          const matchedLoan = loans.find(l => l.id === loanId);
          if (matchedLoan) {
            openAuditPane(matchedLoan);
          }
        });
      });

    } catch (e) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--danger); padding: 3rem;">Failed to fetch pipeline: ${e.message}</td>
        </tr>
      `;
    }
  }

  // ---------------- DEEP AUDIT PANE ----------------
  async function openAuditPane(loan) {
    selectedLoan = loan;
    const pane = document.getElementById('audit-details-pane');
    
    // Smooth transition: hide and show
    pane.style.display = 'none';

    // Populate standard loan fields
    document.getElementById('audit-name').textContent = loan.applicantName;
    document.getElementById('audit-wallet').textContent = loan.walletAddress;
    document.getElementById('audit-plan-text').textContent = loan.businessDescription;

    const gradeBadge = document.getElementById('audit-grade-badge');
    gradeBadge.textContent = `Grade ${loan.creditGrade}`;
    gradeBadge.className = 'score-badge';
    gradeBadge.classList.add(`badge-${loan.creditGrade.toLowerCase()}`);

    // Fetch deep Stellar ledger metrics
    try {
      const analysis = await apiRequest(`/wallet/analysis?walletAddress=${loan.walletAddress}`);

      // Set audit metrics
      document.getElementById('audit-metric-longevity').textContent = analysis.metrics.longevity;
      document.getElementById('audit-metric-consistency').textContent = analysis.metrics.consistency;
      document.getElementById('audit-metric-inflow').textContent = analysis.metrics.avgInflow;
      document.getElementById('audit-metric-savings').textContent = analysis.metrics.savingsRate;

      // Draw Ledger cashflow chart
      drawAuditChart(analysis.history);

    } catch (err) {
      console.error("Failed to load audit transaction data:", err.message);
      // Fallback display if wallet fetch fails
      document.getElementById('audit-metric-longevity').textContent = `Grade ${loan.creditGrade} Defaults`;
      document.getElementById('audit-metric-consistency').textContent = "-";
      document.getElementById('audit-metric-inflow').textContent = "-";
      document.getElementById('audit-metric-savings').textContent = "-";
    }

    // Toggle forms based on status
    const formContainer = document.getElementById('decision-form-container');
    const completeContainer = document.getElementById('decision-complete-container');

    if (loan.status === 'applied') {
      formContainer.style.display = 'block';
      completeContainer.style.display = 'none';
      document.getElementById('decision-feedback').value = '';
    } else {
      formContainer.style.display = 'none';
      completeContainer.style.display = 'block';
      
      let termText = `Status: ${loan.status.toUpperCase()} | Terms: PHP ${loan.amount.toLocaleString()} at ${loan.interestRate}% p.a. over ${loan.termMonths} mos.`;
      document.getElementById('decision-term-summary').textContent = termText;

      let txText = loan.txHash ? `Stellar Disbursement Tx: \n${loan.txHash}` : `Review Remarks: ${loan.lenderFeedback}`;
      document.getElementById('decision-tx-summary').textContent = txText;
    }

    // Show pane
    pane.style.display = 'flex';
    pane.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function drawAuditChart(historyData) {
    if (!window.Chart) return;
    
    const ctx = document.getElementById('auditChart').getContext('2d');
    
    if (auditChartInstance) {
      auditChartInstance.destroy();
    }

    const labels = historyData.map(h => h.month);
    const inflows = historyData.map(h => h.inflow);
    const balances = historyData.map(h => h.balance);

    auditChartInstance = new Chart(ctx, {
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
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Running Balance (XLM)',
            data: balances,
            type: 'line',
            borderColor: 'hsl(250, 100%, 66%)',
            borderWidth: 2,
            fill: false,
            tension: 0.2,
            pointRadius: 2,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false } // hide legend for space
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'hsl(215, 20%, 65%)', font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: 'hsl(215, 20%, 65%)', font: { size: 9 } }
          }
        }
      }
    });
  }

  // Submit Decision Form
  const decisionForm = document.getElementById('form-audit-decision');
  decisionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const status = document.getElementById('decision-status').value;
    const feedback = document.getElementById('decision-feedback').value.trim();

    try {
      showAlert('lender-alert-container', 'Settle auditing decision and pushing transactions...', 'success');
      
      const res = await apiRequest(`/loans/${selectedLoan.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, feedback })
      });

      showAlert('lender-alert-container', res.message, 'success');
      
      // Reload everything
      loadLenderMetrics();
      loadLoansPipeline();
      
      // Update details pane showing completed action
      openAuditPane(res.loan);

    } catch (error) {
      showAlert('lender-alert-container', error.message, 'danger');
    }
  });

});
