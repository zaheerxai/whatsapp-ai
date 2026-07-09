const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const BUCKET = 'wa-sessions';

// RemoteAuth's default dataPath. Update this too if a custom dataPath is
// ever passed into the RemoteAuth constructor options.
const SESSION_DIR = '.wwebjs_auth';

class SupabaseStore {
  async sessionExists({ session }) {
    const { data, error } = await supabase.storage.from(BUCKET).list();
    if (error) throw error;
    return data?.some((f) => f.name === `${session}.zip`) ?? false;
  }

  async save({ session }) {
    // RemoteAuth already compressed the session to this exact path before
    // calling save() — it just doesn't pass the path along.
    const localZipPath = path.join(SESSION_DIR, `${session}.zip`);
    const fileBuffer = fs.readFileSync(localZipPath);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${session}.zip`, fileBuffer, { upsert: true });
    if (error) throw error;
  }

  async extract({ session, path: destPath }) {
    // Unlike save(), RemoteAuth does pass the destination path here.
    const { data, error } = await supabase.storage.from(BUCKET).download(`${session}.zip`);
    if (error) throw error;
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
  }

  async delete({ session }) {
    const { error } = await supabase.storage.from(BUCKET).remove([`${session}.zip`]);
    if (error) throw error;
  }
}

module.exports = { supabase, SupabaseStore };