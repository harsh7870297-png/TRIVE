using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TriveApi.Data;
using TriveApi.Models;
using TriveApi.Services;

namespace TriveApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InterviewController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly GeminiService _geminiService;
        private readonly HttpClient _httpClient;

        public InterviewController(AppDbContext db, GeminiService geminiService, HttpClient httpClient)
        {
            _db = db;
            _geminiService = geminiService;
            _httpClient = httpClient;
        }

        private string GetApiKeyFromHeader()
        {
            if (Request.Headers.TryGetValue("X-Gemini-API-Key", out var headerVal))
            {
                return headerVal.ToString();
            }
            return string.Empty;
        }

        private string GetSelectedModelFromHeader()
        {
            if (Request.Headers.TryGetValue("X-Gemini-Model", out var headerVal))
            {
                return headerVal.ToString();
            }
            return "gemini-3.7-flash";
        }

        [HttpGet("models")]
        public async Task<IActionResult> GetModels()
        {
            var apiKey = GetApiKeyFromHeader();
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return BadRequest(new { message = "API key is required." });
            }

            try
            {
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey.Trim()}";
                var response = await _httpClient.GetAsync(endpoint);

                if (response.IsSuccessStatusCode)
                {
                    var jsonStr = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(jsonStr);
                    var modelList = new List<object>();

                    if (doc.RootElement.TryGetProperty("models", out var modelsArr))
                    {
                        foreach (var m in modelsArr.EnumerateArray())
                        {
                            var name = m.GetProperty("name").GetString() ?? "";
                            var cleanName = name.StartsWith("models/") ? name.Substring(7) : name;
                            var displayName = m.TryGetProperty("displayName", out var dn) ? dn.GetString() : cleanName;

                            if (cleanName.StartsWith("gemini-") && (cleanName.Contains("flash") || cleanName.Contains("pro")))
                            {
                                modelList.Add(new
                                {
                                    id = cleanName,
                                    name = cleanName,
                                    displayName = $"{displayName} ({cleanName})"
                                });
                            }
                        }
                    }

                    return Ok(new { models = modelList });
                }

                return BadRequest(new { message = "Failed to fetch models list from Google API." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("verify-key")]
        public async Task<IActionResult> VerifyKey()
        {
            var apiKey = GetApiKeyFromHeader();
            var model = GetSelectedModelFromHeader();

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return BadRequest(new { message = "Gemini API key is required." });
            }

            var (isValid, errorDetails) = await _geminiService.VerifyKeyDetailsAsync(apiKey, model);
            if (!isValid)
            {
                return BadRequest(new { message = string.IsNullOrEmpty(errorDetails) 
                    ? "We couldn't reach the AI interviewer. Please check your API key or connection." 
                    : errorDetails });
            }

            return Ok(new { valid = true });
        }

        public class StartInterviewRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Company { get; set; } = string.Empty;
            public string JobRole { get; set; } = string.Empty;
            public string JobDescription { get; set; } = string.Empty;
            public string Salary { get; set; } = string.Empty;
            public int Difficulty { get; set; } = 3;
            public string Model { get; set; } = "gemini-3.7-flash";
        }

        [HttpPost("start")]
        public async Task<IActionResult> StartInterview([FromBody] StartInterviewRequest req)
        {
            var apiKey = GetApiKeyFromHeader();
            var model = string.IsNullOrWhiteSpace(req.Model) ? GetSelectedModelFromHeader() : req.Model;

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return BadRequest(new { message = "Gemini API key is required." });
            }

            if (string.IsNullOrWhiteSpace(req.Username))
            {
                return BadRequest(new { message = "Username is required." });
            }

            var sessionUsername = req.Username.Trim();
            var exists = await _db.UserInterviews.AnyAsync(u => u.Username.ToLower() == sessionUsername.ToLower());
            if (exists)
            {
                sessionUsername = $"{sessionUsername}_{Random.Shared.Next(1000, 9999)}";
            }

            var record = new UserInterview
            {
                Username = sessionUsername,
                Company = req.Company.Trim(),
                JobRole = req.JobRole.Trim(),
                JobDescription = req.JobDescription.Trim(),
                Salary = req.Salary.Trim(),
                InterviewStatus = "started",
                CreatedAt = DateTime.UtcNow
            };

            _db.UserInterviews.Add(record);
            _db.AnalyticsEvents.Add(new AnalyticsEvent
            {
                EventType = "INTERVIEW_STARTED",
                UsernameOrSession = req.Username.Trim(),
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            var initialTurn = await _geminiService.GenerateTurnAsync(
                apiKey,
                model,
                req.Company,
                req.JobRole,
                req.JobDescription,
                req.Salary,
                req.Difficulty,
                new List<ConversationTurn>(),
                "",
                0
            );

            return Ok(new { interviewId = record.Id, turn = initialTurn });
        }

        public class TurnRequest
        {
            public int InterviewId { get; set; }
            public string Company { get; set; } = string.Empty;
            public string JobRole { get; set; } = string.Empty;
            public string JobDescription { get; set; } = string.Empty;
            public string Salary { get; set; } = string.Empty;
            public int Difficulty { get; set; } = 3;
            public string Model { get; set; } = "gemini-3.7-flash";
            public List<ConversationTurn> History { get; set; } = new List<ConversationTurn>();
            public string LatestAnswer { get; set; } = string.Empty;
            public int ElapsedSeconds { get; set; } = 0;
        }

        [HttpPost("turn")]
        public async Task<IActionResult> NextTurn([FromBody] TurnRequest req)
        {
            var apiKey = GetApiKeyFromHeader();
            var model = string.IsNullOrWhiteSpace(req.Model) ? GetSelectedModelFromHeader() : req.Model;

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return BadRequest(new { message = "Gemini API key is required." });
            }

            var turn = await _geminiService.GenerateTurnAsync(
                apiKey,
                model,
                req.Company,
                req.JobRole,
                req.JobDescription,
                req.Salary,
                req.Difficulty,
                req.History,
                req.LatestAnswer,
                req.ElapsedSeconds
            );

            return Ok(turn);
        }

        public class StopInterviewRequest
        {
            public int InterviewId { get; set; }
            public int ExitTimeSeconds { get; set; }
        }

        [HttpPost("stop")]
        public async Task<IActionResult> StopInterview([FromBody] StopInterviewRequest req)
        {
            var record = await _db.UserInterviews.FindAsync(req.InterviewId);
            if (record != null)
            {
                record.InterviewStatus = "abandoned";
                record.ExitTimeSeconds = req.ExitTimeSeconds;

                _db.AnalyticsEvents.Add(new AnalyticsEvent
                {
                    EventType = "INTERVIEW_ABANDONED",
                    UsernameOrSession = record.Username,
                    Timestamp = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();
            }

            return Ok(new { status = "abandoned" });
        }

        public class EvaluateRequest
        {
            public int InterviewId { get; set; }
            public string Company { get; set; } = string.Empty;
            public string JobRole { get; set; } = string.Empty;
            public string JobDescription { get; set; } = string.Empty;
            public string Model { get; set; } = "gemini-3.7-flash";
            public List<ConversationTurn> History { get; set; } = new List<ConversationTurn>();
            public int ElapsedSeconds { get; set; }
        }

        [HttpPost("evaluate")]
        public async Task<IActionResult> Evaluate([FromBody] EvaluateRequest req)
        {
            var apiKey = GetApiKeyFromHeader();
            var model = string.IsNullOrWhiteSpace(req.Model) ? GetSelectedModelFromHeader() : req.Model;

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return BadRequest(new { message = "Gemini API key is required." });
            }

            var evaluations = await _geminiService.GenerateEvaluationsAsync(
                apiKey,
                model,
                req.Company,
                req.JobRole,
                req.JobDescription,
                req.History
            );

            var record = await _db.UserInterviews.FindAsync(req.InterviewId);
            if (record != null)
            {
                record.InterviewStatus = "completed";
                record.ExitTimeSeconds = req.ElapsedSeconds;
                record.HrResultJson = JsonSerializer.Serialize(evaluations.Hr);
                record.TechnicalResultJson = JsonSerializer.Serialize(evaluations.Technical);
                record.HiringManagerResultJson = JsonSerializer.Serialize(evaluations.HiringManager);

                _db.AnalyticsEvents.Add(new AnalyticsEvent
                {
                    EventType = "INTERVIEW_COMPLETED",
                    UsernameOrSession = record.Username,
                    Timestamp = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();
            }

            return Ok(evaluations);
        }
    }
}
