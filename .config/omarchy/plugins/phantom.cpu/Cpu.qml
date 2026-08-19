import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "phantom.cpu"

  property string usage: "--"

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  function refresh() {
    if (!gpuProc.running) gpuProc.running = true
  }

  Process {
    id: gpuProc
    command: ["sh", "-c", "for d in /sys/class/drm/card*/device; do [ -r \"$d/gpu_busy_percent\" ] || continue; [ \"$(cat \"$d/boot_vga\" 2>/dev/null)\" = 1 ] && continue; cat \"$d/gpu_busy_percent\"; exit; done; for d in /sys/class/drm/card*/device; do [ -r \"$d/gpu_busy_percent\" ] && cat \"$d/gpu_busy_percent\" && exit; done"]
    stdout: StdioCollector {
      onStreamFinished: {
        var value = text.trim()
        if (/^\d+$/.test(value)) root.usage = value
      }
    }
  }

  Timer {
    interval: 5000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "\uf2db"
    fontSize: 10
    foreground: root.usage === "--"
      ? "#a9b1d6"
      : Number(root.usage) >= 80
        ? "#ff5555"
        : Number(root.usage) >= 50 ? "#f1fa8c" : "#00ff41"
    tooltipText: "AMD GPU usage: " + root.usage + "%\nClick to open radeontop"
    onPressed: root.bar.run("omarchy-launch-or-focus-tui radeontop")
  }
}
