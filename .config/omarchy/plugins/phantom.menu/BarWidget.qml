import QtQuick
import qs.Ui

BarWidget {
  id: root
  moduleName: "omarchy.menu"

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: ""
    fontFamily: "omarchy"
    hasVisualContent: true
    fixedWidth: 24
    fixedHeight: 24
    horizontalMargin: 7.5
    onPressed: function(button) {
      if (!root.bar) return
      if (button === Qt.RightButton) root.bar.run("xdg-terminal-exec")
      else root.bar.run("omarchy-shell shell toggle omarchy.menu '{\"menu\":\"root\"}'")
    }

    AnimatedSprite {
      id: sprite
      anchors.centerIn: parent
      width: 22
      height: 22
      source: "/home/phantom/.config/waybar/gengar-sprite.png"
      frameWidth: 22
      frameHeight: 22
      frameCount: 21
      frameDuration: 100
      running: true
      interpolate: false
    }
  }
}