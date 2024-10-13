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
let triesLeft = 3;  // 병뚜껑 남은 개수
let highestScore = 0;  // 최고 기록
let isDragging = false;
let slingshotLine;
let miniMapCap;
let slingshotAnchorX = 600;  // 고무줄 기준 위치
let slingshotAnchorY = 900;  // 고무줄 기준 높이
let bottleCapOriginalY = 850; // 병뚜껑이 고무줄에 위치하는 기본 위치
let camera;
let tableHeight = 1000;
// 전역 변수로 UI 요소 선언
let bottleCountText;
let highestScoreText;
let currentPositionBar;
let isBottleCapStopped = false;  // 병뚜껑 멈춤 상태 확인 변수
let gameScene;

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

let gameOver = false;  // 게임 종료 여부

function create() {
    gameScene = this;  // 전역 변수로 장면 컨텍스트 저장

    // 배경을 흰색으로 설정
    this.cameras.main.setBackgroundColor('#ffffff');
    
    // 긴 테이블을 배경으로 그리기
    tableHeight = 3000;  // 테이블을 훨씬 더 길게 설정
    let graphics = this.add.graphics();
    graphics.fillStyle(0x87CEEB, 1);  // 파란 배경
    graphics.fillRoundedRect(100, 0, 1000, tableHeight, 50);  // 긴 라운드 테이블

    // 병뚜껑 생성
    bottleCap = this.physics.add.sprite(slingshotAnchorX, bottleCapOriginalY, 'bottlecap');
    bottleCap.setScale(0.3);
    bottleCap.setCollideWorldBounds(true);
    bottleCap.setInteractive();
    
    // 마찰력 추가
    bottleCap.body.setDrag(300);  // X축과 Y축 모두에서 마찰력을 설정
    bottleCap.body.setBounce(0.8);  // 병뚜껑이 충돌 시 반동

    // 병뚜껑 개수, 최고 기록, 현재 위치 표시 바
    bottleCountText = this.add.text(20, 100, `병뚜껑 x${triesLeft}`, { fontSize: '24px', fill: '#000' });
    highestScoreText = this.add.text(1000, 20, `최고 기록: ${highestScore}cm`, { fontSize: '24px', fill: '#000' });
    
    // 미니맵 병뚜껑 위치 표시 재디자인
    miniMapCap = this.add.graphics();
    drawMiniMap(1125, 100, 50);  // 더 크고 둥근 미니맵 그리기

    // 카메라를 병뚜껑에 따라가도록 설정
    camera = this.cameras.main;
    camera.setBounds(0, 0, 1200, tableHeight);  // 카메라 범위를 긴 테이블 끝까지 설정
    camera.startFollow(bottleCap, true, 0.05, 0.05);  // 부드러운 카메라 이동

    // 고무줄 생성
    slingshotLine = this.add.graphics();
    slingshotLine.lineStyle(4, 0x000000, 1);
    updateSlingshotLine(slingshotAnchorX, slingshotAnchorY);

    // 병뚜껑 드래그 및 발사
    this.input.setDraggable(bottleCap);

    this.input.on('dragstart', function (pointer, gameObject) {
        isDragging = true;
    });

    this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
        if (isDragging && dragY > slingshotAnchorY) {
            gameObject.x = dragX;
            gameObject.y = dragY;
            updateSlingshotLine(dragX, dragY);
        }
    });

    this.input.on('dragend', function (pointer, gameObject) {
        if (isDragging) {
            let velocityX = (gameObject.x - slingshotAnchorX) * 3;  // 좌우 방향
            let velocityY = (gameObject.y - slingshotAnchorY) * 3;  // 상하 방향
            gameObject.body.setVelocity(velocityX, -velocityY);  // 발사

            updateSlingshotLine(slingshotAnchorX, slingshotAnchorY);
            isDragging = false;
        }
    });

    // 점수 계산을 위한 끝 라인 설정
    finishLineY = 50;  // 끝 라인의 Y 좌표 (화면 위쪽)
    finishLine = this.add.line(600, finishLineY, 0, 0, 1200, 0, 0xff0000);  // 빨간색으로 라인 표시
}

// 새로운 미니맵 디자인
function drawMiniMap(x, y, radius) {
    miniMapCap.clear();
    miniMapCap.fillStyle(0x00ff00, 1);  // 초록색으로 미니맵 배경
    miniMapCap.fillRoundedRect(x - 30, y - 100, 100, 200, 20);  // 배경 크고 둥글게
    miniMapCap.fillStyle(0xff0000, 1);  // 병뚜껑을 빨간색으로 표시
    miniMapCap.fillCircle(x, y, radius);  // 병뚜껑 표시
}


function handleBottleCapAction() {
    triesLeft -= 1;
    bottleCountText.setText(`병뚜껑 x${triesLeft}`);  // 병뚜껑 개수 업데이트

    // 병뚜껑이 멈추고 점수 계산
    if (bottleCap.y > tableHeight - 100) {  // 공백 영역
        if (bottleCap.x < 500 || bottleCap.x > 700) {  // 낙 처리 (범위 밖이면 떨어짐)
            resetBottleCap(false);  // 낙 처리 (기록 미갱신)
        } else {
            let distanceFromFinish = Math.abs(bottleCap.y - finishLineY);  // 끝 라인에서 떨어진 거리 계산
            highestScore = Math.min(highestScore, distanceFromFinish);  // 최고 기록 갱신
            highestScoreText.setText(`최고 기록: ${highestScore.toFixed(1)}cm`);  // 기록 갱신
            resetBottleCap(true);  // 성공적으로 병뚜껑 발사 완료
        }
    } else {
        resetBottleCap(false);  // 테이블 끝에 도달하지 않으면 초기화 (기록 미갱신)
    }
}


function update() {
    if (gameOver) return;  // 게임 종료 시 더 이상 업데이트 하지 않음

    // 병뚜껑이 멈춘 후 상태 처리
    if (!isDragging && bottleCap.body.speed < 5 && !isBottleCapStopped && bottleCap.body.velocity.length() > 0) {
        // 병뚜껑이 멈췄을 때 처리
        isBottleCapStopped = true;

        // 병뚜껑이 멈춘 후에만 처리
        handleBottleCapAction();

        // 병뚜껑이 다 소진되었을 경우 게임 종료
        if (triesLeft <= 0) {
            endGame();
        }
    }

    // 병뚜껑이 움직일 때마다 미니맵과 텍스트 업데이트
    if (!isDragging && miniMapCap) {  // miniMapCap이 정의되었는지 확인
        let relativeY = Phaser.Math.Clamp((bottleCap.y - 100) * 0.5, 100, 400);
        miniMapCap.clear();  // 기존 원 지우기
        miniMapCap.fillStyle(0xff0000, 1);  // 빨간색으로 채우기
        miniMapCap.fillCircle(1125, relativeY, 10);  // 새로운 위치에 원 그리기

        // 병뚜껑 개수 및 최고 기록 표시도 함께 시점에 맞춰 이동
        if (bottleCountText) bottleCountText.setPosition(camera.scrollX + 20, camera.scrollY + 100);
        if (highestScoreText) highestScoreText.setPosition(camera.scrollX + 1000, camera.scrollY + 20);
        if (currentPositionBar) currentPositionBar.setPosition(camera.scrollX + 1100, camera.scrollY + 100);
    }
}

// 최고 기록 갱신 함수
function handleBottleCapAction() {
    triesLeft -= 1;
    bottleCountText.setText(`병뚜껑 x${triesLeft}`);  // 병뚜껑 개수 업데이트

    // 기록 계산
    let distanceFromFinish = Math.abs(bottleCap.y - finishLineY);  // 끝 라인에서 떨어진 거리 계산
    if (highestScore === 0 || distanceFromFinish < highestScore) {
        highestScore = distanceFromFinish;
        highestScoreText.setText(`최고 기록: ${highestScore.toFixed(1)}cm`);  // 기록 갱신
    }

    if (triesLeft <= 0) {
        endGame();
    } else {
        resetBottleCap(true);  // 병뚜껑 다시 초기화
    }
}

// 병뚜껑 초기화
function resetBottleCap(success) {
    bottleCap.setPosition(slingshotAnchorX, bottleCapOriginalY);  // 초기 위치로 이동
    bottleCap.body.setVelocity(0, 0);  // 속도 초기화
    isBottleCapStopped = false;
    isDragging = false;
    bottleCap.setInteractive();
    camera.startFollow(bottleCap);  // 카메라 재설정
}

// 게임 종료
function endGame() {
    gameOver = true;
    gameScene.add.text(600, 400, `게임 종료!\n최고 기록: ${highestScore.toFixed(1)}cm`, { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5);
    bottleCap.disableInteractive();
    camera.stopFollow();
}

function endGame() {
    gameOver = true;  // 게임 종료 플래그 설정

    // 게임 종료 메시지 표시 (전역 변수를 통해 gameScene 참조)
    gameScene.add.text(600, 400, `게임 종료!\n최고 기록: ${highestScore.toFixed(1)}cm`, { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5);

    // 병뚜껑을 더 이상 상호작용하지 않도록 제거
    bottleCap.disableInteractive();  // 병뚜껑을 다시 드래그할 수 없도록 비활성화
    camera.stopFollow();  // 카메라 멈춤
}


// 고무줄 모션 업데이트 함수
function updateSlingshotLine(endX, endY) {
    slingshotLine.clear();
    slingshotLine.lineStyle(4, 0x000000, 1);
    slingshotLine.lineBetween(500, slingshotAnchorY, endX, endY);  // 왼쪽 고무줄
    slingshotLine.lineBetween(700, slingshotAnchorY, endX, endY);  // 오른쪽 고무줄
}
