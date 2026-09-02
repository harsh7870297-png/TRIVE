using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TriveApi.Data;

namespace TriveApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UsersController(AppDbContext db)
        {
            _db = db;
        }

        public class UsernameCheckRequest
        {
            public string Username { get; set; } = string.Empty;
        }

        [HttpPost("check-username")]
        public async Task<IActionResult> CheckUsername([FromBody] UsernameCheckRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
            {
                return BadRequest(new { message = "Username cannot be empty." });
            }

            var trimmed = request.Username.Trim();
            var exists = await _db.UserInterviews.AnyAsync(u => u.Username.ToLower() == trimmed.ToLower());

            if (exists)
            {
                return BadRequest(new { message = "Username already exists. Please choose another username." });
            }

            return Ok(new { available = true });
        }
    }
}
