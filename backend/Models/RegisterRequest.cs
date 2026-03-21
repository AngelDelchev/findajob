public class RegisterRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";

    public string ConfirmPassword { get; set; } = "";

    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";

    public string PhoneNumber { get; set; } = "";

    public string AddressLine1 { get; set; } = "";
    public string AddressLine2 { get; set; } = "";
    public string City { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public string Country { get; set; } = "";

    public string Role { get; set; } = "Employee";
}
