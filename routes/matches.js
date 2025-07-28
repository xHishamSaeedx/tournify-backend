const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");

// GET all matches
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch matches",
      message: error.message,
    });
  }
});

// GET matches by tournament ID
router.get("/tournament/:tournamentId", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("match_number", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("Error fetching tournament matches:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tournament matches",
      message: error.message,
    });
  }
});

// GET match by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Match not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching match:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch match",
      message: error.message,
    });
  }
});

// POST create new match
router.post("/", async (req, res) => {
  try {
    const {
      tournament_id,
      player1_id,
      player2_id,
      match_number,
      round_number,
      match_type,
    } = req.body;

    if (!tournament_id || !player1_id || !player2_id) {
      return res.status(400).json({
        success: false,
        error: "Tournament ID, Player 1 ID, and Player 2 ID are required",
      });
    }

    const { data, error } = await supabase
      .from("matches")
      .insert([
        {
          tournament_id,
          player1_id,
          player2_id,
          match_number,
          round_number,
          match_type,
          status: "scheduled",
          winner_id: null,
          player1_score: 0,
          player2_score: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Match created successfully",
    });
  } catch (error) {
    console.error("Error creating match:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create match",
      message: error.message,
    });
  }
});

// PUT update match (e.g., update scores, set winner)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Match not found",
      });
    }

    res.json({
      success: true,
      data,
      message: "Match updated successfully",
    });
  } catch (error) {
    console.error("Error updating match:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update match",
      message: error.message,
    });
  }
});

// PUT update match result
router.put("/:id/result", async (req, res) => {
  try {
    const { id } = req.params;
    const { player1_score, player2_score, winner_id, status } = req.body;

    if (player1_score === undefined || player2_score === undefined) {
      return res.status(400).json({
        success: false,
        error: "Both player scores are required",
      });
    }

    const { data, error } = await supabase
      .from("matches")
      .update({
        player1_score,
        player2_score,
        winner_id,
        status: status || "completed",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Match not found",
      });
    }

    res.json({
      success: true,
      data,
      message: "Match result updated successfully",
    });
  } catch (error) {
    console.error("Error updating match result:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update match result",
      message: error.message,
    });
  }
});

// DELETE match
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("matches").delete().eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Match deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting match:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete match",
      message: error.message,
    });
  }
});

module.exports = router;
