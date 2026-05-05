using FluentEmail.Core;

namespace findajob.Services
{
    public class EmailService : IEmailService
    {
        private readonly IFluentEmail _fluentEmail;

        public EmailService(IFluentEmail fluentEmail)
        {
            _fluentEmail = fluentEmail;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            // Note: Currently configured for localhost:1025. 
            // In a real environment, replace .AddSmtpSender with a provider like SendGrid or AWS SES.
            await _fluentEmail
                .To(to)
                .Subject(subject)
                .Body(body, isHtml: true)
                .SendAsync();
        }

        public async Task SendConfirmationEmailAsync(string to, string token)
        {
            var confirmationLink = $"http://localhost:5173/confirm-email?token={token}";
            var body = $@"
                <h1>Welcome to findajob!</h1>
                <p>Please confirm your email by clicking the link below:</p>
                <p><a href='{confirmationLink}'>{confirmationLink}</a></p>
                <p>If you did not request this, please ignore this email.</p>";

            await SendEmailAsync(to, "Confirm your email - findajob", body);
        }
    }
}
