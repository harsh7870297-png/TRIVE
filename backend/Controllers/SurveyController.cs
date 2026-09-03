using System;
using System.Linq;
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
    public class SurveyController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SurveyController(AppDbContext db)
        {
            _db = db;
        }

        public class SurveySubmitRequest
        {
            public string Username { get; set; } = string.Empty;
            public bool WouldUseAgain { get; set; }
            public bool WillingToPay { get; set; }
            public string? PriceRange { get; set; }
            public bool WouldRefer { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> SubmitSurvey([FromBody] SurveySubmitRequest req)
        {
            var cleanUsername = req.Username?.Trim() ?? "anonymous";

            var record = new Survey
            {
                Username = cleanUsername,
                WouldUseAgain = req.WouldUseAgain,
                WillingToPay = req.WillingToPay,
                PriceRange = req.PriceRange,
                WouldRefer = req.WouldRefer,
                CreatedAt = DateTime.UtcNow
            };

            _db.Surveys.Add(record);
            _db.AnalyticsEvents.Add(new AnalyticsEvent
            {
                EventType = "SURVEY_COMPLETED",
                UsernameOrSession = record.Username,
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return Ok(new { success = true });
        }

        private string FormatResultSummary(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return "N/A";
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                
                string feedback = root.TryGetProperty("feedback", out var fb) ? fb.GetString() ?? "" : "";
                var metricsList = new System.Collections.Generic.List<string>();

                if (root.TryGetProperty("metrics", out var metrics) && metrics.ValueKind == JsonValueKind.Array)
                {
                    foreach (var m in metrics.EnumerateArray())
                    {
                        string label = m.TryGetProperty("label", out var l) ? l.GetString() ?? "" : "";
                        int score = m.TryGetProperty("score", out var s) ? s.GetInt32() : 0;
                        if (!string.IsNullOrEmpty(label)) metricsList.Add($"{label}: {score}");
                    }
                }

                string metricsSummary = metricsList.Count > 0 ? string.Join(", ", metricsList) : "";
                return string.IsNullOrEmpty(metricsSummary) ? feedback : $"{metricsSummary} | Feedback: {feedback}";
            }
            catch
            {
                return json;
            }
        }
    }
}
