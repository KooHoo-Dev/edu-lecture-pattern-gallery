---
name: game-patterns
description: "Unity 에 게임 프로그래밍 패턴을 넣거나 변형하거나 고칠 때 쓴다. Unity 6.3 LTS, C# 9, 새 Input System 기준의 검증된 샘플(순수 C# 코어 + MonoBehaviour 연결 컴포넌트)과 넣는 순서가 들어 있다. 다루는 패턴: 상태 패턴(State Pattern), 전략 패턴(Strategy Pattern), 게임 루프(Game Loop), 업데이트 메서드(Update Method), 관찰자 패턴(Observer Pattern), 이벤트 큐(Event Queue), 서비스 로케이터(Service Locator), 책임 연쇄 패턴(Chain of Responsibility Pattern), 명령 패턴(Command Pattern), 메멘토 패턴(Memento Pattern), 오브젝트 풀(Object Pool), 플라이웨이트(Flyweight), 더티 플래그(Dirty Flag), 공간 분할(Spatial Partition), 프로토타입 패턴(Prototype Pattern), 싱글턴 패턴(Singleton Pattern), 팩토리 메서드(Factory Method), 추상 팩토리(Abstract Factory), 어댑터 패턴(Adapter Pattern), 퍼사드 패턴(Facade Pattern), 데코레이터 패턴(Decorator Pattern), 컴포지트 패턴(Composite Pattern). 비슷한 구조를 새로 만들 때도 기준 코드로 삼는다."
license: MIT
compatibility: Unity 6.3 LTS (6000.3), C# 9, Input System
metadata:
  version: "0.1.0"
  source: "Pattern Gallery"
---

# Pattern Gallery

사용자가 Unity 에서 상태 관리, 이벤트 알림, 되돌리기, 객체 재사용, 생성 관리 같은 구조를 요청하면 아래 목록에서 가장 가까운 표본을 고르고, 그 표본의 `references/<id>/guide.md` 만 읽는다. 다른 표본의 자료는 읽지 않는다.

## 목록

| ID | 이름 | 분류 | 설명 |
|---|---|---|---|
| `state-player-actions` | 상태 패턴: 플레이어 행동 | 상태 패턴 | bool 덩어리 대신 지금 상태 객체가 입력과 시간을 처리한다 |
| `strategy-turret-targeting` | 전략 패턴: 포탑 조준 방식 | 전략 패턴 | 포탑은 조준 방식 객체에게 대상을 묻고, 방식은 실행 중에 갈아 끼운다 |
| `state-drone-ai` | 상태 패턴: 잔해 드론 AI | 상태 패턴 | 적 AI 의 순찰·추격·공격·파괴를 상태 객체로 나누고, 들어갈 때 바꾼 것을 나올 때 되돌린다 |
| `hierarchical-state-enemy` | 상태 패턴: 계층 상태 기계 | 상태 패턴 | 여러 상태에 공통인 규칙(EMP, 경계등)을 부모 상태 한 곳에 두고, 자식 상태는 자기 일만 한다 |
| `game-loop-fixed-step` | 게임 루프: 고정 시간 간격 | 게임 루프 | 화면 프레임이 몇이든 게임 규칙은 같은 시간 간격으로 돌려, 30fps 와 144fps 에서 점프 높이가 같게 한다 |
| `update-method-drone-list` | 업데이트 메서드: 드론 목록 한 프레임 | 업데이트 메서드 | 매니저가 드론 목록을 돌며 하나씩 업데이트하되, 도는 중에 생기고 사라지는 드론은 루프 밖에서 정리한다 |
| `observer-health-events` | 관찰자 패턴: 체력 알림 | 관찰자 패턴 | 체력은 바뀌었다고 알리기만 하고, 구독한 쪽이 각자 반응한다 |
| `event-queue-sound` | 이벤트 큐: 효과음 요청 모으기 | 이벤트 큐 | 효과음을 바로 틀지 않고 큐에 모아, 같은 프레임의 같은 소리는 합치고 빈 채널이 나면 차례로 튼다 |
| `service-locator-audio` | 서비스 로케이터: 소리 서비스와 널 객체 | 서비스 로케이터 | 게임 코드는 소리 서비스를 찾아 쓰기만 하고, 서비스가 없으면 아무것도 하지 않는 널 객체가 대신한다 |
| `chain-input-handlers` | 책임 연쇄 패턴: 클릭 처리 사슬 | 책임 연쇄 패턴 | 클릭을 처리자 사슬에 앞에서부터 넘기고, 처리한 처리자가 소비하면 뒤로 넘기지 않는다 |
| `command-undo-replay` | 명령 패턴: 되돌리기와 리플레이 | 명령 패턴 | 입력을 객체로 만들어 기록하고 되돌리고 다시 재생한다 |
| `memento-checkpoint` | 메멘토 패턴: 체크포인트 저장과 되살리기 | 메멘토 패턴 | 저장할 때 상태를 값으로 떠서 메멘토에 담고, 되살릴 때 그 값으로 덮는다 |
| `object-pool-projectiles` | 오브젝트 풀: 포탑 탄 재사용 | 오브젝트 풀 | 탄을 만들고 지우는 대신 빌려 쓰고 돌려주되, 빌릴 때 상태를 새로 맞춘다 |
| `flyweight-drone-types` | 플라이웨이트: 드론 종류 데이터 공유 | 플라이웨이트 | 종류마다 같은 값은 한 객체를 모든 드론이 함께 쓰고, 드론마다 다른 값은 드론이 든다 |
| `dirty-flag-loadout` | 더티 플래그: 장비 무게 다시 계산 | 더티 플래그 | 비싼 합계는 바뀌었을 때만 다시 계산하고, 값을 바꾸는 모든 길이 다시 계산 표시를 켜게 한 곳에 모은다 |
| `spatial-grid-detection` | 공간 분할: 격자로 근처 적 찾기 | 공간 분할 | 땅을 칸으로 나눠 드론을 칸에 등록하고, 근처 칸만 보아 탐지 범위 안의 적을 찾는다 |
| `prototype-drone-clone` | 프로토타입 패턴: 견본 드론 복제 | 프로토타입 패턴 | 견본을 복제하되 참조 필드는 새로 만들어 복제본끼리 섞이지 않게 한다 |
| `singleton-scene-managers` | 싱글턴 패턴: 씬을 넘는 매니저 | 싱글턴 패턴 | 씬을 넘는 매니저와 씬과 함께 사라질 매니저를 나누고 둘 다 하나만 둔다 |
| `factory-drone-spawner` | 팩토리 메서드: 드론 스포너 | 팩토리 메서드 | 무엇을 만들지는 스포너 자식이, 만드는 절차는 부모가 한 곳에서 정한다 |
| `abstract-factory-zone-themes` | 추상 팩토리: 구역 테마 세트 | 추상 팩토리 | 구역마다 드론·투사체·바닥을 한 공장이 세트로 만들어, 다른 구역 것이 섞이지 않는다 |
| `adapter-sensor-units` | 어댑터 패턴: 센서 장비 단위 맞추기 | 어댑터 패턴 | 장비마다 다른 API 와 단위를 어댑터 한 곳에서 우리 모양으로 바꿔, 화면과 경보는 한 모양만 안다 |
| `facade-hit-resolution` | 퍼사드 패턴: 명중 처리 창구 | 퍼사드 패턴 | 명중 처리 다섯 단계를 창구 하나가 맡고, 공격하는 곳은 창구만 부른다 |
| `decorator-stat-buffs` | 데코레이터 패턴: 버프 겹치기와 풀기 | 데코레이터 패턴 | 버프를 감싸는 층으로 겹치고, 층을 빼면 원래 값으로 돌아온다 |
| `composite-drone-squads` | 컴포지트 패턴: 드론 편대 명령 | 컴포지트 패턴 | 드론 하나와 편대를 같은 인터페이스로 다뤄, 편대 안 편대까지 명령 한 번이 끝까지 닿는다 |

## 진행 순서

1. `references/<id>/guide.md` 를 읽는다.
2. 같은 폴더의 `Core/`, `Unity/` 파일을 프로젝트의 `Assets/Patterns/<id>/` 아래 같은 하위 폴더에 그대로 복사한다.
3. guide 의 넣는 순서대로 장면과 Input System 연결을 안내하거나 적용한다.
4. 사용자가 다른 동작을 원하면 게임 규칙은 `Core/` 에서, 입력과 화면 연결은 `Unity/` 에서 고친다.
5. guide 의 확인 방법을 사용자에게 알려 준다.

## 지킬 것

- 게임 규칙은 `Core/` 의 순수 C# 클래스에 둔다. `Core/` 는 `UnityEngine` 을 참조하지 않고, 시간은 `Tick(float dt)` 로만 받는다. 그래야 에디터 없이 테스트할 수 있다.
- `MonoBehaviour` 는 입력을 코어에 넘기고 코어의 상태를 화면에 옮기는 일만 한다.
- 입력은 새 Input System 으로만 받는다. `Input.GetKey` 같은 구 Input Manager API, `FindObjectOfType`, `Rigidbody.velocity` 는 쓰지 않는다.
- 형식은 파일에 있는 `namespace PatternGallery.…` 블록 안에 둔다. Unity 6 은 C# 9 라 `namespace X;` 한 줄 형식, `record struct` 같은 C# 10 이상 문법은 쓰지 않는다.
- 외부 패키지(DOTween, UniRx 등)는 쓰지 않는다. 각 파일 맨 위에 무엇을 하는지 한국어 주석을 둔다.
- 코드에서 만드는 `InputAction` 은 `InputActionType.Button` 으로 만들고, `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다 (떼지 않으면 다시 켤 때 한 번 누를 때 두 번 처리된다).
- `// [1]` 같은 줄 끝 표시는 웹 갤러리의 단계 보기에 쓰는 것이다. Unity 에서는 아무 일도 하지 않으므로 그대로 두어도 되고 지워도 된다.

## 파일을 다룰 때

- `Core/` 는 에디터 없이 테스트할 수 있게 `UnityEngine` 을 참조하지 않는다. 이 구분을 유지한다.
- 표에 없는 패턴은 가장 비슷한 표본의 코어와 연결 컴포넌트 구조를 틀로 삼아 새로 만든다.
