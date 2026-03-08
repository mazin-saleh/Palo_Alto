import { useState, useEffect } from 'react';
import { createCircle, fetchCircles, broadcastStatus, fetchCircleStatuses, fetchEncryptedStatuses, seedCircles } from '../api';
import { useToast } from '../components/Toast';

// Friendly demo user names — makes it feel real for families
const DEMO_USERS = {
  'USR-001': { name: 'You', avatar: '👤' },
  'USR-002': { name: 'Mom', avatar: '👩' },
  'USR-003': { name: 'Dad', avatar: '👨' },
  'USR-004': { name: 'Sarah K.', avatar: '👩‍🦰' },
  'USR-005': { name: 'Alex M.', avatar: '🧑' },
};

const getUserName = (id) => DEMO_USERS[id]?.name || id;
const getUserAvatar = (id) => DEMO_USERS[id]?.avatar || '👤';

// Quick-status presets — one tap instead of typing
const QUICK_STATUSES = [
  { label: "I'm Safe", icon: '🛡️', message: "I'm safe — all clear on my end.", color: 'bg-sage hover:bg-sage-dark text-white' },
  { label: 'Need Help', icon: '🚨', message: 'I need help. Please check on me as soon as possible.', color: 'bg-coral hover:bg-red-600 text-white' },
  { label: 'On My Way', icon: '🏠', message: "On my way home now. I'll update when I arrive.", color: 'bg-sky-500 hover:bg-sky-600 text-white' },
  { label: 'Checking In', icon: '👋', message: 'Just checking in — how is everyone doing?', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
];

export default function SafeCirclesPage() {
  const currentUserId = 'USR-001';
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [showEncrypted, setShowEncrypted] = useState(false);
  const [encryptedStatuses, setEncryptedStatuses] = useState([]);
  const [circleName, setCircleName] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [message, setMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const addToast = useToast();

  const loadCircles = async () => {
    try {
      const data = await fetchCircles(currentUserId);
      setCircles(data);
      return data;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadCircles();
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await seedCircles();
      const data = await loadCircles();
      if (data.length > 0) {
        handleSelectCircle(data[0]);
      }
      addToast('Demo circles created!', 'success');
    } catch (err) {
      addToast(`Seed failed: ${err.message}`, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const loadStatuses = async (circleId) => {
    try {
      const [decrypted, encrypted] = await Promise.all([
        fetchCircleStatuses(circleId, currentUserId),
        fetchEncryptedStatuses(circleId),
      ]);
      setStatuses(decrypted);
      setEncryptedStatuses(encrypted);
    } catch (err) {
      addToast(`Failed to load messages: ${err.message}`, 'error');
    }
  };

  const handleSelectCircle = (circle) => {
    setSelectedCircle(circle);
    setShowEncrypted(false);
    loadStatuses(circle.circle_id);
  };

  // Available members to add (those not already in use)
  const AVAILABLE_MEMBERS = Object.entries(DEMO_USERS)
    .filter(([id]) => id !== currentUserId)
    .map(([id, info]) => ({ id, ...info }));

  const toggleMember = (id) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    if (!circleName.trim() || memberIds.length === 0) return;
    try {
      await createCircle({
        owner_id: currentUserId,
        circle_name: circleName.trim(),
        member_ids: memberIds,
      });
      setCircleName('');
      setMemberIds([]);
      setShowCreateForm(false);
      addToast('Group created!', 'success');
      loadCircles();
    } catch (err) {
      addToast(`Failed: ${err.message}`, 'error');
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || !selectedCircle) return;
    setBroadcasting(true);
    try {
      await broadcastStatus(selectedCircle.circle_id, {
        sender_id: currentUserId,
        plaintext_message: text.trim(),
      });
      setMessage('');
      addToast('Message sent securely', 'success');
      loadStatuses(selectedCircle.circle_id);
    } catch (err) {
      addToast(`Send failed: ${err.message}`, 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleBroadcast = (e) => {
    e.preventDefault();
    sendMessage(message);
  };

  const currentMessages = showEncrypted ? encryptedStatuses : statuses;

  // Group messages by date
  const groupedMessages = {};
  currentMessages.forEach((s) => {
    const day = new Date(s.timestamp).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    if (!groupedMessages[day]) groupedMessages[day] = [];
    groupedMessages[day].push(s);
  });

  const circleMembers = selectedCircle
    ? [currentUserId, ...selectedCircle.member_ids]
    : [];

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-2 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">Safe Circles</h1>
          <p className="text-stone text-sm mt-0.5">Private groups to check on the people you care about</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-warm-sm hover:shadow-warm active:scale-[0.98]"
          aria-label="Create a new group"
          aria-expanded={showCreateForm}
        >
          + New Circle
        </button>
      </div>

      {/* Privacy explainer */}
      <div className="flex items-center gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <svg className="w-4 h-4 text-sage shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-stone">
          All messages are <span className="font-semibold text-sage">encrypted before storage</span> — the server never sees your plaintext. Only circle members can read messages.
        </p>
      </div>

      {/* Create Circle Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateCircle} className="bg-white rounded-xl border border-sand/60 p-6 mb-6 shadow-warm-sm animate-fade-in-up">
          <h3 className="text-base font-semibold text-ink mb-4">Create a New Circle</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone mb-1.5 block">Circle Name</label>
              <input
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="e.g. Family Safety, Close Friends..."
                className="w-full px-4 py-3 bg-parchment/50 border border-sand rounded-xl text-ink placeholder-pebble focus:outline-none focus:border-sage focus:bg-white text-sm transition-colors"
                aria-label="Circle name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone mb-1.5 block">Add Members</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_MEMBERS.map((m) => {
                  const selected = memberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        selected
                          ? 'bg-sage text-white shadow-warm-sm'
                          : 'bg-parchment/50 text-stone border border-sand/60 hover:bg-sand-light'
                      }`}
                      aria-pressed={selected}
                      aria-label={`${selected ? 'Remove' : 'Add'} ${m.name}`}
                    >
                      <span className="text-base">{m.avatar}</span>
                      {m.name}
                      {selected && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {memberIds.length === 0 && (
                <p className="text-xs text-pebble mt-2">Tap people to add them to your circle</p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={!circleName.trim() || memberIds.length === 0}
                className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
              >
                Create Circle
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setMemberIds([]); setCircleName(''); }}
                className="px-5 py-2.5 bg-white border border-sand text-stone text-sm rounded-xl hover:bg-parchment transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Circle list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-sand/60 shadow-warm-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-sand/60">
              <h2 className="text-sm font-semibold text-stone uppercase tracking-wider">Your Circles</h2>
            </div>
            {circles.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">🤝</div>
                <p className="text-ink text-sm font-medium mb-1">No circles yet</p>
                <p className="text-pebble text-xs mb-4">Create a circle to start checking in with family and friends</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full px-4 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    + Create Your First Circle
                  </button>
                  <button
                    onClick={handleSeedDemo}
                    disabled={seeding}
                    className="w-full px-4 py-2.5 bg-parchment hover:bg-sand-light text-stone text-sm rounded-xl border border-sand/60 transition-colors disabled:opacity-50"
                  >
                    {seeding ? 'Loading...' : 'Load Demo Data'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-sand/60">
                {circles.map((c) => {
                  const isActive = selectedCircle?.circle_id === c.circle_id;
                  const members = [currentUserId, ...c.member_ids];
                  return (
                    <button
                      key={c.circle_id}
                      onClick={() => handleSelectCircle(c)}
                      className={`w-full text-left p-4 transition-colors ${isActive ? 'bg-sage-light' : 'hover:bg-parchment/50'}`}
                      aria-label={`Open ${c.circle_name}`}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-1.5">
                          {members.slice(0, 3).map((id) => (
                            <div
                              key={id}
                              className="w-8 h-8 rounded-full bg-parchment border-2 border-white flex items-center justify-center text-sm"
                              title={getUserName(id)}
                            >
                              {getUserAvatar(id)}
                            </div>
                          ))}
                          {members.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-sand text-stone flex items-center justify-center text-xs font-semibold border-2 border-white">
                              +{members.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isActive ? 'text-sage' : 'text-ink'}`}>
                            {c.circle_name}
                          </div>
                          <div className="text-xs text-pebble">
                            {members.map((id) => getUserName(id)).join(', ')}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Message feed */}
        <div className="lg:col-span-2">
          {!selectedCircle ? (
            <div className="bg-white rounded-xl border border-sand/60 shadow-warm-sm p-12 text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-ink font-medium">Select a circle to view messages</p>
              <p className="text-pebble text-sm mt-1">Your conversations are end-to-end encrypted</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-sand/60 shadow-warm-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
              {/* Feed header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand/60">
                <div>
                  <h2 className="text-base font-semibold text-ink">{selectedCircle.circle_name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <svg className="w-3 h-3 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-xs text-pebble">Encrypted</p>
                    <span className="text-xs text-pebble mx-1">·</span>
                    <p className="text-xs text-pebble">{circleMembers.length} members</p>
                  </div>
                </div>
                {/* Encrypted/Decrypted toggle */}
                <button
                  onClick={() => setShowEncrypted(!showEncrypted)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showEncrypted
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-sage-light text-sage border border-sage/20'
                  }`}
                  aria-pressed={showEncrypted}
                  title={showEncrypted ? 'Showing raw encrypted data as stored on server' : 'Showing decrypted messages'}
                >
                  {showEncrypted ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Raw Ciphertext
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Decrypted
                    </>
                  )}
                </button>
              </div>

              {/* Encrypted view explainer */}
              {showEncrypted && (
                <div className="mx-6 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Audit View:</span> This is what the server stores. Messages are XOR-encrypted + Base64 encoded. Only circle members with the key can decrypt.
                  </p>
                </div>
              )}

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-stone text-sm">No messages yet.</p>
                    <p className="text-pebble text-xs mt-1">Use the quick buttons below to check in.</p>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([day, msgs]) => (
                    <div key={day}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-sand/60" />
                        <span className="text-xs text-pebble font-medium">{day}</span>
                        <div className="h-px flex-1 bg-sand/60" />
                      </div>
                      <div className="space-y-3">
                        {msgs.map((s) => {
                          const isOwn = s.sender_id === currentUserId;
                          return (
                            <div key={s.status_id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                                {!isOwn && (
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm">{getUserAvatar(s.sender_id)}</span>
                                    <span className="text-xs font-medium text-stone">{getUserName(s.sender_id)}</span>
                                  </div>
                                )}
                                <div className={`rounded-2xl px-4 py-2.5 ${
                                  isOwn
                                    ? 'bg-sage text-white rounded-br-md'
                                    : 'bg-parchment text-ink rounded-bl-md'
                                }`}>
                                  {showEncrypted ? (
                                    <p className="text-xs font-mono break-all opacity-80">{s.encrypted_payload}</p>
                                  ) : (
                                    <p className="text-sm">{s.decrypted_message}</p>
                                  )}
                                </div>
                                <div className={`text-xs text-pebble mt-0.5 ${isOwn ? 'text-right' : ''}`}>
                                  {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick status buttons */}
              <div className="px-6 py-3 border-t border-sand/40 bg-parchment/30">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs text-pebble shrink-0 font-medium">Quick:</span>
                  {QUICK_STATUSES.map((qs) => (
                    <button
                      key={qs.label}
                      onClick={() => sendMessage(qs.message)}
                      disabled={broadcasting}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 ${qs.color}`}
                      aria-label={`Send quick status: ${qs.label}`}
                    >
                      <span>{qs.icon}</span>
                      {qs.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message input */}
              <form onSubmit={handleBroadcast} className="px-6 py-4 border-t border-sand/60 bg-ivory/50">
                <div className="flex gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={500}
                    className="flex-1 px-4 py-2.5 bg-white border border-sand rounded-xl text-ink placeholder-pebble focus:outline-none focus:border-sage text-sm transition-colors"
                    aria-label="Message"
                  />
                  <button
                    type="submit"
                    disabled={broadcasting || !message.trim()}
                    className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    aria-label="Send message"
                  >
                    {broadcasting ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
