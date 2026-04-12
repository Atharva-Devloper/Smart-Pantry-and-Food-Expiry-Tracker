import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Plus, UserPlus, Settings, Trash2, LogOut, 
  Check, X, ChevronDown, Home, Mail, Crown, Shield,
  AlertCircle, Loader2
} from 'lucide-react';
import API_BASE_URL from '../config';
import '../styles/Family.css';

const Family = () => {
  const { user } = useAuth();
  const [families, setFamilies] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [currentFamilyId, setCurrentFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  
  // Form states
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyDescription, setNewFamilyDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

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
        setPendingInvitations(data.pendingInvitations);
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
        const data = await response.json();
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

  const inviteMember = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/${selectedFamily._id}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (response.ok) {
        setSuccessMessage('Invitation sent successfully!');
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('member');
        fetchFamilies();
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to send invitation');
      }
    } catch (err) {
      setError('Error sending invitation');
    }
  };

  const acceptInvitation = async (token) => {
    try {
      const authToken = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/family/accept-invitation/${token}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        setSuccessMessage('Invitation accepted! Welcome to the family.');
        fetchFamilies();
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Error accepting invitation');
    }
  };

  const rejectInvitation = async (token) => {
    try {
      const authToken = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/family/reject-invitation/${token}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      fetchFamilies();
    } catch (err) {
      console.error('Error rejecting invitation:', err);
    }
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

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="invitations-section">
            <h2>Pending Invitations</h2>
            <div className="invitations-list">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.invitationId} className="invitation-card">
                  <div className="invitation-info">
                    <h3>{invitation.familyName}</h3>
                    <p>Role: {getRoleLabel(invitation.role)}</p>
                    <p className="expires">
                      Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="invitation-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => acceptInvitation(invitation.token)}
                    >
                      <Check size={18} /> Accept
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => rejectInvitation(invitation.token)}
                    >
                      <X size={18} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Families */}
        <div className="families-section">
          <div className="section-header">
            <h2>My Families</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} /> Create Family
            </button>
          </div>

          {families.length === 0 ? (
            <div className="empty-state">
              <Home size={64} />
              <h3>No Families Yet</h3>
              <p>Create a family to start sharing pantry items with your household members.</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={18} /> Create Your First Family
              </button>
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
                          onClick={() => {
                            setSelectedFamily(family);
                            setShowInviteModal(true);
                          }}
                        >
                          <UserPlus size={16} /> Invite
                        </button>
                      )}
                      {myRole === 'owner' && (
                        <button
                          className="btn btn-icon"
                          onClick={() => {
                            setSelectedFamily(family);
                            setShowSettingsModal(true);
                          }}
                          title="Settings"
                        >
                          <Settings size={16} />
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

        {/* Invite Member Modal */}
        {showInviteModal && selectedFamily && (
          <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Invite to {selectedFamily.name}</h2>
                <button className="modal-close" onClick={() => setShowInviteModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={inviteMember}>
                <div className="form-group">
                  <label>Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={18} />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="family.member@email.com"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="member">Member - Can view and edit shared items</option>
                    <option value="admin">Admin - Can manage members and settings</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Mail size={16} /> Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Family;
