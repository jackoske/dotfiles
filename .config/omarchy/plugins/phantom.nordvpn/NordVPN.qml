import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "phantom.nordvpn"

  property bool connected: false
  property string status: "Checking..."

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  function refresh() {
    if (!statusProc.running) statusProc.running = true
  }

  Process {
    id: statusProc
    command: ["sh", "-c", "nordvpn status 2>/dev/null"]
    stdout: StdioCollector {
      onStreamFinished: {
        var output = text.trim()
        root.connected = /^Status:\s*Connected/im.test(output)
        root.status = output.split("\n")[0] || "Unavailable"
      }
    }
    onExited: function(code) {
      if (code !== 0 && !root.connected) root.status = "NordVPN unavailable"
    }
  }

  Timer {
    interval: 15000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "\uf023"
    fontSize: 10
    foreground: root.connected ? "#00ff41" : "#ff5555"
    tooltipText: root.status
    onPressed: root.bar.run("omarchy-launch-floating-terminal-with-presentation nordvpn status")
  }
}
