using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SewingStudio.API.Models;

[Table("Payments")]
public class Payment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int OrderId { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public DateTime? PaymentDate { get; set; }

    [MaxLength(50)]
    public string? PaymentMethod { get; set; }

    public int? TransactionId { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; }

    [ForeignKey(nameof(OrderId))]
    public Order Order { get; set; } = null!;
}
