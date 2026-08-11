namespace AuthOrchestrator.API.Models
{
    /// <summary>
    /// Persisted refresh token. One row per issued token so we can support
    /// rotation, revocation, per-device/session tracking, and reuse detection.
    /// </summary>
    public class RefreshToken
    {
        public int Id { get; set; }

        /// <summary>The token value returned to the client (opaque, random - not a JWT).</summary>
        public string Token { get; set; } = default!;

        /// <summary>FK to the user this token belongs to.</summary>
        public string UserId { get; set; } = default!;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAtUtc { get; set; }

        /// <summary>Set when this token has been exchanged for a new one (rotation).</summary>
        public DateTime? RevokedAtUtc { get; set; }

        /// <summary>
        /// Points to the token that replaced this one. If a caller ever presents
        /// an already-rotated token again, that's a reuse/theft signal - revoke
        /// the whole chain.
        /// </summary>
        public string? ReplacedByToken { get; set; }

        /// <summary>Optional metadata for per-device / per-session tracking.</summary>
        public string? DeviceInfo { get; set; }
        public string? IpAddress { get; set; }

        /// <summary>Lets a client/session be identified independently of the token value.</summary>
        public string SessionId { get; set; } = default!;

        public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;
        public bool IsRevoked => RevokedAtUtc != null;
        public bool IsActive => !IsRevoked && !IsExpired;
    }
}
