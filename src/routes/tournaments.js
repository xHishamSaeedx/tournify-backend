const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { verifyToken, ensureUserExists } = require("../middleware/auth");

// GET all tournaments (public)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tournaments")
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

// GET tournament by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("tournaments")
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
      description,
      start_date,
      end_date,
      max_participants,
      tournament_type,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Tournament name is required",
      });
    }

    const { data, error } = await supabase
      .from("tournaments")
      .insert([
        {
          name,
          description,
          start_date,
          end_date,
          max_participants,
          tournament_type,
          status: "upcoming",
          created_by: req.user.id, // Add creator information
        },
      ])
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
    res.status(500).json({
      success: false,
      error: "Failed to create tournament",
      message: error.message,
    });
  }
});

// PUT update tournament (protected)
router.put("/:id", verifyToken, ensureUserExists, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Optional: Check if user is the creator or has admin rights
    const { data: existingTournament, error: fetchError } = await supabase
      .from("tournaments")
      .select("created_by")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (existingTournament?.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You can only update tournaments you created",
      });
    }

    const { data, error } = await supabase
      .from("tournaments")
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

    // Optional: Check if user is the creator or has admin rights
    const { data: existingTournament, error: fetchError } = await supabase
      .from("tournaments")
      .select("created_by")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (existingTournament?.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
        message: "You can only delete tournaments you created",
      });
    }

    const { error } = await supabase.from("tournaments").delete().eq("id", id);

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
