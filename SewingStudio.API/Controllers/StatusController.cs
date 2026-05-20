using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly AppDbContext _db;

    public StatusController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StatusDto>>> GetAll()
    {
        var statuses = await _db.Statuses
            .Select(s => new StatusDto { Id = s.Id, StatusName = s.StatusName })
            .ToListAsync();
        return Ok(statuses);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StatusDto>> GetById(int id)
    {
        var status = await _db.Statuses.FindAsync(id);
        if (status == null) return NotFound();
        return Ok(new StatusDto { Id = status.Id, StatusName = status.StatusName });
    }

    [HttpPost]
    public async Task<ActionResult<StatusDto>> Create(CreateStatusDto dto)
    {
        var status = new Status { StatusName = dto.StatusName };
        _db.Statuses.Add(status);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = status.Id },
            new StatusDto { Id = status.Id, StatusName = status.StatusName });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateStatusDto dto)
    {
        var status = await _db.Statuses.FindAsync(id);
        if (status == null) return NotFound();
        status.StatusName = dto.StatusName;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var status = await _db.Statuses.FindAsync(id);
        if (status == null) return NotFound();
        _db.Statuses.Remove(status);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
