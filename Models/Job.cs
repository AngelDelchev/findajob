using System.ComponentModel.DataAnnotations;
using findajob.Data;

namespace findajob.Models
{
    public class Job
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Pay { get; set; }
        public string Type { get; set; }
        public string Setting { get; set; }
        public string Company { get; set; }
        public string Location { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Please select a category.")]
        public int CategoryId { get; set; }

        public Category Category { get; set; }
    }
}
