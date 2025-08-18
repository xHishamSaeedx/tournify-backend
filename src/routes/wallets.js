const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");

// GET user wallet balance
router.get("/balance/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get or create wallet for user
    let { data: wallet, error: walletError } = await supabaseAdmin
      .from("user_wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (walletError && walletError.code === "PGRST116") {
      // Wallet doesn't exist, create one
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("user_wallets")
        .insert([
          {
            user_id: userId,
            balance: 0,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      wallet = newWallet;
    } else if (walletError) {
      throw walletError;
    }

    res.json({
      success: true,
      data: {
        user_id: wallet.user_id,
        balance: wallet.balance,
        last_updated: wallet.last_updated,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch wallet balance",
      message: error.message,
    });
  }
});

// GET user transaction history (enriched with tournament names when available)
router.get("/transactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: transactions, error } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enrich with tournament names via ref_id
    const refIds = Array.from(
      new Set(
        (transactions || [])
          .map((t) => t.ref_id)
          .filter((id) => typeof id === "string" && id.length > 0)
      )
    );

    let idToTournamentName = {};
    if (refIds.length > 0) {
      const { data: tournaments, error: tErr } = await supabaseAdmin
        .from("valorant_deathmatch_rooms")
        .select("tournament_id, name")
        .in("tournament_id", refIds);
      if (!tErr && tournaments) {
        tournaments.forEach((t) => {
          idToTournamentName[t.tournament_id] = t.name;
        });
      }
    }

    const enriched = (transactions || []).map((t) => ({
      ...t,
      tournament_name: t.ref_id ? idToTournamentName[t.ref_id] || null : null,
    }));

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) throw countError;

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transaction history",
      message: error.message,
    });
  }
});

// POST create a new transaction
router.post("/transactions", async (req, res) => {
  try {
    const { user_id, type, amount, description, ref_id } = req.body;

    if (!user_id || !type || !amount || !description) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, type, amount, description",
      });
    }

    // Validate transaction type
    const validTypes = ["credit", "debit", "tournament_entry", "tournament_prize", "refund"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Invalid transaction type",
      });
    }

    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Amount must be a positive number",
      });
    }

    // Start a transaction to ensure data consistency
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert([
        {
          user_id,
          type,
          amount,
          description,
          ref_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (transactionError) throw transactionError;

        // Update wallet balance
    const balanceChange = type === "debit" ? -amount : amount;
    
    // Get current wallet balance
    let { data: currentWallet, error: fetchError } = await supabaseAdmin
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user_id)
      .single();
    
    let updatedWallet;

    if (fetchError && fetchError.code === "PGRST116") {
      // Wallet doesn't exist, create one
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("user_wallets")
        .insert([
          {
            user_id,
            balance: balanceChange,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      updatedWallet = newWallet;
    } else if (fetchError) {
      throw fetchError;
    } else {
      // Update existing wallet
      const newBalance = currentWallet.balance + balanceChange;
      
      if (newBalance < 0) {
        throw new Error(`Insufficient balance: current balance is ${currentWallet.balance}, trying to deduct ${Math.abs(balanceChange)}`);
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("user_wallets")
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedWallet = updated;
    }

    res.status(201).json({
      success: true,
      data: {
        transaction,
        new_balance: updatedWallet.balance,
      },
      message: "Transaction created successfully",
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create transaction",
      message: error.message,
    });
  }
});

// POST process tournament entry fee
router.post("/tournament-entry", async (req, res) => {
  try {
    const { user_id, tournament_id, entry_fee } = req.body;

    if (!user_id || !tournament_id || !entry_fee) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, tournament_id, entry_fee",
      });
    }

    // Check if user has sufficient balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user_id)
      .single();

    if (walletError && walletError.code === "PGRST116") {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
        message: "You don't have enough credits to join this tournament",
      });
    } else if (walletError) {
      throw walletError;
    }

    if (wallet.balance < entry_fee) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
        message: `You need ${entry_fee} credits but only have ${wallet.balance}`,
      });
    }

    // Create debit transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert([
        {
          user_id,
          type: "tournament_entry",
          amount: entry_fee,
          description: `Tournament entry fee for tournament ${tournament_id}`,
          ref_id: tournament_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update wallet balance
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from("user_wallets")
      .update({
        balance: wallet.balance - entry_fee,
        last_updated: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: {
        transaction,
        new_balance: updatedWallet.balance,
      },
      message: "Tournament entry fee processed successfully",
    });
  } catch (error) {
    console.error("Error processing tournament entry:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process tournament entry",
      message: error.message,
    });
  }
});

// POST process tournament prize distribution
router.post("/tournament-prize", async (req, res) => {
  try {
    const { user_id, tournament_id, prize_amount, position } = req.body;

    if (!user_id || !tournament_id || !prize_amount || !position) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, tournament_id, prize_amount, position",
      });
    }

    // Create credit transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert([
        {
          user_id,
          type: "tournament_prize",
          amount: prize_amount,
          description: `${position} place prize for tournament ${tournament_id}`,
          ref_id: tournament_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update wallet balance
    let { data: currentWallet, error: fetchError } = await supabaseAdmin
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user_id)
      .single();
    
    let updatedWallet;

    if (fetchError && fetchError.code === "PGRST116") {
      // Wallet doesn't exist, create one
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("user_wallets")
        .insert([
          {
            user_id,
            balance: prize_amount,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      updatedWallet = newWallet;
    } else if (fetchError) {
      throw fetchError;
    } else {
      // Update existing wallet
      const newBalance = currentWallet.balance + prize_amount;

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("user_wallets")
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedWallet = updated;
    }

    res.json({
      success: true,
      data: {
        transaction,
        new_balance: updatedWallet.balance,
      },
      message: "Tournament prize credited successfully",
    });
  } catch (error) {
    console.error("Error processing tournament prize:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process tournament prize",
      message: error.message,
    });
  }
});

// POST add credits to wallet (admin function)
router.post("/add-credits", async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;

    if (!user_id || !amount || !description) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, amount, description",
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Amount must be a positive number",
      });
    }

    // Create credit transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert([
        {
          user_id,
          type: "credit",
          amount,
          description,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update wallet balance
    let { data: currentWallet, error: fetchError } = await supabaseAdmin
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user_id)
      .single();
    
    let updatedWallet;

    if (fetchError && fetchError.code === "PGRST116") {
      // Wallet doesn't exist, create one
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("user_wallets")
        .insert([
          {
            user_id,
            balance: amount,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      updatedWallet = newWallet;
    } else if (fetchError) {
      throw fetchError;
    } else {
      // Update existing wallet
      const newBalance = currentWallet.balance + amount;

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("user_wallets")
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedWallet = updated;
    }

    res.json({
      success: true,
      data: {
        transaction,
        new_balance: updatedWallet.balance,
      },
      message: "Credits added successfully",
    });
  } catch (error) {
    console.error("Error adding credits:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add credits",
      message: error.message,
    });
  }
});

// POST process tournament refund
router.post("/tournament-refund", async (req, res) => {
  try {
    const { user_id, tournament_id, refund_amount, original_fee } = req.body;

    if (!user_id || !tournament_id || !refund_amount || !original_fee) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, tournament_id, refund_amount, original_fee",
      });
    }

    if (typeof refund_amount !== "number" || refund_amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Refund amount must be a positive number",
      });
    }

    // Create refund transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert([
        {
          user_id,
          type: "credit",
          amount: refund_amount,
          description: `Tournament refund: 50% of ${original_fee} credits from tournament ${tournament_id}`,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update wallet balance
    let { data: currentWallet, error: fetchError } = await supabaseAdmin
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user_id)
      .single();
    
    let updatedWallet;

    if (fetchError && fetchError.code === "PGRST116") {
      // Wallet doesn't exist, create one
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("user_wallets")
        .insert([
          {
            user_id,
            balance: refund_amount,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      updatedWallet = newWallet;
    } else if (fetchError) {
      throw fetchError;
    } else {
      // Update existing wallet
      const newBalance = currentWallet.balance + refund_amount;

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("user_wallets")
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedWallet = updated;
    }

    res.json({
      success: true,
      data: {
        transaction,
        new_balance: updatedWallet.balance,
        refund_amount: refund_amount,
      },
      message: "Tournament refund processed successfully",
    });
  } catch (error) {
    console.error("Error processing tournament refund:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process tournament refund",
      message: error.message,
    });
  }
});

module.exports = router;
