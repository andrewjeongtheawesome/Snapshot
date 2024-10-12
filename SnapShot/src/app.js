let config = {
    type: Phaser.AUTO,
    width: 1200,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },  // 중력을 없앰
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game;
let bottleCap;
let triesLeft = 3;
let highestScore = 0;
let isDragging = false;
let slingshotLine;
let miniMapCap;
let slingshotAnchorX = 600;  // 고무줄 기준 위치
let slingshotAnchorY = 900;  // 고무줄 기준 높이
let bottleCapOriginalY = 850; // 병뚜껑이 고무줄에 위치하는 기본 위치
let camera;  // 카메라 변수

document.getElementById('start-btn').addEventListener('click', () => {
    document.querySelector('.container').style.display = 'none';  // 제목과 버튼 숨기기
    document.getElementById('game-container').style.display = 'block';  // 게임 화면 보이기
    startGame();  // 게임 시작
});

function startGame() {
    game = new Phaser.Game(config);  // Phaser 게임 시작
}

function preload() {
    this.load.image('bottlecap', 'bottlecap.png');  // 병뚜껑 이미지 불러오기
    this.load.image('table', 'table.png');  // 책상 이미지
}

function create() {
    // 배경을 흰색으로 설정
    this.cameras.main.setBackgroundColor('#ffffff');
    
    // 긴 책상 생성 (테이블 이미지 추가)
    let table = this.add.tileSprite(600, 0, 1200, 6000, 'table');  // 책상을 화면에 타일로 반복

    // 병뚜껑 생성
    bottleCap = this.physics.add.sprite(slingshotAnchorX, bottleCapOriginalY, 'bottlecap');  // 병뚜껑을 고무줄에 위치
    bottleCap.setScale(0.3);  // 병뚜껑 크기 조정
    bottleCap.setCollideWorldBounds(true);
    bottleCap.setInteractive();  // 병뚜껑을 드래그할 수 있게 설정

    // 병뚜껑 개수 텍스트
    this.add.text(20, 100, `병뚜껑 x${triesLeft}`, { fontSize: '24px', fill: '#000' });

    // 최고 기록 텍스트
    this.add.text(1000, 20, `최고 기록: ${highestScore}cm`, { fontSize: '24px', fill: '#000' });

    // 미니맵 (miniMapCap 문제 해결)
    let miniMap = this.add.graphics();
    miniMap.lineStyle(2, 0x000000, 1);
    miniMap.strokeRect(1100, 100, 50, 300);  // 미니맵의 크기 설정
    miniMapCap = this.add.rectangle(1125, 100, 20, 20, 0xff0000);  // 병뚜껑의 초기 위치를 미니맵에 생성

    // 카메라를 병뚜껑에 따라가도록 설정
    camera = this.cameras.main;
    camera.setBounds(0, 0, 1200, 6000);  // 화면 크기 설정 및 카메라 범위 고정
    camera.startFollow(bottleCap);  // 카메라가 병뚜껑을 따라다님

    // 고무줄 생성
    slingshotLine = this.add.graphics();
    slingshotLine.lineStyle(4, 0x000000, 1);
    updateSlingshotLine(slingshotAnchorX, slingshotAnchorY);  // 고무줄 초기 위치 설정

    // 병뚜껑 드래그 및 발사
    this.input.setDraggable(bottleCap);

    this.input.on('dragstart', function (pointer, gameObject) {
        // 병뚜껑을 고무줄 위에서만 드래그 가능하게 설정
        if (gameObject.y !== bottleCapOriginalY) {
            isDragging = false;
        } else {
            isDragging = true;
        }
    });

    this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
        if (isDragging && dragY > slingshotAnchorY) {
            // 병뚜껑을 아래로만 드래그 가능
            gameObject.x = dragX;
            gameObject.y = dragY;

            // 고무줄 모션 업데이트
            updateSlingshotLine(dragX, dragY);
        }
    });

    this.input.on('dragend', function (pointer, gameObject) {
        if (isDragging) {
            // 병뚜껑 발사 방향을 고무줄 당긴 방향에 맞춰서 계산
            let velocityX = (gameObject.x - slingshotAnchorX) * 3;  // 좌우 방향
            let velocityY = (gameObject.y - slingshotAnchorY) * 3;  // 상하 방향
            gameObject.body.setVelocity(velocityX, -velocityY);  // 발사 방향 설정
    
            // 발사 후 고무줄 원래대로 되돌리기
            updateSlingshotLine(slingshotAnchorX, slingshotAnchorY);
            isDragging = false;
        }
    });
}


function update() {
    // 병뚜껑을 따라 시점이 움직임
    if (!isDragging && miniMapCap) {  // miniMapCap이 정의되었는지 확인
        updateMiniMap(bottleCap.y);
    }
}


// 병뚜껑 위치에 따른 미니맵 업데이트
function updateMiniMap(y) {
    let relativeY = Phaser.Math.Clamp((y - 100) * 0.5, 100, 400);  // 미니맵 내 위치 조정
    miniMapCap.y = relativeY;
}

// 고무줄 모션 업데이트 함수
function updateSlingshotLine(endX, endY) {
    slingshotLine.clear();
    slingshotLine.lineStyle(4, 0x000000, 1);
    slingshotLine.lineBetween(500, slingshotAnchorY, endX, endY);  // 왼쪽 고무줄
    slingshotLine.lineBetween(700, slingshotAnchorY, endX, endY);  // 오른쪽 고무줄
}
