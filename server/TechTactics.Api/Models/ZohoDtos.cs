using System.Text.Json.Serialization;

namespace TechTactics.Api.Models;

public sealed record ZohoTokenExchangeRequest(string Code);
public sealed record ZohoRefreshTokenRequest(string RefreshToken);

public sealed record ZohoTokenResponse(
    [property: JsonPropertyName("access_token")] string? AccessToken,
    [property: JsonPropertyName("refresh_token")] string? RefreshToken,
    [property: JsonPropertyName("api_domain")] string? ApiDomain,
    [property: JsonPropertyName("token_type")] string? TokenType,
    [property: JsonPropertyName("expires_in")] int? ExpiresIn,
    [property: JsonPropertyName("error")] string? Error,
    [property: JsonPropertyName("error_description")] string? ErrorDescription);

public sealed record ZohoInvoiceListResponse(
    [property: JsonPropertyName("code")] int Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("invoices")] List<ZohoInvoiceSummary>? Invoices);

public sealed record ZohoInvoiceSummary(
    [property: JsonPropertyName("invoice_id")] string? InvoiceId,
    [property: JsonPropertyName("invoice_number")] string? InvoiceNumber,
    [property: JsonPropertyName("customer_name")] string? CustomerName,
    [property: JsonPropertyName("status")] string? Status,
    [property: JsonPropertyName("total")] decimal? Total,
    [property: JsonPropertyName("balance")] decimal? Balance,
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("due_date")] string? DueDate);

public sealed record ZohoContactListResponse(
    [property: JsonPropertyName("code")] int Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("contacts")] List<ZohoContactSummary>? Contacts);

public sealed record ZohoContactSummary(
    [property: JsonPropertyName("contact_id")] string? ContactId,
    [property: JsonPropertyName("contact_name")] string? ContactName,
    [property: JsonPropertyName("company_name")] string? CompanyName,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("phone")] string? Phone);

public sealed class CreateInvoiceRequest
{
    public string CustomerId { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public DateOnly? InvoiceDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public List<string>? ContactPersonIds { get; set; }
    public List<CreateInvoiceLineItem>? LineItems { get; set; }
}

public sealed class CreateInvoiceLineItem
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public decimal Quantity { get; set; } = 1;
}

public sealed record SendInvoiceEmailRequest(List<string> ToEmails, string? Subject, string? Body);

public sealed record HostedPaymentPageResponse(string InvoiceId, string PaymentUrl);
