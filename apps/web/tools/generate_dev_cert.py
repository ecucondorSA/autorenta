#!/usr/bin/env python3
"""Generate a self-signed HTTPS certificate for local development.

Creates `local-dev.crt` and `local-dev.key` in the project root using OpenSSL.
Fails fast if either file already exists so you do not overwrite an existing certificate.
"""
from __future__ import annotations

import subprocess
from pathlib import Path


CERT_PATH = Path("local-dev.crt")
KEY_PATH = Path("local-dev.key")


def main() -> None:
    if CERT_PATH.exists() or KEY_PATH.exists():
        raise SystemExit(
            "Ya existen local-dev.crt o local-dev.key; elimina o renómbralos antes de continuar."
        )

    cmd = [
        "openssl",
        "req",
        "-x509",
        "-nodes",
        "-days",
        "365",
        "-newkey",
        "rsa:2048",
        "-keyout",
        str(KEY_PATH),
        "-out",
        str(CERT_PATH),
        "-subj",
        "/CN=localhost",
    ]

    subprocess.run(cmd, check=True)

    print(f"Certificado generado en {CERT_PATH.resolve()}")
    print(f"Clave privada generada en {KEY_PATH.resolve()}")


if __name__ == "__main__":
    main()
