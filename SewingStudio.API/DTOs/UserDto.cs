namespace SewingStudio.API.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public int? ClientId { get; set; }
}

public class CreateUserDto
{
    public int RoleId { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class UpdateUserDto
{
    public int RoleId { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string? Password { get; set; }
}

public class LoginDto
{
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
