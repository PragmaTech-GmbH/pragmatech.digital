{{- $author := index site.Data.authors (.Params.author | default "philip") -}}
# {{ .Title }}

- Author: {{ $author.name }}
- Published: {{ .Date.Format "2006-01-02" }}
- Updated: {{ .Lastmod.Format "2006-01-02" }}
- Source: {{ .Permalink }}

{{ .RawContent | replaceRE `\]\(/` (printf "](%s" site.Home.Permalink) }}
