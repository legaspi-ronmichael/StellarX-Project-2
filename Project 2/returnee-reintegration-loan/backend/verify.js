/**
 * Verification Test Script
 * Validates the Stellar Analyzer credit score thresholds, grading rules, and mock data mappings.
 */

const { analyzeStellarHistory } = require('./analyzer');

async function runTests() {
  console.log("=== STARTING STELLAR ANALYZER VALIDATION TESTS ===");
  let failures = 0;

  const testCases = [
    { key: "mock_ofw_excellent", minScore: 850, maxScore: 1000, expectedGrade: "A" },
    { key: "mock_ofw_good", minScore: 700, maxScore: 849, expectedGrade: "B" },
    { key: "mock_ofw_fair", minScore: 550, maxScore: 699, expectedGrade: "C" },
    { key: "mock_ofw_poor", minScore: 300, maxScore: 549, expectedGrade: "D" },
    { key: "GBK_DYNAMIC_GENERATOR_TEST_12345", minScore: 300, maxScore: 1000, expectedGrade: null } // should run dynamic mockup fallback
  ];

  for (const tc of testCases) {
    try {
      console.log(`\nTesting wallet key: "${tc.key}"...`);
      const result = await analyzeStellarHistory(tc.key);

      if (!result.success) {
        console.error(`❌ Test failed: success flag was false.`);
        failures++;
        continue;
      }

      console.log(`   Mode: ${result.mode}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Grade: ${result.grade}`);
      console.log(`   History logs count: ${result.history.length}`);

      // Assert Score bounds
      if (result.score < tc.minScore || result.score > tc.maxScore) {
        console.error(`❌ Test failed: score ${result.score} out of bounds [${tc.minScore}, ${tc.maxScore}].`);
        failures++;
        continue;
      }

      // Assert Grade matches
      if (tc.expectedGrade && result.grade !== tc.expectedGrade) {
        console.error(`❌ Test failed: expected grade ${tc.expectedGrade}, got ${result.grade}.`);
        failures++;
        continue;
      }

      console.log(`✅ Passed: Key correctly analyzed.`);
    } catch (e) {
      console.error(`❌ Test exploded with error: ${e.message}`);
      failures++;
    }
  }

  console.log("\n==============================================");
  if (failures === 0) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error(`💥 TESTS COMPLETED WITH ${failures} FAILURE(S).`);
    process.exit(1);
  }
}

runTests();
