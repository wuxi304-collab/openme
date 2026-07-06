using System.Collections;
using System.Reflection;
using System.Text;
using System.Text.Json;
using ACadSharp;
using ACadSharp.IO;

Console.InputEncoding = Encoding.UTF8;
Console.OutputEncoding = Encoding.UTF8;

var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };

if (args.Length >= 2 && args[0] == "--inspect")
{
    Console.WriteLine(JsonSerializer.Serialize(Inspect(args[1]), options));
    return;
}

if (args.Length >= 2 && args[0] == "--render-svg")
{
    Console.Write(RenderSvg(args[1]));
    return;
}
string? line;
while ((line = Console.ReadLine()) is not null)
{
    try
    {
        var request = JsonSerializer.Deserialize<RpcRequest>(line, options) ?? throw new InvalidDataException("Invalid request");
        object result = request.Method switch
        {
            "ping" => new { name = "ACadSharp", version = typeof(CadDocument).Assembly.GetName().Version?.ToString(), protocol = 1 },
            "inspect" => Inspect(request.Params.GetProperty("path").GetString() ?? throw new InvalidDataException("Missing path")),
            _ => throw new NotSupportedException($"Unknown method: {request.Method}")
        };
        Console.WriteLine(JsonSerializer.Serialize(new { id = request.Id, success = true, result }, options));
    }
    catch (Exception ex)
    {
        Console.WriteLine(JsonSerializer.Serialize(new { id = (string?)null, success = false, error = ex.Message }, options));
    }
}

static object Inspect(string filePath)
{
    var fullPath = Path.GetFullPath(filePath);
    if (!File.Exists(fullPath)) throw new FileNotFoundException("CAD file not found", fullPath);
    var extension = Path.GetExtension(fullPath).ToLowerInvariant();
    CadDocument document = extension switch
    {
        ".dwg" => DwgReader.Read(fullPath),
        ".dxf" => DxfReader.Read(fullPath),
        _ => throw new NotSupportedException($"Unsupported CAD format: {extension}")
    };

    var entities = ReadEnumerable(document, "Entities").ToList();
    var layers = ReadEnumerable(document, "Layers")
        .Select(x => ReadString(x, "Name"))
        .Where(x => !string.IsNullOrWhiteSpace(x))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .OrderBy(x => x)
        .ToArray();
    var blocks = ReadEnumerable(document, "BlockRecords", "Blocks")
        .Select(x => ReadString(x, "Name"))
        .Where(x => !string.IsNullOrWhiteSpace(x))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .OrderBy(x => x)
        .ToArray();
    var entityTypes = entities.GroupBy(x => x.GetType().Name)
        .OrderByDescending(x => x.Count())
        .ToDictionary(x => x.Key, x => x.Count());

    return new
    {
        schemaVersion = 1,
        engine = "acadsharp",
        source = new { path = fullPath, name = Path.GetFileName(fullPath), size = new FileInfo(fullPath).Length, format = extension.TrimStart('.') },
        document = new
        {
            version = ReadString(document, "Version"),
            units = ReadString(document, "Units", "InsertionUnits"),
            entityCount = entities.Count,
            layerCount = layers.Length,
            blockCount = blocks.Length
        },
        layers,
        blocks,
        entityTypes,
        warnings = Array.Empty<string>()
    };
}

static string RenderSvg(string filePath)
{
    var fullPath = Path.GetFullPath(filePath);
    if (!File.Exists(fullPath)) throw new FileNotFoundException("CAD file not found", fullPath);
    CadDocument document = Path.GetExtension(fullPath).ToLowerInvariant() switch
    {
        ".dwg" => DwgReader.Read(fullPath),
        ".dxf" => DxfReader.Read(fullPath),
        var extension => throw new NotSupportedException($"Unsupported CAD format: {extension}")
    };
    var output = Path.Combine(Path.GetTempPath(), $"openme-{Guid.NewGuid():N}.svg");
    try
    {
        using (var writer = new SvgWriter(output, document)) writer.Write();
        return File.ReadAllText(output);
    }
    finally { try { File.Delete(output); } catch { } }
}
static IEnumerable<object> ReadEnumerable(object source, params string[] propertyNames)
{
    foreach (var name in propertyNames)
    {
        var value = source.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance)?.GetValue(source);
        if (value is IEnumerable enumerable)
        {
            foreach (var item in enumerable) if (item is not null) yield return item;
            yield break;
        }
    }
}

static string? ReadString(object source, params string[] propertyNames)
{
    foreach (var name in propertyNames)
    {
        var value = source.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance)?.GetValue(source);
        if (value is not null) return Convert.ToString(value);
    }
    return null;
}

internal sealed record RpcRequest(string Id, string Method, JsonElement Params);


