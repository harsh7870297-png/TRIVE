using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace TriveApi.Services
{
    public class GoogleSheetsWebhookService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public GoogleSheetsWebhookService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
        }

        private string GetWebhookUrl(string configKey, string envVarName1, string envVarName2)
        {
            // 1. Check IConfiguration (appsettings.json or hosting env)
            string url = _config[configKey] ?? string.Empty;
            
            // 2. Fallback to direct Environment Variables
            if (string.IsNullOrWhiteSpace(url))
            {
                url = Environment.GetEnvironmentVariable(envVarName1) ?? string.Empty;
            }
            if (string.IsNullOrWhiteSpace(url))
            {
                url = Environment.GetEnvironmentVariable(envVarName2) ?? string.Empty;
            }

            return url.Trim();
        }

        public async Task SendTrafficVisitAsync(string intervalStr, int visitorCount)
        {
            var webhookUrl = GetWebhookUrl("GoogleSheets:TrafficWebhookUrl", "GoogleSheets__TrafficWebhookUrl", "TrafficWebhookUrl");
            if (string.IsNullOrWhiteSpace(webhookUrl)) return;

            try
            {
                var payload = new
                {
                    time = intervalStr,
                    visitors = visitorCount
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync(webhookUrl, content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GoogleSheetsWebhookService] Traffic Webhook Error: {ex.Message}");
            }
        }

        public async Task SendUserDataAsync(
            string username,
            string company,
            string jobRole,
            string salary,
            string hrResults,
            string techResults,
            string hmResults,
            DateTime startTime,
            DateTime endTime,
            bool isCompleted,
            bool wouldUseAgain,
            string willingToPayAndPrice,
            bool wouldRefer)
        {
            var webhookUrl = GetWebhookUrl("GoogleSheets:DataWebhookUrl", "GoogleSheets__DataWebhookUrl", "DataWebhookUrl");
            if (string.IsNullOrWhiteSpace(webhookUrl)) return;

            try
            {
                var payload = new
                {
                    username = username,
                    company = company,
                    jobRole = jobRole,
                    salary = salary,
                    hrResults = hrResults,
                    techResults = techResults,
                    hmResults = hmResults,
                    startTime = startTime.ToString("yyyy-MM-dd HH:mm:ss"),
                    endTime = endTime.ToString("yyyy-MM-dd HH:mm:ss"),
                    completedFully = isCompleted ? "Yes" : "No",
                    surveyQ1 = wouldUseAgain ? "Yes" : "No",
                    surveyQ2 = willingToPayAndPrice,
                    surveyQ3 = wouldRefer ? "Yes" : "No"
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync(webhookUrl, content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GoogleSheetsWebhookService] UserData Webhook Error: {ex.Message}");
            }
        }
    }
}
