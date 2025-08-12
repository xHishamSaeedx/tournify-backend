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

module.exports = router;
