using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReviewsController(AppDbContext db) => _db = db;

    // GET api/reviews
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetAll()
    {
        var reviews = await _db.Reviews
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                OrderId = r.OrderId,
                Rating = r.Rating,
                Comment = r.Comment
            })
            .ToListAsync();
        return Ok(reviews);
    }

    // GET api/reviews/5
    [HttpGet("{id}")]
    public async Task<ActionResult<ReviewDto>> GetById(int id)
    {
        var r = await _db.Reviews.FindAsync(id);
        if (r == null) return NotFound();
        return Ok(new ReviewDto { Id = r.Id, OrderId = r.OrderId, Rating = r.Rating, Comment = r.Comment });
    }

    // GET api/reviews/order/5 — отзывы по заказу
    [HttpGet("order/{orderId}")]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetByOrder(int orderId)
    {
        var reviews = await _db.Reviews
            .Where(r => r.OrderId == orderId)
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                OrderId = r.OrderId,
                Rating = r.Rating,
                Comment = r.Comment
            })
            .ToListAsync();
        return Ok(reviews);
    }

    // POST api/reviews
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Create(CreateReviewDto dto)
    {
        var orderExists = await _db.Orders.AnyAsync(o => o.Id == dto.OrderId);
        if (!orderExists) return BadRequest(new { message = "Заказ не найден" });

        if (dto.Rating < 1 || dto.Rating > 5)
            return BadRequest(new { message = "Рейтинг должен быть от 1 до 5" });

        var review = new Review
        {
            OrderId = dto.OrderId,
            Rating = dto.Rating,
            Comment = dto.Comment
        };
        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = review.Id },
            new ReviewDto { Id = review.Id, OrderId = review.OrderId, Rating = review.Rating, Comment = review.Comment });
    }

    // PUT api/reviews/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateReviewDto dto)
    {
        var review = await _db.Reviews.FindAsync(id);
        if (review == null) return NotFound();

        if (dto.Rating < 1 || dto.Rating > 5)
            return BadRequest(new { message = "Рейтинг должен быть от 1 до 5" });

        review.Rating = dto.Rating;
        review.Comment = dto.Comment;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/reviews/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var review = await _db.Reviews.FindAsync(id);
        if (review == null) return NotFound();
        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
