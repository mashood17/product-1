"""
Cloudflare R2 storage helper.

Supabase remains responsible for database/auth.
Cloudflare R2 is responsible for media objects.

The application keeps its existing logical bucket names
(e.g. hero, hero-videos, video-gallery), but stores them
as prefixes inside the single R2 bucket configured by env.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.config import Config

from app.core.config import get_settings


@lru_cache
def get_r2_client():
    settings = get_settings()

    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def _bucket_key(logical_bucket: str, storage_path: str) -> str:
    """
    Preserve the existing logical Supabase bucket/path model
    while storing everything inside one physical R2 bucket.
    """
    return f"{logical_bucket.strip('/')}/{storage_path.lstrip('/')}"


def upload_file(
    logical_bucket: str,
    storage_path: str,
    file: BinaryIO,
    content_type: str,
    cache_control: str | None = None,
) -> None:
    params = {
        "Bucket": get_settings().r2_bucket_name,
        "Key": _bucket_key(logical_bucket, storage_path),
        "Body": file,
        "ContentType": content_type,
    }

    if cache_control:
        params["CacheControl"] = cache_control

    get_r2_client().put_object(**params)


def upload_path(
    logical_bucket: str,
    storage_path: str,
    file_path: Path,
    content_type: str,
    cache_control: str | None = None,
) -> None:
    with file_path.open("rb") as file:
        upload_file(
            logical_bucket=logical_bucket,
            storage_path=storage_path,
            file=file,
            content_type=content_type,
            cache_control=cache_control,
        )


def delete_file(logical_bucket: str, storage_path: str) -> None:
    get_r2_client().delete_object(
        Bucket=get_settings().r2_bucket_name,
        Key=_bucket_key(logical_bucket, storage_path),
    )


def delete_files(logical_bucket: str, storage_paths: list[str]) -> None:
    if not storage_paths:
        return

    client = get_r2_client()
    bucket = get_settings().r2_bucket_name

    # DeleteObjects supports up to 1000 objects per request.
    for start in range(0, len(storage_paths), 1000):
        batch = storage_paths[start : start + 1000]

        client.delete_objects(
            Bucket=bucket,
            Delete={
                "Objects": [
                    {"Key": _bucket_key(logical_bucket, path)}
                    for path in batch
                ],
                "Quiet": True,
            },
        )


def public_url(logical_bucket: str, storage_path: str) -> str:
    base_url = get_settings().r2_public_base_url.rstrip("/")
    return f"{base_url}/{_bucket_key(logical_bucket, storage_path)}"