using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db) => _db = db;

    // GET api/orders — все заказы с данными клиента, сотрудника, статуса
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAll()
    {
        var orders = await _db.Orders
            .Include(o => o.Client)
            .Include(o => o.User)
            .Include(o => o.Status)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                Data = o.Data,
                IdClient = o.IdClient,
                ClientFullName = o.Client.FirstName + " " + o.Client.LastName,
                IdUser = o.IdUser,
                UserLogin = o.User.Login,
                Price = o.Price,
                Description = o.Description,
                StatusId = o.StatusId,
                StatusName = o.Status.StatusName
            })
            .ToListAsync();
        return Ok(orders);
    }

    // GET api/orders/5
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var o = await _db.Orders
            .Include(o => o.Client)
            .Include(o => o.User)
            .Include(o => o.Status)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (o == null) return NotFound();
        return Ok(new OrderDto
        {
            Id = o.Id,
            Data = o.Data,
            IdClient = o.IdClient,
            ClientFullName = o.Client.FirstName + " " + o.Client.LastName,
            IdUser = o.IdUser,
            UserLogin = o.User.Login,
            Price = o.Price,
            Description = o.Description,
            StatusId = o.StatusId,
            StatusName = o.Status.StatusName
        });
    }

    // GET api/orders/status/2 — фильтр по статусу
    [HttpGet("status/{statusId}")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetByStatus(int statusId)
    {
        var orders = await _db.Orders
            .Include(o => o.Client)
            .Include(o => o.User)
            .Include(o => o.Status)
            .Where(o => o.StatusId == statusId)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                Data = o.Data,
                IdClient = o.IdClient,
                ClientFullName = o.Client.FirstName + " " + o.Client.LastName,
                IdUser = o.IdUser,
                UserLogin = o.User.Login,
                Price = o.Price,
                Description = o.Description,
                StatusId = o.StatusId,
                StatusName = o.Status.StatusName
            })
            .ToListAsync();
        return Ok(orders);
    }

    // GET api/orders/user/3 — заказы конкретного сотрудника
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetByUser(int userId)
    {
        var orders = await _db.Orders
            .Include(o => o.Client)
            .Include(o => o.User)
            .Include(o => o.Status)
            .Where(o => o.IdUser == userId)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                Data = o.Data,
                IdClient = o.IdClient,
                ClientFullName = o.Client.FirstName + " " + o.Client.LastName,
                IdUser = o.IdUser,
                UserLogin = o.User.Login,
                Price = o.Price,
                Description = o.Description,
                StatusId = o.StatusId,
                StatusName = o.Status.StatusName
            })
            .ToListAsync();
        return Ok(orders);
    }

    // POST api/orders
    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderDto dto)
    {
        var clientExists = await _db.Clients.AnyAsync(c => c.Id == dto.IdClient);
        if (!clientExists) return BadRequest(new { message = "Клиент не найден" });

        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.IdUser);
        if (!userExists) return BadRequest(new { message = "Сотрудник не найден" });

        var statusExists = await _db.Statuses.AnyAsync(s => s.Id == dto.StatusId);
        if (!statusExists) return BadRequest(new { message = "Статус не найден" });

        var order = new Order
        {
            Data = dto.Data,
            IdClient = dto.IdClient,
            IdUser = dto.IdUser,
            Price = dto.Price,
            Description = dto.Description,
            StatusId = dto.StatusId
        };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = order.Id },
            await GetOrderDto(order.Id));
    }

    // PUT api/orders/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateOrderDto dto)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null) return NotFound();

        order.Data = dto.Data;
        order.IdClient = dto.IdClient;
        order.IdUser = dto.IdUser;
        order.Price = dto.Price;
        order.Description = dto.Description;
        order.StatusId = dto.StatusId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH api/orders/5/status — быстрое изменение статуса заказа
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] int statusId)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null) return NotFound();

        var statusExists = await _db.Statuses.AnyAsync(s => s.Id == statusId);
        if (!statusExists) return BadRequest(new { message = "Статус не найден" });

        order.StatusId = statusId;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/orders/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null) return NotFound();
        _db.Orders.Remove(order);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<OrderDto> GetOrderDto(int id)
    {
        var o = await _db.Orders
            .Include(o => o.Client)
            .Include(o => o.User)
            .Include(o => o.Status)
            .FirstAsync(o => o.Id == id);
        return new OrderDto
        {
            Id = o.Id,
            Data = o.Data,
            IdClient = o.IdClient,
            ClientFullName = o.Client.FirstName + " " + o.Client.LastName,
            IdUser = o.IdUser,
            UserLogin = o.User.Login,
            Price = o.Price,
            Description = o.Description,
            StatusId = o.StatusId,
            StatusName = o.Status.StatusName
        };
    }
}
