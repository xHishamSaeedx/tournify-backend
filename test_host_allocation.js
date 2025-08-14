const { supabase } = require("./src/config/supabase");

// Test host allocation calculation
async function testHostAllocation() {
  console.log("🧪 Testing host allocation calculation...");

  try {
    // Get a sample tournament with host data
    const { data: tournament, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .select(
        "tournament_id, host_id, joining_fee, capacity, host_percentage, name"
      )
      .not("host_id", "is", null)
      .not("joining_fee", "is", null)
      .not("capacity", "is", null)
      .not("host_percentage", "is", null)
      .limit(1)
      .single();

    if (error) {
      console.error("❌ Error fetching tournament:", error);
      return;
    }

    if (!tournament) {
      console.log("ℹ️ No tournament found with host data");
      return;
    }

    console.log("📋 Tournament details:", {
      tournament_id: tournament.tournament_id,
      host_id: tournament.host_id,
      joining_fee: tournament.joining_fee,
      capacity: tournament.capacity,
      host_percentage: tournament.host_percentage,
      name: tournament.name,
    });

    // Calculate host share using the formula: (joining_fee * capacity) * host_percentage
    const hostShare = Math.floor(
      tournament.joining_fee * tournament.capacity * tournament.host_percentage
    );

    console.log("💰 Host allocation calculation:");
    console.log(
      `   Formula: (${tournament.joining_fee} * ${tournament.capacity}) * ${tournament.host_percentage}`
    );
    console.log(`   Result: ${hostShare} credits`);

    // Verify the calculation makes sense
    const totalJoiningFees = tournament.joining_fee * tournament.capacity;
    const expectedHostShare = totalJoiningFees * tournament.host_percentage;

    console.log("✅ Host allocation test completed");
    console.log(`   Total joining fees: ${totalJoiningFees}`);
    console.log(`   Expected host share: ${expectedHostShare}`);
    console.log(`   Calculated host share: ${hostShare}`);
  } catch (error) {
    console.error("❌ Host allocation test failed:", error);
  }
}

// Run the test
testHostAllocation();
