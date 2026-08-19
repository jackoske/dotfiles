-- Change the default Omarchy look'n'feel

hl.config({
  general = {
    -- No gaps between windows or borders
    gaps_in = 2,
    gaps_out = 2.4,
    border_size = 2,

    -- Drag window borders to resize
    resize_on_border = true,
    extend_border_grab_area = 15,
  },

  decoration = {
    -- Use round window corners
    rounding = 8,
  },

  group = {
    auto_group = false,
    col = {
      border_locked_active = "rgba(ebdbb2ff)",
      border_locked_inactive = "rgba(665c54ff)",
    },
  },

  binds = {
    workspace_back_and_forth = true,
    allow_workspace_cycles = true,
  },

  misc = {
    force_default_wallpaper = 0,
  },
})
