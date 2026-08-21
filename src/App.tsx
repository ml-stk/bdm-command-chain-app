import React, { useState, useEffect } from 'react';

interface Account {
  id: string;
  account_name: string;
  location: string;
  annual_target: number;
  sector_name: string;
  total_contacts: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
  gray_count: number;
  latest_contact: string | null;
}

interface Contact {
  id: string;
  account_id: string;
  contact_name: string;
  designation: string;
  tier: 'C-Suite' | 'Operations' | 'Technical Evaluator' | 'Procurement';
  relationship_status: 'green' | 'yellow' | 'red' | 'gray';
  notes: string | null;
  last_contacted_at: string | null;
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stagnantAccounts, setStagnantAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accRes, stagRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/stagnant')
      ]);
      const accData = await accRes.json();
      const stagData = await stagRes.json();
      setAccounts(accData);
      setStagnantAccounts(stagData);
      if (accData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accData[0].id);
      }
    } catch (err) {
      console.error("Failed loading data", err);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      fetch(`/api/contacts?accountId=${selectedAccountId}`)
        .then(res => res.json())
        .then(data => setContacts(data))
        .catch(err => console.error(err));
    }
  }, [selectedAccountId]);

  const handleStatusUpdate = async (contactId: string, newStatus: string) => {
    await fetch('/api/heatmap/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId, status: newStatus }),
    });
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, relationship_status: newStatus as any } : c));
    fetchData();
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Executive Header & Stagnant Alerts */}
      <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">BDM Command Chain & Target Matrix</h1>
          <p className="text-slate-400 text-sm">Port Moresby Mining, DepTec & Enterprise Accounts</p>
        </div>
        {stagnantAccounts.length > 0 && (
          <div className="bg-red-950/80 border border-red-800 text-red-300 text-xs px-3 py-1.5 rounded-lg font-medium">
            ⚠️ {stagnantAccounts.length} Stagnant Account(s) (14+ Days Inactive)
          </div>
        )}
      </header>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {accounts.map(acc => (
          <div
            key={acc.id}
            onClick={() => setSelectedAccountId(acc.id)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedAccountId === acc.id
                ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">{acc.sector_name || 'General'}</span>
              <span className="text-xs font-bold text-slate-300">${acc.annual_target?.toLocaleString()}</span>
            </div>
            <h3 className="font-semibold text-slate-100">{acc.account_name}</h3>
            
            {/* Relationship Coverage Meter */}
            <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
              <div style={{ width: `${((acc.green_count || 0) / (acc.total_contacts || 1)) * 100}%` }} className="bg-emerald-500" />
              <div style={{ width: `${((acc.yellow_count || 0) / (acc.total_contacts || 1)) * 100}%` }} className="bg-amber-500" />
              <div style={{ width: `${((acc.red_count || 0) / (acc.total_contacts || 1)) * 100}%` }} className="bg-rose-500" />
              <div style={{ width: `${((acc.gray_count || 0) / (acc.total_contacts || 1)) * 100}%` }} className="bg-slate-600" />
            </div>
          </div>
        ))}
      </div>

      {/* Command Chain Matrix */}
      {selectedAccount && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">{selectedAccount.account_name} — Stakeholder Heatmap</h2>
              <p className="text-sm text-slate-400">Click color badges to cycle stakeholder relationship status</p>
            </div>
          </div>

          <div className="space-y-4">
            {['C-Suite', 'Operations', 'Technical Evaluator', 'Procurement'].map((tierName) => {
              const tierContacts = contacts.filter(c => c.tier === tierName);
              return (
                <div key={tierName} className="border border-slate-800 rounded-lg p-4 bg-slate-950/40">
                  <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-3">{tierName}</h4>
                  {tierContacts.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No stakeholders mapped for this tier yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {tierContacts.map(contact => (
                        <div key={contact.id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm text-slate-200">{contact.contact_name}</div>
                            <div className="text-xs text-slate-400">{contact.designation}</div>
                          </div>
                          
                          <div className="flex gap-1">
                            {(['green', 'yellow', 'red', 'gray'] as const).map(status => (
                              <button
                                key={status}
                                onClick={() => handleStatusUpdate(contact.id, status)}
                                className={`w-6 h-6 rounded-md transition-transform ${
                                  contact.relationship_status === status ? 'scale-110 ring-2 ring-white' : 'opacity-40 hover:opacity-100'
                                } ${
                                  status === 'green' ? 'bg-emerald-500' :
                                  status === 'yellow' ? 'bg-amber-500' :
                                  status === 'red' ? 'bg-rose-500' : 'bg-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
