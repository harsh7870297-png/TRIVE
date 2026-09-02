using System;

namespace TriveApi.Models
{
    public class Survey
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public bool WouldUseAgain { get; set; }
        public bool WillingToPay { get; set; }
        public string? PriceRange { get; set; }
        public bool WouldRefer { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
