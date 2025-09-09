import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../utils/authStore';

export default function TestSchedule() {
  const { accessToken } = useAuthStore.getState();
  const apiBase = import.meta.env.VITE_API_BASE;

  // form state
  const [domains, setDomains] = useState([]);
  const [title, setTitle] = useState('');
  const [domainIds, setDomainIds] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [msg, setMsg] = useState('');

  // manage tests
  const [tests, setTests] = useState([]);
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    // fetch only staff-created domains
    fetch(`${apiBase}/domains?createdBy=staff`, { headers })
      .then(r => r.json()).then(setDomains).catch(() => { });

    // fetch all tests for manage list
    fetch(`${apiBase}/tests`, { headers })
      .then(r => r.json()).then(setTests).catch(() => { });
  }, []);

  const onToggleDomain = (id) => {
    setDomainIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch(`${apiBase}/tests/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, domains: domainIds, startDate, endDate, durationMinutes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save');
      setMsg('Test saved');
      // refresh tests list
      fetch(`${apiBase}/tests`, { headers }).then(r => r.json()).then(setTests);
      // reset form
      setTitle(''); setDomainIds([]); setStartDate(''); setEndDate(''); setDurationMinutes(60);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test?')) return; // replace with custom dialog later if TestSchedule is used
    const res = await fetch(`${apiBase}/tests/${id}`, { method: 'DELETE', headers });
    if (res.ok) setTests(prev => prev.filter(t => t._id !== id));
  };

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Create / Schedule Test</h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">Title
            <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} required />
          </label>

          <div>
            <div className="font-medium mb-1">Domains (staff-created)</div>
            <div className="flex flex-wrap gap-3">
              {domains.map(d => (
                <label key={d._id} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={domainIds.includes(d._id)}
                    onChange={() => onToggleDomain(d._id)}
                  />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">Start
              <input type="datetime-local" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </label>
            <label className="block">End
              <input type="datetime-local" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </label>
            <label className="block">Duration (mins)
              <input type="number" className="input" value={durationMinutes} onChange={e => setDurationMinutes(+e.target.value)} min={1} />
            </label>
          </div>

          <button className="btn-primary w-max">Save</button>
          {msg && <div className="text-sm">{msg}</div>}
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Manage Tests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Title</th>
                <th className="p-2">Start</th>
                <th className="p-2">End</th>
                <th className="p-2">Duration</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t._id} className="border-t">
                  <td className="p-2">{t.title}</td>
                  <td className="p-2">{new Date(t.startDate).toLocaleString()}</td>
                  <td className="p-2">{new Date(t.endDate).toLocaleString()}</td>
                  <td className="p-2 text-center">{t.durationMinutes}m</td>
                  <td className="p-2 text-right">
                    <button className="btn-danger" onClick={() => handleDelete(t._id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {tests.length === 0 && (
                <tr><td className="p-4 text-center text-gray-500" colSpan={5}>No tests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}