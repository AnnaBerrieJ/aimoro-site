from agent.notify import email_html


def test_email_html_has_signature_and_escapes():
    out = email_html("Hi Kim,\n\nYour quote <is> ready.\n\nView: https://aimoro.co/my-requests/5")
    assert "email-logo.png" in out and "AIMORO" in out and "wa.me/12816736703" in out
    assert "&lt;is&gt;" in out
    assert 'href="https://aimoro.co/my-requests/5"' in out
