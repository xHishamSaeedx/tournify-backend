const {
  processPendingTournaments,
  processTournament,
} = require("./src/services/tournamentProcessor");

// Test the tournament processor
async function testTournamentProcessor() {
  console.log("🧪 Testing tournament processor...");

  try {
    // Test the main function
    await processPendingTournaments();

    console.log("✅ Tournament processor test completed");
  } catch (error) {
    console.error("❌ Tournament processor test failed:", error);
  }
}

// Run the test
testTournamentProcessor();
