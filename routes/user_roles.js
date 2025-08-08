const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Get user roles
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('user_role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return res.status(500).json({ error: 'Failed to fetch user roles' });
    }

    res.json({ roles: roles.map(r => r.user_role) });
  } catch (err) {
    console.error('Error in get user roles:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign role to user
router.post('/:userId/roles', async (req, res) => {
  try {
    const { userId } = req.params;
    const { user_role, user_email } = req.body;

    if (!user_role) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const { data, error } = await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        user_role: user_role,
        user_email: user_email
      }])
      .select()
      .single();

    if (error) {
      console.error('Error assigning role:', error);
      return res.status(500).json({ error: 'Failed to assign role' });
    }

    res.json({ success: true, role: data });
  } catch (err) {
    console.error('Error in assign role:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove role from user
router.delete('/:userId/roles/:roleName', async (req, res) => {
  try {
    const { userId, roleName } = req.params;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('user_role', roleName);

    if (error) {
      console.error('Error removing role:', error);
      return res.status(500).json({ error: 'Failed to remove role' });
    }

    res.json({ success: true, message: 'Role removed successfully' });
  } catch (err) {
    console.error('Error in remove role:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 