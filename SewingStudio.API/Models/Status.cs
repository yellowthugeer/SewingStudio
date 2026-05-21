using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SewingStudio.API.Models;

[Table("Status")]
public class Status
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string StatusName { get; set; } = string.Empty;

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
