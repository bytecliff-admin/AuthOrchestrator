using System.Security.Claims;

namespace AuthOrchestrator.API.Services
{
    public record TokenPair(string AccessToken, string RefreshToken, int ExpiresInSeconds);

    public interface ITokenService
    {
        /// <summary>Creates a signed short-lived JWT access token for the given user.</summary>
        string GenerateAccessToken(IEnumerable<Claim> claims);

        /// <summary>Creates a cryptographically random opaque refresh token string.</summary>
        string GenerateRefreshTokenValue();

        /// <summary>
        /// Extracts claims from an access token WITHOUT validating its lifetime.
        /// Used to identify the user during the refresh flow even though the
        /// access token has already expired.
        /// </summary>
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string accessToken);

        /// <summary>
        /// Full refresh flow: validates the refresh token, detects reuse,
        /// rotates it, and issues a new access + refresh token pair.
        /// Throws SecurityTokenException-derived exceptions on failure.
        /// </summary>
        Task<TokenPair> RefreshTokensAsync(string expiredAccessToken, string refreshToken, string? ipAddress, string? deviceInfo);

        Task RevokeRefreshTokenAsync(string refreshToken);
        Task RevokeAllForUserAsync(string userId);
    }
}
