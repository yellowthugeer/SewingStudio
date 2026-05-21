using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SewingStudio.API.Data;
using SewingStudio.API.DTOs;
using SewingStudio.API.Models;

namespace SewingStudio.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PaymentsController(AppDbContext db) => _db = db;

    // GET api/payments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PaymentDto>>> GetAll()
    {
        var payments = await _db.Payments
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                OrderId = p.OrderId,
                Amount = p.Amount,
                PaymentDate = p.PaymentDate,
                PaymentMethod = p.PaymentMethod,
                TransactionId = p.TransactionId,
                Status = p.Status
            })
            .ToListAsync();
        return Ok(payments);
    }

    // GET api/payments/5
    [HttpGet("{id}")]
    public async Task<ActionResult<PaymentDto>> GetById(int id)
    {
        var p = await _db.Payments.FindAsync(id);
        if (p == null) return NotFound();
        return Ok(new PaymentDto
        {
            Id = p.Id,
            OrderId = p.OrderId,
            Amount = p.Amount,
            PaymentDate = p.PaymentDate,
            PaymentMethod = p.PaymentMethod,
            TransactionId = p.TransactionId,
            Status = p.Status
        });
    }

    // GET api/payments/order/5 — все платежи по заказу
    [HttpGet("order/{orderId}")]
    public async Task<ActionResult<IEnumerable<PaymentDto>>> GetByOrder(int orderId)
    {
        var payments = await _db.Payments
            .Where(p => p.OrderId == orderId)
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                OrderId = p.OrderId,
                Amount = p.Amount,
                PaymentDate = p.PaymentDate,
                PaymentMethod = p.PaymentMethod,
                TransactionId = p.TransactionId,
                Status = p.Status
            })
            .ToListAsync();
        return Ok(payments);
    }

    // POST api/payments
    [HttpPost]
    public async Task<ActionResult<PaymentDto>> Create(CreatePaymentDto dto)
    {
        var orderExists = await _db.Orders.AnyAsync(o => o.Id == dto.OrderId);
        if (!orderExists) return BadRequest(new { message = "Заказ не найден" });

        var payment = new Payment
        {
            OrderId = dto.OrderId,
            Amount = dto.Amount,
            PaymentDate = dto.PaymentDate ?? DateTime.Now,
            PaymentMethod = dto.PaymentMethod,
            Status = dto.Status ?? "Ожидает"
        };
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = payment.Id }, new PaymentDto
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            Amount = payment.Amount,
            PaymentDate = payment.PaymentDate,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = payment.TransactionId,
            Status = payment.Status
        });
    }

    // PUT api/payments/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdatePaymentDto dto)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment == null) return NotFound();

        payment.Amount = dto.Amount;
        payment.PaymentDate = dto.PaymentDate;
        payment.PaymentMethod = dto.PaymentMethod;
        payment.TransactionId = dto.TransactionId;
        payment.Status = dto.Status;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/payments/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var payment = await _db.Payments.FindAsync(id);
        if (payment == null) return NotFound();
        _db.Payments.Remove(payment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
