from pydantic import BaseModel, ConfigDict


class DTO(BaseModel):
    """Response shape of a domain model; built from ORM attributes by FastAPI's response_model."""

    model_config = ConfigDict(from_attributes=True)


class RequestDTO(BaseModel):
    """Request body. Unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid")
