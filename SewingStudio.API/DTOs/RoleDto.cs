namespace SewingStudio.API.DTOs;

public class RoleDto
{
    public int Id { get; set; }
    public string RoleName { get; set; } = string.Empty;
}

public class CreateRoleDto
{
    public string RoleName { get; set; } = string.Empty;
}
