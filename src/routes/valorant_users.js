const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");

// GET all valorant users
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("valorant_users")
      .select(
        `
        *,
        users!inner(
          id,
          username,
          display_name,
          email,
          avatar_url
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("Error fetching valorant users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch valorant users",
      message: error.message,
    });
  }
});

// GET valorant user by user ID
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("valorant_users")
      .select(
        `
        *,
        users!inner(
          id,
          username,
          display_name,
          email,
          avatar_url
        )
      `
      )
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Valorant user not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching valorant user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch valorant user",
      message: error.message,
    });
  }
});

// POST create new valorant user
router.post("/", async (req, res) => {
  try {
    const { user_id, valorant_name, valorant_tag, platform, region } = req.body;

    if (!user_id || !valorant_name || !valorant_tag || !platform || !region) {
      return res.status(400).json({
        success: false,
        error:
          "All fields are required: user_id, valorant_name, valorant_tag, platform, region",
      });
    }

    // Check if valorant user already exists
    const { data: existingValorantUser, error: checkError } = await supabaseAdmin
      .from("valorant_users")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing valorant user:", checkError);
      throw checkError;
    }

    if (existingValorantUser) {
      return res.status(409).json({
        success: false,
        error: "Valorant user already exists",
        message: "A valorant user with this user_id already exists",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("valorant_users")
      .insert([
        {
          user_id,
          valorant_name: valorant_name.trim(),
          valorant_tag: valorant_tag.trim(),
          platform,
          region,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Valorant user created successfully",
    });
  } catch (error) {
    console.error("Error creating valorant user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create valorant user",
      message: error.message,
    });
  }
});

// PUT update valorant user
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { valorant_name, valorant_tag, platform, region } = req.body;

    if (!valorant_name || !valorant_tag || !platform || !region) {
      return res.status(400).json({
        success: false,
        error:
          "All fields are required: valorant_name, valorant_tag, platform, region",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("valorant_users")
      .update({
        valorant_name: valorant_name.trim(),
        valorant_tag: valorant_tag.trim(),
        platform,
        region,
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Valorant user not found",
      });
    }

    res.json({
      success: true,
      data,
      message: "Valorant user updated successfully",
    });
  } catch (error) {
    console.error("Error updating valorant user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update valorant user",
      message: error.message,
    });
  }
});

// DELETE valorant user
router.delete("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = await supabaseAdmin
      .from("valorant_users")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    res.json({
      success: true,
      message: "Valorant user deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting valorant user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete valorant user",
      message: error.message,
    });
  }
});

// Helper function to allocate prizes to winners
async function allocatePrizesToWinners(
  leaderboard,
  tournamentId,
  valorantUsers
) {
  try {
    console.log("🏆 Allocating prizes to winners...");

    // Get tournament prize details
    const { data: tournamentDetails, error: tournamentError } = await supabaseAdmin
      .from("valorant_deathmatch_rooms")
      .select("prize_first_pct, prize_second_pct, prize_third_pct, prize_pool")
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

    const { prize_first_pct, prize_second_pct, prize_third_pct, prize_pool } =
      tournamentDetails;

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
        const { data: transaction, error: transactionError } = await supabaseAdmin
          .from("wallet_transactions")
          .insert([
            {
              user_id: userId,
              type: "tournament_prize",
              amount: prizeAmount,
              description: `${position}${getOrdinalSuffix(
                position
              )} place prize for tournament ${tournamentId}`,
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
        let { data: currentWallet, error: fetchError } = await supabaseAdmin
          .from("user_wallets")
          .select("balance")
          .eq("user_id", userId)
          .single();

        let updatedWallet;

        if (fetchError && fetchError.code === "PGRST116") {
          // Wallet doesn't exist, create one
          const { data: newWallet, error: createError } = await supabaseAdmin
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
          const { data: updatedWalletData, error: updateError } = await supabaseAdmin
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

// Helper function to get ordinal suffix
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

module.exports = router;
