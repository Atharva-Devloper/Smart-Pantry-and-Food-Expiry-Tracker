import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import '../styles/Family.css';

const AcceptInvitation = () => {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const [accepting, setAccepting] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [familyName, setFamilyName] = useState('');

  useEffect(() => {
    const acceptInvitation = async () => {
      // If user is not logged in, redirect to login with return URL
      if (!loading && !user) {
        // User will be redirected by ProtectedRoute, but we can add a message
        return;
      }

      if (!token || !user) return;

      try {
        setAccepting(true);
        const authToken = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/family/accept-invitation/${token}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSuccess(true);
          setFamilyName(data.familyName || 'the family');
          // Redirect after 3 seconds
          setTimeout(() => {
            window.location.href = '/family';
          }, 3000);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to accept invitation');
        }
      } catch (err) {
        setError('Error accepting invitation: ' + err.message);
      } finally {
        setAccepting(false);
      }
    };

    if (!loading) {
      acceptInvitation();
    }
  }, [token, user, loading]);

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="accept-invitation-container">
      <div className="invitation-card">
        {accepting ? (
          <>
            <div className="loading-spinner"></div>
            <h2>Accepting invitation...</h2>
            <p>Please wait while we process your invitation.</p>
          </>
        ) : success ? (
          <>
            <div className="success-icon">✓</div>
            <h2>Invitation Accepted!</h2>
            <p>Welcome to {familyName}!</p>
            <p className="redirect-message">You will be redirected to the family page in a moment...</p>
          </>
        ) : (
          <>
            <div className="error-icon">✗</div>
            <h2>Unable to Accept Invitation</h2>
            <p className="error-message">{error}</p>
            <a href="/family" className="btn-back">Back to Family</a>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
