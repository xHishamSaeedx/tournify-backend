const cron = require("node-cron");
const { supabaseAdmin } = require("../config/supabase");

// Function to calculate final prize pool
async function calculateFinalPrizePool(tournament) {
  try {
    const {
      tournament_id,
      capacity,
      joining_fee,
      host_percentage,
      host_contribution,
    } = tournament;

    // Get actual participant count for this tournament
    const { count: currentParticipants, error: countError } =
      await supabaseAdmin
        .from("valorant_deathmatch_participants")
        .select("*", { count: "exact", head: true })
        .eq("room_id", tournament_id);

    if (countError) {
      console.error(
        `❌ Error counting participants for tournament ${tournament_id}:`,
        countError
      );
      return false;
    }

    // Calculate actual prize pool based on current players
    // Formula: (current_players * joining_fee) * (0.7 + (0.15 - host_percentage)) + 0.9 * host_contribution
    const actualCapacity = currentParticipants || 0;
    const hostPercentageDecimal = parseFloat(host_percentage); // Already stored as decimal in DB

    const basePrizePool =
      actualCapacity *
      parseFloat(joining_fee) *
      (0.7 + (0.15 - hostPercentageDecimal));
    const hostContributionToPrizePool =
      parseFloat(host_contribution || 0) * 0.9;

    const finalPrizePool = Math.ceil(
      basePrizePool + hostContributionToPrizePool
    );

    console.log(
      `💰 Calculating final prize pool for tournament ${tournament_id}:`
    );
    console.log(`   - Current players: ${actualCapacity}`);
    console.log(`   - Joining fee: ${joining_fee}`);
    console.log(`   - Host percentage: ${(host_percentage * 100).toFixed(2)}%`);
    console.log(`   - Host contribution: ${host_contribution || 0}`);
    console.log(`   - Final prize pool: ${finalPrizePool}`);

    // Update the tournament with final prize pool
    const { error: updateError } = await supabaseAdmin
      .from("valorant_deathmatch_rooms")
      .update({
        prize_pool: finalPrizePool,
        final_pool_calculated: true,
      })
      .eq("tournament_id", tournament_id);

    if (updateError) {
      console.error(
        `❌ Error updating prize pool for tournament ${tournament_id}:`,
        updateError
      );
      return false;
    }

    console.log(
      `✅ Successfully updated final prize pool for tournament ${tournament_id}: ${finalPrizePool}`
    );
    return true;
  } catch (error) {
    console.error(
      `❌ Error calculating final prize pool for tournament ${tournament.tournament_id}:`,
      error
    );
    return false;
  }
}

// Function to process tournaments that need final prize pool calculation
async function processFinalPrizePoolCalculation() {
  try {
    console.log(
      "🕐 Checking for tournaments that need final prize pool calculation..."
    );

    // Get current time
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Query for tournaments that are 5 minutes or less away from start time and haven't had final pool calculated
    const { data: tournamentsToProcess, error } = await supabaseAdmin
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
      console.error(
        "❌ Error querying tournaments for final prize pool calculation:",
        error
      );
      return;
    }

    if (!tournamentsToProcess || tournamentsToProcess.length === 0) {
      console.log("✅ No tournaments need final prize pool calculation");
      return;
    }

    console.log(
      `📋 Found ${tournamentsToProcess.length} tournaments that need final prize pool calculation`
    );

    // Process each tournament
    for (const tournament of tournamentsToProcess) {
      console.log(
        `🎯 Processing tournament: ${tournament.name} (ID: ${tournament.tournament_id})`
      );
      console.log(`   - Match start time: ${tournament.match_start_time}`);
      console.log(
        `   - Time until start: ${Math.round(
          (new Date(tournament.match_start_time) - now) / 1000 / 60
        )} minutes`
      );

      await calculateFinalPrizePool(tournament);
    }

    console.log("✅ Finished processing final prize pool calculations");
  } catch (error) {
    console.error("❌ Error in processFinalPrizePoolCalculation:", error);
  }
}

// Initialize the cron job
function initializePrizePoolCalculator() {
  console.log("🚀 Initializing prize pool calculator cron job...");

  // Schedule the job to run every minute
  cron.schedule(
    "* * * * *",
    async () => {
      await processFinalPrizePoolCalculation();
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  console.log(
    "✅ Prize pool calculator cron job scheduled to run every minute"
  );
}

module.exports = {
  initializePrizePoolCalculator,
  processFinalPrizePoolCalculation,
  calculateFinalPrizePool,
};
