const fs = require('fs');
const path = require('path');
const { analyzeStellarHistory } = require('./analyzer');

const DB_FILE = path.join(__dirname, '../database.json');

// Initialize database file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    users: [
      {
        id: "lender-1",
        name: "Lender Admin",
        email: "lender@rrl.com",
        password: "password123",
        role: "lender"
      }
    ],
    loans: []
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

// Helper to read and write database
function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// In-memory session store for API token auth
const SESSIONS = {};

// Helper to generate a simple token
function generateToken() {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

// Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  const token = authHeader.split(' ')[1];
  const user = SESSIONS[token];
  if (!user) {
    return res.status(401).json({ error: "Session expired or invalid token." });
  }
  req.user = user;
  req.token = token;
  next();
}

module.exports = function(app) {
  
  // ---------------- AUTH ROUTES ----------------
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Please enter all fields." });
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "User already exists with this email." });
    }

    const newUser = {
      id: 'user-' + Date.now(),
      name,
      email: email.toLowerCase(),
      password, // In a real app we'd hash this, but simple text is fine for prototype
      role, // 'ofw' or 'lender'
      walletAddress: null
    };

    db.users.push(newUser);
    writeDb(db);

    const token = generateToken();
    SESSIONS[token] = newUser;

    res.status(201).json({
      message: "Registration successful",
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter email and password." });
    }

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const token = generateToken();
    SESSIONS[token] = user;

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, walletAddress: user.walletAddress }
    });
  });

  app.get('/api/auth/session', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/logout', authMiddleware, (req, res) => {
    delete SESSIONS[req.token];
    res.json({ message: "Logged out successfully." });
  });

  // ---------------- WALLET ROUTES ----------------
  app.post('/api/wallet/connect', authMiddleware, async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required." });
    }

    const db = readDb();
    const userIdx = db.users.findIndex(u => u.id === req.user.id);
    if (userIdx === -1) {
      return res.status(404).json({ error: "User not found." });
    }

    db.users[userIdx].walletAddress = walletAddress;

    // Check if walletAddress is a mock preset, and map profile info dynamically if so
    let mockName = null;
    let mockEmail = null;
    const keyCleaned = walletAddress.trim();
    
    if (keyCleaned === "G_EXCELLENT_OFW_STELLAR_KEY_850_1000" || keyCleaned === "mock_ofw_excellent") {
      mockName = "Maria Santos";
      mockEmail = "maria.santos@stellar-ofw.org";
    } else if (keyCleaned === "G_GOOD_OFW_STELLAR_KEY_700_849" || keyCleaned === "mock_ofw_good") {
      mockName = "Juan Dela Cruz";
      mockEmail = "juan.delacruz@stellar-ofw.org";
    } else if (keyCleaned === "G_FAIR_OFW_STELLAR_KEY_550_699" || keyCleaned === "mock_ofw_fair") {
      mockName = "Arnel Bautista";
      mockEmail = "arnel.bautista@stellar-ofw.org";
    } else if (keyCleaned === "G_POOR_OFW_STELLAR_KEY_BELOW_550" || keyCleaned === "mock_ofw_poor") {
      mockName = "Grace Lim";
      mockEmail = "grace.lim@stellar-ofw.org";
    }

    if (mockName) {
      db.users[userIdx].name = mockName;
      db.users[userIdx].email = mockEmail;
      
      // Update in-memory sessions
      req.user.name = mockName;
      req.user.email = mockEmail;
      SESSIONS[req.token].name = mockName;
      SESSIONS[req.token].email = mockEmail;
    }

    // Update in-memory session wallet
    req.user.walletAddress = walletAddress;
    SESSIONS[req.token].walletAddress = walletAddress;

    writeDb(db);

    // Trigger analysis immediately to verify
    try {
      const analysis = await analyzeStellarHistory(walletAddress);
      res.json({
        message: "Wallet linked successfully.",
        walletAddress,
        user: {
          id: db.users[userIdx].id,
          name: db.users[userIdx].name,
          email: db.users[userIdx].email,
          role: db.users[userIdx].role,
          walletAddress: db.users[userIdx].walletAddress
        },
        analysis
      });
    } catch (e) {
      res.json({
        message: "Wallet linked with warning: Analysis failed. Falling back to default scoring.",
        walletAddress,
        user: {
          id: db.users[userIdx].id,
          name: db.users[userIdx].name,
          email: db.users[userIdx].email,
          role: db.users[userIdx].role,
          walletAddress: db.users[userIdx].walletAddress
        },
        error: e.message
      });
    }
  });

  app.get('/api/wallet/analysis', authMiddleware, async (req, res) => {
    // Allow lenders to pass a query param, otherwise default to user's wallet
    let targetWallet = req.user.walletAddress;
    if (req.user.role === 'lender' && req.query.walletAddress) {
      targetWallet = req.query.walletAddress;
    }

    if (!targetWallet) {
      return res.status(400).json({ error: "No wallet address specified." });
    }

    try {
      const analysis = await analyzeStellarHistory(targetWallet);
      res.json(analysis);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------- LOAN ROUTES ----------------
  app.post('/api/loans/apply', authMiddleware, async (req, res) => {
    const { amount, businessCategory, businessDescription, termMonths } = req.body;
    
    if (!amount || !businessCategory || !businessDescription || !termMonths) {
      return res.status(400).json({ error: "Please provide all required loan application details." });
    }

    if (!req.user.walletAddress) {
      return res.status(400).json({ error: "You must connect your Stellar wallet first to establish credit eligibility." });
    }

    try {
      // Fetch credit score
      const analysis = await analyzeStellarHistory(req.user.walletAddress);
      
      if (analysis.grade === 'D') {
        return res.status(400).json({ 
          error: `Loan application denied. Your Stellar credit grade is '${analysis.grade}' (Score: ${analysis.score}), which does not meet the minimum requirement for local micro-loans. Please fund/activate your Stellar account and build consistent remittances.`
        });
      }

      // Check loan limits based on grade
      let maxAllowed = 25000;
      let interestRate = 8; // 8% p.a.
      if (analysis.grade === 'A') {
        maxAllowed = 100000;
        interestRate = 3;
      } else if (analysis.grade === 'B') {
        maxAllowed = 50000;
        interestRate = 5;
      }

      const reqAmount = parseFloat(amount);
      if (reqAmount > maxAllowed) {
        return res.status(400).json({ 
          error: `Requested amount exceeds the maximum limit of PHP ${maxAllowed.toLocaleString()} for Credit Grade '${analysis.grade}'.`
        });
      }

      const db = readDb();
      
      // Check if user already has an active loan application
      const activeLoan = db.loans.find(l => l.userId === req.user.id && (l.status === 'applied' || l.status === 'approved'));
      if (activeLoan) {
        return res.status(400).json({ error: "You already have an active loan application." });
      }

      // Calculate monthly payment: simple interest formula for simplicity in prototype
      // Total Repayment = Principal + (Principal * Rate * TermInYears)
      const termYears = parseFloat(termMonths) / 12;
      const totalRepayment = reqAmount + (reqAmount * (interestRate / 100) * termYears);
      const monthlyRepayment = Math.round((totalRepayment / termMonths) * 100) / 100;

      const newLoan = {
        id: 'loan-' + Date.now(),
        userId: req.user.id,
        applicantName: req.user.name,
        walletAddress: req.user.walletAddress,
        amount: reqAmount,
        businessCategory,
        businessDescription,
        termMonths: parseInt(termMonths),
        status: "applied", // "applied", "approved", "rejected", "disbursed", "repaid"
        creditScore: analysis.score,
        creditGrade: analysis.grade,
        appliedDate: new Date().toISOString(),
        approvedDate: null,
        disbursedDate: null,
        interestRate,
        monthlyRepayment,
        remainingBalance: totalRepayment,
        repaymentHistory: []
      };

      db.loans.push(newLoan);
      writeDb(db);

      res.status(201).json({
        message: "Loan application submitted successfully.",
        loan: newLoan
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to process application: " + e.message });
    }
  });

  app.get('/api/loans/my-loans', authMiddleware, (req, res) => {
    const db = readDb();
    const myLoans = db.loans.filter(l => l.userId === req.user.id);
    res.json(myLoans);
  });

  app.get('/api/loans/all', authMiddleware, (req, res) => {
    if (req.user.role !== 'lender') {
      return res.status(403).json({ error: "Forbidden. Lender permissions required." });
    }
    const db = readDb();
    res.json(db.loans);
  });

  // Review a loan application (Lender operation)
  app.post('/api/loans/:id/review', authMiddleware, (req, res) => {
    if (req.user.role !== 'lender') {
      return res.status(403).json({ error: "Forbidden. Lender permissions required." });
    }

    const { status, feedback } = req.body; // status: 'approved', 'rejected'
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid review status. Must be 'approved' or 'rejected'." });
    }

    const db = readDb();
    const loanIdx = db.loans.findIndex(l => l.id === req.params.id);
    if (loanIdx === -1) {
      return res.status(404).json({ error: "Loan application not found." });
    }

    const loan = db.loans[loanIdx];
    if (loan.status !== 'applied') {
      return res.status(400).json({ error: `Cannot review loan in state '${loan.status}'.` });
    }

    loan.status = status;
    loan.lenderFeedback = feedback || "";
    loan.approvedDate = new Date().toISOString();
    
    // Auto disburse approved loans immediately for mockup fluidity
    if (status === 'approved') {
      loan.status = 'disbursed';
      loan.disbursedDate = new Date().toISOString();
      loan.txHash = "0x" + Math.random().toString(16).substring(2, 18) + Math.random().toString(16).substring(2, 18); // Simulated Stellar disbursement tx hash
    }

    writeDb(db);
    res.json({
      message: `Loan application successfully ${status === 'approved' ? 'approved and disbursed' : 'rejected'}.`,
      loan
    });
  });

  // Repay loan installment (OFW operation)
  app.post('/api/loans/:id/repay', authMiddleware, (req, res) => {
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Please specify a valid payment amount." });
    }

    const payVal = parseFloat(amount);
    const db = readDb();
    const loanIdx = db.loans.findIndex(l => l.id === req.params.id && l.userId === req.user.id);
    if (loanIdx === -1) {
      return res.status(404).json({ error: "Active loan not found." });
    }

    const loan = db.loans[loanIdx];
    if (loan.status !== 'disbursed') {
      return res.status(400).json({ error: "This loan is not currently active for repayments." });
    }

    // Apply repayment
    const paymentAmount = Math.min(payVal, loan.remainingBalance);
    loan.remainingBalance = Math.round((loan.remainingBalance - paymentAmount) * 100) / 100;
    
    const paymentRecord = {
      date: new Date().toISOString(),
      amount: paymentAmount,
      txHash: "0x" + Math.random().toString(16).substring(2, 18) + Math.random().toString(16).substring(2, 18) // Simulated Stellar repayment tx hash
    };

    loan.repaymentHistory.push(paymentRecord);

    if (loan.remainingBalance <= 0) {
      loan.status = 'repaid';
    }

    writeDb(db);
    res.json({
      message: `Repayment of PHP ${paymentAmount.toLocaleString()} successfully processed via Stellar.`,
      loan
    });
  });

  // ---------------- LENDER PORTFOLIO METRICS ----------------
  app.get('/api/lender/metrics', authMiddleware, (req, res) => {
    if (req.user.role !== 'lender') {
      return res.status(403).json({ error: "Forbidden. Lender permissions required." });
    }

    const db = readDb();
    const activeLoans = db.loans.filter(l => l.status === 'disbursed');
    const repaidLoans = db.loans.filter(l => l.status === 'repaid');
    const totalApplications = db.loans.length;

    const totalDisbursed = db.loans
      .filter(l => ['disbursed', 'repaid'].includes(l.status))
      .reduce((sum, l) => sum + l.amount, 0);

    const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
    const totalRepaymentsReceived = db.loans.reduce((sum, l) => {
      const loanPaid = l.repaymentHistory.reduce((s, r) => s + r.amount, 0);
      return sum + loanPaid;
    }, 0);

    const avgScore = db.loans.length > 0 
      ? Math.round(db.loans.reduce((sum, l) => sum + l.creditScore, 0) / db.loans.length)
      : 0;

    // Sector breakdown
    const sectors = {};
    db.loans.forEach(l => {
      sectors[l.businessCategory] = (sectors[l.businessCategory] || 0) + 1;
    });

    res.json({
      totalApplications,
      activeLoansCount: activeLoans.length,
      repaidLoansCount: repaidLoans.length,
      totalDisbursed,
      totalOutstanding,
      totalRepaymentsReceived,
      avgScore,
      sectors
    });
  });
};
