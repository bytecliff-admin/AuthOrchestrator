namespace AuthOrchestrator.API.Models
{
    /// <summary>Bound from configuration section "Jwt" in appsettings.json.</summary>
    public class JwtSettings
    {
        public string Issuer { get; set; } = default!;
        public string Audience { get; set; } = default!;

        /// <summary>Signing secret. In production, pull this from a secrets manager, not appsettings.json.</summary>
        public string Secret { get; set; } = default!;

        public int AccessTokenExpiryMinutes { get; set; } = 15;
        public int RefreshTokenExpiryDays { get; set; } = 7;
    }
}
