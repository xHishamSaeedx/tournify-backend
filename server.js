// const express = require("express");
// const cors = require("cors");
// const helmet = require("helmet");
// const morgan = require("morgan");
// const rateLimit = require("express-rate-limit");
// require("dotenv").config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// // Import routes
// const tournamentRoutes = require("./routes/tournaments");
// const userRoutes = require("./routes/users");
// const matchRoutes = require("./routes/matches");

// // Import Supabase config
// const { testSupabaseConnection } = require("./config/supabase");

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
// });

// // Middleware
// app.use(helmet()); // Security headers
// app.use(cors()); // Enable CORS
// app.use(morgan("combined")); // Logging
// app.use(limiter); // Rate limiting
// app.use(express.json()); // Parse JSON bodies
// app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// // Health check endpoint
// app.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "OK",
//     message: "Tournify Backend Server is running",
//     timestamp: new Date().toISOString(),
//   });
// });

// // API Routes
// app.use("/api/tournaments", tournamentRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/matches", matchRoutes);

// // 404 handler
// app.use("*", (req, res) => {
//   res.status(404).json({
//     error: "Route not found",
//     message: `The route ${req.originalUrl} does not exist`,
//   });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({
//     error: "Something went wrong!",
//     message:
//       process.env.NODE_ENV === "development"
//         ? err.message
//         : "Internal server error",
//   });
// });

// // Start server
// app.listen(PORT, async () => {
//   console.log(`🚀 Tournify Backend Server running on port ${PORT}`);
//   console.log(`📊 Health check available at http://localhost:${PORT}/health`);
//   console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

//   // Test Supabase connection
//   await testSupabaseConnection();
// });

// module.exports = app;

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import routes
const tournamentRoutes = require("./src/routes/tournaments");
const userRoutes = require("./src/routes/users");
const matchRoutes = require("./src/routes/matches");
const playerRoutes = require("./src/routes/players");
const userRoleRoutes = require("./src/routes/user_roles");
const hostApplicationRoutes = require("./src/routes/host_applications");
const adminRoutes = require("./src/routes/admin");

// Import Supabase config
const { supabase } = require("./src/config/supabase");

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5176",
    credentials: true,
  })
); // Enable CORS with proper origin
app.use(morgan("combined")); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Tournify Backend Server is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      tournaments: "/api/tournaments",
      users: "/api/users",
      matches: "/api/matches",
      players: "/api/players",
      user_roles: "/api/user-roles",
      host_applications: "/api/apply-host",
      admin: "/api/admin",
      auth: "/auth/verify",
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Tournify Backend Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/user-roles", userRoleRoutes);
app.use("/api", hostApplicationRoutes);
app.use("/api/admin", adminRoutes);

// 🔐 Verify token route
app.post("/auth/verify", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.log("❌ No token provided in request");
    return res.status(401).json({
      error: "No token provided",
      message: "Authorization header is required",
    });
  }

  try {
    console.log("🔐 Verifying token with Supabase...");

    const response = await fetch(
      "https://jhbghpsjzcndqxlhryvz.supabase.co/auth/v1/user",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.SUPABASE_ANON_KEY, // Add the required API key
        },
      }
    );

    const userData = await response.json();

    if (!response.ok) {
      console.log("❌ Supabase auth error:", userData);
      return res.status(401).json({
        error: "Invalid token",
        message: userData.error_description || "Token verification failed",
      });
    }

    if (userData?.id) {
      console.log("✅ Token verified successfully for user:", userData.email);

      // Check if player exists (but don't create automatically)
      let existingPlayer = null;

      try {
        // Check if player record exists
        const { data: playerData, error: fetchError } = await supabase
          .from("players")
          .select("*")
          .eq("player_id", userData.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 = no rows returned
          console.error("❌ Error fetching player:", {
            message: fetchError.message,
            code: fetchError.code,
            details: fetchError.details,
            hint: fetchError.hint,
          });
        }

        existingPlayer = playerData;

        if (existingPlayer) {
          console.log("✅ Player record found for:", userData.email);
        } else {
          console.log("ℹ️ No player record for:", userData.email);
        }

        // Check and assign user role
        const { data: existingRole, error: roleFetchError } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", userData.id)
          .single();

        if (roleFetchError && roleFetchError.code !== "PGRST116") {
          console.error("❌ Error fetching user role:", {
            message: roleFetchError.message,
            code: roleFetchError.code,
            details: roleFetchError.details,
            hint: roleFetchError.hint,
          });
        }

        if (!existingRole) {
          console.log("🔄 Assigning default player role...");

          // Assign default player role with upsert to handle race conditions
          const { data: newRole, error: roleInsertError } = await supabase
            .from("user_roles")
            .upsert(
              [
                {
                  user_id: userData.id,
                  user_role: "player",
                  user_email: userData.email,
                },
              ],
              {
                onConflict: "user_id",
                ignoreDuplicates: false,
              }
            )
            .select()
            .single();

          if (roleInsertError) {
            console.error("❌ Error assigning role:", {
              message: roleInsertError.message,
              code: roleInsertError.code,
              details: roleInsertError.details,
              hint: roleInsertError.hint,
            });
          } else {
            console.log("✅ Player role assigned successfully");
          }
        } else {
          console.log("✅ Player role already assigned");
        }
      } catch (dbError) {
        console.error("❌ Database operation failed:", dbError);
        // Don't fail the auth verification if DB operations fail
      }

      res.json({
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.user_metadata?.full_name,
          avatar_url: userData.user_metadata?.avatar_url,
          verified_at: new Date().toISOString(),
        },
        player: existingPlayer
          ? {
              player_id: existingPlayer.player_id,
              display_name: existingPlayer.display_name,
              username: existingPlayer.username,
              profile_complete:
                existingPlayer.valo_name !== "TBD" &&
                existingPlayer.valo_tag !== "TBD" &&
                existingPlayer.VPA !== "TBD",
              profile_created: false, // Not created in this session
              needs_setup:
                existingPlayer.valo_name === "TBD" ||
                existingPlayer.valo_tag === "TBD" ||
                existingPlayer.VPA === "TBD",
            }
          : {
              profile_complete: false,
              profile_created: false,
              needs_setup: true,
              message:
                "Player profile not found. Please complete the player registration form.",
            },
      });
    } else {
      console.log("❌ Invalid user data from Supabase");
      res.status(401).json({
        error: "Invalid token",
        message: "User data not found",
      });
    }
  } catch (err) {
    console.error("❌ Token verification failed:", err);
    res.status(500).json({
      error: "Token verification failed",
      message: "Internal server error during token verification",
    });
  }
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The route ${req.originalUrl} does not exist`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Tournify Backend Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
