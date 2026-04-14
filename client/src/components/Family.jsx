import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Plus, UserPlus, Trash2, LogOut, 
  Check, X, Home, Crown, Shield,
  AlertCircle, Loader2, Copy, Share2
} from 'lucide-react';
import API_BASE_URL from '../config';
import '../styles/Family.css';

const Family = () => {
  const { user } = useAuth();
  const [families, setFamilies] = useState([]);
  const [currentFamilyId, setCurrentFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyJoinCode, setFamilyJoinCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  
  // Form states
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyDescription, setNewFamilyDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/my-families`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFamilies(data.families);
        setCurrentFamilyId(data.currentFamilyId);
      } else {
        setError('Failed to load family data');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFamilyName,
          description: newFamilyDescription
        })
      });

      if (response.ok) {
        setSuccessMessage('Family created successfully!');
        setShowCreateModal(false);
        setNewFamilyName('');
        setNewFamilyDescription('');
        fetchFamilies();
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to create family');
      }
    } catch (err) {
      setError('Error creating family');
    }
  };

  const joinFamily = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/join-by-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          joinCode: joinCode.toUpperCase().trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`Successfully joined ${data.familyName}!`);
        setShowJoinModal(false);
        setJoinCode('');
        fetchFamilies();
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to join family');
      }
    } catch (err) {
      setError('Error joining family');
    }
  };

  const showJoinCodeModal = async (family) => {
    try {
      setSelectedFamily(family);
      setCodeLoading(true);
      setFamilyJoinCode('');
      setShowCodeModal(true);
      
      // Fetch the join code from the API
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/${family._id}/join-code`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFamilyJoinCode(data.joinCode);
        setCodeLoading(false);
      } else {
        const errorData = await response.json();
        console.error('Failed to load family code:', response.status, errorData);
        setError(errorData.message || 'Failed to load family code');
        setShowCodeModal(false);
        setCodeLoading(false);
      }
    } catch (err) {
      console.error('❌ Error loading family code:', err);
      setError('Error loading family code: ' + err.message);
      setShowCodeModal(false);
      setCodeLoading(false);
    }
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(familyJoinCode);
    setSuccessMessage('Family code copied to clipboard!');
  };

  const switchFamily = async (familyId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/switch/${familyId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setCurrentFamilyId(familyId);
        setSuccessMessage('Switched to selected family');
        // Reload to update shared pantry
        window.location.reload();
      }
    } catch (err) {
      setError('Error switching family');
    }
  };

  const leaveFamily = async (familyId) => {
    if (!confirm('Are you sure you want to leave this family?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/${familyId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccessMessage('Left family successfully');
        fetchFamilies();
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to leave family');
      }
    } catch (err) {
      setError('Error leaving family');
    }
  };

  const removeMember = async (familyId, memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/${familyId}/remove-member/${memberId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccessMessage('Member removed successfully');
        fetchFamilies();
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to remove member');
      }
    } catch (err) {
      setError('Error removing member');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown size={16} className="role-icon owner" />;
      case 'admin': return <Shield size={16} className="role-icon admin" />;
      default: return <Users size={16} className="role-icon member" />;
    }
  };

  const getRoleLabel = (role) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (loading) {
    return (
      <div className="family-page">
        <div className="loading-container">
          <Loader2 className="spinner" size={40} />
          <p>Loading families...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="family-page">
      <div className="family-container">
        <div className="family-header">
          <div className="header-title">
            <Users size={32} />
            <h1>Family Sharing</h1>
          </div>
          <p className="header-subtitle">
            Share pantry items with family members and collaborate on kitchen management
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="alert-close">&times;</button>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success">
            <Check size={20} />
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage('')} className="alert-close">&times;</button>
          </div>
        )}

        {/* My Families */}
        <div className="families-section">
          <div className="section-header">
            <h2>My Families</h2>
            <div className="header-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={18} /> Create Family
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowJoinModal(true)}
              >
                <UserPlus size={18} /> Join with Code
              </button>
            </div>
          </div>

          {families.length === 0 ? (
            <div className="empty-state">
              <Home size={64} />
              <h3>No Families Yet</h3>
              <p>Create a family or join an existing one using a family code.</p>
              <div className="empty-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={18} /> Create Family
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowJoinModal(true)}
                >
                  <UserPlus size={18} /> Join Family
                </button>
              </div>
            </div>
          ) : (
            <div className="families-grid">
              {families.map((family) => {
                const isCurrent = currentFamilyId === family._id;
                const myRole = family.members.find(m => String(m.userId._id) === String(user._id))?.role;
                const isAdmin = myRole === 'owner' || myRole === 'admin';

                return (
                  <div key={family._id} className={`family-card ${isCurrent ? 'active' : ''}`}>
                    <div className="family-card-header">
                      <div className="family-info">
                        <h3>{family.name}</h3>
                        {family.description && <p>{family.description}</p>}
                        <div className="family-meta">
                          <span className="member-count">
                            <Users size={14} /> {family.members.length} members
                          </span>
                          {isCurrent && <span className="current-badge">Current</span>}
                          <span className="my-role">
                            {getRoleIcon(myRole)} {getRoleLabel(myRole)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="family-members">
                      <h4>Members</h4>
                      <div className="members-list">
                        {family.members.map((member) => (
                          <div key={member.userId._id} className="member-item">
                            <div className="member-avatar">
                              {member.userId.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="member-info">
                              <span className="member-name">{member.userId.name}</span>
                              <span className="member-role">
                                {getRoleIcon(member.role)} {getRoleLabel(member.role)}
                              </span>
                            </div>
                            {isAdmin && member.userId._id !== user._id && (
                              <button
                                className="btn-icon delete"
                                onClick={() => removeMember(family._id, member.userId._id)}
                                title="Remove member"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="family-actions">
                      {!isCurrent && (
                        <button
                          className="btn btn-primary"
                          onClick={() => switchFamily(family._id)}
                        >
                          <Home size={16} /> Switch to Family
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn btn-outline"
                          onClick={() => showJoinCodeModal(family)}
                          title="Share family code with others"
                        >
                          <Share2 size={16} /> Share Code
                        </button>
                      )}
                      {myRole !== 'owner' && (
                        <button
                          className="btn btn-icon danger"
                          onClick={() => leaveFamily(family._id)}
                          title="Leave family"
                        >
                          <LogOut size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Family Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Family</h2>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={createFamily}>
                <div className="form-group">
                  <label>Family Name *</label>
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="e.g., The Smith Household"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={newFamilyDescription}
                    onChange={(e) => setNewFamilyDescription(e.target.value)}
                    placeholder="Brief description of your family..."
                    rows={3}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Family
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join Family by Code Modal */}
        {showJoinModal && (
          <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Join a Family</h2>
                <button className="modal-close" onClick={() => setShowJoinModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={joinFamily}>
                <div className="form-group">
                  <label>Enter Family Code *</label>
                  <p className="help-text">Ask the family owner to share their 8-character code with you</p>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC12345"
                    maxLength="8"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowJoinModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <Loader2 size={16} className="spinner" /> : <UserPlus size={16} />}
                    Join Family
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Share Family Code Modal */}
        {showCodeModal && selectedFamily && (
          <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Share {selectedFamily.name} Code</h2>
                <button className="modal-close" onClick={() => setShowCodeModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p className="code-info">Share this code with family members so they can join your family.</p>
                {codeLoading ? (
                  <div className="code-loading">
                    <Loader2 className="spinner" size={32} />
                    <p>Loading code...</p>
                  </div>
                ) : familyJoinCode ? (
                  <div className="code-display">
                    <div className="code-box">
                      <span className="code-text">{familyJoinCode}</span>
                      <button 
                        type="button"
                        className="btn-copy"
                        onClick={() => copyJoinCode()}
                        title="Copy code to clipboard"
                      >
                        <Copy size={16} />
                        Copy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="code-error">
                    <AlertCircle size={24} />
                    <p>Unable to load family code</p>
                  </div>
                )}
                <p className="code-instruction">Recipients should enter this code in the "Join with Code" option.</p>
              </div>
              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowCodeModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Family;
