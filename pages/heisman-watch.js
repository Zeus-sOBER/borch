import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function HeismanWatch() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    player_name: '',
    position: '',
    team_id: '',
    coach_id: '',
    rank: 1,
    key_stats: {},
    notes: '',
    trophy_screenshot_url: ''
  });

  // Fetch candidates on mount
  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/heisman-watch');
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching Heisman candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/heisman-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setCandidates([...candidates, data.candidate].sort((a, b) => a.rank - b.rank));
        setFormData({ player_name: '', position: '', team_id: '', coach_id: '', rank: 1, key_stats: {}, notes: '', trophy_screenshot_url: '' });
        setShowAddForm(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!confirm('Remove this candidate from Heisman Watch?')) return;
    try {
      const res = await fetch(`/api/heisman-watch?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setCandidates(candidates.filter(c => c.id !== id));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getMedalEmoji = (rank) => {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣', 5: '5️⃣' };
    return medals[rank] || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-amber-900 mb-3">🏆 Heisman Trophy Watch 🏆</h1>
          <p className="text-lg text-amber-700">
            Tracking the top 5 candidates competing for college football's most prestigious award
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-200 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Add Candidate Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition"
          >
            {showAddForm ? '✕ Cancel' : '+ Add Candidate'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-10 border-4 border-amber-300">
            <h2 className="text-2xl font-bold text-amber-900 mb-6">Add New Candidate</h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Player Name"
                  required
                  value={formData.player_name}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  className="border-2 border-amber-300 p-3 rounded-lg focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Position (e.g., QB, RB, WR)"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="border-2 border-amber-300 p-3 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Team ID (integer from teams table)"
                  required
                  value={formData.team_id}
                  onChange={(e) => setFormData({ ...formData, team_id: parseInt(e.target.value) || '' })}
                  className="border-2 border-amber-300 p-3 rounded-lg focus:outline-none focus:border-amber-500"
                />
                <input
                  type="number"
                  placeholder="Coach ID (integer from coaches table)"
                  required
                  value={formData.coach_id}
                  onChange={(e) => setFormData({ ...formData, coach_id: parseInt(e.target.value) || '' })}
                  className="border-2 border-amber-300 p-3 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-amber-900 mb-2">Rank (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) })}
                    className="border-2 border-amber-300 p-3 rounded-lg w-full focus:outline-none focus:border-amber-500"
                  />
                </div>
                <input
                  type="url"
                  placeholder="Trophy Screenshot URL (Google Drive)"
                  value={formData.trophy_screenshot_url}
                  onChange={(e) => setFormData({ ...formData, trophy_screenshot_url: e.target.value })}
                  className="border-2 border-amber-300 p-3 rounded-lg focus:outline-none focus:border-amber-500 md:mt-6"
                />
              </div>

              <textarea
                placeholder="Notes/Commentary (e.g., 'Hot streak after 400 passing yards')"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border-2 border-amber-300 p-3 rounded-lg focus:outline-none focus:border-amber-500"
              />

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition"
              >
                ✓ Add Candidate
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-3xl mb-4">⏳</div>
            <p className="text-amber-700 font-semibold">Loading candidates...</p>
          </div>
        )}

        {/* Candidates Grid */}
        {!loading && candidates.length > 0 && (
          <div className="space-y-6">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-xl shadow-xl overflow-hidden border-l-8 border-amber-500 hover:shadow-2xl transition"
              >
                <div className="p-8">
                  {/* Header with Medal and Delete */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-5xl">{getMedalEmoji(candidate.rank)}</span>
                      <div className="flex-1">
                        <h3 className="text-3xl font-bold text-amber-900">
                          {candidate.player_name}
                          {candidate.position && <span className="text-sm text-amber-600 ml-2">({candidate.position})</span>}
                        </h3>
                        <p className="text-lg text-amber-600 font-semibold">
                          {candidate.teams?.name || 'Team Unknown'}
                        </p>
                        <p className="text-sm text-gray-700">
                          Coach: <span className="font-semibold">{candidate.coaches?.name || 'Unknown'}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCandidate(candidate.id)}
                      className="text-red-500 hover:text-red-700 font-bold text-2xl p-2"
                      title="Remove from watch"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Stats Grid */}
                  {candidate.key_stats && Object.keys(candidate.key_stats).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-amber-50 p-4 rounded-lg">
                      {Object.entries(candidate.key_stats).map(([stat, value]) => (
                        <div key={stat}>
                          <p className="text-xs text-amber-700 uppercase font-bold">{stat}</p>
                          <p className="text-2xl font-bold text-amber-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {candidate.notes && (
                    <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-sm text-blue-900 italic">💭 {candidate.notes}</p>
                    </div>
                  )}

                  {/* Trophy Screenshot */}
                  {candidate.trophy_screenshot_url && (
                    <div className="mt-6">
                      <p className="text-xs text-gray-600 font-bold mb-2">HEISMAN TROPHY SCREENSHOT:</p>
                      <a
                        href={candidate.trophy_screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={candidate.trophy_screenshot_url}
                          alt={`${candidate.player_name} Heisman Trophy`}
                          className="max-h-48 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border-2 border-amber-200"
                        />
                      </a>
                      <p className="text-xs text-gray-500 mt-2">
                        Updated: {new Date(candidate.trophy_screenshot_date).toLocaleDateString()} | Week {candidate.week_updated || '—'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && candidates.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg shadow-lg">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-2xl text-amber-900 font-bold mb-2">No candidates yet!</p>
            <p className="text-amber-700 mb-6">Start adding players to the Heisman Watch</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-lg"
            >
              + Add First Candidate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
