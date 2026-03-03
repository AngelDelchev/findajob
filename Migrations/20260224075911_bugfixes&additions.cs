using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace findajob.Migrations
{
    /// <inheritdoc />
    public partial class bugfixesadditions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "JobApplications",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "JobTitle",
                table: "JobApplications",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "JobTitle",
                table: "JobApplications");
        }
    }
}
