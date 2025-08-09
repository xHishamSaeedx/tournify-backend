const { supabase } = require('../config/supabase');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header is required'
      });
    }

    // Verify token with Supabase
    const response = await fetch('https://jhbghpsjzcndqxlhryvz.supabase.co/auth/v1/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.SUPABASE_ANON_KEY, // Add the required API key
      },
    });

    const userData = await response.json();

    if (!response.ok) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: userData.error_description || 'Token verification failed'
      });
    }

    if (!userData?.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User data not found'
      });
    }

    // Attach user data to request object
    req.user = {
      id: userData.id,
      email: userData.email,
      full_name: userData.user_metadata?.full_name,
      avatar_url: userData.user_metadata?.avatar_url,
    };

    // Optional: Get user from database for additional data
    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (!error && dbUser) {
        req.user = { ...req.user, ...dbUser };
      }
    } catch (dbError) {
      console.warn('Could not fetch user from database:', dbError.message);
    }

    next();
  } catch (error) {
    console.error('Token verification middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token verification failed',
      message: 'Internal server error during token verification'
    });
  }
};

// Middleware to check if user exists in database
const ensureUserExists = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user exists in database
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error checking user:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }

    if (!existingUser) {
      // Create user in database
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          id: req.user.id,
          email: req.user.email,
          username: req.user.full_name || req.user.email.split('@')[0],
          full_name: req.user.full_name,
          avatar_url: req.user.avatar_url,
          is_active: true
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile'
        });
      }

      req.user = { ...req.user, ...newUser };
    } else {
      req.user = { ...req.user, ...existingUser };
    }

    next();
  } catch (error) {
    console.error('Ensure user exists middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'User verification failed'
    });
  }
};

module.exports = {
  verifyToken,
  ensureUserExists,
}; 