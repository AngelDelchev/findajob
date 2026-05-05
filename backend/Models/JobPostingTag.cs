namespace findajob.Models
{
    public class JobPostingTag
    {
        public int Id { get; set; }
        public int JobPostingId { get; set; }
        public int TagId { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public JobPosting? JobPosting { get; set; }
        public Tag? Tag { get; set; }
    }
}
