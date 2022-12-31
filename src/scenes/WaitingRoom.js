import Phaser from "phaser";

export default class WaitingRoom extends Phaser.Scene {
  constructor() {
    super("WaitingRoom");
    this.state = {};
    this.hasBeenSet = false;
  }

  init(data) {
    this.socket = data.socket;
  }

  preload() {
    this.load.html("codeform", "assets/html/codeform.html");
  }

  create() {
    const scene = this;

    scene.input.keyboard.clearCaptures(); // so we can use spacebar
    scene.popUp = scene.add.graphics();
    scene.boxes = scene.add.graphics();

    // for popup window
    scene.popUp.lineStyle(1, 0xffffff);
    scene.popUp.fillStyle(0x72bcd4,0.5);

    // for boxes
    scene.boxes.lineStyle(1, 0xffffff);
    scene.boxes.fillStyle(0x72bcd4, 0.9);

    // popup window
    scene.popUp.strokeRect(25, 25, 750, 500);
    scene.popUp.fillRect(25, 25, 750, 500);

    scene.boxes.fillRect(25, 26, 749, 110);

    //title
    scene.title = scene.add.text(100, 30, "Moop Moop Troop", {
      fill: "#e6bbad",
      fontSize: "66px",
      fontStyle: "bold",
    });
    scene.title = scene.add.text((750)/2, 110, "Sic Transit Gloria Compos Mentis", {
      fill: "#e6bbad",
      fontSize: "20px",
      fontStyle: "bold",
    }).setOrigin(0.5);




    //right popup
    scene.boxes.fillStyle(0x5fb2ce, 0.6);
    scene.boxes.fillRect(50, 200, 700, 100);
    scene.inputElement = scene.add.dom(200, 250).createFromCache("codeform");
    scene.inputElement.addListener("click");
    scene.inputElement.on("click", function (event) {
      if (event.target.name === "join") {

        scene.socket.emit("joinRoom", 'snorktown', {label: scene.inputElement.getChildByName('name').value });
        scene.scene.stop("WaitingRoom");
      }
    });

    
    


  }
  update() {}
}
