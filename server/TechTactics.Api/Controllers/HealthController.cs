using Microsoft.AspNetCore.Mvc;

namespace TechTactics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        status = "ok",
        service = "TechTactics.Api",
        utcTime = DateTimeOffset.UtcNow
    });
}
