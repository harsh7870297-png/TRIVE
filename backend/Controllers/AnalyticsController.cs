using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using TriveApi.Data;
using TriveApi.Models;
using TriveApi.Services;

namespace TriveApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AnalyticsController(AppDbContext db)
        {
            _db = db;
        }

        public class AnalyticsEventRequest
        {
            public string EventType { get; set; } = string.Empty;
            public string UsernameOrSession { get; set; } = string.Empty;
        }

        [HttpPost("event")]
        public async Task<IActionResult> LogEvent([FromBody] AnalyticsEventRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.EventType)) return BadRequest();

            _db.AnalyticsEvents.Add(new AnalyticsEvent
            {
                EventType = req.EventType,
                UsernameOrSession = req.UsernameOrSession ?? "anonymous",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var siteVisits = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(_db.AnalyticsEvents, e => e.EventType == "SITE_VISIT");
                var startedCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(_db.UserInterviews);
                var finishedCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(_db.UserInterviews, u => u.InterviewStatus.ToLower() == "completed");

                var incompleteInterviews = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
                    System.Linq.Queryable.Select(
                        System.Linq.Queryable.Where(_db.UserInterviews, u => u.InterviewStatus.ToLower() != "completed" && u.ExitTimeSeconds > 0),
                        u => u.ExitTimeSeconds
                    )
                );

                double avgQuitSeconds = incompleteInterviews.Count > 0 ? System.Linq.Enumerable.Average(incompleteInterviews) : 0;

                var surveys = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(_db.Surveys);
                int totalSurveys = surveys.Count;
                int wouldUseAgainCount = System.Linq.Enumerable.Count(surveys, s => s.WouldUseAgain);
                int wouldReferCount = System.Linq.Enumerable.Count(surveys, s => s.WouldRefer);

                var willingSurveys = System.Linq.Enumerable.ToList(System.Linq.Enumerable.Where(surveys, s => s.WillingToPay && !string.IsNullOrEmpty(s.PriceRange)));
                double avgPrice = 0;
                if (willingSurveys.Count > 0)
                {
                    double sum = 0;
                    foreach (var s in willingSurveys)
                    {
                        if (s.PriceRange != null && s.PriceRange.Contains("0–50")) sum += 25;
                        else if (s.PriceRange != null && s.PriceRange.Contains("50–100")) sum += 75;
                        else if (s.PriceRange != null && s.PriceRange.Contains("100–150")) sum += 125;
                        else if (s.PriceRange != null && s.PriceRange.Contains("150+")) sum += 175;
                        else sum += 50;
                    }
                    avgPrice = sum / willingSurveys.Count;
                }

                return Ok(new
                {
                    siteVisits,
                    startedCount,
                    finishedCount,
                    avgQuitSeconds = Math.Round(avgQuitSeconds),
                    totalSurveys,
                    wouldUseAgainCount,
                    wouldReferCount,
                    avgPrice = Math.Round(avgPrice)
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    siteVisits = 0,
                    startedCount = 0,
                    finishedCount = 0,
                    avgQuitSeconds = 0,
                    totalSurveys = 0,
                    wouldUseAgainCount = 0,
                    wouldReferCount = 0,
                    avgPrice = 0
                });
            }
        }
    }
}
