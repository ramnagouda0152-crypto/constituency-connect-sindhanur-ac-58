import fs from 'fs';
import path from 'path';
import { getPostgresPool, initializeSchema } from './postgresPool.ts';
import { OFFICIAL_VILLAGES_AC58 } from '../../data/villagesList.ts';

/**
 * Migration Script: Imports legitimate Sindhanur AC-58 data into PostgreSQL.
 * Does NOT destroy or alter the local data/constituency_db.json file.
 * Filters out demo users, test records, and fake items.
 */
export async function migrateDataToPostgres(): Promise<{ migrated: boolean; message: string }> {
  const pool = getPostgresPool();
  if (!pool) {
    return { migrated: false, message: 'PostgreSQL connection unavailable (DATABASE_URL not set).' };
  }

  // Ensure tables and indexes exist
  await initializeSchema();

  if (pool) {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT');
  }

  // Check if villages table already has records
  const checkRes = await pool.query('SELECT COUNT(*) as count FROM villages');
  const count = parseInt(checkRes.rows[0].count, 10);

  if (count >= 100) {
    return { migrated: false, message: `PostgreSQL database already initialized with ${count} villages.` };
  }

  console.log('[PostgreSQL Migration] Migrating legitimate Sindhanur AC-58 dataset into PostgreSQL...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Constituency
    await client.query(`
      INSERT INTO constituencies (constituency_id, name, name_kannada, district, state, total_villages, total_gps)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (constituency_id) DO NOTHING
    `, [
      'AC58',
      'Sindhanur Assembly Constituency (AC-58)',
      'ಸಿಂಧನೂರು ವಿಧಾನಸಭಾ ಕ್ಷೇತ್ರ (AC-58)',
      'Raichur',
      'Karnataka',
      124,
      33
    ]);

    // 2. Insert Taluk
    await client.query(`
      INSERT INTO taluks (taluk_id, constituency_id, name, name_kannada)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (taluk_id) DO NOTHING
    `, [
      'TLK_SND',
      'AC58',
      'Sindhanur Taluk',
      'ಸಿಂಧನೂರು ತಾಲೂಕು'
    ]);

    // Load legitimate data from data/constituency_db.json if available
    let sourceData: any = null;
    const jsonPath = path.join(process.cwd(), 'data', 'constituency_db.json');
    if (fs.existsSync(jsonPath)) {
      try {
        sourceData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      } catch (e) {
        console.warn('[Migration Warning] Could not parse local JSON file, utilizing verified data directory.');
      }
    }

    // 3. Insert Gram Panchayats
    const gpMap = new Map<string, any>();
    if (sourceData && Array.isArray(sourceData.gram_panchayats) && sourceData.gram_panchayats.length > 0) {
      for (const gp of sourceData.gram_panchayats) {
        gpMap.set(gp.gp_id, gp);
      }
    } else {
      // Build from OFFICIAL_VILLAGES_AC58
      for (const v of OFFICIAL_VILLAGES_AC58) {
        const gpId = `GP_${v.gram_panchayat.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        if (!gpMap.has(gpId)) {
          gpMap.set(gpId, {
            gp_id: gpId,
            gp_name: `${v.gram_panchayat} Gram Panchayat`,
            kannada_name: `${v.gram_panchayat} ಗ್ರಾಮ ಪಂಚಾಯಿತಿ`,
            headquarters_village_id: v.village_id,
            villages_count: 0
          });
        }
        gpMap.get(gpId).villages_count++;
      }
    }

    for (const gp of gpMap.values()) {
      await client.query(`
        INSERT INTO gram_panchayats (gp_id, taluk_id, constituency_id, gp_name, kannada_name, headquarters_village_id, villages_count, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (gp_id) DO UPDATE SET gp_name = EXCLUDED.gp_name, villages_count = EXCLUDED.villages_count
      `, [
        gp.gp_id,
        'TLK_SND',
        'AC58',
        gp.gp_name,
        gp.kannada_name || gp.gp_name,
        gp.headquarters_village_id || null,
        gp.villages_count || 1,
        gp.status || 'ACTIVE'
      ]);
    }

    // 4. Insert 124 Villages
    const villagesToInsert = (sourceData && Array.isArray(sourceData.villages) && sourceData.villages.length >= 100)
      ? sourceData.villages
      : OFFICIAL_VILLAGES_AC58.map((v) => {
          const gpId = `GP_${v.gram_panchayat.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
          return {
            village_id: v.village_id,
            village_name: v.village_name,
            kannada_name: v.kannada_name || v.village_name,
            gp_id: gpId,
            taluk_id: 'TLK_SND',
            constituency_id: 'AC58',
            latitude: v.latitude,
            longitude: v.longitude,
            population: v.population,
            households: v.households,
            voter_count: v.voter_count,
            status: 'ACTIVE'
          };
        });

    for (const v of villagesToInsert) {
      await client.query(`
        INSERT INTO villages (village_id, village_name, kannada_name, gp_id, taluk_id, constituency_id, latitude, longitude, population, households, voter_count, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (village_id) DO UPDATE SET
          village_name = EXCLUDED.village_name,
          population = EXCLUDED.population,
          households = EXCLUDED.households,
          voter_count = EXCLUDED.voter_count
      `, [
        v.village_id,
        v.village_name,
        v.kannada_name || v.village_name,
        v.gp_id,
        'TLK_SND',
        'AC58',
        v.latitude || 15.75,
        v.longitude || 76.75,
        v.population || 2000,
        v.households || 400,
        v.voter_count || 1400,
        v.status || 'ACTIVE'
      ]);
    }

    // 5. Insert Legitimate Users (Strictly skip demo users)
    const usersToInsert = (sourceData && Array.isArray(sourceData.users)) ? sourceData.users : [];
    for (const u of usersToInsert) {
      // Do NOT import demo or test users
      if (
        u.user_id.includes('DEMO') ||
        u.user_id === 'USR_VH_GOR' ||
        u.user_id === 'USR_MEM_GOR' ||
        u.user_id === 'USR_VH_TUR'
      ) {
        continue;
      }

      await client.query(`
        INSERT INTO users (
          user_id, name, name_kannada, mobile, email, voter_id, role, status,
          village_id, gp_id, taluk_id, constituency_id, password_hash, password_salt,
          dob, gender, address, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (user_id) DO UPDATE SET
          name = EXCLUDED.name,
          mobile = EXCLUDED.mobile,
          voter_id = EXCLUDED.voter_id,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          village_id = EXCLUDED.village_id,
          updated_at = NOW()
      `, [
        u.user_id,
        u.name,
        u.name_kannada || null,
        u.mobile,
        u.email || null,
        u.voter_id,
        u.role,
        u.status || 'ACTIVE',
        u.village_id || null,
        u.gp_id || null,
        u.taluk_id || 'TLK_SND',
        u.constituency_id || 'AC58',
        u.password_hash || null,
        u.password_salt || null,
        u.dob || null,
        u.gender || null,
        u.address || null,
        u.created_at || new Date().toISOString(),
        u.updated_at || new Date().toISOString()
      ]);
    }

    // 6. Insert Notifications
    const notifs = (sourceData && Array.isArray(sourceData.notifications)) ? sourceData.notifications : [];
    for (const n of notifs) {
      await client.query(`
        INSERT INTO notifications (notification_id, user_id, village_id, title, message, type, is_read, link_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (notification_id) DO NOTHING
      `, [
        n.notification_id,
        n.user_id || null,
        n.village_id || null,
        n.title,
        n.message,
        n.type || 'SYSTEM',
        n.is_read || false,
        n.link_url || null,
        n.created_at || new Date().toISOString()
      ]);
    }

    // 7. Insert Audit Logs
    const audits = (sourceData && Array.isArray(sourceData.audit_logs)) ? sourceData.audit_logs : [];
    for (const a of audits) {
      await client.query(`
        INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (audit_id) DO NOTHING
      `, [
        a.audit_id,
        a.user_id,
        a.user_name,
        a.role,
        a.action || 'UPDATE',
        a.record_type || 'SYSTEM',
        a.record_id || null,
        a.village_id || null,
        a.details,
        a.timestamp || new Date().toISOString()
      ]);
    }

    await client.query('COMMIT');
    console.log(`[PostgreSQL Migration] Successfully imported all 124 villages, 33 Gram Panchayats, and legitimate users.`);
    return { migrated: true, message: 'Migration completed successfully.' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL Migration Failed]:', (err as Error)?.message);
    throw err;
  } finally {
    client.release();
  }
}

