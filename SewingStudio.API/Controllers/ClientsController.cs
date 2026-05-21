using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ClientsController(AppDbContext db) => _db = db;

    // GET api/clients
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClientDto>>> GetAll()
    {
        var clients = await _db.Clients
            .Select(c => new ClientDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Phone = c.Phone,
                Email = c.Email
            })
            .ToListAsync();
        return Ok(clients);
    }

    // GET api/clients/5
    [HttpGet("{id}")]
    public async Task<ActionResult<ClientDto>> GetById(int id)
    {
        var c = await _db.Clients.FindAsync(id);
        if (c == null) return NotFound();
        return Ok(new ClientDto
        {
            Id = c.Id,
            FirstName = c.FirstName,
            LastName = c.LastName,
            Phone = c.Phone,
            Email = c.Email
        });
    }

    // GET api/clients/5/orders — все заказы клиента
    [HttpGet("{id}/orders")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders(int id)
    {
        var exists = await _db.Clients.AnyAsync(c => c.Id == id);
        if (!exists) return NotFound();

        var orders = await _db.Orders
            .Include(o => o.Status)
            .Include(o => o.User)
            .Where(o => o.IdClient == id)
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

    // POST api/clients
    [HttpPost]
    public async Task<ActionResult<ClientDto>> Create(CreateClientDto dto)
    {
        var client = new Client
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Phone = dto.Phone,
            Email = dto.Email
        };
        _db.Clients.Add(client);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = client.Id }, new ClientDto
        {
            Id = client.Id,
            FirstName = client.FirstName,
            LastName = client.LastName,
            Phone = client.Phone,
            Email = client.Email
        });
    }

    // PUT api/clients/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateClientDto dto)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client == null) return NotFound();

        client.FirstName = dto.FirstName;
        client.LastName = dto.LastName;
        client.Phone = dto.Phone;
        client.Email = dto.Email;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/clients/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client == null) return NotFound();
        _db.Clients.Remove(client);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
