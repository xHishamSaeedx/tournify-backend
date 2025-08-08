const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { verifyToken } = require("../middleware/auth");

// POST /api/apply-host - Submit host application
router.post("/apply-host", verifyToken, async (req, res) => {
  try {
    const { youtube_channel, experience, motivation } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Validate required fields
    if (!experience || !motivation) {
      return res.status(400).json({
        success: false,
        error: "Experience and motivation are required fields",
        message: "Please provide your experience and motivation for hosting tournaments"
      });
    }

    // Check if user already has a pending application
    const { data: existingApplication, error: checkError } = await supabase
      .from("host_applications")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing application:", checkError);
      return res.status(500).json({
        success: false,
        error: "Failed to check existing application",
        message: "Database error occurred"
      });
    }

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        error: "Application already exists",
        message: "You have already submitted a host application. Please wait for review.",
        applicationId: existingApplication.id,
        submittedAt: existingApplication.created_at
      });
    }

    // Insert new host application
    console.log('📝 Attempting to insert host application for user:', userId);
    console.log('📧 User email:', userEmail);
    console.log('📋 Application data:', {
      user_id: userId,
      user_email: userEmail,
      youtube_channel: youtube_channel || null,
      experience: experience,
      motivation: motivation
    });

    const { data, error } = await supabase
      .from("host_applications")
      .insert([
        {
          user_id: userId,
          user_email: userEmail,
          youtube_channel: youtube_channel || null,
          experience: experience,
          motivation: motivation
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating host application:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return res.status(500).json({
        success: false,
        error: "Failed to submit application",
        message: `Database error: ${error.message}`
      });
    }

    console.log('✅ Host application created successfully:', data);

    res.status(201).json({
      success: true,
      message: "Host application submitted successfully",
      data: {
        id: data.id,
        user_email: data.user_email,
        youtube_channel: data.youtube_channel,
        experience: data.experience,
        motivation: data.motivation,
        created_at: data.created_at
      }
    });

  } catch (error) {
    console.error("Error in host application submission:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while processing your application"
    });
  }
});

// GET /api/host-applications/my - Get user's own applications
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("host_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching host applications:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch applications",
        message: "Database error occurred"
      });
    }

    res.json({
      success: true,
      data: data,
      count: data.length
    });

  } catch (error) {
    console.error("Error fetching host applications:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred"
    });
  }
});

// GET /api/host-applications/:id - Get specific application by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("host_applications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: "Application not found",
          message: "The requested application does not exist or you don't have access to it"
        });
      }
      console.error("Error fetching host application:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch application",
        message: "Database error occurred"
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error("Error fetching host application:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred"
    });
  }
});

module.exports = router;
