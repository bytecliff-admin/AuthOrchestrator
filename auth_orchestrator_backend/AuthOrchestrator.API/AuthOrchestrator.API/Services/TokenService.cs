using AuthOrchestrator.API.Data;
using AuthOrchestrator.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AuthOrchestrator.API.Services
{
    public class InvalidRefreshTokenException : Exception
    {
        public InvalidRefreshTokenException(string message) : base(message) { }
    }

    public class TokenService : ITokenService
    {
        private readonly JwtSettings _settings;
        private readonly AppDbContext _db;

        public TokenService(IOptions<JwtSettings> settings, AppDbContext db)
        {
            _settings = settings.Value;
            _db = db;
        }

        public string GenerateAccessToken(IEnumerable<Claim> claims)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpiryMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshTokenValue()
        {
            var bytes = RandomNumberGenerator.GetBytes(64);
            return Convert.ToBase64String(bytes);
        }

        public ClaimsPrincipal? GetPrincipalFromExpiredToken(string accessToken)
        {
            var validation = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _settings.Issuer,
                ValidateAudience = true,
                ValidAudience = _settings.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret)),
                // Key setting: do NOT reject an expired token here. We only
                // need to read who it belonged to, not enforce its lifetime.
                ValidateLifetime = false
            };

            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(accessToken, validation, out var securityToken);

            if (securityToken is not JwtSecurityToken jwt ||
                !jwt.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                return null;
            }

            return principal;
        }

        public async Task<TokenPair> RefreshTokensAsync(string expiredAccessToken, string refreshToken, string? ipAddress, string? deviceInfo)
        {
            var principal = GetPrincipalFromExpiredToken(expiredAccessToken)
                ?? throw new InvalidRefreshTokenException("Invalid access token.");

            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new InvalidRefreshTokenException("Access token missing subject claim.");

            var stored = await _db.RefreshTokens
                .FirstOrDefaultAsync(t => t.Token == refreshToken && t.UserId == userId);

            if (stored is null)
                throw new InvalidRefreshTokenException("Refresh token not recognized.");

            // --- Reuse / theft detection -----------------------------------------
            // If a token that was already rotated (revoked + replaced) gets
            // presented again, someone is replaying an old token. Treat this
            // as a compromise signal and revoke the entire chain for the user.
            if (stored.IsRevoked)
            {
                await RevokeAllForUserAsync(userId);
                throw new InvalidRefreshTokenException("Refresh token reuse detected. All sessions revoked.");
            }

            if (stored.IsExpired)
                throw new InvalidRefreshTokenException("Refresh token expired.");

            // TODO: also check user.IsActive / user.IsLockedOut here against your user store.

            // --- Rotate --------------------------------------------------------
            var newRefreshValue = GenerateRefreshTokenValue();

            stored.RevokedAtUtc = DateTime.UtcNow;
            stored.ReplacedByToken = newRefreshValue;

            var newRefreshEntity = new RefreshToken
            {
                Token = newRefreshValue,
                UserId = userId,
                SessionId = stored.SessionId, // same logical session, new token
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(_settings.RefreshTokenExpiryDays),
                IpAddress = ipAddress,
                DeviceInfo = deviceInfo
            };

            _db.RefreshTokens.Add(newRefreshEntity);
            await _db.SaveChangesAsync();

            var newAccessToken = GenerateAccessToken(principal.Claims);

            return new TokenPair(newAccessToken, newRefreshValue, _settings.AccessTokenExpiryMinutes * 60);
        }

        public async Task RevokeRefreshTokenAsync(string refreshToken)
        {
            var stored = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken);
            if (stored is null || stored.IsRevoked) return;

            stored.RevokedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public async Task RevokeAllForUserAsync(string userId)
        {
            var active = await _db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
                .ToListAsync();

            foreach (var t in active)
                t.RevokedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }
    }
}
