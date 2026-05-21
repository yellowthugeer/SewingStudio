namespace SewingStudio.API.DTOs;

public class StatusDto
{
    public int Id { get; set; }
    public string StatusName { get; set; } = string.Empty;
}

public class CreateStatusDto
{
    public string StatusName { get; set; } = string.Empty;
}
