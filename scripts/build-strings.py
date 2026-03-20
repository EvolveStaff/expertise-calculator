"""
build-strings.py
Parses SWG STF (String Table File) binary files and generates:
  - public/data/string_tables.json   (cmdNames, sklNames, statNames)
  - public/data/cmd_descriptions.json (command key -> description text)
  - public/data/stat_descriptions.json (stat key -> description text)

STF format:
  Header: magic(4) + version(1) + count(4) + total_count(4) = 13 bytes
  Section 1 (integer-ID entries):
    Repeated until sentinel mismatch:
      id(4) + sentinel=0xFFFFFFFF(4) + slen(4) + utf16le_text(slen*2)
  Section 2 (string-key -> id mapping):
    Repeated until EOF:
      id(4) + key_len(4) + ascii_key(key_len)
    The id references the display text in section 1.
"""

import struct
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
OUT_DIR = os.path.join(ROOT, "public", "data")


def parse_stf(path: str) -> tuple[dict[int, str], dict[str, str]]:
    """Parse an STF file. Returns (int_map, key_map) where:
    - int_map: integer_id -> display_text
    - key_map: string_key -> display_text
    """
    with open(path, "rb") as f:
        raw = f.read()

    # Section 1: integer-ID entries
    offset = 13
    int_map: dict[int, str] = {}
    while offset + 12 <= len(raw):
        sentinel = struct.unpack_from("<I", raw, offset + 4)[0]
        if sentinel != 0xFFFFFFFF:
            break
        id_ = struct.unpack_from("<I", raw, offset)[0]
        slen = struct.unpack_from("<I", raw, offset + 8)[0]
        if slen > 100_000:
            break
        text = raw[offset + 12 : offset + 12 + slen * 2].decode(
            "utf-16-le", errors="replace"
        )
        int_map[id_] = text
        offset += 12 + slen * 2

    # Section 2: string-key entries (id + key_len + ascii_key)
    key_map: dict[str, str] = {}
    off = offset
    while off + 8 <= len(raw):
        id_ = struct.unpack_from("<I", raw, off)[0]
        klen = struct.unpack_from("<I", raw, off + 4)[0]
        if klen == 0 or klen > 1000:
            break
        off += 8
        if off + klen > len(raw):
            break
        key = raw[off : off + klen].decode("ascii", errors="replace")
        off += klen
        if id_ in int_map:
            key_map[key] = int_map[id_]

    return int_map, key_map


def strip_name_prefix(text: str, display_name: str) -> str:
    """If text starts with 'DisplayName: body' or 'DisplayName\nbody', strip the prefix."""
    if not text:
        return text

    # Handle "Name: Description" single-line format
    first_line = text.split("\n")[0].strip()
    # Check for "Name: " prefix
    colon_prefix = display_name + ": "
    if first_line.lower().startswith(colon_prefix.lower()):
        rest = text[len(colon_prefix) :].strip()
        return rest

    # Check for exact name match on first line
    if first_line.lower() == display_name.lower():
        rest = text[len(first_line) :].lstrip("\n").strip()
        return rest

    return text


def main():
    print("Parsing STF files...")

    _, cmd_names = parse_stf(os.path.join(DATA_DIR, "cmd_n.stf"))
    _, cmd_descs = parse_stf(os.path.join(DATA_DIR, "cmd_d.stf"))
    _, skl_names = parse_stf(os.path.join(DATA_DIR, "skl_n.stf"))
    _, stat_names = parse_stf(os.path.join(DATA_DIR, "stat_n.stf"))
    _, stat_descs = parse_stf(os.path.join(DATA_DIR, "stat_ed.stf"))

    print(f"  cmd_n: {len(cmd_names)} keys")
    print(f"  cmd_d: {len(cmd_descs)} keys")
    print(f"  skl_n: {len(skl_names)} keys")
    print(f"  stat_n: {len(stat_names)} keys")
    print(f"  stat_ed: {len(stat_descs)} keys")

    # ── string_tables.json ───────────────────────────────────────────────────
    string_tables = {
        "cmdNames": cmd_names,
        "sklNames": skl_names,
        "statNames": stat_names,
    }
    out_path = os.path.join(OUT_DIR, "string_tables.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(string_tables, f, indent=2, ensure_ascii=False)
    print(f"\nWrote string_tables.json ({len(cmd_names)} cmd, {len(skl_names)} skl, {len(stat_names)} stat)")

    # ── cmd_descriptions.json ────────────────────────────────────────────────
    # Store full description text keyed by command string key.
    # The app strips the leading "AbilityName: " prefix at render time.
    cmd_desc_out: dict[str, str] = {}
    for key, desc in cmd_descs.items():
        cmd_desc_out[key] = desc.strip()

    out_path = os.path.join(OUT_DIR, "cmd_descriptions.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(cmd_desc_out, f, indent=2, ensure_ascii=False)
    print(f"Wrote cmd_descriptions.json ({len(cmd_desc_out)} entries)")

    # ── stat_descriptions.json ───────────────────────────────────────────────
    stat_desc_out: dict[str, str] = {}
    for key, desc in stat_descs.items():
        stat_desc_out[key] = desc.strip()

    out_path = os.path.join(OUT_DIR, "stat_descriptions.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(stat_desc_out, f, indent=2, ensure_ascii=False)
    print(f"Wrote stat_descriptions.json ({len(stat_desc_out)} entries)")

    # ── Coverage report ──────────────────────────────────────────────────────
    shared = set(cmd_names.keys()) & set(cmd_descs.keys())
    print(f"\nCmd coverage: {len(shared)}/{len(cmd_names)} names have descriptions")

    # Check which expertise commands from skills.tab have descriptions
    skills_path = os.path.join(DATA_DIR, "skills.tab")
    if os.path.exists(skills_path):
        with open(skills_path, "r", encoding="utf-8") as f:
            lines = f.read().split("\n")
        headers = lines[0].split("\t")
        cmd_idx = headers.index("COMMANDS") if "COMMANDS" in headers else -1
        name_idx = headers.index("NAME")

        expertise_cmds: set[str] = set()
        for line in lines[2:]:
            cols = line.split("\t")
            name = cols[name_idx] if name_idx < len(cols) else ""
            if "expertise" not in name.lower():
                continue
            if cmd_idx >= 0 and cmd_idx < len(cols) and cols[cmd_idx].strip():
                for cmd in re.split(r"[;,]", cols[cmd_idx]):
                    cmd = cmd.strip()
                    if cmd:
                        expertise_cmds.add(cmd)

        matched = expertise_cmds & set(cmd_descs.keys())
        print(f"Expertise cmd coverage: {len(matched)}/{len(expertise_cmds)} have descriptions")

        missing = expertise_cmds - set(cmd_descs.keys())
        if missing:
            print(f"Missing descriptions for: {sorted(missing)[:10]}...")


if __name__ == "__main__":
    main()
