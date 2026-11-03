import uuid

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session, sessionmaker

from relay.auth.csrf import CSRF_HEADER
from relay.domain.notifications import NotificationKind, is_enabled, set_notification
from relay.domain.users import AppUser
from tests.conftest import AsUser, MakeUser

URL = "/api/v1/me/notifications"
ALL_ON = {"settings": [{"kind": "revalidation_reminder", "enabled": True}]}
ALL_OFF = {"settings": [{"kind": "revalidation_reminder", "enabled": False}]}


def test_acc_5_defaults_to_on(client: TestClient) -> None:
    res = client.get(URL)
    assert res.status_code == 200
    assert res.json() == ALL_ON


def test_acc_5_switch_off_and_on_again(client: TestClient) -> None:
    res = client.put(URL, json=ALL_OFF)
    assert res.status_code == 200
    assert res.json() == ALL_OFF
    assert client.get(URL).json() == ALL_OFF
    assert client.put(URL, json=ALL_ON).json() == ALL_ON
    assert client.get(URL).json() == ALL_ON


def test_acc_5_empty_update_changes_nothing(client: TestClient) -> None:
    client.put(URL, json=ALL_OFF)
    assert client.put(URL, json={"settings": []}).json() == ALL_OFF


def test_acc_5_unknown_kind_is_422(client: TestClient) -> None:
    res = client.put(URL, json={"settings": [{"kind": "weekly_digest", "enabled": False}]})
    assert res.status_code == 422
    assert client.get(URL).json() == ALL_ON


def test_acc_5_extra_field_is_422(client: TestClient) -> None:
    assert client.put(URL, json={**ALL_ON, "other": 1}).status_code == 422


def test_acc_5_settings_are_per_user(
    client: TestClient, make_user: MakeUser, as_user: AsUser
) -> None:
    client.put(URL, json=ALL_OFF)
    other = as_user(make_user("other@example.org", "Other"))
    assert other.get(URL).json() == ALL_ON


def test_acc_5_requires_session(anon_client: TestClient) -> None:
    assert anon_client.get(URL).status_code == 401
    assert anon_client.put(URL, json=ALL_ON).status_code == 401


def test_acc_5_write_requires_csrf_header(client: TestClient) -> None:
    del client.headers[CSRF_HEADER]
    assert client.put(URL, json=ALL_OFF).status_code == 403


def test_acc_5_is_enabled_helper(db: sessionmaker[Session], user: AppUser) -> None:
    kind = NotificationKind.REVALIDATION_REMINDER
    with db() as s:
        assert is_enabled(s, user.id, kind) is True
        set_notification(s, user.id, kind, False)
        s.commit()
    with db() as s:
        assert is_enabled(s, user.id, kind) is False
        assert is_enabled(s, uuid.uuid4(), kind) is True
        set_notification(s, user.id, kind, True)
        s.commit()
        assert is_enabled(s, user.id, kind) is True


@pytest.fixture
def alembic_cfg(app_database_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.attributes["database_url"] = app_database_url
    return cfg


def test_acc_5_migration_cycle(alembic_cfg: Config, app_database_url: str) -> None:
    from sqlalchemy import create_engine

    def has_table() -> bool:
        engine = create_engine(app_database_url)
        try:
            return inspect(engine).has_table("user_notification_setting")
        finally:
            engine.dispose()

    try:
        command.downgrade(alembic_cfg, "0008")
        assert not has_table()
        command.upgrade(alembic_cfg, "head")
        assert has_table()
    finally:
        command.upgrade(alembic_cfg, "head")
