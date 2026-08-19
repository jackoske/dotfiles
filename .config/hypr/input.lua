-- Control your input devices
-- See https://wiki.hypr.land/Configuring/Basics/Variables/#input

hl.config({
  input = {
    -- Use multiple keyboard layouts and switch between them with Left Alt + Right Alt
    kb_layout = "us, de",
    kb_options = "compose:caps",

    -- Change speed of keyboard repeat
    repeat_rate = 30,
    repeat_delay = 300,

    -- Start with numlock on by default
    numlock_by_default = true,

    touchpad = {
      -- Use natural (inverse) scrolling
      natural_scroll = true,

      -- Use two-finger clicks for right-click instead of lower-right corner
      clickfinger_behavior = true,

      -- Control the speed of your scrolling
      scroll_factor = 0.4,

      -- Disabled 3-finger drag so 3-finger swipe can switch workspaces
      drag_3fg = 0,
    },
  },

})

-- Scroll nicely in the terminal
o.window("(Alacritty|kitty|foot)", { scroll_touchpad = 1.5 })
o.window("com.mitchellh.ghostty", { scroll_touchpad = 0.2 })

-- Enable touchpad gestures for changing workspaces
-- See https://wiki.hypr.land/Configuring/Advanced-and-Cool/Gestures/
hl.gesture({ fingers = 3, direction = "horizontal", action = "workspace" })
