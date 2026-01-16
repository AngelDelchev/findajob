using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Net;
using findajob.Data;
using Microsoft.AspNetCore.Identity;

namespace findajob.Models
{
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [StringLength(100)]
        public string FullName { get; set; }

        //public virtual ICollection<Address> Addresses { get; set; }

        //public virtual ICollection<Order> Orders { get; set; }

        public ApplicationUser()
        {
            //Addresses = new HashSet<Address>();
            //Orders = new HashSet<Order>();
        }
    }
}
