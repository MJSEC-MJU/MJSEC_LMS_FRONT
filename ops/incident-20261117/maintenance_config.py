#!/usr/bin/env python3
"""Create a separate, minimal LMS maintenance candidate from an nginx config.

Usage: python3 maintenance_config.py INPUT OUTPUT

Only the two lms-back:8080 and one lms-front:80 proxy_pass directives may
change. The caller must test, install, reload, and handle rollback separately.
"""

import argparse
import os
from pathlib import Path
import re
import stat
import sys


PROXY_LINE = re.compile(
    rb"(?P<indent>[ \t]*)"
    rb"(?P<directive>proxy_pass[ \t]+http://"
    rb"(?P<upstream>lms-back:8080|lms-front:80)"
    rb"(?:[/?][^;\s\"'\\#]*)?[ \t]*;)"
    rb"[ \t]*"
)
LMS_HOST = re.compile(
    rb"(?<![A-Za-z0-9_-])lms-(?:back|front)(?![A-Za-z0-9_-])",
    re.IGNORECASE,
)
EXPECTED = {b"lms-back:8080": 2, b"lms-front:80": 1}


def active_bytes(source):
    """Mask comments without changing offsets; track unquoted positions.

    Nginx comments start at an unescaped # outside single/double quotes.
    Quoted content stays visible for the final conservative hostname check.
    """
    active = bytearray(source)
    unquoted = bytearray(len(source))
    quote = None
    escaped = False
    comment = False
    for index, value in enumerate(source):
        if comment:
            if value in (10, 13):
                comment = False
            else:
                active[index] = 32
            continue
        unquoted[index] = quote is None and not escaped
        if escaped:
            escaped = False
        elif value == 92:  # backslash
            escaped = True
        elif quote is not None:
            if value == quote:
                quote = None
        elif value in (34, 39):
            quote = value
        elif value == 35:  # #
            active[index] = 32
            comment = True
    return bytes(active), unquoted


def make_candidate(source):
    """Return validated candidate bytes, or raise ValueError before any write."""
    active, unquoted = active_bytes(source)
    counts = dict.fromkeys(EXPECTED, 0)
    result = []
    offset = 0
    previous_active = b""
    for original_line in source.splitlines(keepends=True):
        active_line = active[offset:offset + len(original_line)]
        # Remove only the physical line ending from the matching view.
        body = active_line
        if body.endswith(b"\r\n"):
            body = body[:-2]
        elif body.endswith((b"\r", b"\n")):
            body = body[:-1]
        match = PROXY_LINE.fullmatch(body)
        if (match is not None and unquoted[offset]
                and not previous_active.rstrip(b"\r\n").endswith(b"\\")):
            counts[match.group("upstream")] += 1
            # Preserve original bytes after the semicolon, including comments,
            # whitespace, and the exact newline convention.
            result.append(match.group("indent") + b"return 503;"
                          + original_line[match.end("directive"):])
        else:
            result.append(original_line)
        previous_active = active_line
        offset += len(original_line)
    if counts != EXPECTED:
        raise ValueError(
            "expected exactly 2 lms-back:8080 and 1 lms-front:80 proxy_pass "
            "directives; found {} and {}".format(
                counts[b"lms-back:8080"], counts[b"lms-front:80"]
            )
        )
    candidate = b"".join(result)
    if LMS_HOST.search(active_bytes(candidate)[0]):
        raise ValueError("candidate retains an active lms-back/lms-front hostname reference")
    return candidate


def read_regular_file(path):
    """Read a regular input, rejecting symbolic links and special files."""
    if not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError("input must be a regular file, not a symbolic link")
    flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags)
    with os.fdopen(descriptor, "rb") as source:
        if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
            raise ValueError("input must be a regular file")
        return source.read()


def write_new_candidate(path, candidate):
    """Exclusively create OUTPUT with owner-only permissions; never overwrite."""
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0)
    descriptor = os.open(path, flags, 0o600)
    try:
        with os.fdopen(descriptor, "wb") as output:
            if hasattr(os, "fchmod"):
                os.fchmod(output.fileno(), 0o600)
            else:
                os.chmod(path, 0o600)
            output.write(candidate)
            output.flush()
            os.fsync(output.fileno())
    except BaseException:
        path.unlink()
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args(argv)
    try:
        if args.input.resolve() == args.output.resolve():
            raise ValueError("output must be distinct from input")
        try:
            args.output.lstat()
        except FileNotFoundError:
            pass
        else:
            raise ValueError("output must not already exist")
        candidate = make_candidate(read_regular_file(args.input))
        write_new_candidate(args.output, candidate)
    except (OSError, ValueError) as error:
        parser.exit(1, "maintenance_config: {}\n".format(error))
    print("created {} (lms-back=2, lms-front=1; mode=0600)".format(args.output))
    return 0


if __name__ == "__main__":
    sys.exit(main())
