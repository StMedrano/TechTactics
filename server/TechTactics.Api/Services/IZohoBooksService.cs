using TechTactics.Api.Models;

namespace TechTactics.Api.Services;

public interface IZohoBooksService
{
    string BuildAuthorizeUrl(string? state = null);
    Task<ZohoTokenResponse> ExchangeCodeForTokenAsync(string code, CancellationToken cancellationToken);
    Task<ZohoTokenResponse> RefreshAccessTokenAsync(string refreshToken, CancellationToken cancellationToken);
    Task<ZohoInvoiceListResponse?> ListInvoicesAsync(string accessToken, CancellationToken cancellationToken);
    Task<ZohoContactListResponse?> ListContactsAsync(string accessToken, CancellationToken cancellationToken);
    Task<string> CreateInvoiceAsync(string accessToken, CreateInvoiceRequest request, CancellationToken cancellationToken);
    Task SendInvoiceEmailAsync(string accessToken, string invoiceId, SendInvoiceEmailRequest request, CancellationToken cancellationToken);
    string BuildHostedPaymentPageUrl(string invoiceId);
}
