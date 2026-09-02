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
        private readonly ExcelExportService _excelService;
        private readonly GoogleSheetsWebhookService _sheetsService;

        public AnalyticsController(AppDbContext db, ExcelExportService excelService, GoogleSheetsWebhookService sheetsService)
        {
            _db = db;
            _excelService = excelService;
            _sheetsService = sheetsService;
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

            // Record site visit traffic in traffic.xlsx (10-minute interval buckets)
            if (req.EventType.Equals("SITE_VISIT", StringComparison.OrdinalIgnoreCase))
            {
                await _excelService.RecordTrafficVisitAsync();

                // Compute current 10-minute interval string for Google Sheets Webhook
                var now = DateTime.Now;
                int minuteBucket = (now.Minute / 10) * 10;
                var startTime = new DateTime(now.Year, now.Month, now.Day, now.Hour, minuteBucket, 0);
                var endTime = startTime.AddMinutes(10);
                string intervalStr = $"{startTime:HH:mm}-{endTime:HH:mm}";

                await _sheetsService.SendTrafficVisitAsync(intervalStr, 1);
            }

            return Ok(new { success = true });
        }
    }
}
