using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SewingStudio.API.Models;

[Table("Orders")]
public class Order
{
    [Key]
    public int Id { get; set; }

    [Required]
    public DateTime Data { get; set; }

    [Required]
    public int IdClient { get; set; }

    [Required]
    public int IdUser { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [MaxLength(100)]
    public string? Description { get; set; }

    [Required]
    public int StatusId { get; set; }

    [ForeignKey(nameof(IdClient))]
    public Client Client { get; set; } = null!;

    [ForeignKey(nameof(IdUser))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(StatusId))]
    public Status Status { get; set; } = null!;

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
