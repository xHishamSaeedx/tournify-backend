const express = require("express");
const router = express.Router();
const multer = require("multer");
const { supabase, supabaseAdmin } = require("../config/supabase");
const { verifyToken } = require("../middleware/auth");

// Log Supabase client configuration
console.log("🔧 Supabase Admin client configured:", !!supabaseAdmin);
if (!supabaseAdmin) {
  console.error(
    "❌ Supabase Admin client is not configured! Check SUPABASE_SERVICE_ROLE_KEY environment variable."
  );
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Upload profile picture
router.post(
  "/upload",
  verifyToken,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      console.log("🔍 Profile picture upload started");
      console.log("👤 User ID:", req.user.id);
      console.log("📧 User email:", req.user.email);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const userId = req.user.id;
      const file = req.file;

      console.log("📁 File info:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      // Check if user exists in users table, create if not
      console.log("🔍 Checking if user exists in users table...");
      console.log("🔍 Using supabaseAdmin client:", !!supabaseAdmin);

      // First, let's check if the users table exists and get its structure
      try {
        const { data: tableInfo, error: tableError } = await supabaseAdmin
          .from("users")
          .select("*")
          .limit(1);

        if (tableError) {
          console.error("❌ Error accessing users table:", tableError);
          console.error("❌ Table error details:", {
            message: tableError.message,
            code: tableError.code,
            details: tableError.details,
          });
        } else {
          console.log(
            "✅ Users table accessible, structure:",
            Object.keys(tableInfo[0] || {})
          );
        }
      } catch (tableCheckError) {
        console.error("❌ Exception checking users table:", tableCheckError);
      }

      let { data: existingUser, error: userError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("player_id", userId)
        .single();

      if (userError && userError.code === "PGRST116") {
        console.log("👤 User doesn't exist, creating new user record...");
        // User doesn't exist, create them
        const { data: newUser, error: createError } = await supabaseAdmin
          .from("users")
          .insert([
            {
              player_id: userId,
              email: req.user.email,
              username: req.user.email.split("@")[0], // Default username
              full_name: req.user.full_name,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("❌ Error creating user:", createError);
          return res.status(500).json({
            success: false,
            error: "Failed to create user record",
            message: createError.message,
          });
        }
        console.log("✅ User created successfully:", newUser);
        existingUser = newUser;
      } else if (userError) {
        console.error("❌ Error checking user:", userError);
        return res.status(500).json({
          success: false,
          error: "Failed to check user record",
          message: userError.message,
        });
      } else {
        console.log("✅ User exists:", existingUser);
      }

      // Generate unique filename
      const fileExtension = file.originalname.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExtension}`;
      const filePath = `profile-pictures/${fileName}`;

      console.log("📁 File path:", filePath);

      // Upload to Supabase Storage
      console.log(
        "☁️ Uploading to Supabase Storage bucket 'profile-pictures'..."
      );
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("profile-pictures")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        return res.status(500).json({
          success: false,
          error: "Failed to upload file to storage",
          message: uploadError.message,
        });
      }

      console.log("✅ File uploaded to storage successfully:", uploadData);

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log("🔗 Public URL generated:", publicUrl);

      // Update user's avatar_url in the database
      console.log("💾 Updating user's avatar_url in users table...");
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("player_id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Database update error:", updateError);
        return res.status(500).json({
          success: false,
          error: "Failed to update user profile",
          message: updateError.message,
        });
      }

      console.log("✅ User avatar_url updated successfully:", updateData);

      console.log("🎉 Profile picture upload completed successfully!");
      res.json({
        success: true,
        data: {
          avatar_url: publicUrl,
          user: updateData,
        },
        message: "Profile picture uploaded successfully",
      });
    } catch (error) {
      console.error("💥 Error uploading profile picture:", error);
      console.error("💥 Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      res.status(500).json({
        success: false,
        error: "Failed to upload profile picture",
        message: error.message,
      });
    }
  }
);

// Delete profile picture
router.delete("/delete", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user exists in users table, create if not
    let { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("avatar_url")
      .eq("player_id", userId)
      .single();

    if (userError && userError.code === "PGRST116") {
      // User doesn't exist, create them
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert([
          {
            player_id: userId,
            email: req.user.email,
            username: req.user.email.split("@")[0], // Default username
            full_name: req.user.full_name,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return res.status(500).json({
          success: false,
          error: "Failed to create user record",
          message: createError.message,
        });
      }
      userData = newUser;
    } else if (userError) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch user data",
        message: userError.message,
      });
    }

    if (userData.avatar_url) {
      // Extract file path from URL
      const urlParts = userData.avatar_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `profile-pictures/${fileName}`;

      // Delete from storage
      const { error: deleteError } = await supabaseAdmin.storage
        .from("profile-pictures")
        .remove([filePath]);

      if (deleteError) {
        console.error("Storage delete error:", deleteError);
        // Continue with database update even if storage delete fails
      }
    }

    // Update user's avatar_url to null
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ avatar_url: null })
      .eq("player_id", userId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: "Failed to update user profile",
        message: updateError.message,
      });
    }

    res.json({
      success: true,
      data: updateData,
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete profile picture",
      message: error.message,
    });
  }
});

// Get profile picture URL
router.get("/url/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("avatar_url")
      .eq("player_id", userId)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch user avatar",
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: {
        avatar_url: data.avatar_url,
      },
    });
  } catch (error) {
    console.error("Error fetching profile picture URL:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile picture URL",
      message: error.message,
    });
  }
});

module.exports = router;
