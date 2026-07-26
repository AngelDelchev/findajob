namespace findajob.Services;

public sealed class AppOptions
{
    public const string SectionName = "App";

    /// <summary>
    /// Public base URL of the site, used to build links in outgoing email.
    /// The confirmation link used to be hard-coded to <c>http://localhost:5173</c>,
    /// which made every confirmation email sent from a deployed instance a dead link.
    /// </summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";

    /// <summary>Origins allowed to call the API with credentials during development.</summary>
    public string[] CorsOrigins { get; set; } = ["http://localhost:5173"];
}
