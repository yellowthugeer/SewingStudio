namespace SewingStudio.API.DTOs;

public class OrderDto
{
    public int Id { get; set; }
    public DateTime Data { get; set; }
    public int IdClient { get; set; }
    public string ClientFullName { get; set; } = string.Empty;
    public int IdUser { get; set; }
    public string UserLogin { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public int StatusId { get; set; }
    public string StatusName { get; set; } = string.Empty;
}

public class CreateOrderDto
{
    public DateTime Data { get; set; }
    public int IdClient { get; set; }
    public int IdUser { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public int StatusId { get; set; }
}

public class UpdateOrderDto
{
    public DateTime Data { get; set; }
    public int IdClient { get; set; }
    public int IdUser { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public int StatusId { get; set; }
}
