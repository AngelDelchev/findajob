namespace findajob.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body);
        Task SendConfirmationEmailAsync(string to, string token);

        /// <summary>
        /// Sends the "choose a new password" link. The address travels in the link
        /// alongside the token, because a reset token is only meaningful for the one
        /// account it was issued against.
        /// </summary>
        Task SendPasswordResetEmailAsync(string to, string token);
    }
}
