-- See https://wiki.hypr.land/Configuring/Basics/Monitors/
-- List current monitors and resolutions possible: hyprctl monitors all

-- Dell P2422HE - physically LEFT, rotated 90° clockwise (transform=1)
-- Rotated: logical size becomes 1080w x 1920h
-- hl.monitor({ output = "HDMI-A-1", mode = "1920x1080@60", position = "0x0", scale = 1, transform = 1 })

-- WAM 27" FHD - physically MIDDLE, positioned after Dell's 1080px logical width
hl.monitor({ output = "DP-1", mode = "1920x1080@60", position = "1080x0", scale = 1 })

-- Laptop (HiDPI 2560x1440 on 13") - physically RIGHT, scale 1.25 → logical 2048x1152
hl.monitor({ output = "eDP-1", mode = "2560x1440@165", position = "3000x0", scale = 1.25 })

-- Catch-all: any monitor not matched above gets preferred settings
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = 1 })
