namespace findajob.Models;

/// <summary>Role names used by Identity and the <c>[Authorize]</c> attributes.</summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string Employer = "Employer";
    public const string Employee = "Employee";

    public const string AdminOrEmployer = $"{Admin},{Employer}";
    public const string AdminOrEmployee = $"{Admin},{Employee}";

    public static readonly string[] All = [Admin, Employer, Employee];

    public static bool IsValid(string role) => All.Contains(role);
}
