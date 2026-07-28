import json
from typing import Any

from pydantic import BaseModel, Field, field_validator

# Analytics payloads are unauthenticated and public — `metadata` previously had
# no size cap at all, so a single request could carry an arbitrarily large
# nested object straight into the database. These caps are generous relative
# to any real tracking payload (a few short key/value pairs) while bounding
# the worst case.
_MAX_METADATA_JSON_BYTES = 4096


class AnalyticsEventCreate(BaseModel):
    event_name: str = Field(min_length=1, max_length=80)
    page: str | None = Field(default=None, max_length=200)
    metadata: dict[str, Any] | None = None

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict[str, Any] | None) -> dict[str, Any] | None:
        if v is None:
            return v
        if len(json.dumps(v)) > _MAX_METADATA_JSON_BYTES:
            raise ValueError(f"metadata is too large — keep it under {_MAX_METADATA_JSON_BYTES} bytes of JSON.")
        return v
