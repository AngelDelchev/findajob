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

        var body = await RenderAsync(
            "ConfirmationEmail.html",
            "{{confirmation_link}}",
            confirmationLink,
            $"""
            <h1>Welcome to findajob!</h1>
            <p>Please confirm your email address by following the link below:</p>
            <p><a href="{confirmationLink}">{confirmationLink}</a></p>
            <p>If you did not create this account you can safely ignore this email.</p>
            """
        );

        await SendEmailAsync(to, "Confirm your email - findajob", body);
    }

    public async Task SendPasswordResetEmailAsync(string to, string token)
    {
        var baseUrl = _appOptions.FrontendBaseUrl.TrimEnd('/');
        var resetLink =
            $"{baseUrl}/reset-password"
            + $"?email={Uri.EscapeDataString(to)}"
            + $"&token={Uri.EscapeDataString(token)}";

        var body = await RenderAsync(
            "PasswordResetEmail.html",
            "{{reset_link}}",
            resetLink,
            $"""
            <h1>Reset your password</h1>
            <p>Follow the link below to choose a new password:</p>
            <p><a href="{resetLink}">{resetLink}</a></p>
            <p>If you did not ask for this you can safely ignore this email; your
            password will not change.</p>
            """
        );

        await SendEmailAsync(to, "Reset your password - findajob", body);
    }

    /// <summary>
    /// Fills in a bundled template, falling back to plain markup when the file is not
    /// where it should be. The templates are copied to the output directory by the
    /// project file, but a missing one should degrade rather than fail the request.
    /// </summary>
    private async Task<string> RenderAsync(
        string templateName,
        string placeholder,
        string value,
        string fallback
    )
    {
        var path = Path.Combine(_environment.ContentRootPath, "EmailTemplates", templateName);

        if (!File.Exists(path))
        {
            _logger.LogWarning("Email template {Template} is missing; sending plain markup.", templateName);
            return fallback;
        }

        return (await File.ReadAllTextAsync(path)).Replace(placeholder, value);
    }
}
