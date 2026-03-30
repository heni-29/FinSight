import { useQuery } from '@tanstack/react-query'
import { getProfile } from '../api/users'

export default function Profile() {
  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    select: (res) => res.data,
  })

  return (
    <div className="page">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Your account information</p>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>Loading profile...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
            }}
          >
            ⚠ Failed to load profile: {error.message}
          </div>
        )}

        {profileData && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Profile Card */}
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-card)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: '#fff',
                    fontWeight: 'bold',
                  }}
                >
                  U
                </div>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <p style={{ fontSize: '16px', fontWeight: '500' }}>{profileData.email}</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    User ID
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      color: 'var(--color-text-muted)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {profileData.id}
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    Account Created
                  </label>
                  <p style={{ fontSize: '16px' }}>
                    {new Date(profileData.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-card)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                Account Status
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
                  <span
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    Active
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Auth Method</span>
                  <span style={{ fontSize: '14px' }}>JWT Token</span>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-card)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                Security
              </h3>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => alert('Change password feature coming soon!')}
              >
                Change Password
              </button>
            </div>

            {/* Logout Section */}
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-card)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                className="btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  backgroundColor: '#fee',
                  color: '#c00',
                  border: '1px solid #fcc',
                }}
                onClick={() => {
                  localStorage.removeItem('token')
                  window.location.href = '/login'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
