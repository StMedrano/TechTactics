using TechTactics.Api.Options;
using TechTactics.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ZohoOptions>(builder.Configuration.GetSection(ZohoOptions.SectionName));
builder.Services.AddHttpClient<IZohoBooksService, ZohoBooksService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientCors", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ClientCors");
app.MapControllers();
app.Run();
