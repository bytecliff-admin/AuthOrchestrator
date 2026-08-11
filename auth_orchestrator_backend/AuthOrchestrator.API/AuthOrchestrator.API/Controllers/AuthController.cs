using AuthOrchestrator.API.Data;
using AuthOrchestrator.API.Models;
using AuthOrchestrator.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AuthOrchestrator.API.Controllers
{
    public record RefreshRequest(string AccessToken, string RefreshToken);
    public record TokenResponse(string AccessToken, string RefreshToken, int ExpiresIn);
    public record LoginRequest(string Email, string Password);

    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ITokenService _tokenService;
        private readonly AppDbContext _db;
        // Inject your real user/identity service here instead of the stub below.

        public AuthController(ITokenService tokenService, AppDbContext db)
        {
            _tokenService = tokenService;
            _db = db;
        }

        [HttpPost("login")]
        public async Task<ActionResult<TokenResponse>> Login([FromBody] LoginRequest request)
        {
            // TODO: replace with real credential validation (Identity, custom store, etc.)
            var userId = await ValidateCredentialsAsync(request.Email, request.Password);
            if (userId is null)
                return Unauthorized(new { message = "Invalid credentials." });

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Email, request.Email),
                // add role/permission claims as needed
            };

            var accessToken = _tokenService.GenerateAccessToken(claims);
            var refreshValue = _tokenService.GenerateRefreshTokenValue();

            _db.RefreshTokens.Add(new RefreshToken
            {
                Token = refreshValue,
                UserId = userId,
                SessionId = Guid.NewGuid().ToString(),
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                DeviceInfo = Request.Headers.UserAgent.ToString()
            });
            await _db.SaveChangesAsync();

            return Ok(new TokenResponse(accessToken, refreshValue, 15 * 60));
        }

        [HttpPost("refresh-token")]
        public async Task<ActionResult<TokenResponse>> RefreshToken([FromBody] RefreshRequest request)
        {
            try
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var device = Request.Headers.UserAgent.ToString();

                var pair = await _tokenService.RefreshTokensAsync(request.AccessToken, request.RefreshToken, ip, device);
                return Ok(new TokenResponse(pair.AccessToken, pair.RefreshToken, pair.ExpiresInSeconds));
            }
            catch (InvalidRefreshTokenException ex)
            {
                // Client should treat any 401 here as "force logout".
                return Unauthorized(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
        {
            await _tokenService.RevokeRefreshTokenAsync(request.RefreshToken);
            return NoContent();
        }

        [Authorize]
        [HttpPost("logout-all")]
        public async Task<IActionResult> LogoutAll()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            await _tokenService.RevokeAllForUserAsync(userId);
            return NoContent();
        }

        private Task<string?> ValidateCredentialsAsync(string email, string password)
        {
            // Stub - wire up to your real user store / ASP.NET Identity.
            return Task.FromResult<string?>("stub-user-id");
        }
    }
}
