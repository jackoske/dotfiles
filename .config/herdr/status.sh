#!/bin/sh

cpu=$(top -bn1 2>/dev/null | awk '/Cpu\(s\)/ { printf "%d%%", $2 + $4; exit }')
memory=$(free 2>/dev/null | awk '/Mem:/ { printf "%d%%", ($3 / $2) * 100; exit }')
disk=$(df -P / 2>/dev/null | awk 'NR == 2 { gsub("%", "", $5); printf "%d%%", $5; exit }')

[ -n "$cpu" ] || cpu="n/a"
[ -n "$memory" ] || memory="n/a"
[ -n "$disk" ] || disk="n/a"

printf 'CPU %s  MEM %s  DISK %s\n' "$cpu" "$memory" "$disk"
