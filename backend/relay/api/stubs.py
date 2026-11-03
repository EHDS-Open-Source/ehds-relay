from typing import NoReturn

from fastapi import HTTPException, status


def not_implemented() -> NoReturn:
    """Body of a route whose shape is defined but whose logic has not landed yet.

    The route still appears in the OpenAPI spec, so clients can be generated against it.
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")
