/* ----- THREEJS Utils for all other parts ----- */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import * as state from "./state.js";


const ballAccelerationCoef = 1.0  // 1.5
const ballSpeedLimit = 1000;
// initial speed of the ball
const ballStartSpeed = 6; // 6

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function checkPlayerPositionY(player, minY, maxY){
    if (player.position.y < minY)
        player.position.y = minY
    else if (player.position.y > maxY)
        player.position.y = maxY
}

function checkBallPositionY(ball, minY, maxY){
    if (ball.position.y < minY){
        ball.position.y = minY
        ball.velocity.y *= -1
    }
    else if (ball.position.y > maxY){
        ball.position.y = maxY
        ball.velocity.y *= -1
    }
}

// check if player can interact with the ball1
// all bounces are assumed to be perfect and dont apply any modifications
// player can interact if: 
//      x distance is the sum of their width/2
//      y is at most the distance of their combined height/2
// the /2 is because the position is the center of the obj
function checkRacketHitBall(ball, player){
    if (ball.hitRacketFlag == 1)
        return
    if (!(Math.abs(ball.position.x - player.position.x) <= player.size.x / 2 + ball.size.x / 2 &&
        Math.abs(ball.position.y - player.position.y) <= player.size.y / 2 + ball.size.y / 2 ))
        return
    ball.hitRacketFlag = 1;
    let side = Math.sign(player.position.x);
    ball.position.x = player.position.x - side * (player.size.x / 2 + ball.size.x / 2 + 0.01);
    ball.speed = Math.sqrt(ball.velocity.y * ball.velocity.y + ball.velocity.x * ball.velocity.x);
    if (ball.speed < ballSpeedLimit){
        ball.velocity.x *= -ballAccelerationCoef;
        ball.velocity.y *= ballAccelerationCoef;
        ball.speed *= ballAccelerationCoef;
    }
    else
        ball.velocity.x *= -1;
    let deltaAngle = - side * (ball.position.y - player.position.y) / player.size.y;
    let ballDirectionAngle = Math.atan2(ball.velocity.y, ball.velocity.x) + deltaAngle;
    ball.velocity.x = ball.speed * Math.cos(ballDirectionAngle);
    ball.velocity.y = ball.speed * Math.sin(ballDirectionAngle);
    if (Math.sign(ball.position.x) * ball.velocity.x > -5){
        ball.velocity.x = - Math.sign(ball.position.x) * ballStartSpeed;
    }
}

function setCameraTop(camera) {
    camera.position.z = 22
    camera.position.y = 0
    camera.rotation.x = 0
}
function setCameraAside(camera) {
    camera.rotation.x = 50 * Math.PI / 180;
    camera.position.z = 20; 
    camera.position.y =  - camera.position.z * Math.tan(camera.rotation.x);
}

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// ai = 2 two AIs: AI vs god level AI
// ai = 1 one AI vs human
// ai = 0 two humans
// (to be implemented) ai = -2 four humans
window.startGame = (ai) => {
    console.log("game is started. window.singleGameState=", window.singleGameState);
    let isPaused = false;
    const maxScore = 5;
    const playerSpeed = 17;  // 17 12
    const hight = 20;
    const width = 40;
    
    // create a scene and camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    setCameraTop(camera)
    //setCameraAside(camera)

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth * 0.96, window.innerHeight * 0.96);

    // needs to be a game screen that we overlay and make visible
    //document.getElementById("gameWindow").innerHTML = "";
    document.getElementById("gameWindow").appendChild(renderer.domElement);
    //document.getElementById("gameStartButton").disabled = true;

    // Add lights to the scene for score visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Softer global illumination
    scene.add(ambientLight)


    // Test line Define the line's geometry (vertices)
    const points = [];
    points.push(new THREE.Vector3(width/2, hight/2, 0)); // Start point
    points.push(new THREE.Vector3(width/2, -hight/2, 0)); // End point
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff }); // Red color
    const testline = new THREE.Line(geometry, material);
    scene.add(testline);

    // players geometry and material is shared so we create it once
    const playergeometry = new THREE.BoxGeometry(0.5, 4, 1);
    const playermaterial = new THREE.MeshBasicMaterial({ color: 0x00400E }); 
    //#00400E =  rgba(0, 255, 55, 0.25) with black backround
    // creates the player box
    const player1Mesh = new THREE.Mesh(playergeometry, playermaterial);
    const player2Mesh = new THREE.Mesh(playergeometry, playermaterial);
    // adds a border based on the geometry
    let edge = new THREE.EdgesGeometry(playergeometry);
    const player1outline = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({color: 0x000000}));
    const player2outline = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({color: 0x000000}));

    const player1 = new THREE.Group();
    const player2 = new THREE.Group();
    player1.size = {x: 0.5, y: 4, z: 1};
    player2.size = {x: 0.5, y: 4, z: 1};
    player1.add(player1Mesh);
    player2.add(player2Mesh);
    player1.add(player1outline);
    player2.add(player2outline);
    // registers to be rendered
    scene.add(player1);
    scene.add(player2);

    
    // create separate material and geometry for the ball1 and register it
    const ball1material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const ball1Geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    const ball1Mesh = new THREE.Mesh(ball1Geometry, ball1material);
    let ball1Edge = new THREE.EdgesGeometry(ball1Geometry);
    const balll1Outline = new THREE.LineSegments(ball1Edge, new THREE.LineBasicMaterial({color: 0x000000}));
    const ball1 = new THREE.Group();
    ball1.size = {x: 0.5, y: 0.5, z: 0.5};
    ball1.add(ball1Mesh);
    ball1.add(balll1Outline);
    scene.add(ball1);
    ball1.hitRacketFlag = 0;
    ball1.speed = ballStartSpeed;
    let startAngle = getRandom(-1, 1);
    ball1.velocity = {x: Math.cos(startAngle) * ballStartSpeed, y: Math.sin(startAngle) * ballStartSpeed};

    // for case of  4 players we create the other two
    // create separate material and geometry for the ball2 and register it
    const playergeometry2 = new THREE.BoxGeometry(0.5, 4, 1);
    let player2Edge = new THREE.EdgesGeometry(playergeometry2);
    const playermaterial2 = new THREE.MeshBasicMaterial({ color: 0x32495E }); //rgba(50, 73, 94, 1) corresponds to #32495E in hex.
    const player3mesh = new THREE.Mesh(playergeometry2, playermaterial2);
    const player4mesh = new THREE.Mesh(playergeometry2, playermaterial2);
    const player3outline = new THREE.LineSegments(player2Edge, new THREE.LineBasicMaterial({color: 0x000000}));
    const player4outline = new THREE.LineSegments(player2Edge, new THREE.LineBasicMaterial({color: 0x000000}));

    const player3 = new THREE.Group();
    const player4 = new THREE.Group();
    player3.size = {x: 0.5, y: 4, z: 1};
    player4.size = {x: 0.5, y: 4, z: 1};
    player3.add(player3mesh);
    player4.add(player4mesh);
    player3.add(player3outline);
    player4.add(player4outline);


    // const ballmaterial2 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const ballMesh2 = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    // const ball2 = new THREE.Mesh(ballMesh2, ballmaterial2);
    // scene.add(ball2)
    const pyramidGeometry = new THREE.ConeGeometry(0.5, 1, 4); // Radius, Height, RadialSegments
    let ball2EdgesGeometry = new THREE.EdgesGeometry(pyramidGeometry);
    const pyramidMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: false });
    const ball2mesh = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
    const ball2Edges = new THREE.LineSegments(ball2EdgesGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
    const ball2 = new THREE.Group();
    ball2.size = {x: 0.5, y: 1, z: 4};
    ball2.add(ball2mesh);
    ball2.add(ball2Edges);
    ball2.hitRacketFlag = 0;
    ball2.speed = ballStartSpeed;

    // we add the players 3 and 5 and ball2 to the scene only if it is a 4 player game
    if (ai == -2){
        // Add the groups to the scene
        scene.add(player3);
        scene.add(player4);
        scene.add(ball2);
    
        ball2.position.x = 5;
        ball2.position.y = 5;
        ball2.velocity =  new THREE.Vector3(0, 0, 0);

        player3.position.x = -width / 2;
        player3.position.y = hight / 4;
        player4.position.x = width / 2;
        player4.position.y = hight / 4;

        startAngle = getRandom(-1, 1)
        ball2.velocity = {x: Math.cos(startAngle) * ballStartSpeed, y: Math.sin(startAngle) * ballStartSpeed, z: 0}
    }

    // double array for the outer boxes
    let outerboxes = [[], [], []]

    /* ----- Local game logic and setup ----- */
    // the per frame shift that is influenced by keyboard presses  = player1Velocity * (time duration since last frame)
    let player1Velocity = 0
    let player2Velocity = 0
    let player3Velocity = 0
    let player4Velocity = 0

    // Function to create text geometry
    let score3dObj, font
    function updateScore(text) {
        if (score3dObj) {
            scene.remove(score3dObj); // Remove the old text
            score3dObj.geometry.dispose(); // Clean up memory
        }

        const textGeometry = new TextGeometry(text, {
            font: font,
            size: 1, //1,
            height: 0.01,
            // curveSegments: 12,
            // bevelEnabled: true,
            // bevelThickness: 1, //0.1,
            // bevelSize: 0.05,
            //    bevelSegments: 5
        });

        const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff,});
        score3dObj = new THREE.Mesh(textGeometry, textMaterial);
        score3dObj.position.set(-1, 7, -2); 
        scene.add(score3dObj);
        score3dObj.rotation.x = - Math.atan((score3dObj.position.y - camera.position.y)/ (score3dObj.position.z - camera.position.z));
    }
    // Load the font and create initial text
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
        font = loadedFont;
        updateScore("0 : 0"); // Initial text
    });

    let pause3dObj, pauseFont
    //const loader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        pauseFont = loadedFont;
        const pauseGeometry = new TextGeometry("PAUSE", {
            font: pauseFont,
            size: 3,
            height: 0.01,
        });
        const pauseMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        pause3dObj = new THREE.Mesh(pauseGeometry, pauseMaterial);
        pause3dObj.position.set(-5, 0, 100);
        pause3dObj.rotation.x = - Math.atan((pause3dObj.position.y - camera.position.y)/ (pause3dObj.position.z - camera.position.z));
        scene.add(pause3dObj)
    });

    function setup() {
        // move the players to their starting position from <0,0,0>
        player1.position.x = width / 2
        player2.position.x = -width / 2


        // use the same geometry for all outer boxes
        const outerboxgeometry = new THREE.BoxGeometry(0.95, 0.95, 1);
        const outerboxmaterial = new THREE.MeshBasicMaterial({
            color: 0x4c0000, // Red color   with 0.3 opacity   background: rgba(255, 0, 0, 0.3);
        });
        // loop over all the rows that share the height of the outer boxes
        outerboxes.forEach((element, row) => {
            for (let i = 1; i < 44; i++) {
                // create box and move to the correct position in its row
                var cur = new THREE.Mesh(outerboxgeometry, outerboxmaterial);
                cur.position.x = -width/2 - 2 + i;
                cur.position.y = -hight/2 - 1.25 - row;
                cur.position.z = 0;

                // create an edge and line for all boxes and move to the same position
                let edges = new THREE.EdgesGeometry(outerboxgeometry);
                let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
                line.position.x = -width/2 - 2 + i;
                line.position.y = -hight/2 - 1.25 - row;
                line.position.z = 0;

                scene.add(line);
                scene.add(cur);

                // save them for later access
                element.push({ box: cur, out: line });

                // add the same thing on the other side
                cur = new THREE.Mesh(outerboxgeometry, outerboxmaterial);
                cur.position.x = -width/2 - 2 + i;
                cur.position.y = hight/2 + 1.25 + row;
                cur.position.z = 0;
                edges = new THREE.EdgesGeometry(outerboxgeometry);
                line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));

                line.position.x = -width/2 - 2 + i;
                line.position.y = hight/2 + 1.25 + row;
                line.position.z = 0;

                scene.add(line);
                scene.add(cur);

                element.push({ box: cur, out: line });
            }
        })
    }

    const pressedKeys = new Set();
    const isPressed = (key) => pressedKeys.has(key);
    const isPressedByChar = (char) => isPressed(char.charCodeAt(0));
    let cameraAside = false;

    // function registered as an event listener to keydown events
    // 38 = ArrowUp, 40 = ArrowDown, 87 = w, 83 = s
    
    function keyDownAction(event) {
        let code = event.which;
        if (code == 32){ // space = 32
            //event.preventDefault();
        }
        if (!pressedKeys.has(code))
            pressedKeys.add(code);
        if (isPressed(27) && (isPaused || Math.max(...gameCount) >= maxScore)){ // 27 = escape
            console.log("Esc is pressed, game to be terminated.");
            cancelAnimationFrame(animationId);
            document.getElementById("gameWindow").style.display = "none";
            document.getElementById("gameWindow").removeChild(renderer.domElement);
            document.removeEventListener("keydown", keyDownAction);
            document.removeEventListener("keyup", keyUpAction);
            console.log("game terminated", window.singleGameState);
            gotoHome();
            // if (window.singleGameState.size > 0){
            //     //updateGameState();
            //     console.log("return to main");
            // }
            // else {
            //     //updateTouramentState();
            //     console.log("return to tournament");
            // }
            return 1;
        }
        else if (code == 32 && Math.max(...gameCount) < maxScore){ // space
            if (!isPaused){
                pause3dObj.position.z = -5
                render();
                isPaused = true;
                console.log("Space is pressed, game is paused.");
            }
            else {
                pause3dObj.position.z = 100
                isPaused = false;
                console.log("Space is pressed again, game is resumed.", isPaused);
                clock = new THREE.Clock();
                loop();
            }
        }
        else if (code == 'C'.charCodeAt(0)){
            cameraAside = !cameraAside;
            if (cameraAside)
                setCameraAside(camera)
            else
                setCameraTop(camera)
            render()
        }
        return 0;
    }
    function keyUpAction(event) {
        pressedKeys.delete(event.which);
    }
    function keyEventHandler() {
        player1Velocity = (isPressed(38) - isPressed(40)) * playerSpeed; // 40 = `ArrowDown`, 38 = `ArrowUp`
        player2Velocity = (isPressedByChar('W') - isPressedByChar('S')) * playerSpeed; // 87 = `W`, 83 = `S`
        player3Velocity = (isPressedByChar('R') - isPressedByChar('F')) * playerSpeed; // 82 = `R`, 70 = `F`
        player4Velocity = (isPressedByChar('O') - isPressedByChar('L')) * playerSpeed; // 79 = `O`, 76 = `L`
    }
    
    // util function
    var render = function() {
        renderer.render(scene, camera);
    };

    // AI Algo part
    // settging for the AI
    let timeIntervalAi = 1;  // must to be 1 according to the subject
    let clockAi = new THREE.Clock();
    let deltaTimeAi = 0;
    let r0 = {x: ball1.position.x, y: ball1.position.y};
    let r1 = {x: player1.position.x, y: player1.position.y};
    //let r2 = {x: player2.position.x, y: player2.position.y};
    let v0 = {x: ball1.velocity.x, y: ball1.velocity.y};
    let w = width; // width of the game area
    let h = hight;// hight  = hegith of the game area - height of the player
    let yPredictionNoBorders = [0, 0];
    let yPrediction = 0;
    let hightFromBorders = 0;
    let epsilon = 1;
    player1Velocity = 0;


    // this function is used to simulate key presses. 
    // Only for ArrowUp and ArrowDown
    function simulateArrowKey(keyUpDown, key) {
        if (!(key == 'ArrowDown' || key == 'ArrowUp'))
            return;
        let numCode = 40
        if (key == 'ArrowUp')
            numCode = 38
        else if (key == 'ArrowDown')
            numCode = 40
        const event = new KeyboardEvent(keyUpDown, {
            key: key,
            code: key,
            keyCode: numCode, 
            bubbles: true, // Ensure the event bubbles up
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    function runAi()
    {
        deltaTimeAi += clockAi.getDelta();
        if (deltaTimeAi > timeIntervalAi){
            r0 = {x: ball1.position.x, y: ball1.position.y};
            v0 = {x: ball1.velocity.x, y: ball1.velocity.y};
            v0 = v0.x == 0 ? {x: 0.0001, y: v0.y} : v0;
            yPredictionNoBorders = [
                r0.y + (-w/2 - r0.x) * v0.y / v0.x, 
                r0.y + ( w/2 - r0.x) * v0.y / v0.x
            ];
            hightFromBorders = Math.abs(yPredictionNoBorders[v0.x > 0 ? 1 : 0]) - h / 2;
            if (hightFromBorders < 0)
                yPrediction = yPredictionNoBorders[v0.x > 0 ? 1 : 0];
            else
                yPrediction = (h/2 - hightFromBorders % h) * Math.sign(v0.y) 
                    * Math.pow(-1, Math.floor(hightFromBorders / h) % 2);
            deltaTimeAi = 0;
        }        
        if (ai >= 1)
        {
            r1 = {x: player1.position.x, y: player1.position.y};
            if (v0.x > 0 && Math.abs(r1.y - yPrediction) > epsilon) {
                if (r1.y - yPrediction > epsilon && player1Velocity >= 0){ // need to move down
                    if (player1Velocity > 0)
                        simulateArrowKey('keyup','ArrowUp');
                    if (player1Velocity >= 0)
                        simulateArrowKey('keydown','ArrowDown');
                }
                else if (r1.y - yPrediction < epsilon && player1Velocity <= 0){  // need to move up
                    if (player1Velocity < 0)
                        simulateArrowKey('keyup','ArrowDown');
                    if (player1Velocity <= 0)
                        simulateArrowKey('keydown','ArrowUp');
                }
            }
            else {
                if (player1Velocity < 0)
                    simulateArrowKey('keyup','ArrowDown');
                if (player1Velocity > 0)
                    simulateArrowKey('keyup','ArrowUp');
            }
        }
        // Test AI that just jumps to the ball1 position without any prediction
        // it is simplest solution that always wins the AI opponent
        if (ai == 2){
            player2Velocity = 0;
            player2.position.y = ball1.position.y
        }
    }
 
    // check for goals and just reset position: subject to change
    function countGameScore(ball, gameCount){
        if (!(ball.hitRacketFlag == 0 && (ball.position.x > width / 2  || ball.position.x < - width / 2)))
            return;
        if (ball.position.x > 0)
            gameCount[1] += 1
        else
            gameCount[0] += 1
        updateScore(gameCount[1] + " : " + gameCount[0]);
        ball.position.set(0, 0, 0)
        let startAngle = getRandom(-1, 1)
        ball.velocity = {x: Math.cos(startAngle) * Math.sign(ball.velocity.x) * ballStartSpeed, y: Math.sin(startAngle) * Math.sign(ball.velocity.y) * ballStartSpeed}
        deltaTimeAi = 2;
    }

    function updateGameState(){
        console.log("updateGameState", window.singleGameState);
        window.singleGameState.player1_score = gameCount[0];
        window.singleGameState.player2_score = gameCount[1];
        window.singleGameState.match_time = Date.now() - startTime
        console.log(window.singleGameState);
    }

    /* ----- loop setup ----- */
    let animationId = null;
    // start a clock
    let clock = new THREE.Clock();
    const startTime = new Date();
    // keep track of deltatime since last frame
    let delta = 0;
    // 75 max fps
    let interval = 1 / 75;

    let playerMaxY = hight / 2 - 1.5;
    let gameCount = [0, 0];
   

    //console.log("player1 scale=", player1.scale.y, "ball scale=", ball1.scale.y)
    function loop() {
        if (!isPaused && ai >= 1)
            runAi()
        animationId = requestAnimationFrame(loop);
        // if its time to draw a new frame
        if (delta > interval){
            if (isPaused){
                return;
            }
            if (Math.max(...gameCount) >= maxScore){
                isPaused = true;
                console.log("Game ended", gameCount);
                updateScore("Score: " + gameCount[1] + " : " + gameCount[0] + ". Game ended!");
                score3dObj.position.set(-7, 7, -2); 
                render();
                updateGameState();
                // fetch the game result to backend and update game state?
                return;
            }
            keyEventHandler() // check for key presses
            // move the players with deltatime
            player1.position.y += player1Velocity * delta
            player2.position.y += player2Velocity * delta
            if (ai == -2){
                player3.position.y += player3Velocity * delta
                player4.position.y += player4Velocity * delta
            }

            // check for boundaries of the game area
            checkPlayerPositionY(player1, -playerMaxY, playerMaxY)
            checkPlayerPositionY(player2, -playerMaxY, playerMaxY)
            checkBallPositionY(ball1, -hight/2, hight/2)
            if (ai == -2){
                checkPlayerPositionY(player3, -playerMaxY, playerMaxY)
                checkPlayerPositionY(player4, -playerMaxY, playerMaxY)
                checkBallPositionY(ball2, -hight/2, hight/2)
            }

            ball1.hitRacketFlag = 0
            checkRacketHitBall(ball1, player1)
            checkRacketHitBall(ball1, player2)
            if (ai == -2){
                checkRacketHitBall(ball1, player3)
                checkRacketHitBall(ball1, player4)
                ball2.hitRacketFlag = 0
                checkRacketHitBall(ball2, player1)
                checkRacketHitBall(ball2, player2)
                checkRacketHitBall(ball2, player3)
                checkRacketHitBall(ball2, player4)
            }

            // move the balls to new position
            ball1.position.x += ball1.velocity.x * delta
            ball1.position.y += ball1.velocity.y * delta
            countGameScore(ball1, gameCount)
            if (ai == -2){
                ball2.position.x += ball2.velocity.x * delta
                ball2.position.y += ball2.velocity.y * delta
                countGameScore(ball2, gameCount)
            }
            // update each outer box height based on sin to create a wave effect
            outerboxes.forEach((element, row) => {
                element.forEach((box, index) => {
                    box.box.scale.z = (Math.sin(Date.now() / 700 + index / 2 + row) + 2) / 1.5
                    box.box.position.z = -1 + box.box.scale.z / 2
                    box.out.scale.z = (Math.sin(Date.now() / 700 + index / 2 + row) + 2) / 1.5
                    box.out.position.z = -1 + box.out.scale.z / 2
                });
            });
            render();
            // if we have multiple frames it skips to the most recent one
            delta = delta % interval;
        }
        // keep track of time since last loop call
        delta += clock.getDelta();
    }

    // allows keydown and keyup to move player
    document.addEventListener("keydown", keyDownAction, false)
    document.addEventListener("keyup", keyUpAction, false)


    /* ----- Main logic ----- */

    setup()
    loop()

    return
}