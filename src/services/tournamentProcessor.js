const cron = require("node-cron");
const { supabase } = require("../config/supabase");

// Function to allocate prizes to winners
async function allocatePrizesToWinners(
  leaderboard,
  tournamentId,
  valorantUsers
) {
  try {
    console.log("🏆 Allocating prizes to winners...");

    // Get tournament prize details
    const { data: tournamentDetails, error: tournamentError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select(
        "prize_first_pct, prize_second_pct, prize_third_pct, prize_pool, name"
      )
      .eq("tournament_id", tournamentId)
      .single();

    if (tournamentError) {
      console.error(
        "❌ Error fetching tournament prize details:",
        tournamentError
      );
      return {
        tournament_id: tournamentId,
        prize_pool: 0,
        winners: [],
        total_allocated: 0,
        message: "Failed to fetch tournament prize details",
        error: tournamentError.message,
      };
    }

    const {
      prize_first_pct,
      prize_second_pct,
      prize_third_pct,
      prize_pool,
      name: tournamentName,
    } = tournamentDetails;

    // Calculate prize amounts (percentages are stored as decimals, e.g., 0.5 for 50%)
    const firstPrize = Math.floor(prize_first_pct * prize_pool);
    const secondPrize = Math.floor(prize_second_pct * prize_pool);
    const thirdPrize = Math.floor(prize_third_pct * prize_pool);

    console.log(
      `💰 Prize pool: ${prize_pool}, 1st: ${firstPrize}, 2nd: ${secondPrize}, 3rd: ${thirdPrize}`
    );

    const winners = [];

    // Process winners (up to 3 positions)
    for (let i = 0; i < Math.min(leaderboard.length, 3); i++) {
      const player = leaderboard[i];
      const position = i + 1;
      let prizeAmount = 0;

      switch (position) {
        case 1:
          prizeAmount = firstPrize;
          break;
        case 2:
          prizeAmount = secondPrize;
          break;
        case 3:
          prizeAmount = thirdPrize;
          break;
      }

      if (prizeAmount > 0) {
        // Find user_id from the already fetched valorantUsers data
        const valorantUser = valorantUsers.find(
          (user) =>
            user.valorant_name === player.player_info.name &&
            user.valorant_tag === player.player_info.tag &&
            user.platform === player.player_info.platform &&
            user.region === player.player_info.region
        );

        if (!valorantUser) {
          console.error(
            `❌ User not found for ${player.player_info.name}#${player.player_info.tag}`
          );
          continue;
        }

        const userId = valorantUser.user_id;

        // Create credit transaction
        const { data: transaction, error: transactionError } = await supabase
          .from("wallet_transactions")
          .insert([
            {
              user_id: userId,
              type: "tournament_prize",
              amount: prizeAmount,
              description: `${position}${getOrdinalSuffix(
                position
              )} place prize for ${tournamentName}`,
              ref_id: tournamentId,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (transactionError) {
          console.error(
            `❌ Error creating transaction for ${player.player_info.name}:`,
            transactionError
          );
          continue;
        }

        // Update wallet balance
        let { data: currentWallet, error: fetchError } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", userId)
          .single();

        let updatedWallet;

        if (fetchError && fetchError.code === "PGRST116") {
          // Wallet doesn't exist, create one
          const { data: newWallet, error: createError } = await supabase
            .from("user_wallets")
            .insert([
              {
                user_id: userId,
                balance: prizeAmount,
                created_at: new Date().toISOString(),
                last_updated: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (createError) {
            console.error(
              `❌ Error creating wallet for ${player.player_info.name}:`,
              createError
            );
            continue;
          }
          updatedWallet = newWallet;
        } else if (fetchError) {
          console.error(
            `❌ Error fetching wallet for ${player.player_info.name}:`,
            fetchError
          );
          continue;
        } else {
          // Update existing wallet
          const { data: updatedWalletData, error: updateError } = await supabase
            .from("user_wallets")
            .update({
              balance: currentWallet.balance + prizeAmount,
              last_updated: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .select()
            .single();

          if (updateError) {
            console.error(
              `❌ Error updating wallet for ${player.player_info.name}:`,
              updateError
            );
            continue;
          }
          updatedWallet = updatedWalletData;
        }

        // Add to winners list
        winners.push({
          position: position,
          player_name: `${player.player_info.name}#${player.player_info.tag}`,
          user_id: userId,
          kills: player.kills,
          average_combat_score: player.average_combat_score,
          prize_amount: prizeAmount,
          new_balance: updatedWallet.balance,
          transaction_id: transaction.id,
        });

        console.log(
          `✅ Allocated ${prizeAmount} credits to ${player.player_info.name}#${
            player.player_info.tag
          } (${position}${getOrdinalSuffix(position)} place)`
        );
      }
    }

    return {
      tournament_id: tournamentId,
      prize_pool: prize_pool,
      winners: winners,
      total_allocated: winners.reduce(
        (sum, winner) => sum + winner.prize_amount,
        0
      ),
      message: `Successfully allocated prizes to ${winners.length} winners`,
    };
  } catch (error) {
    console.error("❌ Error allocating prizes:", error);
    return {
      tournament_id: tournamentId,
      prize_pool: 0,
      winners: [],
      total_allocated: 0,
      message: "Failed to allocate prizes due to an error",
      error: error.message,
    };
  }
}

// Function to refund joining fees to all participants when match is invalid
async function refundJoiningFees(tournamentId, valorantUsers) {
  try {
    console.log("💰 Refunding joining fees to all participants...");

    // Get tournament details to find joining fee
    const { data: tournamentDetails, error: tournamentError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("joining_fee, name")
      .eq("tournament_id", tournamentId)
      .single();

    if (tournamentError) {
      console.error(
        "❌ Error fetching tournament joining fee details:",
        tournamentError
      );
      return;
    }

    const { joining_fee, name: tournamentName } = tournamentDetails;

    if (!joining_fee || joining_fee <= 0) {
      console.log("ℹ️ No joining fee to refund for this tournament");
      return;
    }

    console.log(
      `💰 Refunding ${joining_fee} credits to ${valorantUsers.length} participants`
    );

    const refundedUsers = [];

    // Process refund for each participant
    for (const valorantUser of valorantUsers) {
      const userId = valorantUser.user_id;

      // Create refund transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("wallet_transactions")
        .insert([
          {
            user_id: userId,
            type: "tournament_refund",
            amount: joining_fee,
            description: `Joining fee refund for ${tournamentName} (match invalid)`,
            ref_id: tournamentId,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (transactionError) {
        console.error(
          `❌ Error creating refund transaction for user ${userId}:`,
          transactionError
        );
        continue;
      }

      // Update wallet balance
      let { data: currentWallet, error: fetchError } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();

      let updatedWallet;

      if (fetchError && fetchError.code === "PGRST116") {
        // Wallet doesn't exist, create one
        const { data: newWallet, error: createError } = await supabase
          .from("user_wallets")
          .insert([
            {
              user_id: userId,
              balance: joining_fee,
              created_at: new Date().toISOString(),
              last_updated: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error(
            `❌ Error creating wallet for user ${userId}:`,
            createError
          );
          continue;
        }
        updatedWallet = newWallet;
      } else if (fetchError) {
        console.error(
          `❌ Error fetching wallet for user ${userId}:`,
          fetchError
        );
        continue;
      } else {
        // Update existing wallet
        const { data: updatedWalletData, error: updateError } = await supabase
          .from("user_wallets")
          .update({
            balance: currentWallet.balance + joining_fee,
            last_updated: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) {
          console.error(
            `❌ Error updating wallet for user ${userId}:`,
            updateError
          );
          continue;
        }
        updatedWallet = updatedWalletData;
      }

      // Add to refunded users list
      refundedUsers.push({
        user_id: userId,
        player_name: `${valorantUser.valorant_name}#${valorantUser.valorant_tag}`,
        refund_amount: joining_fee,
        new_balance: updatedWallet.balance,
        transaction_id: transaction.id,
      });

      console.log(
        `✅ Refunded ${joining_fee} credits to ${valorantUser.valorant_name}#${valorantUser.valorant_tag}`
      );
    }

    console.log(
      `💰 Successfully refunded joining fees to ${refundedUsers.length} out of ${valorantUsers.length} participants`
    );

    return {
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      joining_fee: joining_fee,
      refunded_users: refundedUsers,
      total_refunded: refundedUsers.reduce(
        (sum, user) => sum + user.refund_amount,
        0
      ),
      message: `Successfully refunded joining fees to ${refundedUsers.length} participants`,
    };
  } catch (error) {
    console.error("❌ Error refunding joining fees:", error);
    return {
      tournament_id: tournamentId,
      joining_fee: 0,
      refunded_users: [],
      total_refunded: 0,
      message: "Failed to refund joining fees due to an error",
      error: error.message,
    };
  }
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
}

// Main function to process a single tournament
async function processTournament(tournament_id) {
  try {
    console.log(`🔄 Processing tournament: ${tournament_id}`);

    // First, get all participants for this tournament using room_id
    const { data: participants, error: participantsError } = await supabase
      .from("valorant_deathmatch_participants")
      .select("player_id")
      .eq("room_id", tournament_id);

    if (participantsError) throw participantsError;

    if (!participants || participants.length === 0) {
      console.log(`⚠️ No participants found for tournament ${tournament_id}`);
      return;
    }

    // Extract player_ids from participants
    const playerIds = participants.map((participant) => participant.player_id);

    // Get valorant user information for these player_ids
    const { data: valorantUsers, error: valorantUsersError } = await supabase
      .from("valorant_users")
      .select("user_id, valorant_name, valorant_tag, platform, region")
      .in("user_id", playerIds);

    if (valorantUsersError) throw valorantUsersError;

    // Get tournament details (match_start_time and match_map) from valorant_deathmatch_rooms
    const { data: tournamentDetails, error: tournamentError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("match_start_time, match_map")
      .eq("tournament_id", tournament_id)
      .single();

    if (tournamentError) throw tournamentError;

    if (!tournamentDetails) {
      console.log(`❌ Tournament ${tournament_id} not found`);
      return;
    }

    // Format the match_start_time to the expected format (YYYY-MM-DDTHH:mm:ss)
    const matchStartTime = new Date(tournamentDetails.match_start_time);
    const formattedStartTime = matchStartTime.toISOString().slice(0, 19); // Remove milliseconds and timezone

    // Prepare players data for the valorant service
    const players = valorantUsers.map((user) => ({
      name: user.valorant_name,
      tag: user.valorant_tag,
      region: user.region,
      platform: user.platform,
    }));

    // Prepare request for valorant deathmatch service
    const valorantServiceRequest = {
      players: players,
      expected_start_time: formattedStartTime,
      expected_map: tournamentDetails.match_map,
    };

    // Get the valorant deathmatch service URL from environment
    const valorantServiceUrl = process.env.VALORANT_DEATHMATCH_SERVICE_URL;

    if (!valorantServiceUrl) {
      console.error(
        "VALORANT_DEATHMATCH_SERVICE_URL environment variable not set"
      );
      return;
    }

    try {
      // Step 1: Validate the match
      console.log(
        `🔍 Validating match for tournament ${tournament_id} with valorant service...`
      );
      const validationResponse = await fetch(
        `${valorantServiceUrl}/matches/validate-match-history`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(valorantServiceRequest),
        }
      );

      if (!validationResponse.ok) {
        throw new Error(
          `Validation failed with status ${
            validationResponse.status
          }: ${await validationResponse.text()}`
        );
      }

      const validationData = await validationResponse.json();
      console.log(
        `✅ Match validation successful for tournament ${tournament_id}:`,
        validationData
      );

      if (!validationData.validation_passed) {
        console.log(
          `❌ Match validation failed for tournament ${tournament_id}: ${validationData.message}`
        );

        // Refund joining fees to all participants
        await refundJoiningFees(tournament_id, valorantUsers);

        // Mark as processed and set status to invalid
        await markTournamentAsProcessed(tournament_id, "invalid");
        return;
      }

      // Step 2: Get the leaderboard
      console.log(
        `🏆 Getting leaderboard for tournament ${tournament_id} from valorant service...`
      );
      const leaderboardResponse = await fetch(
        `${valorantServiceUrl}/matches/leaderboard`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(valorantServiceRequest),
        }
      );

      if (!leaderboardResponse.ok) {
        throw new Error(
          `Leaderboard generation failed with status ${
            leaderboardResponse.status
          }: ${await leaderboardResponse.text()}`
        );
      }

      const leaderboardData = await leaderboardResponse.json();
      console.log(
        `✅ Leaderboard generation successful for tournament ${tournament_id}:`,
        leaderboardData
      );

      // Allocate prizes to winners
      const prizeAllocation = await allocatePrizesToWinners(
        leaderboardData.leaderboard,
        tournament_id,
        valorantUsers
      );

      console.log(
        `💰 Prize allocation completed for tournament ${tournament_id}:`,
        prizeAllocation
      );

      // Mark tournament as processed and set status to valid
      await markTournamentAsProcessed(tournament_id, "valid");

      console.log(`✅ Tournament ${tournament_id} processed successfully`);
    } catch (error) {
      console.error(`❌ Error processing tournament ${tournament_id}:`, error);
      // Mark as processed even if there was an error to prevent infinite retries
      await markTournamentAsProcessed(tournament_id, "invalid");
    }
  } catch (error) {
    console.error(`❌ Error in processTournament for ${tournament_id}:`, error);
  }
}

// Function to mark tournament as processed
async function markTournamentAsProcessed(tournament_id, status = "valid") {
  try {
    const { error } = await supabase
      .from("valorant_deathmatch_rooms")
      .update({ processed: true, status: status })
      .eq("tournament_id", tournament_id);

    if (error) {
      console.error(
        `Error marking tournament ${tournament_id} as processed:`,
        error
      );
    } else {
      console.log(
        `✅ Marked tournament ${tournament_id} as processed with status: ${status}`
      );
    }
  } catch (error) {
    console.error(
      `Error marking tournament ${tournament_id} as processed:`,
      error
    );
  }
}

// Main cron job function
async function processPendingTournaments() {
  try {
    console.log("🕐 Checking for pending tournaments to process...");

    // Query for tournaments that need processing
    const { data: pendingTournaments, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("tournament_id, match_result_time")
      .lt("match_result_time", new Date().toISOString())
      .eq("processed", false);

    if (error) {
      console.error("Error querying pending tournaments:", error);
      return;
    }

    if (!pendingTournaments || pendingTournaments.length === 0) {
      console.log("✅ No pending tournaments to process");
      return;
    }

    console.log(
      `📋 Found ${pendingTournaments.length} pending tournaments to process`
    );

    // Process each tournament
    for (const tournament of pendingTournaments) {
      await processTournament(tournament.tournament_id);
    }
  } catch (error) {
    console.error("Error in processPendingTournaments:", error);
  }
}

// Initialize the cron job
function initializeTournamentProcessor() {
  console.log("🚀 Initializing tournament processor cron job...");

  // Schedule the job to run every minute
  cron.schedule(
    "* * * * *",
    async () => {
      await processPendingTournaments();
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  console.log("✅ Tournament processor cron job scheduled to run every minute");
}

module.exports = {
  initializeTournamentProcessor,
  processPendingTournaments,
  processTournament,
};
