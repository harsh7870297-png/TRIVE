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
    }
}
