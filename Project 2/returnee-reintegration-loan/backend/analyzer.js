/**
 * Stellar Wallet Credit Scoring & Analysis Engine
 */

// Define mock data for sandbox/offline or demonstration mode
const MOCK_WALLETS = {
  "mock_ofw_excellent": {
    publicKey: "G_EXCELLENT_OFW_STELLAR_KEY_850_1000",
    name: "Maria Santos (Excellent Profile)",
    ageMonths: 36,
    balance: 2450.75, // in XLM
    grade: "A",
    score: 925,
    metrics: {
      longevity: "3.0 Years (36 Months)",
      consistency: "100% (12/12 active months)",
      avgInflow: "1,850 XLM / mo",
      savingsRate: "42.5%"
    },
    history: [
      { month: "Jul 25", inflow: 1800, outflow: 1100, balance: 700 },
      { month: "Aug 25", inflow: 1900, outflow: 1050, balance: 1550 },
      { month: "Sep 25", inflow: 1850, outflow: 1100, balance: 2300 },
      { month: "Oct 25", inflow: 1800, outflow: 1200, balance: 2900 },
      { month: "Nov 25", inflow: 2000, outflow: 1150, balance: 3750 },
      { month: "Dec 25", inflow: 2200, outflow: 2100, balance: 3850 },
      { month: "Jan 26", inflow: 1750, outflow: 1300, balance: 4300 },
      { month: "Feb 26", inflow: 1800, outflow: 1250, balance: 4850 },
      { month: "Mar 26", inflow: 1950, outflow: 1200, balance: 5600 },
      { month: "Apr 26", inflow: 1850, outflow: 4800, balance: 2650 }, // major transfer home (reintegration preparation)
      { month: "May 26", inflow: 1900, outflow: 1100, balance: 3450 },
      { month: "Jun 26", inflow: 1800, outflow: 2799.25, balance: 2450.75 }
    ]
  },
  "mock_ofw_good": {
    publicKey: "G_GOOD_OFW_STELLAR_KEY_700_849",
    name: "Juan Dela Cruz (Good Profile)",
    ageMonths: 18,
    balance: 820.50,
    grade: "B",
    score: 765,
    metrics: {
      longevity: "1.5 Years (18 Months)",
      consistency: "91% (11/12 active months)",
      avgInflow: "1,200 XLM / mo",
      savingsRate: "28.3%"
    },
    history: [
      { month: "Jul 25", inflow: 1200, outflow: 900, balance: 300 },
      { month: "Aug 25", inflow: 1150, outflow: 950, balance: 500 },
      { month: "Sep 25", inflow: 1300, outflow: 850, balance: 950 },
      { month: "Oct 25", inflow: 1200, outflow: 1000, balance: 1150 },
      { month: "Nov 25", inflow: 0, outflow: 300, balance: 850 }, // unpaid leave month
      { month: "Dec 25", inflow: 1500, outflow: 1300, balance: 1050 },
      { month: "Jan 26", inflow: 1200, outflow: 950, balance: 1300 },
      { month: "Feb 26", inflow: 1100, outflow: 1000, balance: 1400 },
      { month: "Mar 26", inflow: 1250, outflow: 900, balance: 1750 },
      { month: "Apr 26", inflow: 1200, outflow: 2100, balance: 850 },
      { month: "May 26", inflow: 1300, outflow: 950, balance: 1200 },
      { month: "Jun 26", inflow: 1200, outflow: 1579.50, balance: 820.50 }
    ]
  },
  "mock_ofw_fair": {
    publicKey: "G_FAIR_OFW_STELLAR_KEY_550_699",
    name: "Arnel Bautista (Fair Profile)",
    ageMonths: 10,
    balance: 210.00,
    grade: "C",
    score: 610,
    metrics: {
      longevity: "0.8 Years (10 Months)",
      consistency: "75% (9/12 active months)",
      avgInflow: "750 XLM / mo",
      savingsRate: "11.2%"
    },
    history: [
      { month: "Jul 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Aug 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Sep 25", inflow: 800, outflow: 750, balance: 50 },
      { month: "Oct 25", inflow: 750, outflow: 700, balance: 100 },
      { month: "Nov 25", inflow: 600, outflow: 600, balance: 100 },
      { month: "Dec 25", inflow: 1100, outflow: 1050, balance: 150 },
      { month: "Jan 26", inflow: 0, outflow: 50, balance: 100 }, // gap in work
      { month: "Feb 26", inflow: 800, outflow: 750, balance: 150 },
      { month: "Mar 26", inflow: 900, outflow: 800, balance: 250 },
      { month: "Apr 26", inflow: 700, outflow: 800, balance: 150 },
      { month: "May 26", inflow: 800, outflow: 700, balance: 250 },
      { month: "Jun 26", inflow: 750, outflow: 790, balance: 210 }
    ]
  },
  "mock_ofw_poor": {
    publicKey: "G_POOR_OFW_STELLAR_KEY_BELOW_550",
    name: "Grace Lim (Poor Profile)",
    ageMonths: 3,
    balance: 25.10,
    grade: "D",
    score: 420,
    metrics: {
      longevity: "0.2 Years (3 Months)",
      consistency: "25% (3/12 active months)",
      avgInflow: "250 XLM / mo",
      savingsRate: "3.3%"
    },
    history: [
      { month: "Jul 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Aug 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Sep 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Oct 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Nov 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Dec 25", inflow: 0, outflow: 0, balance: 0 },
      { month: "Jan 26", inflow: 0, outflow: 0, balance: 0 },
      { month: "Feb 26", inflow: 0, outflow: 0, balance: 0 },
      { month: "Mar 26", inflow: 0, outflow: 0, balance: 0 },
      { month: "Apr 26", inflow: 400, outflow: 390, balance: 10 },
      { month: "May 26", inflow: 350, outflow: 340, balance: 20 },
      { month: "Jun 26", inflow: 0, outflow: 19.90, balance: 25.10 } // active 2 months basically
    ]
  }
};

/**
 * Main analysis function
 */
async function analyzeStellarHistory(publicKey) {
  // 1. Check if public key matches a mock key prefix or name
  const matchedKey = Object.keys(MOCK_WALLETS).find(
    k => publicKey === MOCK_WALLETS[k].publicKey || publicKey.toLowerCase() === k
  );

  if (matchedKey) {
    return {
      success: true,
      mode: "mock",
      ...MOCK_WALLETS[matchedKey]
    };
  }

  // 2. If it's a generic "mock_" string or doesn't look like a real Stellar public key, fallback to a smart generator
  if (publicKey.startsWith("mock_") || !/^[GD][A-D0-9]{55}$/.test(publicKey)) {
    // Generate a pseudo-random but consistent profile based on public key hash
    let hash = 0;
    for (let i = 0; i < publicKey.length; i++) {
      hash = publicKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const scores = [580, 640, 720, 810, 890, 940];
    const score = scores[hash % scores.length];
    
    let grade = "C";
    if (score >= 850) grade = "A";
    else if (score >= 700) grade = "B";
    else if (score < 550) grade = "D";

    const balance = (hash % 1500) + 50;
    const ageMonths = (hash % 24) + 6;
    const avgInflow = (hash % 1000) + 400;
    const consistencyPct = (hash % 40) + 60; // 60% to 100%
    const savingsRate = ((balance / (avgInflow * ageMonths)) * 100).toFixed(1);

    // Generate custom history
    const months = ["Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26"];
    let runningBalance = balance * 0.2;
    const history = months.map((m, index) => {
      const isConsistent = (hash + index) % 10 < (consistencyPct / 10);
      const inflow = isConsistent ? Math.round(avgInflow * (0.8 + ((hash + index) % 5) * 0.1)) : 0;
      const outflow = inflow > 0 ? Math.round(inflow * (0.7 + ((hash - index) % 4) * 0.05)) : Math.round(runningBalance * 0.1);
      runningBalance = Math.max(0, runningBalance + inflow - outflow);
      return {
        month: m,
        inflow,
        outflow,
        balance: Math.round(runningBalance * 100) / 100
      };
    });

    // Make final balance match history
    const finalBalance = history[history.length - 1].balance;

    return {
      success: true,
      mode: "generated_mock",
      publicKey,
      name: `Stellar Wallet (${publicKey.substring(0, 6)}...${publicKey.substring(50)})`,
      ageMonths,
      balance: finalBalance,
      grade,
      score,
      metrics: {
        longevity: `${(ageMonths / 12).toFixed(1)} Years (${ageMonths} Months)`,
        consistency: `${consistencyPct}% (${Math.round(12 * (consistencyPct/100))}/12 active months)`,
        avgInflow: `${avgInflow} XLM / mo`,
        savingsRate: `${savingsRate}%`
      },
      history
    };
  }

  // 3. Query Real Horizon Testnet API
  try {
    const horizonUrl = "https://horizon-testnet.stellar.org";
    
    // Fetch account summary
    const accountResponse = await fetch(`${horizonUrl}/accounts/${publicKey}`);
    if (!accountResponse.ok) {
      throw new Error(`Horizon account fetch failed with status ${accountResponse.status}`);
    }
    const accountData = await accountResponse.json();

    // Fetch payments
    const paymentsResponse = await fetch(`${horizonUrl}/accounts/${publicKey}/payments?limit=100&order=asc`);
    if (!paymentsResponse.ok) {
      throw new Error(`Horizon payments fetch failed with status ${paymentsResponse.status}`);
    }
    const paymentsData = await paymentsResponse.json();
    const payments = paymentsData._embedded?.records || [];

    // Extract current balance (summing native XLM and other tokens)
    let nativeBalance = 0;
    accountData.balances.forEach(b => {
      if (b.asset_type === "native") {
        nativeBalance = parseFloat(b.balance);
      }
    });

    // Calculate metrics from payments
    if (payments.length === 0) {
      return {
        success: true,
        mode: "live",
        publicKey,
        name: `New Wallet (${publicKey.substring(0, 6)}...)`,
        ageMonths: 1,
        balance: nativeBalance,
        grade: "D",
        score: 350,
        metrics: {
          longevity: "New Wallet (<1 month)",
          consistency: "0% (0/12 active months)",
          avgInflow: "0 XLM / mo",
          savingsRate: "0%"
        },
        history: Array(12).fill(0).map((_, i) => ({
          month: ["Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26"][i],
          inflow: 0,
          outflow: 0,
          balance: 0
        }))
      };
    }

    // Determine oldest payment for longevity
    const oldestTxTime = new Date(payments[0].created_at);
    const now = new Date();
    const diffTime = Math.abs(now - oldestTxTime);
    const ageMonths = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)));

    // Group transactions by month (last 12 months)
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        dateObj: d,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        inflow: 0,
        outflow: 0,
        balance: 0
      });
    }

    let totalInflowAllTime = 0;
    let activeMonthsCount = 0;

    // Process payments
    payments.forEach(p => {
      const pDate = new Date(p.created_at);
      const val = parseFloat(p.amount || 0);
      const isIncoming = p.to === publicKey;

      // Find if payment fits in our 12-month window
      months.forEach(m => {
        if (pDate.getMonth() === m.dateObj.getMonth() && pDate.getFullYear() === m.dateObj.getFullYear()) {
          if (isIncoming) {
            m.inflow += val;
          } else {
            m.outflow += val;
          }
        }
      });

      if (isIncoming) {
        totalInflowAllTime += val;
      }
    });

    // Populate balances sequentially in monthly history
    let runningBal = nativeBalance;
    // Go backwards to reconstruct historical balances approximately
    for (let i = months.length - 1; i >= 0; i--) {
      months[i].balance = Math.max(0, Math.round(runningBal * 100) / 100);
      runningBal = runningBal - months[i].inflow + months[i].outflow;
    }

    // Calculate consistency metrics
    let totalInflowInWindow = 0;
    months.forEach(m => {
      if (m.inflow > 5) { // Threshold for a significant remittance payment
        activeMonthsCount++;
      }
      totalInflowInWindow += m.inflow;
      m.inflow = Math.round(m.inflow * 100) / 100;
      m.outflow = Math.round(m.outflow * 100) / 100;
    });

    const consistencyPct = Math.round((activeMonthsCount / 12) * 100);
    const avgInflow = Math.round((totalInflowInWindow / 12) * 100) / 100;
    const savingsRateVal = totalInflowInWindow > 0 ? (nativeBalance / totalInflowInWindow) * 100 : 0;
    const savingsRate = Math.min(100, Math.max(0, savingsRateVal)).toFixed(1);

    // Compute credit score components
    // Longevity Score (max 150)
    const longevityScore = Math.min(ageMonths / 24, 1) * 150;
    // Consistency Score (max 300)
    const consistencyScore = (consistencyPct / 100) * 300;
    // Volume Score (max 250) - benchmarks at 1000 XLM / month average
    const volumeScore = Math.min(avgInflow / 1000, 1) * 250;
    // Savings rate score (max 300) - benchmarks at 30% savings rate
    const savingsScore = Math.min(parseFloat(savingsRate) / 30, 1) * 300;

    let score = Math.round(longevityScore + consistencyScore + volumeScore + savingsScore);
    score = Math.min(1000, Math.max(300, score));

    let grade = "C";
    if (score >= 850) grade = "A";
    else if (score >= 700) grade = "B";
    else if (score < 550) grade = "D";

    return {
      success: true,
      mode: "live",
      publicKey,
      name: `Live Stellar Account (${publicKey.substring(0, 6)}...${publicKey.substring(50)})`,
      ageMonths,
      balance: nativeBalance,
      grade,
      score,
      metrics: {
        longevity: `${(ageMonths / 12).toFixed(1)} Years (${ageMonths} Months)`,
        consistency: `${consistencyPct}% (${activeMonthsCount}/12 active months)`,
        avgInflow: `${avgInflow} XLM / mo`,
        savingsRate: `${savingsRate}%`
      },
      history: months.map(m => ({
        month: m.label,
        inflow: m.inflow,
        outflow: m.outflow,
        balance: m.balance
      }))
    };

  } catch (error) {
    console.error("Live Stellar loading error, falling back to mock:", error.message);
    // If anything fails (like rate limits, offline state, sandbox blocks), fallback to generated mock
    return {
      success: true,
      mode: "fallback_mock",
      publicKey,
      name: `Fallback Wallet (${publicKey.substring(0, 6)}...)`,
      ageMonths: 12,
      balance: 450.00,
      grade: "C",
      score: 620,
      metrics: {
        longevity: "1.0 Year (12 Months)",
        consistency: "75% (9/12 active months)",
        avgInflow: "650 XLM / mo",
        savingsRate: "5.8%"
      },
      history: [
        { month: "Jul 25", inflow: 600, outflow: 580, balance: 20 },
        { month: "Aug 25", inflow: 700, outflow: 650, balance: 70 },
        { month: "Sep 25", inflow: 650, outflow: 600, balance: 120 },
        { month: "Oct 25", inflow: 0, outflow: 50, balance: 70 },
        { month: "Nov 25", inflow: 650, outflow: 600, balance: 120 },
        { month: "Dec 25", inflow: 800, outflow: 750, balance: 170 },
        { month: "Jan 26", inflow: 650, outflow: 600, balance: 220 },
        { month: "Feb 26", inflow: 0, outflow: 80, balance: 140 },
        { month: "Mar 26", inflow: 650, outflow: 600, balance: 190 },
        { month: "Apr 26", inflow: 700, outflow: 650, balance: 240 },
        { month: "May 26", inflow: 750, outflow: 700, balance: 290 },
        { month: "Jun 26", inflow: 910, outflow: 750, balance: 450 }
      ]
    };
  }
}

module.exports = {
  analyzeStellarHistory,
  MOCK_WALLETS
};
