using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    // GET api/users
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await _db.Users
            .Include(u => u.Role)
            .Select(u => new UserDto
            {
                Id = u.Id,
                RoleId = u.RoleId,
                RoleName = u.Role.RoleName,
                PhoneNumber = u.PhoneNumber,
                Login = u.Login
            })
            .ToListAsync();
        return Ok(users);
    }

    // GET api/users/5
    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(int id)
    {
        var u = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (u == null) return NotFound();
        return Ok(new UserDto
        {
            Id = u.Id,
            RoleId = u.RoleId,
            RoleName = u.Role.RoleName,
            PhoneNumber = u.PhoneNumber,
            Login = u.Login
        });
    }

    // POST api/users/login — аутентификация
    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Login == dto.Login && u.Password == dto.Password);

        if (user == null) return Unauthorized(new { message = "Неверный логин или пароль" });

        return Ok(new UserDto
        {
            Id = user.Id,
            RoleId = user.RoleId,
            RoleName = user.Role.RoleName,
            PhoneNumber = user.PhoneNumber,
            Login = user.Login
        });
    }

    // POST api/users
    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserDto dto)
    {
        var roleExists = await _db.Roles.AnyAsync(r => r.Id == dto.RoleId);
        if (!roleExists) return BadRequest(new { message = "Роль не найдена" });

        var loginTaken = await _db.Users.AnyAsync(u => u.Login == dto.Login);
        if (loginTaken) return BadRequest(new { message = "Логин уже занят" });

        var user = new User
        {
            RoleId = dto.RoleId,
            PhoneNumber = dto.PhoneNumber,
            Login = dto.Login,
            Password = dto.Password
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var role = await _db.Roles.FindAsync(user.RoleId);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new UserDto
        {
            Id = user.Id,
            RoleId = user.RoleId,
            RoleName = role!.RoleName,
            PhoneNumber = user.PhoneNumber,
            Login = user.Login
        });
    }

    // PUT api/users/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateUserDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var roleExists = await _db.Roles.AnyAsync(r => r.Id == dto.RoleId);
        if (!roleExists) return BadRequest(new { message = "Роль не найдена" });

        user.RoleId = dto.RoleId;
        user.PhoneNumber = dto.PhoneNumber;
        user.Login = dto.Login;
        if (!string.IsNullOrEmpty(dto.Password))
            user.Password = dto.Password;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/users/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
