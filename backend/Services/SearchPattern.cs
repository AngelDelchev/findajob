namespace findajob.Services;

/// <summary>
/// Builds the patterns used by the free-text searches.
///
/// Two things this fixes over the previous <c>value.ToLower().Contains(term)</c>:
///
/// <para>
/// It stops calling <c>lower()</c> on every searched column of every row. SQLite's
/// <c>LIKE</c> is already case-insensitive for ASCII, so the lowering bought nothing
/// and cost a function call per column per row — five of them per posting.
/// </para>
///
/// <para>
/// It escapes the wildcards. <c>%</c> and <c>_</c> are meaningful to <c>LIKE</c>, so a
/// visitor searching for "100%" or "a_b" was writing a pattern rather than looking for
/// text — searching for a single "%" matched the entire table.
/// </para>
///
/// <para>
/// Full-text search was considered and rejected. FTS5's tokeniser drops punctuation,
/// which on a board whose tags are "C#", ".NET" and "Node.js" would turn a search for
/// "C#" into a search for "c" — a worse result than the scan it replaces.
/// </para>
/// </summary>
public static class SearchPattern
{
    /// <summary>
    /// The escape character to pass to <c>EF.Functions.Like</c>, which emits it as the
    /// <c>ESCAPE</c> clause. Without that clause the backslashes below would be matched
    /// literally instead of doing any escaping.
    /// </summary>
    public const string Escape = "\\";

    /// <summary>A "contains this text" pattern, with any wildcards in it neutralised.</summary>
    public static string Contains(string term) => $"%{EscapeWildcards(term.Trim())}%";

    private static string EscapeWildcards(string term) =>
        term.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
