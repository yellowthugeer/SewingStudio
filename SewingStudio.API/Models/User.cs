using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SewingStudio.API.Models;

[Table("Users")]
public class User
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int RoleId { get; set; }

    [Required]
    [MaxLength(30)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Login { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Password { get; set; } = string.Empty;

    public int? ClientId { get; set; }

    [ForeignKey(nameof(RoleId))]
    public Role Role { get; set; } = null!;

    [ForeignKey(nameof(ClientId))]
    public Client? Client { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
