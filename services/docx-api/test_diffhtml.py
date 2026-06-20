"""Gate corpus for the structural HTML redline (run: python test_diffhtml.py).

Asserts the capabilities that motivated moving the diff into Python on xmldiff:
structural tag changes (h2->h3, td->th), figure swaps, move detection, and atomic
math protection. Output is pre-sanitize (the Node worker DOMPurify-gates it).
"""

from diffhtml import diff_html


def test_word_change():
    out = diff_html("<p>The quick brown fox</p>", "<p>The slow brown fox</p>")
    assert "<del>quick</del>" in out and "<ins>slow</ins>" in out
    assert "brown fox" in out


def test_heading_level_change_is_structural():
    out = diff_html("<h2>Title</h2>", "<h3>Title</h3>")
    assert "<del><h2>Title</h2></del>" in out
    assert "<ins><h3>Title</h3></ins>" in out


def test_cell_type_change_is_structural():
    out = diff_html(
        "<table><tr><td>cell</td></tr></table>",
        "<table><tr><th>cell</th></tr></table>",
    )
    assert "<del><td>cell</td></del>" in out and "<ins><th>cell</th></ins>" in out


def test_paragraph_move_badged_not_deleted_and_reinserted():
    a = "<p>Alpha block.</p><p>Beta block.</p><p>Gamma block.</p>"
    b = "<p>Gamma block.</p><p>Alpha block.</p><p>Beta block.</p>"
    out = diff_html(a, b)
    assert '<ins class="moved"><p>Gamma block.</p></ins>' in out
    # the old-position copy is dropped, not shown as a deletion
    assert "<del><p>Gamma block.</p></del>" not in out


def test_inserted_paragraph():
    out = diff_html("<p>one</p><p>three</p>", "<p>one</p><p>two</p><p>three</p>")
    assert "<ins><p>two</p></ins>" in out


def test_figure_swap():
    out = diff_html(
        '<p><img src="figures/aaa.png"></p>', '<p><img src="figures/bbb.png"></p>'
    )
    assert '<del><img src="figures/aaa.png"></del>' in out
    assert '<ins><img src="figures/bbb.png"></ins>' in out


def test_changed_equation_is_atomic_matheq():
    a = '<p>E <span class="math inline">E=mc^2</span> x</p>'
    b = '<p>E <span class="math inline">E=mc^3</span> x</p>'
    out = diff_html(a, b)
    assert '<del class="matheq"><span class="math inline">E=mc^2</span></del>' in out
    assert '<ins class="matheq"><span class="math inline">E=mc^3</span></ins>' in out
    assert "xeqx" not in out and "mathtok" not in out  # tokens fully restored


def test_unchanged_equation_not_diffed():
    a = '<p>See <span class="math inline">a+b</span> now</p>'
    b = '<p>See <span class="math inline">a+b</span> later</p>'
    out = diff_html(a, b)
    assert '<span class="math inline">a+b</span>' in out
    assert "matheq" not in out  # the equation itself is unchanged
    assert "<del>now</del>" in out and "<ins>later</ins>" in out


def test_inline_spacing_preserved():
    out = diff_html("<p>alpha beta gamma</p>", "<p>alpha BETA gamma</p>")
    assert "alpha " in out and " gamma" in out  # spaces not eaten by normalization


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
