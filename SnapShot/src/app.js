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
    
    // 테이블 높이 및 낭떠러지 영역 설정
    tableHeight = 3000;  // 테이블을 훨씬 더 길게 설정
    fallingZoneHeight = 500;  // 낭떠러지 공간을 더 크게 설정
    let graphics = this.add.graphics();
    
    // 테이블을 그리고 낭떠러지 영역 추가
    graphics.fillStyle(0x87CEEB, 1);  // 파란 테이블
    graphics.fillRoundedRect(100, 0, 1000, tableHeight, 50);  // 긴 라운드 테이블

    // 낭떠러지 영역 추가 (테이블 아래)
    graphics.fillStyle(0xdddddd, 1);  // 낭떠러지 영역 색상 (회색)
    graphics.fillRect(100, tableHeight, 1000, fallingZoneHeight);  // 낭떠러지 영역 그리기

    // 병뚜껑 및 새총의 위치 설정 (테이블 끝에 위치하도록 조정)
    slingshotAnchorX = 600;  // 새총 기준 위치 조정
    slingshotAnchorY = tableHeight - 50;  // 새총이 테이블 끝에 배치
    bottleCapOriginalY = tableHeight - 100;  // 병뚜껑이 새총에 위치하는 기본 위치

    // 병뚜껑 생성 (테이블 끝으로 위치 변경)
    bottleCap = this.physics.add.sprite(slingshotAnchorX, bottleCapOriginalY, 'bottlecap');
    bottleCap.setScale(0.3);
    bottleCap.setCollideWorldBounds(false);  // 테이블 끝에서 벗어날 수 있도록 설정
    bottleCap.setInteractive();
    
    // 마찰력 추가
    bottleCap.body.setDrag(300);  // X축과 Y축 모두에서 마찰력을 설정
    bottleCap.body.setBounce(0.8);  // 병뚜껑이 충돌 시 반동

    // 병뚜껑 개수, 최고 기록, 현재 위치 표시 바
    bottleCountText = this.add.text(20, 100, `병뚜껑 x${triesLeft}`, { fontSize: '24px', fill: '#000' });
    highestScoreText = this.add.text(1000, 20, `최고 기록: ${highestScore}cm`, { fontSize: '24px', fill: '#000' });

    // 미니맵 틀 그리기 - 항상 화면에 고정된 위치에 표시
    miniMapCap = this.add.graphics();
    drawMiniMap();  // 화면 오른쪽에 미니맵 고정

    // 카메라를 병뚜껑에 따라가도록 설정
    camera = this.cameras.main;
    camera.setBounds(0, 0, 1200, tableHeight + fallingZoneHeight);  // 카메라 범위를 낭떠러지 끝까지 설정
    camera.startFollow(bottleCap, true, 0.05, 0.05);  // 부드러운 카메라 이동

    // 고무줄 생성 및 새총 끝 검은 원 추가 (테이블 끝쪽에 배치)
    slingshotLine = this.add.graphics();
    slingshotLine.lineStyle(4, 0x000000, 1);
    updateSlingshotLine(slingshotAnchorX, slingshotAnchorY);

    // 새총 끝에 검은 원 추가 (병뚜껑 위치와 일치하도록 수정)
    this.add.circle(slingshotAnchorX - 100, bottleCapOriginalY, 20, 0x000000);  // 왼쪽 원
    this.add.circle(slingshotAnchorX + 100, bottleCapOriginalY, 20, 0x000000);  // 오른쪽 원

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

    // 점수 계산을 위한 끝 라인 설정 (테이블 상단)
    finishLineY = 50;  // 끝 라인의 Y 좌표 (화면 위쪽)
    finishLine = this.add.line(600, finishLineY, 0, 0, 1200, 0, 0xff0000);  // 빨간색으로 라인 표시
}

function drawMiniMap() {
    miniMapCap.clear();

    // 미니맵 틀을 화면에 고정된 위치에 그리기
    miniMapCap.lineStyle(2, 0x000000, 1);  // 검은색 테두리
    miniMapCap.strokeRoundedRect(1050, 20, 30, 200, 15);  // 고정된 위치의 세로로 긴 미니맵 (x, y, width, height, corner radius)
    
    // 미니맵 배경 색상
    miniMapCap.fillStyle(0x87CEEB, 1);  // 파란 배경
    miniMapCap.fillRoundedRect(1050, 20, 30, 200, 15);  // 배경 채우기
    
    // 병뚜껑 위치 표시 (빨간색으로 표시)
    let relativeY = Phaser.Math.Clamp((bottleCap.y / tableHeight) * 200, 20, 220);  // 병뚜껑 위치 계산
    miniMapCap.fillStyle(0xff0000, 1);  // 빨간색 병뚜껑
    miniMapCap.fillCircle(1065, relativeY, 10);  // 병뚜껑 그리기
}

function handleBottleCapAction() {
    triesLeft -= 1;
    bottleCountText.setText(`병뚜껑 x${triesLeft}`);  // 병뚜껑 개수 업데이트

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

    // 병뚜껑이 움직일 때마다 미니맵 업데이트
    drawMiniMap();  // 병뚜껑의 이동에 따라 미니맵을 계속해서 업데이트

    if (!isDragging && bottleCap.body.speed < 5 && !isBottleCapStopped && bottleCap.body.velocity.length() > 0) {
        if (bottleCap.y > tableHeight) {  // 병뚜껑이 낭떠러지 영역에 도달했는지 확인
            handleBottleCapAction();
        } else {
            isBottleCapStopped = true;
            handleBottleCapAction();  // 정상적인 병뚜껑 처리
        }

        if (triesLeft <= 0) {
            endGame();
        }
    }

    if (!isDragging && miniMapCap) {  
        let relativeY = Phaser.Math.Clamp((bottleCap.y / tableHeight) * 200, 20, 220);
        miniMapCap.clear();  // 기존 원 지우기
        miniMapCap.fillStyle(0xff0000, 1);  // 빨간색으로 채우기
        miniMapCap.fillCircle(1065, relativeY, 10);  // 새로운 위치에 원 그리기

        if (bottleCountText) bottleCountText.setPosition(camera.scrollX + 20, camera.scrollY + 100);
        if (highestScoreText) highestScoreText.setPosition(camera.scrollX + 1000, camera.scrollY + 20);
    }
}

// 최고 기록 갱신 함수
function handleBottleCapAction() {
    triesLeft -= 1;
    bottleCountText.setText(`병뚜껑 x${triesLeft}`);  // 병뚜껑 개수 업데이트

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
    gameOver = true;  // 게임 종료 플래그 설정

    gameScene.add.text(600, 400, `게임 종료!\n최고 기록: ${highestScore.toFixed(1)}cm`, { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5);

    bottleCap.disableInteractive();  // 병뚜껑을 다시 드래그할 수 없도록 비활성화
    camera.stopFollow();  // 카메라 멈춤
}

function updateSlingshotLine(endX, endY) {
    slingshotLine.clear();
    slingshotLine.lineStyle(4, 0x000000, 1);
    
    // 고무줄 시작 위치를 병뚜껑 아래쪽의 동그라미로 조정
    slingshotLine.lineBetween(slingshotAnchorX - 100, bottleCapOriginalY, endX, endY);  // 왼쪽 고무줄
    slingshotLine.lineBetween(slingshotAnchorX + 100, bottleCapOriginalY, endX, endY);  // 오른쪽 고무줄
}
