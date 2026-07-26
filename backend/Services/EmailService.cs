using FluentEmail.Core;
using Microsoft.Extensions.Options;

namespace findajob.Services;

public sealed class EmailService : IEmailService
{
    private readonly IFluentEmail _fluentEmail;
    private readonly IHostEnvironment _environment;
    private readonly AppOptions _appOptions;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IFluentEmail fluentEmail,
        IHostEnvironment environment,
        IOptions<AppOptions> appOptions,
        ILogger<EmailService> logger
    )
    {
        _fluentEmail = fluentEmail;
        _environment = environment;
        _appOptions = appOptions.Value;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        var result = await _fluentEmail.To(to).Subject(subject).Body(body, isHtml: true).SendAsync();

        if (!result.Successful)
        {
            _logger.LogError(
                "Failed to send email to {Recipient}: {Errors}",
                to,
                string.Join("; ", result.ErrorMessages)
            );
        }
    }

    public async Task SendConfirmationEmailAsync(string to, string token)
    {
        // The base URL comes from configuration. It used to be hard-coded to
        // http://localhost:5173, so every confirmation email sent from a deployed
        // instance contained a dead link.
        var baseUrl = _appOptions.FrontendBaseUrl.TrimEnd('/');
        var confirmationLink = $"{baseUrl}/confirm-email?token={Uri.EscapeDataString(token)}";

        var templatePath = Path.Combine(
            _environment.ContentRootPath,
            "EmailTemplates",
            "ConfirmationEmail.html"
        );

        string body;
        if (File.Exists(templatePath))
        {
            body = (await File.ReadAllTextAsync(templatePath)).Replace(
                "{{confirmation_link}}",
                confirmationLink
            );
        }
        else
        {
            body = $"""
                <h1>Welcome to findajob!</h1>
                <p>Please confirm your email address by following the link below:</p>
                <p><a href="{confirmationLink}">{confirmationLink}</a></p>
                <p>If you did not create this account you can safely ignore this email.</p>
                """;
        }

        await SendEmailAsync(to, "Confirm your email - findajob", body);
    }
}
