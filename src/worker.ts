export interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (pathname === '/api/accounts' && request.method === 'GET') {
        const query = `
          SELECT 
            a.id,
            a.account_name,
            a.location,
            a.annual_target,
            s.name AS sector_name,
            COUNT(c.id) AS total_contacts,
            SUM(CASE WHEN c.relationship_status = 'green' THEN 1 ELSE 0 END) AS green_count,
            SUM(CASE WHEN c.relationship_status = 'yellow' THEN 1 ELSE 0 END) AS yellow_count,
            SUM(CASE WHEN c.relationship_status = 'red' THEN 1 ELSE 0 END) AS red_count,
            SUM(CASE WHEN c.relationship_status = 'gray' THEN 1 ELSE 0 END) AS gray_count,
            MAX(c.last_contacted_at) AS latest_contact
          FROM accounts a
          LEFT JOIN sectors s ON a.sector_id = s.id
          LEFT JOIN command_chain_contacts c ON a.id = c.account_id
          GROUP BY a.id
          ORDER BY a.account_name ASC;
        `;
        const { results } = await env.DB.prepare(query).all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (pathname === '/api/contacts' && request.method === 'GET') {
        const accountId = url.searchParams.get('accountId');
        if (!accountId) {
          return Response.json({ error: 'accountId query param required' }, { status: 400, headers: corsHeaders });
        }

        const { results } = await env.DB.prepare(`
          SELECT * FROM command_chain_contacts
          WHERE account_id = ?
          ORDER BY 
            CASE tier
              WHEN 'C-Suite' THEN 1
              WHEN 'Operations' THEN 2
              WHEN 'Technical Evaluator' THEN 3
              WHEN 'Procurement' THEN 4
              ELSE 5
            END
        `).bind(accountId).all();

        return Response.json(results, { headers: corsHeaders });
      }

      if (pathname === '/api/heatmap/update' && request.method === 'POST') {
        const body: any = await request.json();
        const { contactId, status, notes } = body;

        await env.DB.prepare(`
          UPDATE command_chain_contacts
          SET relationship_status = ?, notes = COALESCE(?, notes), last_contacted_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(status, notes || null, contactId).run();

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      if (pathname === '/api/stagnant' && request.method === 'GET') {
        const query = `
          SELECT a.id, a.account_name, MAX(c.last_contacted_at) as last_interaction
          FROM accounts a
          LEFT JOIN command_chain_contacts c ON a.id = c.account_id
          GROUP BY a.id
          HAVING last_interaction IS NULL 
             OR datetime(last_interaction) < datetime('now', '-14 days');
        `;
        const { results } = await env.DB.prepare(query).all();
        return Response.json(results, { headers: corsHeaders });
      }

      return Response.json({ error: 'Endpoint Not Found' }, { status: 404, headers: corsHeaders });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  },
};
