CREATE TABLE IF NOT EXISTS sectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    sector_id TEXT REFERENCES sectors(id),
    account_name TEXT NOT NULL,
    location TEXT DEFAULT 'Port Moresby',
    annual_target REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS command_chain_contacts (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    tier TEXT CHECK(tier IN ('C-Suite', 'Operations', 'Technical Evaluator', 'Procurement')),
    relationship_status TEXT CHECK(relationship_status IN ('green', 'yellow', 'red', 'gray')) DEFAULT 'gray',
    notes TEXT,
    last_contacted_at DATETIME
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id),
    contact_id TEXT REFERENCES command_chain_contacts(id),
    activity_type TEXT CHECK(activity_type IN ('Call', 'Meeting', 'Site Visit', 'Proposal')),
    summary TEXT NOT NULL,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
