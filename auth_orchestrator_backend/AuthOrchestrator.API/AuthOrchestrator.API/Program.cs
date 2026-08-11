using AuthOrchestrator.API.Data;
using AuthOrchestrator.API.Models;
using AuthOrchestrator.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- Config ----------------------------------------------------------------
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()!;

// Add services to the container.

// --- DB ----------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- DI ----------------------------------------------------------------
builder.Services.AddScoped<ITokenService, TokenService>();

// --- CORS (adjust origin to your Angular dev/prod URL) ---------------------
builder.Services.AddCors(opts =>
{
    opts.AddPolicy("SpaClient", p => p
        .WithOrigins("https://your-angular-app.com", "http://localhost:4200")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// --- Auth ----------------------------------------------------------------
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwt.Issuer,
        ValidateAudience = true,
        ValidAudience = jwt.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
        ValidateLifetime = true,
        // Zero out default 5-min grace period so "expired" is exact - the
        // client's own pre-expiry check already gives it a buffer.
        ClockSkew = TimeSpan.Zero
    };

    // Return a clean 401 with no WWW-Authenticate noise the SPA has to parse.
    options.Events = new JwtBearerEvents
    {
        OnChallenge = context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            return context.Response.WriteAsync("{\"message\":\"Unauthorized\"}");
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("SpaClient");

app.UseAuthorization();

app.MapControllers();

app.Run();
