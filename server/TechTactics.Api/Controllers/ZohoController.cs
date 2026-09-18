using Microsoft.AspNetCore.Mvc;
using TechTactics.Api.Models;
using TechTactics.Api.Services;

namespace TechTactics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ZohoController(IZohoBooksService zohoBooksService) : ControllerBase
{
    private readonly IZohoBooksService _zohoBooksService = zohoBooksService;

    [HttpGet("auth/url")]
    public IActionResult GetAuthorizeUrl([FromQuery] string? state)
        => Ok(new { authorizeUrl = _zohoBooksService.BuildAuthorizeUrl(state) });

    [HttpPost("oauth/token")]
    public async Task<IActionResult> ExchangeCode([FromBody] ZohoTokenExchangeRequest request, CancellationToken cancellationToken)
    {
        var token = await _zohoBooksService.ExchangeCodeForTokenAsync(request.Code, cancellationToken);
        return Ok(token);
    }

    [HttpPost("oauth/refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] ZohoRefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var token = await _zohoBooksService.RefreshAccessTokenAsync(request.RefreshToken, cancellationToken);
        return Ok(token);
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> ListInvoices(CancellationToken cancellationToken)
    {
        var accessToken = GetAccessToken();
        var invoices = await _zohoBooksService.ListInvoicesAsync(accessToken, cancellationToken);
        return Ok(invoices);
    }

    [HttpPost("invoices")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        var accessToken = GetAccessToken();
        var result = await _zohoBooksService.CreateInvoiceAsync(accessToken, request, cancellationToken);
        return Content(result, "application/json");
    }

    [HttpPost("invoices/{invoiceId}/email")]
    public async Task<IActionResult> SendInvoiceEmail(string invoiceId, [FromBody] SendInvoiceEmailRequest request, CancellationToken cancellationToken)
    {
        var accessToken = GetAccessToken();
        await _zohoBooksService.SendInvoiceEmailAsync(accessToken, invoiceId, request, cancellationToken);
        return NoContent();
    }

    [HttpGet("invoices/{invoiceId}/payment-link")]
    public IActionResult GetPaymentLink(string invoiceId)
        => Ok(new HostedPaymentPageResponse(invoiceId, _zohoBooksService.BuildHostedPaymentPageUrl(invoiceId)));

    [HttpGet("contacts")]
    public async Task<IActionResult> ListContacts(CancellationToken cancellationToken)
    {
        var accessToken = GetAccessToken();
        var contacts = await _zohoBooksService.ListContactsAsync(accessToken, cancellationToken);
        return Ok(contacts);
    }

    private string GetAccessToken()
    {
        if (Request.Headers.TryGetValue("X-Zoho-Access-Token", out var headerValue) && !string.IsNullOrWhiteSpace(headerValue))
        {
            return headerValue.ToString();
        }

        throw new BadHttpRequestException("Missing X-Zoho-Access-Token header.");
    }
}
