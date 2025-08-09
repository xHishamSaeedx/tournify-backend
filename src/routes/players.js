const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");

// GET all players
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch players",
      message: error.message,
    });
  }
});

// GET player by ID
router.get("/:id", async (req, res) => {
  try {
    // Log the authorization header
    const authHeader = req.headers.authorization;
    console.log(
      "🔐 GET - Authorization header received:",
      authHeader ? "Present" : "Missing"
    );

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authorization header is required",
        message: "No authorization token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log(
      "🎫 GET - Token extracted:",
      token ? `${token.substring(0, 20)}...` : "No token"
    );

    const { id } = req.params;
    console.log("🔍 GET - Looking for player with ID:", id);

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("player_id", id)
      .single();

    if (error) {
      console.error("❌ GET - Error fetching player:", error);

      // Handle the case where no player is found (PGRST116 error)
      if (error.code === "PGRST116") {
        console.log("⚠️ GET - Player not found for ID:", id);
        return res.status(404).json({
          success: false,
          error: "Player not found",
          message: "No player record exists for this user",
        });
      }

      // For other errors, throw them
      throw error;
    }

    if (!data) {
      console.log("⚠️ GET - Player not found for ID:", id);
      return res.status(404).json({
        success: false,
        error: "Player not found",
        message: "No player record exists for this user",
      });
    }

    console.log("✅ GET - Player found:", data);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch player",
      message: error.message,
    });
  }
});

// POST create new player
router.post("/", async (req, res) => {
  try {
    // Log the authorization header
    const authHeader = req.headers.authorization;
    console.log(
      "🔐 Authorization header received:",
      authHeader ? "Present" : "Missing"
    );
    console.log("📋 Full headers:", req.headers);

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authorization header is required",
        message: "No authorization token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log(
      "🎫 Token extracted:",
      token ? `${token.substring(0, 20)}...` : "No token"
    );

    const { player_id, display_name, username, DOB, valo_name, valo_tag, VPA } =
      req.body;

    if (
      !player_id ||
      !display_name ||
      !username ||
      !DOB ||
      !valo_name ||
      !valo_tag ||
      !VPA
    ) {
      return res.status(400).json({
        success: false,
        error:
          "All fields are required: player_id, display_name, username, DOB, valo_name, valo_tag, VPA",
      });
    }

    console.log("📝 Player data received:", {
      player_id,
      display_name,
      username,
      DOB,
      valo_name,
      valo_tag,
      VPA,
    });

    // Check if player already exists
    console.log("🔍 Checking if player already exists for ID:", player_id);
    const { data: existingPlayer, error: checkError } = await supabase
      .from("players")
      .select("*")
      .eq("player_id", player_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("❌ Error checking existing player:", checkError);
      throw checkError;
    }

    if (existingPlayer) {
      console.log("⚠️ Player already exists:", existingPlayer);
      return res.status(409).json({
        success: false,
        error: "Player already exists",
        message: "A player with this ID already exists",
      });
    }

    console.log("✅ No existing player found, proceeding with creation");

    console.log("💾 Attempting to insert player into database...");
    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          player_id,
          display_name: display_name.trim(),
          username: username.trim(),
          DOB,
          valo_name: valo_name.trim(),
          valo_tag: valo_tag.trim(),
          VPA: VPA.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Error inserting player into database:", error);
      throw error;
    }

    console.log("✅ Player successfully inserted:", data);

    res.status(201).json({
      success: true,
      data,
      message: "Player created successfully",
    });
  } catch (error) {
    console.error("Error creating player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create player",
      message: error.message,
    });
  }
});

// PUT update player
router.put("/:id", async (req, res) => {
  try {
    // Log the authorization header
    const authHeader = req.headers.authorization;
    console.log(
      "🔐 PUT - Authorization header received:",
      authHeader ? "Present" : "Missing"
    );

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authorization header is required",
        message: "No authorization token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log(
      "🎫 PUT - Token extracted:",
      token ? `${token.substring(0, 20)}...` : "No token"
    );

    const { id } = req.params;
    const { display_name, username, DOB, valo_name, valo_tag, VPA } = req.body;

    if (!display_name || !username || !DOB || !valo_name || !valo_tag || !VPA) {
      return res.status(400).json({
        success: false,
        error:
          "All fields are required: display_name, username, DOB, valo_name, valo_tag, VPA",
      });
    }

    console.log("📝 PUT - Player update data received:", {
      id,
      display_name,
      username,
      DOB,
      valo_name,
      valo_tag,
      VPA,
    });

    console.log("💾 PUT - Attempting to update player in database...");
    const { data, error } = await supabase
      .from("players")
      .update({
        display_name: display_name.trim(),
        username: username.trim(),
        DOB,
        valo_name: valo_name.trim(),
        valo_tag: valo_tag.trim(),
        VPA: VPA.trim(),
      })
      .eq("player_id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ PUT - Error updating player in database:", error);
      throw error;
    }

    if (!data) {
      console.log("⚠️ PUT - Player not found for ID:", id);
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    console.log("✅ PUT - Player successfully updated:", data);
    res.json({
      success: true,
      data,
      message: "Player updated successfully",
    });
  } catch (error) {
    console.error("Error updating player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update player",
      message: error.message,
    });
  }
});

// DELETE player
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("players")
      .delete()
      .eq("player_id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    res.json({
      success: true,
      message: "Player deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting player:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete player",
      message: error.message,
    });
  }
});

module.exports = router;
