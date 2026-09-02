using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace TriveApi.Services
{
    public class TurnResponseDto
    {
        [JsonPropertyName("speakingInterviewer")]
        public string SpeakingInterviewer { get; set; } = "HR"; // "HR", "TECHNICAL", "HIRING_MANAGER"

        [JsonPropertyName("dialogue")]
        public string Dialogue { get; set; } = string.Empty;

        [JsonPropertyName("expressions")]
        public ExpressionsDto Expressions { get; set; } = new ExpressionsDto();

        [JsonPropertyName("isConcluded")]
        public bool IsConcluded { get; set; } = false;
    }

    public class ExpressionsDto
    {
        [JsonPropertyName("hr")]
        public string Hr { get; set; } = "satisfied";

        [JsonPropertyName("technical")]
        public string Technical { get; set; } = "thinking";

        [JsonPropertyName("hiring_manager")]
        public string HiringManager { get; set; } = "evaluating";
    }

    public class EvaluationMetric
    {
        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;

        [JsonPropertyName("score")]
        public int Score { get; set; }
    }

    public class InterviewerEvaluation
    {
        [JsonPropertyName("metrics")]
        public List<EvaluationMetric> Metrics { get; set; } = new List<EvaluationMetric>();

        [JsonPropertyName("feedback")]
        public string Feedback { get; set; } = string.Empty;
    }

    public class FinalEvaluationsDto
    {
        [JsonPropertyName("hr")]
        public InterviewerEvaluation Hr { get; set; } = new InterviewerEvaluation();

        [JsonPropertyName("technical")]
        public InterviewerEvaluation Technical { get; set; } = new InterviewerEvaluation();

        [JsonPropertyName("hiringManager")]
        public InterviewerEvaluation HiringManager { get; set; } = new InterviewerEvaluation();
    }

    public class ConversationTurn
    {
        public string Speaker { get; set; } = string.Empty; // HR, TECHNICAL, HIRING_MANAGER, CANDIDATE
        public string Text { get; set; } = string.Empty;
    }

    public class GeminiService
    {
        private readonly HttpClient _httpClient;

        public static readonly string[] FallbackModels = new[]
        {
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite"
        };

        public GeminiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<(bool isValid, string errorDetails)> VerifyKeyDetailsAsync(string apiKey, string selectedModel = "gemini-3.1-flash-lite")
        {
            if (string.IsNullOrWhiteSpace(apiKey)) 
                return (false, "Gemini API key is empty.");

            var cleanKey = apiKey.Trim();
            string lastError = "Unable to reach Gemini API.";

            var modelsToTry = new List<string>();
            if (!string.IsNullOrWhiteSpace(selectedModel)) modelsToTry.Add(selectedModel.Trim());
            foreach (var m in FallbackModels)
            {
                if (!modelsToTry.Contains(m)) modelsToTry.Add(m);
            }

            foreach (var model in modelsToTry)
            {
                try
                {
                    var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={cleanKey}";
                    var payload = new
                    {
                        contents = new[]
                        {
                            new { parts = new[] { new { text = "Respond with JSON: {\"status\": \"ok\"}" } } }
                        },
                        generationConfig = new
                        {
                            responseMimeType = "application/json"
                        }
                    };

                    var jsonStr = JsonSerializer.Serialize(payload);
                    var content = new StringContent(jsonStr, Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync(endpoint, content);

                    if (response.IsSuccessStatusCode)
                    {
                        return (true, string.Empty);
                    }

                    var responseBody = await response.Content.ReadAsStringAsync();
                    lastError = $"Google API Error ({response.StatusCode}): {responseBody}";
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                }
            }

            return (false, lastError);
        }

        public async Task<TurnResponseDto> GenerateTurnAsync(
            string apiKey,
            string selectedModel,
            string company,
            string jobRole,
            string jobDescription,
            string salary,
            int difficulty,
            List<ConversationTurn> history,
            string candidateLatestAnswer,
            int elapsedSeconds)
        {
            bool timeLimitReached = elapsedSeconds >= 270;

            var systemPrompt = $@"You are simulating a 3-person panel interview for candidate applying to:
Company: {company}
Role: {jobRole}
Job Description: {jobDescription}
Salary context: {salary}
Interview Difficulty Level: {difficulty} out of 5.

The interview panel consists of 3 distinct interviewers:
1. HR Interviewer:
   - Question Focus: Behavioral & fit assessment (Communication clarity, teamwork, motivation).
   - Expressions available:
     - ""thinking"" (🤔: Candidate gives an answer requiring interpretation)
     - ""very_pleased"" (😁: Exceptionally strong behavioral answer)
     - ""happy"" (😄: Positive engaging answer)
     - ""awkward"" (😅: Uncomfortable, nervous, or mildly questionable answer)
     - ""satisfied"" (😊: Clear credible answer meeting expectations)
     - ""disappointed"" (😭: Concerning answer, poor accountability, or total failure to answer)

2. TECHNICAL Interviewer:
   - Question Focus: Technical accuracy, depth, problem solving, architecture.
   - Expressions available:
     - ""thinking"" (🤔: Evaluating technical reasoning)
     - ""impressed"" (😎: Strong technical depth / elegant solution)
     - ""skeptical"" (🤨: Unsupported technical claim or flawed reasoning)
     - ""investigating"" (🧐: Interesting answer requiring deeper technical probing)
     - ""astonished"" (🤯: Exceptionally sophisticated technical insight)
     - ""exhausted"" (🫩: Repeatedly incorrect, extremely vague, or poorly reasoned answers)

3. HIRING_MANAGER Interviewer:
   - Question Focus: Practical role suitability, judgment, ownership, trade-offs.
   - Expressions available:
     - ""considering"" (🤔: Evaluating candidate judgment or proposed approach)
     - ""respect"" (🫡: Demonstrates strong ownership, accountability, professionalism)
     - ""impressed"" (😎: Excellent practical judgment or strong role answer)
     - ""questioning"" (🤨: Questionable decision or unrealistic approach)
     - ""evaluating"" (🧐: Ambiguous answer, assessing trust with responsibility)
     - ""unimpressed"" (😴: Generic, rehearsed, irrelevant, or overly long answers)

PANEL RULES:
- Select the MOST APPROPRIATE interviewer to speak next (""HR"", ""TECHNICAL"", or ""HIRING_MANAGER"").
- Update expressions for ALL 3 interviewers based on the candidate's latest response!

TIMING RULE:
Elapsed Time: {elapsedSeconds}s / 300s.
{(timeLimitReached ? "ALERT: Elapsed time >= 4:30 (270s). NO NEW QUESTIONS ALLOWED. Conclude interview thoughts and set isConcluded to true." : "Normal questioning allowed.")}

OUTPUT FORMAT (JSON ONLY):
{{
  ""speakingInterviewer"": ""HR"" | ""TECHNICAL"" | ""HIRING_MANAGER"",
  ""dialogue"": ""Short spoken line (1 to 3 sentences max)"",
  ""expressions"": {{
    ""hr"": ""satisfied"" | ""thinking"" | ""very_pleased"" | ""happy"" | ""awkward"" | ""disappointed"",
    ""technical"": ""thinking"" | ""impressed"" | ""skeptical"" | ""investigating"" | ""astonished"" | ""exhausted"",
    ""hiring_manager"": ""evaluating"" | ""considering"" | ""respect"" | ""impressed"" | ""questioning"" | ""unimpressed""
  }},
  ""isConcluded"": {(timeLimitReached ? "true" : "false")}
}}";

            var historyText = new StringBuilder();
            if (history != null && history.Count > 0)
            {
                historyText.AppendLine("CONVERSATION HISTORY:");
                foreach (var turn in history)
                {
                    historyText.AppendLine($"{turn.Speaker}: {turn.Text}");
                }
            }
            else
            {
                historyText.AppendLine("No prior conversation. Start of interview.");
            }

            if (!string.IsNullOrWhiteSpace(candidateLatestAnswer))
            {
                historyText.AppendLine($"CANDIDATE LATEST ANSWER: {candidateLatestAnswer}");
            }

            var promptText = $"{systemPrompt}\n\n{historyText.ToString()}";

            var turnJson = await CallGeminiJsonAsync(apiKey, selectedModel, promptText);
            try
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<TurnResponseDto>(turnJson, options);
                if (result != null)
                {
                    if (result.SpeakingInterviewer == "CRITIC" || result.SpeakingInterviewer == "MANAGER")
                        result.SpeakingInterviewer = "HIRING_MANAGER";
                    return result;
                }
            }
            catch { }

            return new TurnResponseDto
            {
                SpeakingInterviewer = "HR",
                Dialogue = "Thank you for sharing that context. Let's explore your background further.",
                IsConcluded = timeLimitReached
            };
        }

        public async Task<FinalEvaluationsDto> GenerateEvaluationsAsync(
            string apiKey,
            string selectedModel,
            string company,
            string jobRole,
            string jobDescription,
            List<ConversationTurn> fullHistory)
        {
            var systemPrompt = $@"You are evaluating a candidate after a mock interview for:
Company: {company}
Role: {jobRole}
Job Description: {jobDescription}

Each of the 3 interviewers must independently evaluate the candidate from their perspective:

1. HR ASSESSMENT:
   Metrics (0 to 100):
   - Communication Clarity
   - Behavioral Structure
   - Speaking Pace & Poise
   - Professionalism
   Feedback: Actionable feedback on behavioral structure, communication clarity, and response delivery. (2-3 sentences)

2. TECHNICAL ASSESSMENT:
   Metrics (0 to 100):
   - Technical Accuracy
   - Subject Depth
   - Problem Solving
   - Technical Decision-Making
   Feedback: Actionable feedback on technical competency, accuracy, and trade-off depth. (2-3 sentences)

3. HIRING MANAGER ASSESSMENT:
   Metrics (0 to 100):
   - Role Fit
   - Decision Making
   - Ownership
   - Situational Judgment
   Feedback: Concise manager feedback evaluating role execution, practical judgment, initiative, and real-world execution. (2-3 sentences)

HARD REQUIREMENT: DO NOT GENERATE AN OVERALL SCORE OR COMBINED RATING. ONLY GENERATE THE 3 SEPARATE ASSESSMENTS.

OUTPUT FORMAT (JSON ONLY):
{{
  ""hr"": {{
    ""metrics"": [
      {{ ""label"": ""Communication Clarity"", ""score"": 82 }},
      {{ ""label"": ""Behavioral Structure"", ""score"": 78 }},
      {{ ""label"": ""Speaking Pace & Poise"", ""score"": 85 }},
      {{ ""label"": ""Professionalism"", ""score"": 88 }}
    ],
    ""feedback"": ""...""
  }},
  ""technical"": {{
    ""metrics"": [
      {{ ""label"": ""Technical Accuracy"", ""score"": 88 }},
      {{ ""label"": ""Subject Depth"", ""score"": 79 }},
      {{ ""label"": ""Problem Solving"", ""score"": 90 }},
      {{ ""label"": ""Technical Decision-Making"", ""score"": 84 }}
    ],
    ""feedback"": ""...""
  }},
  ""hiringManager"": {{
    ""metrics"": [
      {{ ""label"": ""Role Fit"", ""score"": 84 }},
      {{ ""label"": ""Decision Making"", ""score"": 80 }},
      {{ ""label"": ""Ownership"", ""score"": 86 }},
      {{ ""label"": ""Situational Judgment"", ""score"": 82 }}
    ],
    ""feedback"": ""...""
  }}
}}";

            var historyText = new StringBuilder();
            historyText.AppendLine("FULL INTERVIEW TRANSCRIPT:");
            if (fullHistory != null)
            {
                foreach (var turn in fullHistory)
                {
                    historyText.AppendLine($"{turn.Speaker}: {turn.Text}");
                }
            }

            var promptText = $"{systemPrompt}\n\n{historyText.ToString()}";

            var evalJson = await CallGeminiJsonAsync(apiKey, selectedModel, promptText);
            try
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<FinalEvaluationsDto>(evalJson, options);
                if (result != null) return result;
            }
            catch { }

            return GetFallbackEvaluations();
        }

        private async Task<string> CallGeminiJsonAsync(string apiKey, string selectedModel, string promptText)
        {
            var cleanKey = apiKey.Trim();
            
            var modelsToTry = new List<string>();
            if (!string.IsNullOrWhiteSpace(selectedModel)) modelsToTry.Add(selectedModel.Trim());
            foreach (var m in FallbackModels)
            {
                if (!modelsToTry.Contains(m)) modelsToTry.Add(m);
            }

            foreach (var modelToUse in modelsToTry)
            {
                try
                {
                    var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{modelToUse}:generateContent?key={cleanKey}";
                    var payload = new
                    {
                        contents = new[]
                        {
                            new { parts = new[] { new { text = promptText } } }
                        },
                        generationConfig = new
                        {
                            responseMimeType = "application/json"
                        }
                    };

                    var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync(endpoint, jsonContent);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseString = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(responseString);
                        var candidates = doc.RootElement.GetProperty("candidates");
                        if (candidates.GetArrayLength() > 0)
                        {
                            var parts = candidates[0].GetProperty("content").GetProperty("parts");
                            if (parts.GetArrayLength() > 0)
                            {
                                return parts[0].GetProperty("text").GetString() ?? "{}";
                            }
                        }
                    }
                }
                catch { }
            }

            return "{}";
        }

        private FinalEvaluationsDto GetFallbackEvaluations()
        {
            return new FinalEvaluationsDto
            {
                Hr = new InterviewerEvaluation
                {
                    Metrics = new List<EvaluationMetric>
                    {
                        new EvaluationMetric { Label = "Communication Clarity", Score = 82 },
                        new EvaluationMetric { Label = "Behavioral Structure", Score = 78 },
                        new EvaluationMetric { Label = "Speaking Pace & Poise", Score = 85 },
                        new EvaluationMetric { Label = "Professionalism", Score = 88 }
                    },
                    Feedback = "Your answers showed strong professional poise and clear delivery, but your behavioral responses lacked specific details regarding your individual contributions."
                },
                Technical = new InterviewerEvaluation
                {
                    Metrics = new List<EvaluationMetric>
                    {
                        new EvaluationMetric { Label = "Technical Accuracy", Score = 85 },
                        new EvaluationMetric { Label = "Subject Depth", Score = 78 },
                        new EvaluationMetric { Label = "Problem Solving", Score = 88 },
                        new EvaluationMetric { Label = "Technical Decision-Making", Score = 80 }
                    },
                    Feedback = "You demonstrated a solid overall technical foundation, though some architectural choices lacked deep trade-off justification."
                },
                HiringManager = new InterviewerEvaluation
                {
                    Metrics = new List<EvaluationMetric>
                    {
                        new EvaluationMetric { Label = "Role Fit", Score = 84 },
                        new EvaluationMetric { Label = "Decision Making", Score = 80 },
                        new EvaluationMetric { Label = "Ownership", Score = 86 },
                        new EvaluationMetric { Label = "Situational Judgment", Score = 82 }
                    },
                    Feedback = "Demonstrated strong ownership and practical decision-making when discussing ambiguous situations. Responses were structured and realistic for the role."
                }
            };
        }
    }
}
