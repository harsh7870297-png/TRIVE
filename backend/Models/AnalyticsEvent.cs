using System;

namespace TriveApi.Models
{
    public class AnalyticsEvent
    {
        public int Id { get; set; }
        public string EventType { get; set; } = string.Empty; // SITE_VISIT, INTERVIEW_STARTED, INTERVIEW_COMPLETED, INTERVIEW_ABANDONED, SURVEY_COMPLETED
        public string UsernameOrSession { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
