const { supabase } = require("./src/config/supabase");
const {
  calculateFinalPrizePool,
} = require("./src/services/prizePoolCalculator");

// Test function to simulate prize pool calculation
async function testPrizePoolCalculation() {
  console.log("🧪 Testing Prize Pool Calculator...\n");

  try {
    // Create a test tournament record
    const testTournament = {
      tournament_id: "test-prize-pool-123",
      name: "Test Prize Pool Tournament",
      capacity: 10,
      joining_fee: 20,
      host_percentage: 0.15, // 15% (stored as decimal in DB)
      host_contribution: 100,
      match_start_time: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // 3 minutes from now
      final_pool_calculated: false,
    };

    console.log("📊 Test Tournament Data:");
    console.log(`   - Tournament ID: ${testTournament.tournament_id}`);
    console.log(`   - Capacity: ${testTournament.capacity}`);
    console.log(`   - Joining Fee: $${testTournament.joining_fee}`);
    console.log(
      `   - Host Percentage: ${(testTournament.host_percentage * 100).toFixed(
        2
      )}%`
    );
    console.log(`   - Host Contribution: $${testTournament.host_contribution}`);
    console.log(`   - Match Start Time: ${testTournament.match_start_time}\n`);

    // Test the calculation manually (using a hypothetical player count of 8)
    const hypotheticalPlayerCount = 8;
    const hostPercentageDecimal = parseFloat(testTournament.host_percentage); // Already decimal

    const basePrizePool =
      hypotheticalPlayerCount *
      parseFloat(testTournament.joining_fee) *
      (0.7 + (0.15 - hostPercentageDecimal));
    const hostContributionToPrizePool =
      parseFloat(testTournament.host_contribution) * 0.9;

    const expectedFinalPrizePool = Math.ceil(
      basePrizePool + hostContributionToPrizePool
    );

    console.log("🧮 Manual Calculation (with hypothetical 8 players):");
    console.log(
      `   - Base Prize Pool: (${hypotheticalPlayerCount} × $${testTournament.joining_fee}) × (0.7 + (0.15 - ${hostPercentageDecimal}))`
    );
    console.log(
      `   - Base Prize Pool: $${
        hypotheticalPlayerCount * testTournament.joining_fee
      } × ${0.7 + (0.15 - hostPercentageDecimal)}`
    );
    console.log(`   - Base Prize Pool: $${basePrizePool.toFixed(2)}`);
    console.log(
      `   - Host Contribution: $${testTournament.host_contribution} × 0.9 = $${hostContributionToPrizePool}`
    );
    console.log(`   - Expected Final Prize Pool: $${expectedFinalPrizePool}\n`);

    // Test the function
    console.log("🔧 Testing calculateFinalPrizePool function...");
    const result = await calculateFinalPrizePool(testTournament);

    if (result) {
      console.log("✅ Prize pool calculation test passed!");
    } else {
      console.log("❌ Prize pool calculation test failed!");
    }

    // Test database query for tournaments needing calculation
    console.log(
      "\n🔍 Testing database query for tournaments needing calculation..."
    );

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const { data: tournamentsToProcess, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .select(
        `
        tournament_id,
        name,
        capacity,
        joining_fee,
        host_percentage,
        host_contribution,
        match_start_time,
        final_pool_calculated
      `
      )
      .gte("match_start_time", now.toISOString())
      .lte("match_start_time", fiveMinutesFromNow.toISOString())
      .eq("final_pool_calculated", false);

    if (error) {
      console.error("❌ Error querying tournaments:", error);
    } else {
      console.log(
        `✅ Found ${
          tournamentsToProcess?.length || 0
        } tournaments that need final prize pool calculation`
      );

      if (tournamentsToProcess && tournamentsToProcess.length > 0) {
        console.log("\n📋 Tournaments needing calculation:");
        tournamentsToProcess.forEach((tournament) => {
          const timeUntilStart = Math.round(
            (new Date(tournament.match_start_time) - now) / 1000 / 60
          );
          console.log(
            `   - ${tournament.name} (ID: ${tournament.tournament_id}) - ${timeUntilStart} minutes until start`
          );
        });
      }
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Run the test
testPrizePoolCalculation();
