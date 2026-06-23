"""Unit tests for the bundle fingerprint + md->HTML (run: python test_bundle_meta.py).

Needs pandoc on PATH (docling itself is NOT required — `safe_version` tolerates its
absence, and these assert internal consistency, not the live version strings).
"""

import bundle_meta


def test_health_and_meta_fingerprint_parity():
    """The `/` health fields and the bundle meta MUST agree byte-for-byte, else the
    Node artifact cache pre-check can never hit the key the bundle actually wrote."""
    fp = bundle_meta.fingerprint()
    meta = bundle_meta.build_meta("paper.pdf", "1.10.0", 3, None)
    for key in ("pandocVersion", "normalizerConfigHash", "schemaVersion"):
        assert fp[key] == meta[key], key


def test_schema_version_is_integer_not_docling_string():
    """Guards the type/semantics trap: docling's per-doc schema is a string
    ("1.10.0"); the cache-key column is an integer recipe version."""
    assert isinstance(bundle_meta.SCHEMA_VERSION, int)
    meta = bundle_meta.build_meta("p.pdf", "1.10.0", 0, None)
    assert isinstance(meta["schemaVersion"], int)
    assert meta["doclingDocSchema"] == "1.10.0"  # the string lives here, not the column


def test_meta_has_all_node_bundlemeta_fields():
    """Node's BundleMeta requires these keys; artifactKey throws without pandocVersion."""
    meta = bundle_meta.build_meta("p.pdf", "1.10.0", 2, "some warning")
    for key in ("pandocVersion", "libreofficeVersion", "normalizerConfigHash",
                "schemaVersion", "warnings"):
        assert key in meta
    assert meta["libreofficeVersion"] is None  # unused on the PDF path
    assert meta["figures"] == 2
    assert meta["warnings"] == "some warning"


def test_config_hash_is_stable_and_folds_docling():
    """The hash is deterministic and includes the docling versions (so a docling
    bump yields a new cache key — C4/C7)."""
    assert len(bundle_meta.NORMALIZER_CONFIG_HASH) == 64
    assert "doclingVersion" in bundle_meta.NORMALIZER_CONFIG
    assert "do_formula_enrichment" in bundle_meta.NORMALIZER_CONFIG["pdfPipeline"]


def test_md_to_html_emits_math_spans():
    """pandoc's default HTML math output is `<span class="math ...">`, which the diff
    protects atomically and KaTeX renders."""
    html, _ = bundle_meta.md_to_html("Inline $E=mc^2$ and display $$\\int x\\,dx$$.")
    assert 'class="math inline"' in html
    assert 'class="math display"' in html


def test_md_to_html_preserves_figure_refs():
    html, _ = bundle_meta.md_to_html("![](figures/abc123.png)")
    assert 'src="figures/abc123.png"' in html


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
