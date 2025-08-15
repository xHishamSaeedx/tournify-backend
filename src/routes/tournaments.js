const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { verifyToken, ensureUserExists } = require("../middleware/auth");

// GET all tournaments (public)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch host information and participant count for each tournament
    const tournamentsWithHosts = await Promise.all(
      data.map(async (tournament) => {
        // Get actual participant count for this tournament
        const { count: currentParticipants, error: countError } = await supabase
          .from("valorant_deathmatch_participants")
          .select("*", { count: "exact", head: true })
          .eq("room_id", tournament.tournament_id);

        if (countError) {
          console.error(
            "Error counting participants for tournament",
            tournament.tournament_id,
            ":",
            countError
          );
        }

        let host = null;
        if (tournament.host_id) {
          const { data: hostData, error: hostError } = await supabase
            .from("users")
            .select("player_id, username, display_name, avatar_url")
            .eq("player_id", tournament.host_id)
            .single();

          if (!hostError && hostData) {
            host = hostData;
          }
        }

        return {
          ...tournament,
          host: host,
          current_players: currentParticipants || 0,
        };
      })
    );

    res.json({
      success: true,
      data: tournamentsWithHosts,
      count: tournamentsWithHosts.length,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tournaments",
      message: error.message,
    });
  }
});

// GET tournaments by host ID (protected)
router.get("/host/:hostId", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const { hostId } = req.params;

    // Check if the user is requesting their own tournaments or has admin rights
    if (hostId !== (req.user.player_id || req.user.id)) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You can only view your own tournaments",
      });
    }

    const { data, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("*")
      .eq("host_id", hostId)
      .order("match_start_time", { ascending: false });

    if (error) throw error;

    // Fetch host information and participant count for each tournament
    const tournamentsWithHosts = await Promise.all(
      data.map(async (tournament) => {
        // Get actual participant count for this tournament
        const { count: currentParticipants, error: countError } = await supabase
          .from("valorant_deathmatch_participants")
          .select("*", { count: "exact", head: true })
          .eq("room_id", tournament.tournament_id);

        if (countError) {
          console.error(
            "Error counting participants for tournament",
            tournament.tournament_id,
            ":",
            countError
          );
        }

        let host = null;
        if (tournament.host_id) {
          const { data: hostData, error: hostError } = await supabase
            .from("users")
            .select("player_id, username, display_name, avatar_url")
            .eq("player_id", tournament.host_id)
            .single();

          if (!hostError && hostData) {
            host = hostData;
          }
        }

        return {
          ...tournament,
          host: host,
          current_players: currentParticipants || 0,
        };
      })
    );

    res.json({
      success: true,
      data: tournamentsWithHosts,
      count: tournamentsWithHosts.length,
    });
  } catch (error) {
    console.error("Error fetching host tournaments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch host tournaments",
      message: error.message,
    });
  }
});

// GET tournament by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("*")
      .eq("tournament_id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Tournament not found",
      });
    }

    // Get actual participant count
    const { count: currentParticipants, error: countError } = await supabase
      .from("valorant_deathmatch_participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", id);

    if (countError) {
      console.error("Error counting participants:", countError);
    }

    // Fetch host information for the tournament
    let tournamentWithHost = {
      ...data,
      host: null,
      current_players: currentParticipants || 0,
    };
    if (data.host_id) {
      const { data: hostData, error: hostError } = await supabase
        .from("users")
        .select("player_id, username, display_name, avatar_url")
        .eq("player_id", data.host_id)
        .single();

      if (!hostError && hostData) {
        tournamentWithHost.host = hostData;
      }
    }

    res.json({
      success: true,
      data: tournamentWithHost,
    });
  } catch (error) {
    console.error("Error fetching tournament:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tournament",
      message: error.message,
    });
  }
});

// POST create new tournament (protected)
router.post("/", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const {
      name,
      capacity,
      joining_fee,
      prize_first_pct,
      prize_second_pct,
      prize_third_pct,
      host_percentage,
      host_contribution,
      match_start_time,
      party_join_time,
      platform,
      region,
      match_map,
      host_id,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Tournament name is required",
      });
    }

    // Check for 20-minute gap between tournaments for the same host
    const currentHostId = host_id || req.user.player_id || req.user.id;
    const newMatchStartTime = new Date(match_start_time);

    // Get all existing tournaments by this host
    const { data: existingTournaments, error: existingError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("match_start_time")
      .eq("host_id", currentHostId);

    if (existingError) throw existingError;

    // Check if there's a conflict with existing tournaments (20-minute gap required)
    for (const tournament of existingTournaments) {
      const existingStartTime = new Date(tournament.match_start_time);
      const timeDifference = Math.abs(
        newMatchStartTime.getTime() - existingStartTime.getTime()
      );
      const minutesDifference = timeDifference / (1000 * 60);

      if (minutesDifference < 20) {
        return res.status(400).json({
          success: false,
          error: "Tournament time conflict",
          message:
            "There must be at least a 20-minute gap between your tournaments. Please choose a different start time.",
        });
      }
    }

    // Calculate match_result_time (15 minutes after match_start_time)
    const matchStartTime = new Date(match_start_time);
    const matchResultTime = new Date(matchStartTime.getTime() + 15 * 60 * 1000);

    // Convert percentages to decimal format (e.g., 50 -> 0.5)
    const prizeFirstPct = parseFloat(prize_first_pct);
    const prizeSecondPct = parseFloat(prize_second_pct);
    const prizeThirdPct = parseFloat(prize_third_pct);
    const hostPercentage = parseFloat(host_percentage) / 100;

    // Calculate prize pool: (0.7 + (0.15-host_percentage))*capacity*joining_fee + 90% of host_contribution
    const basePrizePool =
      (0.7 + (0.15 - hostPercentage)) *
      parseInt(capacity) *
      parseFloat(joining_fee);

    const hostContributionToPrizePool =
      parseFloat(host_contribution || 0) * 0.9;

    const prizePool = Math.ceil(basePrizePool + hostContributionToPrizePool);

    const tournamentData = {
      name,
      capacity: parseInt(capacity),
      prize_first_pct: prizeFirstPct,
      prize_second_pct: prizeSecondPct,
      prize_third_pct: prizeThirdPct,
      party_join_time: party_join_time,
      match_start_time: match_start_time,
      prize_pool: prizePool,
      joining_fee: parseFloat(joining_fee),
      host_id: host_id || req.user.player_id || req.user.id,
      host_percentage: hostPercentage,
      host_contribution: parseFloat(host_contribution || 0),
      match_result_time: matchResultTime.toISOString(),
      platform: platform,
      region: region,
      match_map: match_map,
    };

    console.log("Attempting to create tournament with data:", tournamentData);
    console.log("User info:", {
      player_id: req.user.player_id,
      id: req.user.id,
      email: req.user.email,
    });

    const { data, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .insert([tournamentData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Tournament created successfully",
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    res.status(500).json({
      success: false,
      error: "Failed to create tournament",
      message: error.message || "Unknown error occurred",
      details: error.details || error.hint || "No additional details available",
    });
  }
});

// PUT update tournament (protected)
router.put("/:id", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Optional: Check if user is the host or has admin rights
    const { data: existingTournament, error: fetchError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("host_id")
      .eq("tournament_id", id)
      .single();

    if (fetchError) throw fetchError;

    if (existingTournament?.host_id !== (req.user.player_id || req.user.id)) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You can only update tournaments you created",
      });
    }

    const { data, error } = await supabase
      .from("valorant_deathmatch_rooms")
      .update(updateData)
      .eq("tournament_id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Tournament not found",
      });
    }

    res.json({
      success: true,
      data,
      message: "Tournament updated successfully",
    });
  } catch (error) {
    console.error("Error updating tournament:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update tournament",
      message: error.message,
    });
  }
});

// DELETE tournament (protected)
router.delete("/:id", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Check if user is the host or has admin rights
    const { data: existingTournament, error: fetchError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("host_id")
      .eq("tournament_id", id)
      .single();

    if (fetchError) throw fetchError;

    if (existingTournament?.host_id !== (req.user.player_id || req.user.id)) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You can only delete tournaments you created",
      });
    }

    const { error } = await supabase
      .from("valorant_deathmatch_rooms")
      .delete()
      .eq("tournament_id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Tournament deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tournament:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete tournament",
      message: error.message,
    });
  }
});

// POST join tournament (protected)
router.post("/:id/join", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const { id: tournamentId } = req.params;
    const playerId = req.user.player_id || req.user.id;

    // Check if user has a complete profile
    const { data: playerData, error: playerError } = await supabase
      .from("users")
      .select(
        `
        username, 
        VPA
      `
      )
      .eq("player_id", playerId)
      .single();

    if (playerError || !playerData) {
      return res.status(400).json({
        success: false,
        error: "Profile incomplete",
        message: "You must complete your profile before joining tournaments",
      });
    }

    // Get Valorant data separately to match the players endpoint structure
    const { data: valorantData, error: valorantError } = await supabase
      .from("valorant_users")
      .select("valorant_name, valorant_tag")
      .eq("user_id", playerId)
      .single();

    // Check if required fields are filled
    if (
      !playerData.username ||
      !valorantData?.valorant_name ||
      !valorantData?.valorant_tag ||
      !playerData.VPA
    ) {
      return res.status(400).json({
        success: false,
        error: "Profile incomplete",
        message:
          "Please fill in your username, Valorant ID, and VPA before joining tournaments",
      });
    }

    // Check if tournament exists and is not full
    const { data: tournament, error: tournamentError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("tournament_id, capacity, match_start_time")
      .eq("tournament_id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return res.status(404).json({
        success: false,
        error: "Tournament not found",
        message: "The tournament you're trying to join doesn't exist",
      });
    }

    // Check if tournament hasn't started yet (at least 5 minutes before start)
    const now = new Date();
    const matchStartTime = new Date(tournament.match_start_time);
    const fiveMinutesBefore = new Date(
      matchStartTime.getTime() - 5 * 60 * 1000
    );

    if (now >= fiveMinutesBefore) {
      return res.status(400).json({
        success: false,
        error: "Tournament closed",
        message:
          "Tournament registration is closed. It starts in less than 5 minutes.",
      });
    }

    // Check if user is already a participant
    const { data: existingParticipant, error: participantError } =
      await supabase
        .from("valorant_deathmatch_participants")
        .select("player_id")
        .eq("player_id", playerId)
        .eq("room_id", tournamentId)
        .single();

    if (participantError && participantError.code !== "PGRST116") {
      throw participantError;
    }

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        error: "Already joined",
        message: "You are already registered for this tournament",
      });
    }

    // Check current participant count
    const { count: currentParticipants, error: countError } = await supabase
      .from("valorant_deathmatch_participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", tournamentId);

    if (countError) throw countError;

    if (currentParticipants >= tournament.capacity) {
      return res.status(400).json({
        success: false,
        error: "Tournament full",
        message: "This tournament is already full",
      });
    }

    // Add participant to tournament
    const { data: newParticipant, error: joinError } = await supabase
      .from("valorant_deathmatch_participants")
      .insert({
        player_id: playerId,
        room_id: tournamentId,
      })
      .select()
      .single();

    if (joinError) throw joinError;

    // Update tournament current_players count
    const { error: updateError } = await supabase
      .from("valorant_deathmatch_rooms")
      .update({
        current_players: currentParticipants + 1,
      })
      .eq("tournament_id", tournamentId);

    if (updateError) {
      console.error("Error updating tournament player count:", updateError);
      // Don't fail the request if this fails, but log it
    }

    res.json({
      success: true,
      data: newParticipant,
      message: "Successfully joined tournament",
    });
  } catch (error) {
    console.error("Error joining tournament:", error);
    res.status(500).json({
      success: false,
      error: "Failed to join tournament",
      message: error.message,
    });
  }
});

// POST leave tournament (protected)
router.post("/:id/leave", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const { id: tournamentId } = req.params;
    const playerId = req.user.player_id || req.user.id;

    // Get tournament details to check match start time
    const { data: tournament, error: tournamentError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("match_start_time, joining_fee")
      .eq("tournament_id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return res.status(400).json({
        success: false,
        error: "Tournament not found",
        message: "Tournament not found",
      });
    }

    // Check if match starts within 15 minutes
    const matchStartTime = new Date(tournament.match_start_time);
    const currentTime = new Date();
    const timeDifference = matchStartTime.getTime() - currentTime.getTime();
    const minutesUntilMatch = Math.floor(timeDifference / (1000 * 60));

    if (minutesUntilMatch <= 15) {
      return res.status(400).json({
        success: false,
        error: "Cancellation not allowed",
        message:
          "Cannot leave tournament within 15 minutes of match start time",
      });
    }

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from("valorant_deathmatch_participants")
      .select("player_id")
      .eq("player_id", playerId)
      .eq("room_id", tournamentId)
      .single();

    if (participantError || !participant) {
      return res.status(400).json({
        success: false,
        error: "Not a participant",
        message: "You are not registered for this tournament",
      });
    }

    // Calculate refund amount (50% of joining fee)
    const joiningFee = tournament.joining_fee || 0;
    const refundAmount = Math.floor(joiningFee * 0.5);

    // Process refund if there's a joining fee (write directly to wallet tables)
    if (joiningFee > 0 && refundAmount > 0) {
      try {
        // Create refund transaction
        const { data: refundTx, error: txError } = await supabase
          .from("wallet_transactions")
          .insert([
            {
              user_id: playerId,
              type: "refund",
              amount: refundAmount,
              description: `50% refund for leaving tournament ${tournamentId}`,
              ref_id: tournamentId,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (txError) throw txError;

        // Update wallet balance (create wallet if missing)
        let { data: currentWallet, error: fetchError } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", playerId)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          // Create new wallet with refund amount
          const { error: createError } = await supabase
            .from("user_wallets")
            .insert([
              {
                user_id: playerId,
                balance: refundAmount,
                created_at: new Date().toISOString(),
                last_updated: new Date().toISOString(),
              },
            ]);
          if (createError) throw createError;
        } else if (fetchError) {
          throw fetchError;
        } else {
          const newBalance = (currentWallet?.balance || 0) + refundAmount;
          const { error: updateError } = await supabase
            .from("user_wallets")
            .update({
              balance: newBalance,
              last_updated: new Date().toISOString(),
            })
            .eq("user_id", playerId);
          if (updateError) throw updateError;
        }
      } catch (refundError) {
        console.error("Error processing refund:", refundError);
        // Continue with leaving tournament even if refund fails
      }
    }

    // Remove participant from tournament
    const { error: leaveError } = await supabase
      .from("valorant_deathmatch_participants")
      .delete()
      .eq("player_id", playerId)
      .eq("room_id", tournamentId);

    if (leaveError) throw leaveError;

    // Update tournament current_players count
    const { count: currentParticipants, error: countError } = await supabase
      .from("valorant_deathmatch_participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", tournamentId);

    if (!countError) {
      const { error: updateError } = await supabase
        .from("valorant_deathmatch_rooms")
        .update({
          current_players: currentParticipants,
        })
        .eq("tournament_id", tournamentId);

      if (updateError) {
        console.error("Error updating tournament player count:", updateError);
        // Don't fail the request if this fails, but log it
      }
    }

    res.json({
      success: true,
      message: `Successfully left tournament. ${refundAmount} credits have been refunded to your account.`,
      refundAmount: refundAmount,
    });
  } catch (error) {
    console.error("Error leaving tournament:", error);
    res.status(500).json({
      success: false,
      error: "Failed to leave tournament",
      message: error.message,
    });
  }
});

// GET tournament participants (protected)
router.get(
  "/:id/participants",
  verifyToken,
  ensureUserExists,
  async (req, res) => {
    try {
      const { id: tournamentId } = req.params;

      const { data: participants, error } = await supabase
        .from("valorant_deathmatch_participants")
        .select(
          `
        player_id,
        room_id,
        joined_at,
        users!inner(
          player_id,
          username,
          display_name,
          VPA,
          valorant_users!inner(
            valorant_name,
            valorant_tag
          )
        )
      `
        )
        .eq("room_id", tournamentId)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      res.json({
        success: true,
        data: participants,
        count: participants.length,
      });
    } catch (error) {
      console.error("Error fetching tournament participants:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch participants",
        message: error.message,
      });
    }
  }
);

// GET user's tournament participation status (protected)
router.get(
  "/:id/participation",
  verifyToken,
  ensureUserExists,
  async (req, res) => {
    try {
      const { id: tournamentId } = req.params;
      const playerId = req.user.player_id || req.user.id;

      const { data: participant, error } = await supabase
        .from("valorant_deathmatch_participants")
        .select("player_id, joined_at")
        .eq("player_id", playerId)
        .eq("room_id", tournamentId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      res.json({
        success: true,
        data: {
          isParticipant: !!participant,
          participant: participant || null,
        },
      });
    } catch (error) {
      console.error("Error checking participation status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check participation status",
        message: error.message,
      });
    }
  }
);

// GET user's joined tournaments (protected)
router.get("/joined/me", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const playerId = req.user.player_id || req.user.id;

    // First, get all room_ids where the user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from("valorant_deathmatch_participants")
      .select("room_id, joined_at")
      .eq("player_id", playerId)
      .order("joined_at", { ascending: false });

    if (participantError) throw participantError;

    if (!participantData || participantData.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // Get the room_ids
    const roomIds = participantData.map((p) => p.room_id);

    // Get tournament details for those rooms
    const { data: tournaments, error: tournamentError } = await supabase
      .from("valorant_deathmatch_rooms")
      .select("*")
      .in("tournament_id", roomIds)
      .order("match_start_time", { ascending: false });

    if (tournamentError) throw tournamentError;

    // Create a map of room_id to joined_at for quick lookup
    const joinedAtMap = {};
    participantData.forEach((p) => {
      joinedAtMap[p.room_id] = p.joined_at;
    });

    // Transform the data to match the expected format and fetch host information
    const transformedTournaments = await Promise.all(
      tournaments.map(async (tournament) => {
        // Get actual participant count for this tournament
        const { count: currentParticipants, error: countError } = await supabase
          .from("valorant_deathmatch_participants")
          .select("*", { count: "exact", head: true })
          .eq("room_id", tournament.tournament_id);

        if (countError) {
          console.error(
            "Error counting participants for tournament",
            tournament.tournament_id,
            ":",
            countError
          );
        }

        let host = null;
        if (tournament.host_id) {
          const { data: hostData, error: hostError } = await supabase
            .from("users")
            .select("player_id, username, display_name, avatar_url")
            .eq("player_id", tournament.host_id)
            .single();

          if (!hostError && hostData) {
            host = hostData;
          }
        }

        return {
          tournament_id: tournament.tournament_id,
          name: tournament.name,
          match_start_time: tournament.match_start_time,
          prize_pool: tournament.prize_pool,
          joining_fee: tournament.joining_fee,
          capacity: tournament.capacity,
          current_players: currentParticipants || 0,
          platform: tournament.platform,
          region: tournament.region,
          host: host,
          joined_at: joinedAtMap[tournament.tournament_id],
        };
      })
    );

    res.json({
      success: true,
      data: transformedTournaments,
      count: transformedTournaments.length,
    });
  } catch (error) {
    console.error("Error fetching joined tournaments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch joined tournaments",
      message: error.message,
    });
  }
});

// POST cancel tournament (protected - only host can cancel)
router.post(
  "/cancel/:tournamentId",
  verifyToken,
  ensureUserExists,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const userId = req.user.player_id || req.user.id;

      // First, verify the tournament exists and the user is the host
      const { data: tournament, error: tournamentError } = await supabase
        .from("valorant_deathmatch_rooms")
        .select("*")
        .eq("tournament_id", tournamentId)
        .single();

      if (tournamentError || !tournament) {
        return res.status(404).json({
          success: false,
          error: "Tournament not found",
          message: "The tournament you're trying to cancel does not exist",
        });
      }

      // Check if the user is the host of this tournament
      if (tournament.host_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
          message: "Only the tournament host can cancel the tournament",
        });
      }

      // Check if tournament is more than 5 minutes away from starting
      const now = new Date();
      const matchStartTime = new Date(tournament.match_start_time);
      const timeDiff = matchStartTime.getTime() - now.getTime();
      const minutesUntilStart = timeDiff / (1000 * 60);

      if (minutesUntilStart <= 5) {
        return res.status(400).json({
          success: false,
          error: "Cannot cancel tournament",
          message:
            "Tournaments cannot be cancelled within 5 minutes of the start time",
        });
      }

      // Get all participants for this tournament
      const { data: participants, error: participantsError } = await supabase
        .from("valorant_deathmatch_participants")
        .select("player_id")
        .eq("room_id", tournamentId);

      if (participantsError) throw participantsError;

      // Process refunds for all participants
      if (
        participants &&
        participants.length > 0 &&
        tournament.joining_fee > 0
      ) {
        for (const participant of participants) {
          // Get current wallet balance first
          const { data: currentWallet, error: fetchError } = await supabase
            .from("user_wallets")
            .select("balance")
            .eq("user_id", participant.player_id)
            .single();

          if (fetchError && fetchError.code === "PGRST116") {
            // Wallet doesn't exist, create one with refund amount
            const { error: createError } = await supabase
              .from("user_wallets")
              .insert({
                user_id: participant.player_id,
                balance: tournament.joining_fee,
                created_at: new Date().toISOString(),
                last_updated: new Date().toISOString(),
              });

            if (createError) {
              console.error(
                "Error creating wallet for participant:",
                participant.player_id,
                createError
              );
            }
          } else if (fetchError) {
            console.error(
              "Error fetching wallet for participant:",
              participant.player_id,
              fetchError
            );
          } else {
            // Update existing wallet balance
            const { error: walletError } = await supabase
              .from("user_wallets")
              .update({
                balance: (currentWallet.balance || 0) + tournament.joining_fee,
                last_updated: new Date().toISOString(),
              })
              .eq("user_id", participant.player_id);

            if (walletError) {
              console.error(
                "Error updating wallet for participant:",
                participant.player_id,
                walletError
              );
            }
          }

          // Create transaction record
          const { error: transactionError } = await supabase
            .from("wallet_transactions")
            .insert({
              user_id: participant.player_id,
              type: "refund",
              amount: tournament.joining_fee,
              description: `Tournament cancellation refund - ${tournament.name}`,
              ref_id: tournamentId,
              created_at: new Date().toISOString(),
            });

          if (transactionError) {
            console.error(
              "Error creating transaction record for participant:",
              participant.player_id,
              transactionError
            );
            // Continue with other participants even if one fails
          }
        }
      }

      // Delete all participants for this tournament
      const { error: deleteParticipantsError } = await supabase
        .from("valorant_deathmatch_participants")
        .delete()
        .eq("room_id", tournamentId);

      if (deleteParticipantsError) {
        console.error("Error deleting participants:", deleteParticipantsError);
        throw deleteParticipantsError;
      }

      // Delete the tournament itself
      const { error: deleteTournamentError } = await supabase
        .from("valorant_deathmatch_rooms")
        .delete()
        .eq("tournament_id", tournamentId);

      if (deleteTournamentError) {
        console.error("Error deleting tournament:", deleteTournamentError);
        throw deleteTournamentError;
      }

      res.json({
        success: true,
        message: "Tournament cancelled successfully",
        data: {
          tournament_id: tournamentId,
          participants_refunded: participants ? participants.length : 0,
        },
      });
    } catch (error) {
      console.error("Error cancelling tournament:", error);
      res.status(500).json({
        success: false,
        error: "Failed to cancel tournament",
        message: error.message,
      });
    }
  }
);

module.exports = router;
