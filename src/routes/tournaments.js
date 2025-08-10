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

    res.json({
      success: true,
      data,
      count: data.length,
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

    res.json({
      success: true,
      data,
      count: data.length,
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
      .eq("id", id)
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
      match_start_time,
      party_join_time,
      platform,
      region,
      host_id,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Tournament name is required",
      });
    }

    // Calculate match_result_time (15 minutes after match_start_time)
    const matchStartTime = new Date(match_start_time);
    const matchResultTime = new Date(matchStartTime.getTime() + 15 * 60 * 1000);

    // Convert percentages to decimal format (e.g., 50 -> 0.5)
    const prizeFirstPct = parseFloat(prize_first_pct) / 100;
    const prizeSecondPct = parseFloat(prize_second_pct) / 100;
    const prizeThirdPct = parseFloat(prize_third_pct) / 100;
    const hostPercentage = parseFloat(host_percentage) / 100;

    // Calculate prize pool: (0.7 + (0.15-host_percentage))*capacity*joining_fee
    const prizePool = Math.ceil(
      (0.7 + (0.15 - hostPercentage)) *
        parseInt(capacity) *
        parseFloat(joining_fee)
    );

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
      match_result_time: matchResultTime.toISOString(),
      platform: platform,
      region: region,
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
      .eq("id", id)
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
      .eq("id", id)
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
      .eq("id", id)
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
      .eq("id", id);

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

module.exports = router;
