"""End-to-end check of the password flows against the running dev stack (Tilt).

Drives Keycloak's own pages the way a browser would and reads the emails from Mailpit:

  1. registration: a weak password is refused, a valid one is accepted, the verification email
     arrives and its link signs the new user in to the app;
  2. forgotten password: the reset page answers the same for a registered and an unknown address,
     only the registered one gets an email, the link sets a new password and works only once,
     and afterwards the new password works and the old one does not;
  3. change password: a signed-in user goes through the account page's link, is asked for the
     current password, sets a new one and comes back to /account?password=success.

It also reads the realm through the admin API to check the password policy, the link lifetime
and the client's base URL. Each run uses a new random user, so it can be repeated.

Run with `make check_password_flows` (needs `make tilt` and the web dev server). Ports come from
the environment (`.dev.env`): WEB_PORT, KEYCLOAK_LOCAL_PORT, MAILPIT_UI_LOCAL_PORT.
`--check-expiry` also waits for a reset link to expire (a little over five minutes).
"""

import argparse
import html
import os
import re
import secrets
import sys
import time
from html.parser import HTMLParser
from urllib.parse import urljoin

import requests
from requests.cookies import RequestsCookieJar

WEB = f"http://localhost:{os.environ.get('WEB_PORT', '5173')}"
KEYCLOAK = f"http://localhost:{os.environ.get('KEYCLOAK_LOCAL_PORT', '8080')}"
MAILPIT = f"http://localhost:{os.environ.get('MAILPIT_UI_LOCAL_PORT', '8025')}"
REALM = os.environ.get("KEYCLOAK_REALM", "ehds-relay")
ADMIN_USER = os.environ.get("KEYCLOAK_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("KEYCLOAK_ADMIN_PASSWORD", "admin")

EXPECTED_POLICY = (
    "length(12) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1)"
    " and notUsername and notEmail and maxLength(128)"
)
EXPECTED_LIFESPAN_SECONDS = 300
ACTION_LINK = re.compile(
    r"https?://[^\s\"'<>]+/login-actions/action-token\?[^\s\"'<>]+"
)
TIMEOUT = 15


class CheckError(Exception):
    pass


def check(condition: bool, message: str) -> None:
    if not condition:
        raise CheckError(message)


def need[T](value: T | None, message: str) -> T:
    if value is None:
        raise CheckError(message)
    return value


def step(message: str) -> None:
    print(f"  - {message}")


# Browser stand-in


class LocalhostCookies(RequestsCookieJar):
    """Send Secure cookies to localhost over http, as Chrome and Firefox do. Keycloak marks its
    login cookies Secure even on http, and requests would otherwise drop them. (A cookie policy
    would not help: requests copies the jar into a new one for every request.)"""

    def set_cookie(self, cookie, *args, **kwargs):
        cookie.secure = False
        super().set_cookie(cookie, *args, **kwargs)


def browser() -> requests.Session:
    session = requests.Session()
    session.cookies = LocalhostCookies()
    return session


class Page(HTMLParser):
    """Forms, links and visible text of an HTML page."""

    def __init__(self, response: requests.Response):
        super().__init__(convert_charrefs=True)
        self.url = response.url
        self.forms: list[dict] = []
        self.links: list[tuple[str, str]] = []
        self._text: list[str] = []
        self._skip = 0
        self._link: list | None = None
        self.feed(response.text)
        self.text = " ".join(" ".join(self._text).split())

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if tag in ("script", "style"):
            self._skip += 1
        elif tag == "form":
            self.forms.append(
                {
                    "id": a.get("id", ""),
                    "action": urljoin(self.url, a.get("action", "")),
                    "fields": {},
                }
            )
        elif (
            tag in ("input", "button", "textarea", "select")
            and self.forms
            and a.get("name")
        ):
            if a.get("type") in ("checkbox", "radio") and "checked" not in a:
                return
            if a["name"].startswith(
                "cancel"
            ):  # a "Cancel" button is only sent when clicked
                return
            self.forms[-1]["fields"].setdefault(a["name"], a.get("value", ""))
        elif tag == "a" and a.get("href"):
            self._link = [urljoin(self.url, a["href"]), ""]

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1
        elif tag == "a" and self._link is not None:
            self.links.append((self._link[0], " ".join(self._link[1].split())))
            self._link = None

    def handle_data(self, data):
        if self._skip:
            return
        self._text.append(data)
        if self._link is not None:
            self._link[1] += data

    def form_with(self, *fields: str) -> dict | None:
        for form in self.forms:
            if all(f in form["fields"] for f in fields):
                return form
        return None

    def link(self, href_part: str) -> str | None:
        return next((href for href, _ in self.links if href_part in href), None)


def submit(session: requests.Session, form: dict, **values: str) -> requests.Response:
    data = {**form["fields"], **values}
    return session.post(form["action"], data=data, timeout=TIMEOUT)


def on_web(response: requests.Response) -> bool:
    return response.url.startswith(WEB)


def signed_in(session: requests.Session) -> bool:
    return session.get(f"{WEB}/api/v1/me", timeout=TIMEOUT).status_code == 200


def start(session: requests.Session, **params: str) -> Page:
    res = session.get(f"{WEB}/api/v1/auth/login", params=params, timeout=TIMEOUT)
    check(
        res.status_code == 200, f"login start answered {res.status_code} at {res.url}"
    )
    check(
        res.url.startswith(KEYCLOAK),
        f"login did not reach Keycloak, ended at {res.url}",
    )
    return Page(res)


def proceed(session: requests.Session, res: requests.Response) -> requests.Response:
    """Follow Keycloak's "Click here to proceed" page if it shows one."""
    if res.url.startswith(KEYCLOAK):
        page = Page(res)
        for href, text in page.links:
            if "proceed" in text.lower() and "login-actions" in href:
                return session.get(href, timeout=TIMEOUT)
    return res


def sign_in(username: str, password: str) -> tuple[requests.Session, requests.Response]:
    session = browser()
    form = need(
        start(session, redirect="/").form_with("username", "password"),
        "no sign-in form on Keycloak's page",
    )
    return session, submit(session, form, username=username, password=password)


# Mailpit


def mails_to(address: str) -> list[dict]:
    res = requests.get(
        f"{MAILPIT}/api/v1/search", params={"query": f'to:"{address}"'}, timeout=TIMEOUT
    )
    res.raise_for_status()
    return res.json().get("messages") or []


def wait_for_mail(
    address: str, subject_part: str, count: int = 1, seconds: int = 30
) -> list[dict]:
    deadline = time.monotonic() + seconds
    while True:
        found = [
            m for m in mails_to(address) if subject_part.lower() in m["Subject"].lower()
        ]
        if len(found) >= count or time.monotonic() > deadline:
            return found
        time.sleep(1)


def action_link(message: dict) -> str:
    res = requests.get(f"{MAILPIT}/api/v1/message/{message['ID']}", timeout=TIMEOUT)
    res.raise_for_status()
    body = res.json()
    for part in (body.get("Text") or "", html.unescape(body.get("HTML") or "")):
        found = ACTION_LINK.search(part)
        if found:
            return found.group(0)
    raise CheckError(f"no link in the email '{message['Subject']}'")


# Checks


def check_realm() -> None:
    print("Realm settings (admin API)")
    token = requests.post(
        f"{KEYCLOAK}/realms/master/protocol/openid-connect/token",
        data={
            "client_id": "admin-cli",
            "grant_type": "password",
            "username": ADMIN_USER,
            "password": ADMIN_PASSWORD,
        },
        timeout=TIMEOUT,
    )
    check(token.status_code == 200, f"admin sign-in failed: {token.status_code}")
    headers = {"Authorization": f"Bearer {token.json()['access_token']}"}
    realm = requests.get(
        f"{KEYCLOAK}/admin/realms/{REALM}", headers=headers, timeout=TIMEOUT
    ).json()
    check(
        realm.get("passwordPolicy") == EXPECTED_POLICY,
        f"policy is {realm.get('passwordPolicy')!r}",
    )
    step("password policy set")
    lifespan = realm.get("actionTokenGeneratedByUserLifespan")
    check(lifespan == EXPECTED_LIFESPAN_SECONDS, f"email link lifetime is {lifespan}")
    step(f"email links expire after {lifespan} s")
    for flag in ("registrationAllowed", "resetPasswordAllowed", "verifyEmail"):
        check(realm.get(flag) is True, f"{flag} is not on")
    clients = requests.get(
        f"{KEYCLOAK}/admin/realms/{REALM}/clients",
        params={"clientId": "ehds-relay-bff"},
        headers=headers,
        timeout=TIMEOUT,
    ).json()
    base_url = clients[0].get("baseUrl") if clients else None
    check(base_url == f"{WEB}/", f"client baseUrl is {base_url!r}, expected {WEB}/")
    step(f"client base URL is {base_url}")


def check_registration(username: str, email: str, password: str) -> requests.Session:
    print("Registration")
    session = browser()
    page = start(session, signup="true", redirect="/")
    # Keycloak 26 with "verify email" on asks for the password only after the address is verified;
    # the registration page then has no password fields. Older setups ask for it up front.
    form = need(
        page.form_with("email", "username"),
        "no registration form (is registration allowed?)",
    )
    details = {
        "firstName": "Pat",
        "lastName": "Check",
        "email": email,
        "username": username,
    }
    password_on_form = "password" in form["fields"]

    if password_on_form:
        weak = "short"
        res = submit(
            session, form, **details, password=weak, **{"password-confirm": weak}
        )
        page = Page(res)
        form = need(
            page.form_with("email", "password", "password-confirm"),
            "weak password accepted",
        )
        check(
            "invalid password" in page.text.lower(),
            f"no policy message: {page.text[:200]}",
        )
        step(f"weak password refused: {_message(page)}")
        res = submit(
            session,
            form,
            **details,
            password=password,
            **{"password-confirm": password},
        )
    else:
        res = submit(session, form, **details)
    page = Page(res)
    check(
        "verify" in page.text.lower(),
        f"no verify-email page after registering: {page.text[:200]}",
    )
    step("registration accepted; asked to verify the email address")

    mails = wait_for_mail(email, "verif")
    check(len(mails) == 1, f"expected one verification email, got {len(mails)}")
    link = action_link(mails[0])
    step("verification email arrived in Mailpit")

    res = proceed(session, session.get(link, timeout=TIMEOUT))
    if not password_on_form:
        page = Page(res)
        form = need(
            page.form_with("password-new", "password-confirm"),
            f"no set-password page after verifying the email: {page.text[:200]}",
        )
        step("verification link leads to a set-password page")
        weak = "short"
        res = submit(session, form, **{"password-new": weak, "password-confirm": weak})
        page = Page(res)
        form = need(
            page.form_with("password-new", "password-confirm"), "weak password accepted"
        )
        check(
            "invalid password" in page.text.lower(),
            f"no policy message: {page.text[:200]}",
        )
        step(f"weak password refused: {_message(page)}")
        res = submit(
            session, form, **{"password-new": password, "password-confirm": password}
        )
    check(on_web(res), f"registration did not lead back to the app: {res.url}")
    check(signed_in(session), "not signed in after registering")
    step("new user chose a valid password and is signed in")
    return session


def _message(page: Page) -> str:
    """The first sentence-like bit of a Keycloak page that looks like an error."""
    found = re.search(r"Invalid password[^.]*\.", page.text)
    return found.group(0) if found else page.text[:120]


def request_reset(session: requests.Session, address: str) -> Page:
    page = start(session, redirect="/")
    reset = need(
        page.link("reset-credentials"),
        "no 'Forgot Password?' link on Keycloak's sign-in page",
    )
    page = Page(session.get(reset, timeout=TIMEOUT))
    form = need(page.form_with("username"), "no form on the reset page")
    return Page(submit(session, form, username=address))


def check_reset(
    username: str, email: str, old_password: str, new_password: str
) -> None:
    print("Forgotten password")
    session = browser()
    known = request_reset(session, email)
    unknown_address = f"nobody-{secrets.token_hex(6)}@example.org"
    unknown = request_reset(browser(), unknown_address)
    check(
        known.text == unknown.text,
        "reset page differs for a registered and an unknown address",
    )
    step(f"same answer for a registered and an unknown address: '{known.text[:90]}…'")

    mails = wait_for_mail(email, "reset")
    check(len(mails) == 1, f"expected one reset email, got {len(mails)}")
    time.sleep(3)  # give a wrongly sent email to the unknown address time to arrive
    check(mails_to(unknown_address) == [], "an email was sent to an unknown address")
    step("one email to the registered address, none to the unknown one")
    link = action_link(mails[0])

    page = Page(proceed(session, session.get(link, timeout=TIMEOUT)))
    form = need(
        page.form_with("password-new", "password-confirm"),
        f"reset link shows no new-password form: {page.text[:200]}",
    )
    res = submit(
        session,
        form,
        **{"password-new": new_password, "password-confirm": new_password},
    )
    check(
        on_web(res) and signed_in(session), f"not signed in after the reset: {res.url}"
    )
    step("reset link set a new password and signed in")

    again = Page(browser().get(link, timeout=TIMEOUT))
    check(again.form_with("password-new") is None, "reset link works a second time")
    step(f"second use of the link refused: '{again.text[:90]}…'")

    _, res = sign_in(username, old_password)
    check(not on_web(res), "old password still works")
    _, res = sign_in(email, new_password)
    check(on_web(res), "new password does not work")
    step("old password refused, new password works")


def check_link_back_to_app(email: str) -> None:
    """A reset link opened in another browser ends on Keycloak; it should offer a way back."""
    request_reset(browser(), email)
    mails = wait_for_mail(email, "reset", count=2)
    check(len(mails) >= 2, "no second reset email")
    other = browser()
    page = Page(proceed(other, other.get(action_link(mails[0]), timeout=TIMEOUT)))
    form = need(
        page.form_with("password-new", "password-confirm"),
        "reset link in another browser shows no new-password form",
    )
    return_password = f"Back-{secrets.token_hex(4)}-9!"
    res = submit(
        other,
        form,
        **{"password-new": return_password, "password-confirm": return_password},
    )
    page = Page(res)
    if on_web(res):
        step("reset link opened in another browser went straight back to the app")
    else:
        back = need(page.link(WEB), f"no 'Back to application' link: {page.text[:200]}")
        step(f"reset in another browser offers a link back to the app ({back})")
    _, res = sign_in(email, return_password)
    check(on_web(res), "password set from another browser does not work")


def check_expiry(email: str) -> None:
    print("Link lifetime")
    count = len(wait_for_mail(email, "reset", count=99, seconds=0))
    request_reset(browser(), email)
    mails = wait_for_mail(email, "reset", count=count + 1)
    check(len(mails) > count, "no new reset email")
    link = action_link(mails[0])
    wait = EXPECTED_LIFESPAN_SECONDS + 15
    step(f"waiting {wait} s for the link to expire")
    time.sleep(wait)
    page = Page(browser().get(link, timeout=TIMEOUT))
    check(
        page.form_with("password-new") is None,
        "reset link still works after its lifetime",
    )
    step(f"expired link refused: '{page.text[:90]}…'")


def check_change_password(
    session: requests.Session, username: str, current: str, new: str
) -> None:
    print("Change password")
    page = start(session, action="change_password", redirect="/account")
    form = need(
        page.form_with("password"),
        "change password did not ask for the current password",
    )
    values = {"password": current}
    if "username" in form["fields"]:
        values["username"] = username
    page = Page(submit(session, form, **values))
    form = need(
        page.form_with("password-new", "password-confirm"),
        f"no update-password form after the current password: {page.text[:200]}",
    )
    step("asked for the current password, then for a new one")
    res = submit(session, form, **{"password-new": new, "password-confirm": new})
    check(
        res.url == f"{WEB}/account?password=success",
        f"expected to land on /account?password=success, got {res.url}",
    )
    check(signed_in(session), "not signed in after changing the password")
    step("back on /account?password=success")
    _, res = sign_in(username, current)
    check(not on_web(res), "the previous password still works")
    _, res = sign_in(username, new)
    check(on_web(res), "the new password does not work")
    step("previous password refused, new password works")


def main() -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    parser.add_argument(
        "--check-expiry", action="store_true", help="wait for a link to expire"
    )
    args = parser.parse_args()

    suffix = secrets.token_hex(4)
    username = f"pw-{suffix}"
    email = f"pw-{suffix}@example.org"
    first, second, third = (f"Check-{secrets.token_hex(3)}-{n}a!" for n in (1, 2, 3))
    print(f"Web {WEB}, Keycloak {KEYCLOAK}, Mailpit {MAILPIT}; test user {email}")
    try:
        check_realm()
        session = check_registration(username, email, first)
        check_change_password(session, username, first, second)
        check_reset(username, email, second, third)
        check_link_back_to_app(email)
        if args.check_expiry:
            check_expiry(email)
    except CheckError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    except requests.ConnectionError as exc:
        print(
            f"FAIL: cannot reach the dev stack (is `make tilt` running?): {exc}",
            file=sys.stderr,
        )
        return 1
    print("OK: password flows work")
    return 0


if __name__ == "__main__":
    sys.exit(main())
