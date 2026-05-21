using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db) => _db = db;

    // POST api/auth/register-client
    // Создаёт запись Client + User (роль «Клиент») в одной транзакции
    [HttpPost("register-client")]
    public async Task<IActionResult> RegisterClient(RegisterClientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName) ||
            string.IsNullOrWhiteSpace(dto.Phone)     || string.IsNullOrWhiteSpace(dto.Login)    ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Заполните все обязательные поля" });

        if (await _db.Users.AnyAsync(u => u.Login == dto.Login))
            return BadRequest(new { message = "Логин уже занят" });

        var clientRole = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == "Клиент");
        if (clientRole == null)
            return StatusCode(500, new { message = "Роль «Клиент» не найдена в БД" });

        await using var tx = await _db.Database.BeginTransactionAsync();

        var client = new Client
        {
            FirstName = dto.FirstName,
            LastName  = dto.LastName,
            Phone     = dto.Phone,
            Email     = dto.Email
        };
        _db.Clients.Add(client);
        await _db.SaveChangesAsync();

        var user = new User
        {
            RoleId      = clientRole.Id,
            Login       = dto.Login,
            Password    = dto.Password,
            PhoneNumber = dto.Phone,
            ClientId    = client.Id
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        await tx.CommitAsync();

        return Ok(new { message = "Регистрация прошла успешно", clientId = client.Id });
    }
}
