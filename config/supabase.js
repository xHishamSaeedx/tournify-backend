const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

// Create admin client with service role key for server-side operations
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    // First test basic connection
    const { data, error } = await supabase
      .from("tournaments")
      .select("count")
      .limit(1);
    if (error) {
      if (error.message.includes("does not exist")) {
        console.log("✅ Connected to Supabase (tables not created yet)");
        console.log(
          "💡 Run the SQL commands in Supabase SQL Editor to create tables"
        );
        return true;
      } else {
        console.log("❌ Supabase connection failed:", error.message);
        return false;
      }
    }
    console.log("✅ Successfully connected to Supabase");
    return true;
  } catch (error) {
    console.log("❌ Supabase connection error:", error.message);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testSupabaseConnection,
};
