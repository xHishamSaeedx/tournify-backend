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
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import routes
const tournamentRoutes = require("./routes/tournaments");
const userRoutes = require("./routes/users");
const matchRoutes = require("./routes/matches");
const playerRoutes = require("./routes/players");

// Import Supabase config
const { supabase } = require("./config/supabase");

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5176',
  credentials: true
})); // Enable CORS with proper origin
app.use(morgan("combined")); // Logging
app.use(limiter); // Rate limiting
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
      auth: "/auth/verify"
    }
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

// 🔐 Verify token route
app.post('/auth/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.log('❌ No token provided in request');
    return res.status(401).json({ 
      error: 'No token provided',
      message: 'Authorization header is required'
    });
  }

  try {
    console.log('🔐 Verifying token with Supabase...');
    
    const response = await fetch('https://jhbghpsjzcndqxlhryvz.supabase.co/auth/v1/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.SUPABASE_ANON_KEY, // Add the required API key
      },
    });

    const userData = await response.json();

    if (!response.ok) {
      console.log('❌ Supabase auth error:', userData);
      return res.status(401).json({ 
        error: 'Invalid token',
        message: userData.error_description || 'Token verification failed'
      });
    }

    if (userData?.id) {
      console.log('✅ Token verified successfully for user:', userData.email);
      
      // Create or update user in your database
      try {
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userData.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('❌ Error fetching user:', fetchError);
        }

        if (!existingUser) {
          // Create new user in database
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
              id: userData.id,
              email: userData.email,
              username: userData.user_metadata?.full_name || userData.email.split('@')[0],
              full_name: userData.user_metadata?.full_name,
              avatar_url: userData.user_metadata?.avatar_url,
              is_active: true
            }])
            .select()
            .single();

          if (insertError) {
            console.error('❌ Error creating user:', insertError);
          } else {
            console.log('✅ New user created:', newUser.email);
          }
        } else {
          // Update existing user
          const { error: updateError } = await supabase
            .from('users')
            .update({
              email: userData.email,
              full_name: userData.user_metadata?.full_name || existingUser.full_name,
              avatar_url: userData.user_metadata?.avatar_url || existingUser.avatar_url,
              is_active: true
            })
            .eq('id', userData.id);

          if (updateError) {
            console.error('❌ Error updating user:', updateError);
          } else {
            console.log('✅ User updated:', userData.email);
          }
        }
      } catch (dbError) {
        console.error('❌ Database operation failed:', dbError);
        // Don't fail the auth verification if DB operations fail
      }

      res.json({ 
        success: true, 
        user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.user_metadata?.full_name,
          avatar_url: userData.user_metadata?.avatar_url,
          verified_at: new Date().toISOString()
        }
      });
    } else {
      console.log('❌ Invalid user data from Supabase');
      res.status(401).json({ 
        error: 'Invalid token',
        message: 'User data not found'
      });
    }
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    res.status(500).json({ 
      error: 'Token verification failed',
      message: 'Internal server error during token verification'
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
