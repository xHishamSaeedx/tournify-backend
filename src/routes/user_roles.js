const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const { verifyToken } = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get user roles
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure user can only access their own roles or is admin
    if (req.user.id !== userId) {
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabaseAdmin
        .from("user_roles")
        .select("user_role")
        .eq("user_id", req.user.id)
        .eq("user_role", "admin")
        .single();

      if (adminError || !adminCheck) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_role, game")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user roles:", error);
      return res.status(500).json({ error: "Failed to fetch user roles" });
    }

    // Transform the data to include games for each role
    const transformedRoles = roles.map((role) => ({
      role: role.user_role,
      games: role.game || [], // Handle JSONB game column
    }));

    res.json({ roles: transformedRoles });
  } catch (err) {
    console.error("Error in get user roles:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user roles with detailed information
router.get("/:userId/detailed", async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure user can only access their own roles or is admin
    if (req.user.id !== userId) {
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabaseAdmin
        .from("user_roles")
        .select("user_role")
        .eq("user_id", req.user.id)
        .eq("user_role", "admin")
        .single();

      if (adminError || !adminCheck) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user roles:", error);
      return res.status(500).json({ error: "Failed to fetch user roles" });
    }

    res.json({ roles: roles });
  } catch (err) {
    console.error("Error in get detailed user roles:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if user is host for specific game
router.get("/:userId/host-for-game/:game", async (req, res) => {
  try {
    const { userId, game } = req.params;

    // Ensure user can only access their own roles or is admin
    if (req.user.id !== userId) {
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabaseAdmin
        .from("user_roles")
        .select("user_role")
        .eq("user_id", req.user.id)
        .eq("user_role", "admin")
        .single();

      if (adminError || !adminCheck) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const { data: hostRole, error } = await supabaseAdmin
      .from("user_roles")
      .select("game")
      .eq("user_id", userId)
      .eq("user_role", "host")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.json({ isHost: false, games: [] });
      }
      console.error("Error checking host status:", error);
      return res.status(500).json({ error: "Failed to check host status" });
    }

    const games = hostRole.game || [];
    const isHost = games.includes(game);

    res.json({
      isHost: isHost,
      games: games,
      requestedGame: game,
    });
  } catch (err) {
    console.error("Error in check host for game:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Assign role to user - Only admins can do this
router.post("/:userId/roles", async (req, res) => {
  try {
    const { userId } = req.params;
    const { user_role, user_email, game } = req.body;

    if (!user_role) {
      return res.status(400).json({ error: "Role name is required" });
    }

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from("user_roles")
      .select("user_role")
      .eq("user_id", req.user.id)
      .eq("user_role", "admin")
      .single();

    if (adminError || !adminCheck) {
      return res.status(403).json({ error: "Only admins can assign roles" });
    }

    // Handle game parameter for host roles
    let gameData = null;
    if (user_role === "host" && game) {
      gameData = [game]; // Store as JSONB array
    }

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .insert([
        {
          user_id: userId,
          user_role: user_role,
          user_email: user_email,
          game: gameData,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error assigning role:", error);
      return res.status(500).json({ error: "Failed to assign role" });
    }

    res.json({ success: true, role: data });
  } catch (err) {
    console.error("Error in assign role:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove role from user - Only admins can do this
router.delete("/:userId/roles/:roleName", async (req, res) => {
  try {
    const { userId, roleName } = req.params;

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from("user_roles")
      .select("user_role")
      .eq("user_id", req.user.id)
      .eq("user_role", "admin")
      .single();

    if (adminError || !adminCheck) {
      return res.status(403).json({ error: "Only admins can remove roles" });
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("user_role", roleName);

    if (error) {
      console.error("Error removing role:", error);
      return res.status(500).json({ error: "Failed to remove role" });
    }

    res.json({ success: true, message: "Role removed successfully" });
  } catch (err) {
    console.error("Error in remove role:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
