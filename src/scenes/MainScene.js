import Phaser from "phaser";
import ControlPanel from "../entity/ControlPanel";
import Direction from '../utils/Direction';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.state = {};
    this.vendingMachineStatus = false;
  }

  preload() {
    this.load.spritesheet("astronaut", "assets/spritesheets/001.png", {
      frameWidth: 32,
      frameHeight: 32
    });


    this.load.tilemapTiledJSON("map", "/assets/tilemaps/map.json");

    this.load.image('tiles', 'assets/tilesets/tiles.png');
    this.load.image("vendingMachine", "assets/sprites/vendingMachine.png");
    this.load.image("mainroom", "assets/backgrounds/mainroom.png");
  }

  createPlayerAnimation(
      name ,
      startFrame,
      endFrame
    ) {
	console.log(name);
      this.anims.create({
	key: name,
	frames: this.anims.generateFrameNumbers("astronaut", {
	  start: startFrame,
	  end: endFrame,
	}),
	frameRate: 10,
	repeat: -1,
	yoyo: true,
      });
    }

  create() {
    const scene = this;
    //BACKGROUND
    //this.add.image(0, 0, "mainroom").setOrigin(0);
    const map = this.make.tilemap({ key: "map", tileWidth: 32, tileHeight: 32 });
    const tileset = map.addTilesetImage("tile", 'tiles');
    const layer = map.createStaticLayer(0, tileset, 0, 0);
    const layer2 = map.createStaticLayer(1, tileset, 0, 0);


    //CREATE SOCKET
    this.socket = io();

    //LAUNCH WAITING ROOM
    scene.scene.launch("WaitingRoom", { socket: scene.socket });

    // CREATE OTHER PLAYERS GROUP
    this.otherPlayers = this.physics.add.group();

    // JOINED ROOM - SET STATE
    this.socket.on("setState", function (state) {
      const { roomKey, players, numPlayers } = state;
      scene.physics.resume();

      // STATE
      scene.state.roomKey = roomKey;
      scene.state.players = players;
      scene.state.numPlayers = numPlayers;
    });

    // CONTROL PANELS
    this.controlPanelGroup = this.physics.add.staticGroup({
      classType: ControlPanel,
    });
    this.controlPanelVendingMachine = this.controlPanelGroup.create(
      300,
      300,
      "vendingMachine"
    );

    this.controlPanelVendingMachine.on("pointerdown", () => {
      scene.scene.start("TaskScene", { ...scene.state, socket: scene.socket });
      scene.physics.pause();
    });

    // PLAYERS
    this.socket.on("currentPlayers", function (arg) {
      const { players, numPlayers } = arg;
      scene.state.numPlayers = numPlayers;
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === scene.socket.id) {
          scene.addPlayer(scene, players[id]);
        } else {
          scene.addOtherPlayers(scene, players[id]);
        }
      });
    });

    this.socket.on("newPlayer", function (arg) {
      const { playerInfo, numPlayers } = arg;
      scene.addOtherPlayers(scene, playerInfo);
      scene.state.numPlayers = numPlayers;
    });

    this.socket.on("playerMoved", function (playerInfo) {
      scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          const oldX = otherPlayer.x;
          const oldY = otherPlayer.y;
          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        }
      });
    });

    this.socket.on("otherPlayerStopped", function (playerInfo) {
      scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          otherPlayer.anims.stop(null, true);
        }
      });
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    // DISCONNECT
    this.socket.on("disconnected", function (arg) {
      const { playerId, numPlayers } = arg;
      scene.state.numPlayers = numPlayers;
      scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy();
        }
      });
    });
    this.createPlayerAnimation(Direction.UP, 8, 11);
    this.createPlayerAnimation(Direction.RIGHT, 4, 7);
    this.createPlayerAnimation(Direction.DOWN, 0, 3);
    this.createPlayerAnimation(Direction.LEFT, 12, 15);
  }

  update() {
    const scene = this;
    //MOVEMENT
    if (this.astronaut) {
      const speed = 225;
      const prevVelocity = this.astronaut.body.velocity.clone();
      // Stop any previous movement from the last frame
      this.astronaut.body.setVelocity(0);

      let anim = false;

      // Horizontal movement
      if (this.cursors.left.isDown) {
        this.astronaut.body.setVelocityX(-speed);
	anim = Direction.LEFT;
      } else if (this.cursors.right.isDown) {
        this.astronaut.body.setVelocityX(speed);
	anim = Direction.RIGHT;
      }
      // Vertical movement
      if (this.cursors.up.isDown) {
        this.astronaut.body.setVelocityY(-speed);
	anim = Direction.UP;
      } else if (this.cursors.down.isDown) {
        this.astronaut.body.setVelocityY(speed);
	anim = Direction.DOWN;
      }


      // Normalize and scale the velocity so that astronaut can't move faster along a diagonal
      this.astronaut.body.velocity.normalize().scale(speed);
      if(anim === false){
	this.moving = false;
	this.astronaut.sprite.anims.stop(null, true);
	this.moving_direction = false;
      }else {

	if(this.moving_direction != anim) {
	  this.astronaut.sprite.anims.play(anim);

	}else if(!this.astronaut.sprite.anims.isPlaying){
	  this.astronaut.sprite.anims.play(anim);
	}
	this.moving_direction = anim;
      }

      // emit player movement
      var x = this.astronaut.x;
      var y = this.astronaut.y;
      if (
        this.astronaut.oldPosition &&
        (x !== this.astronaut.oldPosition.x ||
          y !== this.astronaut.oldPosition.y)
      ) {
        this.moving = true;
        this.socket.emit("playerMovement", {
          x: this.astronaut.x,
          y: this.astronaut.y,
          roomKey: scene.state.roomKey,
        });
      }
      // save old position data
      this.astronaut.oldPosition = {
        x: this.astronaut.x,
        y: this.astronaut.y,
        rotation: this.astronaut.rotation,
      };
    }
    // CONTROL PANEL OVERLAP
    if (this.astronaut) {
      this.physics.add.overlap(
        scene.astronaut,
        scene.controlPanelVendingMachine,
        scene.highlightControlPanel,
        null,
        this
      );
      //CONTROL PANEL: NOT OVERLAPPED
      scene.checkOverlap(
        scene,
        scene.astronaut,
        scene.controlPanelVendingMachine
      );
    }
  }

  buildPlayerObject(scene, playerInfo) {

    var new_player = scene.physics.add
      .sprite(playerInfo.x, playerInfo.y, "astronaut")
      .setOrigin(0.5, 0.5)
      .setSize(30, 40)
      .setOffset(0, 24)
      .setScale(0.5);

    var style = { font: "10px Arial", fill: "#ffffff" };  
    var label = scene.add.text(playerInfo.x - 0,playerInfo.y - 35 , playerInfo.label || "mooo", style);
    label.setOrigin(0.5, 0.5)

    var new_container = scene.add.container(0, 0, [label, new_player])
    new_player.container = new_container;

    scene.physics.world.enable(new_container);
    new_container.sprite = new_player;

    return(  new_container );
  }

  addPlayer(scene, playerInfo) {
    scene.joined = true;

    var new_container = this.buildPlayerObject(scene, playerInfo);

    this.astronaut = new_container;


  }
  addOtherPlayers(scene, playerInfo) {
    const otherPlayer = this.buildPlayerObject(scene, playerInfo);
    otherPlayer.playerId = playerInfo.playerId;
    scene.otherPlayers.add(otherPlayer);
  }

  highlightControlPanel(astronaut, controlPanel) {
    controlPanel.setTint(0xbdef83);
    controlPanel.setInteractive();
  }

  checkOverlap(scene, player, controlPanel) {
    const boundsPlayer = player.getBounds();
    const boundsPanel = controlPanel.getBounds();
    if (
      !Phaser.Geom.Intersects.RectangleToRectangle(boundsPlayer, boundsPanel)
    ) {
      scene.deactivateControlPanel(controlPanel);
    }
  }

  deactivateControlPanel(controlPanel) {
    controlPanel.clearTint();
    controlPanel.disableInteractive();
  }
}
