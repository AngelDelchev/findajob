public class JobApplication
{
    public int Id { get; set; }
    public int JobId { get; set; } // Foreign Key
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
}
