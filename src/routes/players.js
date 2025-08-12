const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");

// GET all users
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
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
    console.log("🔍 GET - Looking for user with ID:", id);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("player_id", id)
      .single();

    if (error) {
      console.error("❌ GET - Error fetching player:", error);

      // Handle the case where no player is found (PGRST116 error)
      if (error.code === "PGRST116") {
        console.log("⚠️ GET - User not found for ID:", id);
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: "No user record exists for this user",
        });
      }

      // For other errors, throw them
      throw error;
    }

    if (!data) {
      console.log("⚠️ GET - User not found for ID:", id);
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "No user record exists for this user",
      });
    }

    console.log("✅ GET - User found:", data);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
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

    const {
      player_id,
      display_name,
      username,
      DOB,
      valo_name,
      valo_tag,
      VPA,
      platform,
      region,
    } = req.body;

    if (!player_id || !display_name || !username || !DOB || !VPA) {
      return res.status(400).json({
        success: false,
        error:
          "Required fields are: player_id, display_name, username, DOB, VPA. Valorant fields are optional.",
      });
    }

    console.log("📝 User data received:", {
      player_id,
      display_name,
      username,
      DOB,
      valo_name,
      valo_tag,
      VPA,
      platform,
      region,
    });

    // Check if user already exists
    console.log("🔍 Checking if user already exists for ID:", player_id);
    const { data: existingPlayer, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("player_id", player_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("❌ Error checking existing user:", checkError);
      throw checkError;
    }

    if (existingPlayer) {
      console.log("⚠️ User already exists:", existingPlayer);
      return res.status(409).json({
        success: false,
        error: "User already exists",
        message: "A user with this ID already exists",
      });
    }

    console.log("✅ No existing user found, proceeding with creation");

    console.log("💾 Attempting to insert user into database...");

    // First, insert the user data (without Valorant fields)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          player_id,
          display_name: display_name.trim(),
          username: username.trim(),
          DOB,
          VPA: VPA.trim(),
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error("❌ Error inserting user into database:", userError);
      throw userError;
    }

    // Validate that userData exists
    if (!userData) {
      console.error("❌ Error: userData is null/undefined:", userData);
      throw new Error("Failed to get user data from inserted user");
    }

    console.log(
      "✅ User inserted successfully, using player_id as user_id:",
      player_id
    );

    // Then, insert the Valorant data into the new table only if Valorant fields are provided
    let valorantData = null;
    if (valo_name && valo_tag && platform && region) {
      const { data: valorantInsertData, error: valorantError } = await supabase
        .from("valorant_users")
        .insert([
          {
            user_id: player_id, // Use player_id (auth user ID) as user_id
            valorant_name: valo_name.trim(),
            valorant_tag: valo_tag.trim(),
            platform,
            region,
          },
        ])
        .select()
        .single();

      if (valorantError) {
        console.error("❌ Error inserting valorant data:", valorantError);
        throw valorantError;
      }

      valorantData = valorantInsertData;
    }

    // Combine the data for response
    const data = {
      ...userData,
      valorant_data: valorantData,
    };

    // Error handling is already done above for both user and valorant data

    console.log("✅ User successfully inserted:", data);

    res.status(201).json({
      success: true,
      data,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create user",
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
    const {
      display_name,
      username,
      DOB,
      valo_name,
      valo_tag,
      VPA,
      platform,
      region,
    } = req.body;

    if (!display_name || !username || !DOB || !VPA) {
      return res.status(400).json({
        success: false,
        error:
          "Required fields are: display_name, username, DOB, VPA. Valorant fields are optional.",
      });
    }

    console.log("📝 PUT - User update data received:", {
      id,
      display_name,
      username,
      DOB,
      valo_name,
      valo_tag,
      VPA,
      platform,
      region,
    });

    console.log("💾 PUT - Attempting to update user in database...");

    // First, update the user data (without Valorant fields)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        display_name: display_name.trim(),
        username: username.trim(),
        DOB,
        VPA: VPA.trim(),
      })
      .eq("player_id", id)
      .select()
      .single();

    if (userError) {
      console.error("❌ PUT - Error updating user in database:", userError);

      // Handle the case where no user is found (PGRST116 error)
      if (userError.code === "PGRST116") {
        console.log("⚠️ PUT - User not found for ID:", id);
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: "No user record exists for this ID",
        });
      }

      // For other errors, throw them
      throw userError;
    }

    if (!userData) {
      console.log("⚠️ PUT - User not found for ID:", id);
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "No user record exists for this ID",
      });
    }

    // Validate that userData exists
    if (!userData) {
      console.error("❌ PUT - Error: userData is null/undefined:", userData);
      throw new Error("Failed to get user data from updated user");
    }

    console.log("✅ PUT - User updated successfully, using id as user_id:", id);

    // Then, update or insert the Valorant data only if Valorant fields are provided
    let valorantData = null;
    if (valo_name && valo_tag && platform && region) {
      const { data: valorantUpsertData, error: valorantError } = await supabase
        .from("valorant_users")
        .upsert([
          {
            user_id: id, // Use id parameter (auth user ID) as user_id
            valorant_name: valo_name.trim(),
            valorant_tag: valo_tag.trim(),
            platform,
            region,
          },
        ])
        .select()
        .single();

      if (valorantError) {
        console.error("❌ PUT - Error updating valorant data:", valorantError);
        throw valorantError;
      }

      valorantData = valorantUpsertData;
    } else {
      // If no Valorant data provided, delete existing Valorant record if it exists
      const { error: deleteError } = await supabase
        .from("valorant_users")
        .delete()
        .eq("user_id", id);

      if (deleteError) {
        console.error("❌ PUT - Error deleting valorant data:", deleteError);
        // Don't throw error here as it's not critical
      }
    }

    // Combine the data for response
    const data = {
      ...userData,
      valorant_data: valorantData,
    };

    // Error handling is already done above for both user and valorant data

    console.log("✅ PUT - User successfully updated:", data);
    res.json({
      success: true,
      data,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user",
      message: error.message,
    });
  }
});

// DELETE player
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("player_id", id)
      .select()
      .single();

    if (error) {
      // Handle the case where no user is found (PGRST116 error)
      if (error.code === "PGRST116") {
        console.log("⚠️ DELETE - User not found for ID:", id);
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: "No user record exists for this ID",
        });
      }

      // For other errors, throw them
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "No user record exists for this ID",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete user",
      message: error.message,
    });
  }
});

module.exports = router;
