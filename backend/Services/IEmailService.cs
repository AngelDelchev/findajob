namespace findajob.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body);
        Task SendConfirmationEmailAsync(string to, string token);
    }
}
