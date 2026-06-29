# GitHub Pages 배포 가이드

본 문서는 **NEON TETRIS** 애플리케이션을 별도의 GitHub 저장소에 배포하고 GitHub Pages를 활성화하는 과정 및 관리 방법을 기록한 문서입니다.

## 1. 배포 정보
- **저장소(Repository)**: `git@github.com:leading79/tetris.git`
- **배포 URL**: [https://leading79.github.io/tetris/](https://leading79.github.io/tetris/)
- **개발 환경**: Vanilla HTML5, CSS3, JavaScript (Static Web)

---

## 2. 배포 및 설정 절차

### 1단계: 로컬 Git 저장소 초기화 및 원격 저장소 추가
테트리스 소스코드가 위치한 디렉토리에서 Git 저장소를 초기화하고 원격 저장소를 `origin`으로 등록합니다.
```bash
# 테트리스 디렉토리로 이동
cd /home/leading79/work/kosa-ict-genai-2026-1st/src/exercise/leading79/day33/tetris

# Git 저장소 초기화
git init

# 기본 브랜치 이름을 main으로 설정
git branch -M main

# 원격 저장소 등록 (개인 계정 leading79의 tetris 레포지토리)
git remote add origin git@github.com:leading79/tetris.git
```

### 2단계: 파일 추가 및 배포 URL 커밋 로그 기록
모든 게임 에셋과 소스코드를 스테이징한 후, 커밋 메시지에 **배포될 URL을 기록**하여 커밋을 생성합니다.
```bash
# 변경 사항 스테이징
git add index.html style.css tetris.js GITHUB\ PAGES.md

# 커밋 기록 생성 (커밋 로그에 배포 URL 포함)
git commit -m "Deploy Tetris to GitHub Pages

Deployed URL: https://leading79.github.io/tetris/"
```

### 3단계: GitHub에 소스코드 푸시
등록된 원격 저장소의 `main` 브랜치로 코드를 푸시합니다.
```bash
git push -u origin main
```

### 4단계: GitHub Pages 서비스 활성화
GitHub Pages는 기본적으로 배포 브랜치에 코드가 푸시되면 자동으로 빌드되도록 설정할 수 있습니다.
1. 웹 브라우저에서 생성한 저장소([https://github.com/leading79/tetris](https://github.com/leading79/tetris))에 접속합니다.
2. 상단 탭에서 **Settings**를 클릭합니다.
3. 왼쪽 사이드바 메뉴에서 **Pages**를 클릭합니다.
4. **Build and deployment** 섹션의 **Source** 설정을 `Deploy from a branch`로 지정합니다.
5. **Branch** 설정을 `main` / `/ (root)`로 선택한 후 **Save** 버튼을 클릭합니다.
6. 약 1~2분 후, 상단에 생성된 배포 URL([https://leading79.github.io/tetris/](https://leading79.github.io/tetris/))을 통해 실시간으로 배포된 웹게임을 플레이할 수 있습니다.

---

## 3. 파일 구성 목록
- `index.html` : 테트리스 전체 레이아웃 구조, 캔버스 영역 및 오버레이 화면 정의
- `style.css` : 네온 빔 글로우 스타일링, 글래스모피즘 HUD 카드 및 모바일 반응형 레이아웃 정의
- `tetris.js` : 테트리스 테트로미노 낙하 중력 로직, 충돌 체크, 회전 보정(Wall kick) 및 사용자 키 입력 이벤트 처리
- `GITHUB PAGES.md` : 배포 가이드라인 및 히스토리 기록 문서
