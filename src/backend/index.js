const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/auth/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const response = await fetch('https://jhbghpsjzcndqxlhryvz.supabase.co/auth/v1/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const user = await response.json();

    if (user?.id) {
      return res.json({ success: true, user });
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
