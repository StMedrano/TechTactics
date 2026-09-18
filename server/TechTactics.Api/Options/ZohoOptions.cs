namespace TechTactics.Api.Options;

public sealed class ZohoOptions
{
    public const string SectionName = "Zoho";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
    public string AccountsBaseUrl { get; set; } = "https://accounts.zoho.com";
    public string ApiBaseUrl { get; set; } = "https://www.zohoapis.com";
    public string BooksApiVersionPath { get; set; } = "/books/v3";
    public string BooksOAuthScope { get; set; } = "ZohoBooks.fullaccess.all";
    public string InvoicePath { get; set; } = "/invoices";
    public string ContactsPath { get; set; } = "/contacts";
    public string CustomerPaymentsPath { get; set; } = "/customerpayments";
    public string HostedPaymentPageBasePath { get; set; } = "/invoicepayments";
    public List<string> DefaultContactPersonIds { get; set; } = [];
    public List<ZohoDefaultLineItem> DefaultLineItems { get; set; } = [];
}

public sealed class ZohoDefaultLineItem
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public decimal Quantity { get; set; } = 1;
}
