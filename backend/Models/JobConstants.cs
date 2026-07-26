namespace findajob.Models;

/// <summary>
/// Single source of truth for the vocabularies shared by the API and the UI.
/// The <c>/api/jobs/metadata</c> endpoint exposes these so the frontend never
/// has to hard-code a list that can drift out of sync with the server.
/// </summary>
public static class JobConstants
{
    public static readonly string[] JobTypes =
        ["Full-time", "Part-time", "Contract", "Internship", "Freelance"];

    public static readonly string[] WorkModes = ["Remote", "On-site", "Hybrid"];

    public static readonly string[] EmploymentTypes = ["Permanent", "Temporary"];

    public static readonly string[] SeniorityLevels = ["Junior", "Mid", "Senior", "Lead"];
}

/// <summary>
/// The lifecycle of a job application. Previously three different lists existed
/// (the model default, the employer endpoint and the admin endpoint), which meant
/// a freshly submitted application had a status no dropdown could display.
/// </summary>
public static class ApplicationStatus
{
    public const string Pending = "Pending";
    public const string Reviewed = "Reviewed";
    public const string Interviewing = "Interviewing";
    public const string Accepted = "Accepted";
    public const string Rejected = "Rejected";

    public static readonly string[] All = [Pending, Reviewed, Interviewing, Accepted, Rejected];

    public static bool IsValid(string status) => All.Contains(status);
}

public static class NotificationTypes
{
    public const string Application = "Application";
    public const string Message = "Message";
    public const string FriendRequest = "FriendRequest";
}
