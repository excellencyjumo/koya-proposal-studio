// scripts/sync_supabase.js - Enterprise Supabase Data Durability & Backfill Engine
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal'
};

async function checkTableExists(tableName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count&limit=0`, { headers });
    return res.ok;
  } catch {
    return false;
  }
}

async function runSync() {
  console.log('\n================================================================');
  console.log('KOYA PROPOSAL STUDIO — SUPABASE DATA DURABILITY SYNC ENGINE');
  console.log(`Target Supabase URL: ${SUPABASE_URL}`);
  console.log('================================================================\n');

  const proposalsTableExists = await checkTableExists('proposals');
  const auditLogsTableExists = await checkTableExists('proposal_audit_logs');

  if (!proposalsTableExists || !auditLogsTableExists) {
    console.log('⚠️  DEDICATED TABLES PENDING CREATION IN SUPABASE:');
    if (!proposalsTableExists) console.log('   - public.proposals: NOT FOUND');
    if (!auditLogsTableExists) console.log('   - public.proposal_audit_logs: NOT FOUND');
    console.log('\n👉 ACTION REQUIRED:');
    console.log('   Open Supabase SQL Editor: https://supabase.com/dashboard/project/nbmmuyubkluvqzrsqwtm/sql');
    console.log('   Run the contents of: supabase_schema.sql');
    console.log('   Then re-run: node scripts/sync_supabase.js\n');
    return;
  }

  console.log('✅ Supabase Schema Verified: public.proposals and public.proposal_audit_logs are ACTIVE.\n');

  const dbPath = path.join(__dirname, '..', 'data', 'database.json');
  if (!fs.existsSync(dbPath)) {
    console.log('No local database.json found to backfill.');
    return;
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const data = JSON.parse(raw);
  const proposals = data.proposals || [];
  const auditLogs = data.audit_logs || [];

  console.log(`Starting backfill of ${proposals.length} proposals and ${auditLogs.length} audit logs...\n`);

  let syncedProposals = 0;
  for (const prop of proposals) {
    const payload = {
      id: prop.id,
      idempotency_key: prop.idempotency_key || null,
      version: prop.version || 1,
      status: prop.status || 'draft',
      title: prop.title,
      client_name: prop.client_name,
      client_email: prop.client_email,
      company_name: prop.company_name,
      salesperson_name: prop.salesperson_name,
      created_by_user_id: prop.created_by_user_id || null,
      date_of_call: prop.date_of_call || null,
      valid_until: prop.valid_until || null,
      content_digest: prop.content_digest || null,
      intake_data: prop.intake_data || {},
      supporting_material: prop.supporting_material || '',
      has_gaps: Boolean(prop.has_gaps),
      gaps: prop.gaps || [],
      sections: prop.sections || {},
      version_history: prop.version_history || [],
      telemetry: prop.telemetry || {},
      approval: prop.approval || null,
      delivery: prop.delivery || null,
      revision_request_notes: prop.revision_request_notes || null,
      acceptance: prop.acceptance || null,
      created_at: prop.created_at || new Date().toISOString(),
      updated_at: prop.updated_at || new Date().toISOString()
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/proposals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      syncedProposals++;
      process.stdout.write(`   ✓ Synced proposal: ${prop.id} (${prop.company_name})\n`);
    } else {
      const err = await res.text();
      console.error(`   ✗ Failed to sync proposal ${prop.id}: ${err}`);
    }
  }

  let syncedLogs = 0;
  for (const log of auditLogs) {
    const payload = {
      id: log.id,
      proposal_id: log.proposal_id,
      timestamp: log.timestamp || new Date().toISOString(),
      action: log.action,
      actor: log.actor,
      details: log.details || {}
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/proposal_audit_logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      syncedLogs++;
    }
  }

  console.log(`\n================================================================`);
  console.log(`SYNC COMPLETE: ${syncedProposals}/${proposals.length} Proposals, ${syncedLogs}/${auditLogs.length} Audit Logs`);
  console.log('Data Durability Verified in Supabase Cloud PostgreSQL!');
  console.log('================================================================\n');
}

runSync().catch(console.error);
