using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using TechTactics.Api.Models;
using TechTactics.Api.Options;

namespace TechTactics.Api.Services;

public sealed class ZohoBooksService(HttpClient httpClient, IOptions<ZohoOptions> zohoOptions) : IZohoBooksService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient = httpClient;
    private readonly ZohoOptions _zohoOptions = zohoOptions.Value;

    public string BuildAuthorizeUrl(string? state = null)
    {
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = _zohoOptions.ClientId,
            ["response_type"] = "code",
            ["redirect_uri"] = _zohoOptions.RedirectUri,
            ["scope"] = _zohoOptions.BooksOAuthScope,
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["state"] = state
        };

        return QueryHelpers.AddQueryString($"{_zohoOptions.AccountsBaseUrl.TrimEnd('/')}/oauth/v2/auth", query!);
    }

    public async Task<ZohoTokenResponse> ExchangeCodeForTokenAsync(string code, CancellationToken cancellationToken)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = _zohoOptions.ClientId,
            ["client_secret"] = _zohoOptions.ClientSecret,
            ["redirect_uri"] = _zohoOptions.RedirectUri,
            ["code"] = code
        });

        using var response = await _httpClient.PostAsync($"{_zohoOptions.AccountsBaseUrl.TrimEnd('/')}/oauth/v2/token", content, cancellationToken);
        return await ReadJsonAsync<ZohoTokenResponse>(response, cancellationToken);
    }

    public async Task<ZohoTokenResponse> RefreshAccessTokenAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = _zohoOptions.ClientId,
            ["client_secret"] = _zohoOptions.ClientSecret,
            ["refresh_token"] = refreshToken
        });

        using var response = await _httpClient.PostAsync($"{_zohoOptions.AccountsBaseUrl.TrimEnd('/')}/oauth/v2/token", content, cancellationToken);
        return await ReadJsonAsync<ZohoTokenResponse>(response, cancellationToken);
    }

    public async Task<ZohoInvoiceListResponse?> ListInvoicesAsync(string accessToken, CancellationToken cancellationToken)
    {
        using var request = BuildBooksRequest(HttpMethod.Get, _zohoOptions.InvoicePath, accessToken);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<ZohoInvoiceListResponse>(response, cancellationToken);
    }

    public async Task<ZohoContactListResponse?> ListContactsAsync(string accessToken, CancellationToken cancellationToken)
    {
        using var request = BuildBooksRequest(HttpMethod.Get, _zohoOptions.ContactsPath, accessToken);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<ZohoContactListResponse>(response, cancellationToken);
    }

    public async Task<string> CreateInvoiceAsync(string accessToken, CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        var lineItems = request.LineItems?.Count > 0
            ? request.LineItems.Select(item => new
            {
                name = item.Name,
                description = item.Description,
                rate = item.Rate,
                quantity = item.Quantity
            }).ToList()
            : _zohoOptions.DefaultLineItems.Select(item => new
            {
                name = item.Name,
                description = item.Description,
                rate = item.Rate,
                quantity = item.Quantity
            }).ToList<object>();

        var payload = new
        {
            customer_id = request.CustomerId,
            reference_number = request.ReferenceNumber,
            date = request.InvoiceDate?.ToString("yyyy-MM-dd"),
            due_date = request.DueDate?.ToString("yyyy-MM-dd"),
            notes = request.Notes,
            contact_persons = request.ContactPersonIds is { Count: > 0 }
                ? request.ContactPersonIds
                : _zohoOptions.DefaultContactPersonIds,
            line_items = lineItems
        };

        using var httpRequest = BuildBooksRequest(HttpMethod.Post, _zohoOptions.InvoicePath, accessToken);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Zoho invoice creation failed ({(int)response.StatusCode}): {responseBody}");
        }

        return responseBody;
    }

    public async Task SendInvoiceEmailAsync(string accessToken, string invoiceId, SendInvoiceEmailRequest request, CancellationToken cancellationToken)
    {
        var path = $"{_zohoOptions.InvoicePath.TrimEnd('/')}/{invoiceId}/email";
        var payload = new
        {
            to_mail_ids = request.ToEmails,
            subject = request.Subject,
            body = request.Body
        };

        using var httpRequest = BuildBooksRequest(HttpMethod.Post, path, accessToken);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public string BuildHostedPaymentPageUrl(string invoiceId)
    {
        var basePath = _zohoOptions.HostedPaymentPageBasePath.Trim('/');
        return $"{_zohoOptions.ApiBaseUrl.TrimEnd('/')}/{basePath}/{invoiceId}";
    }

    private HttpRequestMessage BuildBooksRequest(HttpMethod method, string path, string accessToken)
    {
        var uri = QueryHelpers.AddQueryString(
            $"{_zohoOptions.ApiBaseUrl.TrimEnd('/')}{_zohoOptions.BooksApiVersionPath.TrimEnd('/')}/{path.TrimStart('/')}",
            "organization_id",
            _zohoOptions.OrganizationId);

        var request = new HttpRequestMessage(method, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Zoho-oauthtoken", accessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return request;
    }

    private static async Task<T> ReadJsonAsync<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Zoho request failed ({(int)response.StatusCode}): {responseBody}");
        }

        return JsonSerializer.Deserialize<T>(responseBody, JsonOptions)
               ?? throw new InvalidOperationException("Zoho response could not be parsed.");
    }
}
