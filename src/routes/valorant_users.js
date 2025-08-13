const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");

// GET all valorant users
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data: existingValorantUser, error: checkError } = await supabase
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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
    const { error } = await supabase
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

// POST get tournament participants valorant information
router.post("/tournament-participants", async (req, res) => {
  try {
    const { tournament_id } = req.body;

    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: "tournament_id is required",
      });
    }

    // First, get all participants for this tournament using room_id
    const { data: participants, error: participantsError } = await supabase
      .from("valorant_deathmatch_participants")
      .select("player_id")
      .eq("room_id", tournament_id);

    if (participantsError) throw participantsError;

    if (!participants || participants.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: "No participants found for this tournament",
      });
    }

    // Extract player_ids from participants
    const playerIds = participants.map((participant) => participant.player_id);

    // Get valorant user information for these player_ids
    const { data: valorantUsers, error: valorantUsersError } = await supabase
      .from("valorant_users")
      .select("valorant_name, valorant_tag, platform, region")
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
      return res.status(404).json({
        success: false,
        error: "Tournament not found",
      });
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
      return res.status(500).json({
        success: false,
        error: "Valorant service configuration missing",
      });
    }

    try {
      // Step 1: Validate the match
      console.log("🔍 Validating match with valorant service...");
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
      console.log("✅ Match validation successful:", validationData);

      if (!validationData.validation_passed) {
        return res.json({
          success: true,
          data: valorantUsers,
          count: valorantUsers.length,
          tournament_id: tournament_id,
          match_validation: {
            passed: false,
            message: validationData.message,
            percentage_with_match: validationData.percentage_with_match,
          },
          leaderboard: null,
        });
      }

      // Step 2: Get the leaderboard
      console.log("🏆 Getting leaderboard from valorant service...");
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
      console.log("✅ Leaderboard generation successful:", leaderboardData);

      // Return combined data
      res.json({
        success: true,
        data: valorantUsers,
        count: valorantUsers.length,
        tournament_id: tournament_id,
        match_validation: {
          passed: true,
          match_id: validationData.match_id,
          message: validationData.message,
          percentage_with_match: validationData.percentage_with_match,
        },
        leaderboard: {
          match_id: leaderboardData.match_id,
          map: leaderboardData.map,
          total_players: leaderboardData.total_players,
          leaderboard: leaderboardData.leaderboard,
          non_participants: leaderboardData.non_participants || [],
          message: leaderboardData.message,
        },
      });
    } catch (valorantServiceError) {
      console.error(
        "❌ Error calling valorant deathmatch service:",
        valorantServiceError
      );

      // Return basic data even if valorant service fails
      res.json({
        success: true,
        data: valorantUsers,
        count: valorantUsers.length,
        tournament_id: tournament_id,
        match_validation: {
          passed: false,
          message: "Valorant service unavailable",
          error: valorantServiceError.message,
        },
        leaderboard: null,
      });
    }
  } catch (error) {
    console.error(
      "Error fetching tournament participants valorant info:",
      error
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch tournament participants valorant information",
      message: error.message,
    });
  }
});

module.exports = router;
