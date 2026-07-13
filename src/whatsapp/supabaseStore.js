const path = require('path');
const fs = require('fs');
const { promises: fsPromises } = require('fs');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const BUCKET = 'wa-sessions';

// RemoteAuth's default dataPath. Update this too if a custom dataPath is
// ever passed into the RemoteAuth constructor options.
const SESSION_DIR = '.wwebjs_auth';

class SupabaseStore {
  async sessionExists({ session }) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list();
      if (error) throw error;
      return data?.some((f) => f.name === `${session}.zip`) ?? false;
    } catch (err) {
      console.error('Error checking session existence:', err.message);
      return false;
    }
  }

  async save({ session }) {
    // RemoteAuth already compressed the session to this exact path before
    // calling save() — it just doesn't pass the path along.
    const localZipPath = path.join(SESSION_DIR, `${session}.zip`);
    try {
      const fileBuffer = await fsPromises.readFile(localZipPath);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${session}.zip`, fileBuffer, { upsert: true });
      if (error) throw error;
      console.log('Session saved to Supabase');
    } catch (err) {
      console.error('Error saving session:', err.message);
      throw err;
    }
  }

  async extract({ session, path: destPath }) {
    // Unlike save(), RemoteAuth does pass the destination path here.
    try {
      console.log(`Restoring session from Supabase: ${session}`);
      const { data, error } = await supabase.storage.from(BUCKET).download(`${session}.zip`);
      if (error) throw error;
      
      const buffer = Buffer.from(await data.arrayBuffer());
      await fsPromises.mkdir(path.dirname(destPath), { recursive: true });
      await fsPromises.writeFile(destPath, buffer);
      console.log('Session restored from Supabase');
    } catch (err) {
      console.error('Error extracting session:', err.message);
      throw err;
    }
  }

  async delete({ session }) {
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([`${session}.zip`]);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting session:', err.message);
      throw err;
    }
  }
}

module.exports = { supabase, SupabaseStore };
