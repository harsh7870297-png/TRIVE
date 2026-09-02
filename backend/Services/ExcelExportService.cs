using System;
using System.IO;
using System.Threading.Tasks;
using OfficeOpenXml;

namespace TriveApi.Services
{
    public class ExcelExportService
    {
        private static readonly object _trafficLock = new object();
        private static readonly object _dataLock = new object();

        private readonly string _trafficFilePath;
        private readonly string _dataFilePath;

        public ExcelExportService()
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            // Store directly in project root folder (e:\TRIVE\backend\)
            var projectDir = Directory.GetCurrentDirectory();
            _trafficFilePath = Path.Combine(projectDir, "traffic.xlsx");
            _dataFilePath = Path.Combine(projectDir, "data.xlsx");

            EnsureFilesExist();
        }

        private void EnsureFilesExist()
        {
            lock (_trafficLock)
            {
                try
                {
                    if (!File.Exists(_trafficFilePath))
                    {
                        using var package = new ExcelPackage();
                        var ws = package.Workbook.Worksheets.Add("Traffic");
                        ws.Cells[1, 1].Value = "Time";
                        ws.Cells[1, 2].Value = "No of Visitors";
                        ws.Cells[1, 1, 1, 2].Style.Font.Bold = true;
                        ws.Cells[ws.Dimension.Address].AutoFitColumns();
                        package.SaveAs(new FileInfo(_trafficFilePath));
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ExcelExportService] Traffic file creation error: {ex.Message}");
                }
            }

            lock (_dataLock)
            {
                try
                {
                    if (!File.Exists(_dataFilePath))
                    {
                        using var package = new ExcelPackage();
                        var ws = package.Workbook.Worksheets.Add("UserData");
                        
                        string[] headers = new string[]
                        {
                            "Username",
                            "Company Name",
                            "Job Role",
                            "Salary",
                            "HR Interviewer Results",
                            "Technical Interviewer Results",
                            "Hiring Manager Results",
                            "Start Time",
                            "End Time",
                            "Completed Fully",
                            "Survey Q1 (Would Use Again)",
                            "Survey Q2 (Willing To Pay & Price)",
                            "Survey Q3 (Would Refer)"
                        };

                        for (int c = 0; c < headers.Length; c++)
                        {
                            ws.Cells[1, c + 1].Value = headers[c];
                        }
                        ws.Cells[1, 1, 1, headers.Length].Style.Font.Bold = true;
                        ws.Cells[ws.Dimension.Address].AutoFitColumns();
                        package.SaveAs(new FileInfo(_dataFilePath));
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ExcelExportService] UserData file creation error: {ex.Message}");
                }
            }
        }

        public Task RecordTrafficVisitAsync()
        {
            lock (_trafficLock)
            {
                try
                {
                    var now = DateTime.Now;
                    // Round down to nearest 10-minute interval
                    int minuteBucket = (now.Minute / 10) * 10;
                    var startTime = new DateTime(now.Year, now.Month, now.Day, now.Hour, minuteBucket, 0);
                    var endTime = startTime.AddMinutes(10);

                    string intervalStr = $"{startTime:HH:mm}-{endTime:HH:mm}";

                    using var package = new ExcelPackage(new FileInfo(_trafficFilePath));
                    var ws = package.Workbook.Worksheets["Traffic"] ?? package.Workbook.Worksheets[0];

                    int lastRow = ws.Dimension?.End.Row ?? 1;
                    bool updated = false;

                    // Check if interval already exists in sheet
                    for (int r = 2; r <= lastRow; r++)
                    {
                        var cellVal = ws.Cells[r, 1].Value?.ToString();
                        if (cellVal == intervalStr)
                        {
                            int currentCount = 0;
                            int.TryParse(ws.Cells[r, 2].Value?.ToString(), out currentCount);
                            ws.Cells[r, 2].Value = currentCount + 1;
                            updated = true;
                            break;
                        }
                    }

                    if (!updated)
                    {
                        int newRow = lastRow + 1;
                        ws.Cells[newRow, 1].Value = intervalStr;
                        ws.Cells[newRow, 2].Value = 1;
                    }

                    ws.Cells[ws.Dimension.Address].AutoFitColumns();
                    package.Save();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ExcelExportService] Traffic logging error: {ex.Message}");
                }
            }

            return Task.CompletedTask;
        }

        public Task RecordUserDataAsync(
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
            lock (_dataLock)
            {
                try
                {
                    using var package = new ExcelPackage(new FileInfo(_dataFilePath));
                    var ws = package.Workbook.Worksheets["UserData"] ?? package.Workbook.Worksheets[0];

                    int nextRow = (ws.Dimension?.End.Row ?? 1) + 1;

                    ws.Cells[nextRow, 1].Value = username;
                    ws.Cells[nextRow, 2].Value = company;
                    ws.Cells[nextRow, 3].Value = jobRole;
                    ws.Cells[nextRow, 4].Value = salary;
                    ws.Cells[nextRow, 5].Value = hrResults;
                    ws.Cells[nextRow, 6].Value = techResults;
                    ws.Cells[nextRow, 7].Value = hmResults;
                    ws.Cells[nextRow, 8].Value = startTime.ToString("yyyy-MM-dd HH:mm:ss");
                    ws.Cells[nextRow, 9].Value = endTime.ToString("yyyy-MM-dd HH:mm:ss");
                    ws.Cells[nextRow, 10].Value = isCompleted ? "Yes" : "No";
                    ws.Cells[nextRow, 11].Value = wouldUseAgain ? "Yes" : "No";
                    ws.Cells[nextRow, 12].Value = willingToPayAndPrice;
                    ws.Cells[nextRow, 13].Value = wouldRefer ? "Yes" : "No";

                    ws.Cells[ws.Dimension.Address].AutoFitColumns();
                    package.Save();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ExcelExportService] UserData logging error: {ex.Message}");
                }
            }

            return Task.CompletedTask;
        }
    }
}
