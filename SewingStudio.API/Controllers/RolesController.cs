using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RolesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetAll()
    {
        var roles = await _db.Roles
            .Select(r => new RoleDto { Id = r.Id, RoleName = r.RoleName })
            .ToListAsync();
        return Ok(roles);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RoleDto>> GetById(int id)
    {
        var role = await _db.Roles.FindAsync(id);
        if (role == null) return NotFound();
        return Ok(new RoleDto { Id = role.Id, RoleName = role.RoleName });
    }

    [HttpPost]
    public async Task<ActionResult<RoleDto>> Create(CreateRoleDto dto)
    {
        var role = new Role { RoleName = dto.RoleName };
        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = role.Id },
            new RoleDto { Id = role.Id, RoleName = role.RoleName });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateRoleDto dto)
    {
        var role = await _db.Roles.FindAsync(id);
        if (role == null) return NotFound();
        role.RoleName = dto.RoleName;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var role = await _db.Roles.FindAsync(id);
        if (role == null) return NotFound();
        _db.Roles.Remove(role);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
