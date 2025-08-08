const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    console.log('🔐 Checking admin privileges for user:', req.user.id);
    
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select('user_role')
      .eq('user_id', req.user.id)
      .eq('user_role', 'admin')
      .single();

    if (error) {
      console.error('❌ Error checking admin privileges:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error checking admin privileges',
        details: error.message
      });
    }

    if (!userRoles) {
      console.log('❌ User is not admin:', req.user.id);
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Admin privileges required.' 
      });
    }

    console.log('✅ User is admin:', req.user.id);
    next();
  } catch (error) {
    console.error('❌ Unexpected error in admin check:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
};

// GET /api/admin/current-hosts - Get all current hosts
router.get('/current-hosts', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Fetching current hosts for user:', req.user.id);
    
    const { data: hosts, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        user_email,
        user_role,
        created_at
      `)
      .eq('user_role', 'host')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error fetching hosts:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch hosts',
        details: error.message
      });
    }

    console.log('✅ Successfully fetched hosts:', hosts?.length || 0);
    res.json({ 
      success: true, 
      data: hosts 
    });
  } catch (error) {
    console.error('❌ Unexpected error in current-hosts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/admin/pending-applications - Get all pending host applications
router.get('/pending-applications', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('host_applications')
      .select(`
        id,
        user_id,
        user_email,
        youtube_channel,
        experience,
        motivation,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch applications' 
      });
    }

    res.json({ 
      success: true, 
      data: applications 
    });
  } catch (error) {
    console.error('Error in pending-applications:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/admin/approve-application - Approve a host application
router.post('/approve-application', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Application ID is required' 
      });
    }

    // Get the application details
    const { data: application, error: fetchError } = await supabase
      .from('host_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Start a transaction-like operation
    // 1. Update user_roles to set user_role to 'host'
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: application.user_id,
        user_email: application.user_email,
        user_role: 'host'
      });

    if (roleError) {
      console.error('Error updating user role:', roleError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update user role' 
      });
    }

    // 2. Delete the application from host_applications
    const { error: deleteError } = await supabase
      .from('host_applications')
      .delete()
      .eq('id', applicationId);

    if (deleteError) {
      console.error('Error deleting application:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to delete application' 
      });
    }

    console.log(`✅ Application ${applicationId} approved for user ${application.user_email}`);
    res.json({ 
      success: true, 
      message: 'Application approved successfully',
      data: { user_email: application.user_email }
    });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/admin/reject-application - Reject a host application
router.post('/reject-application', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Application ID is required' 
      });
    }

    // Get the application details for logging
    const { data: application, error: fetchError } = await supabase
      .from('host_applications')
      .select('user_email')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Delete the application
    const { error: deleteError } = await supabase
      .from('host_applications')
      .delete()
      .eq('id', applicationId);

    if (deleteError) {
      console.error('Error deleting application:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to reject application' 
      });
    }

    console.log(`❌ Application ${applicationId} rejected for user ${application.user_email}`);
    res.json({ 
      success: true, 
      message: 'Application rejected successfully',
      data: { user_email: application.user_email }
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/admin/remove-host - Remove a host (change role back to player)
router.post('/remove-host', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Get the user details for logging
    const { data: userRole, error: fetchError } = await supabase
      .from('user_roles')
      .select('user_email')
      .eq('user_id', userId)
      .eq('user_role', 'host')
      .single();

    if (fetchError || !userRole) {
      return res.status(404).json({ 
        success: false, 
        error: 'Host not found' 
      });
    }

    // Update user_roles to set user_role back to 'player'
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ user_role: 'player' })
      .eq('user_id', userId)
      .eq('user_role', 'host');

    if (updateError) {
      console.error('Error removing host:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to remove host' 
      });
    }

    console.log(`👤 Host ${userId} (${userRole.user_email}) removed and set to player`);
    res.json({ 
      success: true, 
      message: 'Host removed successfully',
      data: { user_email: userRole.user_email }
    });
  } catch (error) {
    console.error('Error removing host:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;
