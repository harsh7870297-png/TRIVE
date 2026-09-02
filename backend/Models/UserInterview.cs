using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace TriveApi.Models
{
    public class UserInterview
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string JobRole { get; set; } = string.Empty;
        public string JobDescription { get; set; } = string.Empty;
        public string Salary { get; set; } = string.Empty;
        
        // "started", "completed", "abandoned"
        public string InterviewStatus { get; set; } = "started";
        public int ExitTimeSeconds { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Individual Evaluations (JSON string serialized)
        public string? HrResultJson { get; set; }
        public string? TechnicalResultJson { get; set; }

        [Column("CriticResultJson")]
        public string? HiringManagerResultJson { get; set; }
    }
}
