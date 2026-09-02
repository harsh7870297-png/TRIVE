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
        private readonly ExcelExportService _excelService;
        private readonly GoogleSheetsWebhookService _sheetsService;

        public SurveyController(AppDbContext db, ExcelExportService excelService, GoogleSheetsWebhookService sheetsService)
        {
            _db = db;
            _excelService = excelService;
            _sheetsService = sheetsService;
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

            // Fetch candidate interview session details for data.xlsx & Google Sheets
            var interview = await _db.UserInterviews
                .Where(u => u.Username.ToLower() == cleanUsername.ToLower())
                .OrderByDescending(u => u.CreatedAt)
                .FirstOrDefaultAsync();

            string company = interview?.Company ?? "N/A";
            string jobRole = interview?.JobRole ?? "N/A";
            string salary = string.IsNullOrWhiteSpace(interview?.Salary) ? "N/A" : interview.Salary;
            
            string hrResults = FormatResultSummary(interview?.HrResultJson);
            string techResults = FormatResultSummary(interview?.TechnicalResultJson);
            string hmResults = FormatResultSummary(interview?.HiringManagerResultJson);

            DateTime startTime = interview?.CreatedAt ?? DateTime.Now;
            int exitSecs = interview?.ExitTimeSeconds ?? 0;
            DateTime endTime = startTime.AddSeconds(exitSecs);

            bool isCompleted = (interview?.InterviewStatus?.ToLower() == "completed");
            string willingToPayPrice = req.WillingToPay 
                ? $"Yes ({req.PriceRange ?? "Tier Not Selected"})" 
                : "No";

            // 1. Record local master 13-column record into data.xlsx
            await _excelService.RecordUserDataAsync(
                cleanUsername,
                company,
                jobRole,
                salary,
                hrResults,
                techResults,
                hmResults,
                startTime,
                endTime,
                isCompleted,
                req.WouldUseAgain,
                willingToPayPrice,
                req.WouldRefer
            );

            // 2. Post real-time 13-column record to Google Sheets Webhook link
            await _sheetsService.SendUserDataAsync(
                cleanUsername,
                company,
                jobRole,
                salary,
                hrResults,
                techResults,
                hmResults,
                startTime,
                endTime,
                isCompleted,
                req.WouldUseAgain,
                willingToPayPrice,
                req.WouldRefer
            );

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
